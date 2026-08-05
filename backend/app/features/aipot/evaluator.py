"""Evidence-first practical prompt execution and Haiku evaluation."""

from __future__ import annotations

import base64
import hashlib
import http.client
import json
import socket
import urllib.error
import urllib.request
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from uuid import uuid4

from app.core.config import Settings
from app.core.errors import (
    AipotEvaluationUnavailableError,
    AipotMediaConfirmationRequiredError,
)
from app.features.aipot.repository import AipotRepository

MAX_ARTIFACT_BYTES = 15 * 1024 * 1024
EVALUATOR_CONTRACT_VERSION = 2


@dataclass(frozen=True, slots=True)
class ExecutionResult:
    kind: str
    text: str | None = None
    artifact: bytes | None = None
    media_type: str | None = None
    stdout: str | None = None
    stderr: str | None = None
    exit_code: int | None = None
    cost_usd: float | None = None


class OpenRouterClient:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def _request(self, path: str, payload: dict[str, Any]) -> dict[str, Any]:
        if not self.settings.openrouter_api_key.strip():
            raise AipotEvaluationUnavailableError(
                "AI practical evaluation is not configured. Add the OpenRouter key to the service environment."
            )
        request = urllib.request.Request(
            f"{self.settings.openrouter_base_url.rstrip('/')}{path}",
            data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {self.settings.openrouter_api_key}",
                "Content-Type": "application/json",
                "X-Title": "AI-POT private study",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=self.settings.aipot_evaluator_timeout_seconds) as response:
                return json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as error:
            retryable = error.code in {408, 429, 500, 502, 503, 504}
            raise AipotEvaluationUnavailableError(
                "The AI evaluator rejected or could not complete this request. Please retry.", retryable=retryable
            ) from error
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as error:
            raise AipotEvaluationUnavailableError(
                "The AI evaluator is temporarily unavailable. Your answer was not locked.", retryable=True
            ) from error

    @staticmethod
    def _json_schema(name: str, schema: dict[str, Any]) -> dict[str, Any]:
        return {
            "type": "json_schema",
            "json_schema": {"name": name, "strict": True, "schema": schema},
        }

    def text_execution(self, *, question_text: str, answer: str, attachments: list[dict[str, Any]], code: bool) -> ExecutionResult:
        properties = {"output": {"type": "string"}}
        required = ["output"]
        if code:
            properties["source"] = {"type": "string"}
            required.append("source")
        response = self._request(
            "/chat/completions",
            {
                "model": self.settings.aipot_text_model,
                "temperature": 0,
                "max_tokens": 4000,
                "provider": {"allow_fallbacks": False, "require_parameters": True},
                "response_format": self._json_schema(
                    "aipot_execution",
                    {
                        "type": "object", "additionalProperties": False,
                        "properties": properties, "required": required,
                    },
                ),
                "messages": [
                    {
                        "role": "system",
                        "content": "You are an execution environment for a Korean AI-POT practice task. Execute the learner's prompt against only the supplied question and materials. Do not reveal hidden answers. Return the requested result, not advice about the prompt.",
                    },
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": f"Question:\n{question_text}\n\nLearner prompt to execute:\n{answer}"},
                            *attachments,
                        ],
                    },
                ],
            },
        )
        try:
            content = response["choices"][0]["message"]["content"]
            payload = json.loads(content if isinstance(content, str) else content[0]["text"])
            text = str(payload["source"] if code else payload["output"])
            summary = str(payload["output"])
        except (KeyError, IndexError, TypeError, json.JSONDecodeError) as error:
            raise AipotEvaluationUnavailableError(
                "The AI executor returned an invalid result. Your answer was not locked.", retryable=True
            ) from error
        cost = response.get("usage", {}).get("cost")
        return ExecutionResult(kind="code" if code else "text", text=text, cost_usd=float(cost) if cost is not None else None, stderr=None if not code else summary)

    def image_execution(self, *, answer: str, references: list[dict[str, Any]], options: dict[str, Any]) -> ExecutionResult:
        payload: dict[str, Any] = {
            "model": self.settings.aipot_image_model,
            "prompt": answer,
            "n": 1,
            "output_format": "png",
            "provider": {"allow_fallbacks": False},
        }
        for key in ("aspect_ratio", "quality", "size", "resolution"):
            if options.get(key):
                payload[key] = options[key]
        if references:
            payload["input_references"] = references
        response = self._request("/images", payload)
        try:
            item = response["data"][0]
            artifact = base64.b64decode(item["b64_json"], validate=True)
            media_type = str(item.get("media_type") or "image/png")
        except (KeyError, IndexError, TypeError, ValueError) as error:
            raise AipotEvaluationUnavailableError(
                "The AI image executor returned an invalid image. Your answer was not locked.", retryable=True
            ) from error
        if not artifact or len(artifact) > MAX_ARTIFACT_BYTES:
            raise AipotEvaluationUnavailableError(
                "The generated image is unavailable or too large to store safely. Your answer was not locked.", retryable=True
            )
        cost = response.get("usage", {}).get("cost")
        return ExecutionResult(kind="image", artifact=artifact, media_type=media_type, cost_usd=float(cost) if cost is not None else None)

    def assess_context(
        self, *, context_markdown: str, answer: str, provider_solution: str | None,
        attachments: list[dict[str, Any]],
    ) -> dict[str, str | bool]:
        """Reject a polished prompt that is for a different practical task.

        This intentionally runs before an executor.  It protects the scoring
        contract from giving credit to a well-written but unrelated prompt and
        avoids paying to generate media for it.
        """
        response = self._request(
            "/chat/completions",
            {
                "model": self.settings.aipot_judge_model,
                "temperature": 0,
                "max_tokens": 1200,
                "provider": {"allow_fallbacks": False, "require_parameters": True},
                "response_format": self._json_schema(
                    "aipot_context_alignment",
                    {
                        "type": "object", "additionalProperties": False,
                        "properties": {
                            "aligned": {"type": "boolean"},
                            "rationale": {"type": "string"},
                            "evidence": {"type": "string"},
                        },
                        "required": ["aligned", "rationale", "evidence"],
                    },
                ),
                "messages": [
                    {
                        "role": "system",
                        "content": (
                            "You are the relevance gate for a Korean AI-POT practical question. "
                            "Use the provided Markdown and reference materials as authoritative. "
                            "Decide whether the learner's answer is a prompt for this exact task, "
                            "not whether it is generally well written. If it changes the task type, "
                            "target, supplied data, or required result, set aligned=false. An unrelated "
                            "image-generation prompt for a text task is false. Do not execute anything. "
                            "Give concise Korean rationale and concrete evidence."
                        ),
                    },
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": json.dumps({
                                "question_context_markdown": context_markdown,
                                "provider_reference_solution": provider_solution or "(not available)",
                                "learner_answer": answer,
                            }, ensure_ascii=False)},
                            *attachments,
                        ],
                    },
                ],
            },
        )
        try:
            content = response["choices"][0]["message"]["content"]
            payload = json.loads(content if isinstance(content, str) else content[0]["text"])
            return {
                "aligned": bool(payload["aligned"]),
                "rationale": str(payload["rationale"]),
                "evidence": str(payload["evidence"]),
            }
        except (KeyError, IndexError, TypeError, json.JSONDecodeError) as error:
            raise AipotEvaluationUnavailableError(
                "The AI evaluator returned an invalid context check. Your answer was not locked.", retryable=True
            ) from error

    def judge(
        self, *, question_text: str, context_markdown: str, provider_solution: str | None, answer: str,
        rubric: list[dict[str, Any]], execution: ExecutionResult, context_attachments: list[dict[str, Any]],
        artifact_attachment: dict[str, Any] | None,
    ) -> list[dict[str, Any]]:
        criteria = [{"criterion": str(item["criterion"]), "possible": float(item["points"])} for item in rubric]
        response = self._request(
            "/chat/completions",
            {
                "model": self.settings.aipot_judge_model,
                "temperature": 0,
                "max_tokens": 3000,
                "provider": {"allow_fallbacks": False, "require_parameters": True},
                "response_format": self._json_schema(
                    "aipot_practical_score",
                    {
                        "type": "object", "additionalProperties": False,
                        "properties": {
                            "criteria": {
                                "type": "array",
                                "items": {
                                    "type": "object", "additionalProperties": False,
                                    "properties": {
                                        "criterion": {"type": "string"}, "met": {"type": "boolean"},
                                        "rationale": {"type": "string"}, "evidence": {"type": "string"},
                                    },
                                    "required": ["criterion", "met", "rationale", "evidence"],
                                },
                            },
                        },
                        "required": ["criteria"],
                    },
                ),
                "messages": [
                    {
                        "role": "system",
                        "content": (
                            "Score an AI-POT learner prompt from the exact question context, supplied materials, "
                            "rubric, provider reference solution when present, and actual generated result. "
                            "The provider reference is calibration, not an exact-string requirement. Do not credit "
                            "generic prompt scaffolding unless it targets the task's actual inputs and result. Mark a "
                            "criterion met only if the generated result demonstrates it. Give concise Korean rationale "
                            "and evidence for every criterion."
                        ),
                    },
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": json.dumps({
                                "question": question_text, "question_context_markdown": context_markdown,
                                "provider_reference_solution": provider_solution or "(not available)",
                                "learner_prompt": answer, "rubric": criteria,
                                "actual_result": execution.text,
                                "stdout": execution.stdout, "stderr": execution.stderr,
                                "exit_code": execution.exit_code,
                            }, ensure_ascii=False)},
                            *context_attachments,
                            *([artifact_attachment] if artifact_attachment else []),
                        ],
                    },
                ],
            },
        )
        try:
            content = response["choices"][0]["message"]["content"]
            payload = json.loads(content if isinstance(content, str) else content[0]["text"])
            returned = payload["criteria"]
        except (KeyError, IndexError, TypeError, json.JSONDecodeError) as error:
            raise AipotEvaluationUnavailableError(
                "The AI evaluator returned an invalid score. Your answer was not locked.", retryable=True
            ) from error
        by_name = {str(item.get("criterion")): item for item in returned if isinstance(item, dict)}
        normalized = []
        for item in criteria:
            result = by_name.get(item["criterion"])
            if not result:
                raise AipotEvaluationUnavailableError(
                    "The AI evaluator omitted a scoring criterion. Your answer was not locked.", retryable=True
                )
            normalized.append({
                "criterion": item["criterion"], "possible": item["possible"],
                "earned": item["possible"] if bool(result.get("met")) else 0.0,
                "met": bool(result.get("met")), "rationale": str(result.get("rationale", "")),
                "evidence": str(result.get("evidence", "")),
            })
        return normalized


class AipotPracticalEvaluator:
    def __init__(
        self, settings: Settings, repository: AipotRepository,
        asset_loader: Callable[[str, str], Path],
        client: OpenRouterClient | None = None,
    ) -> None:
        self.settings = settings
        self.repository = repository
        self.asset_loader = asset_loader
        self.client = client or OpenRouterClient(settings)

    @staticmethod
    def _hash(value: Any) -> str:
        return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True).encode("utf-8")).hexdigest()

    def _asset_content(self, exam_id: str, asset_name: str) -> tuple[dict[str, Any], dict[str, Any] | None, str]:
        try:
            path = self.asset_loader(exam_id, asset_name)
            raw = path.read_bytes()
        except (OSError, ValueError) as error:
            raise AipotEvaluationUnavailableError(
                "A required practical-test source file is not available, so this answer cannot be scored.", retryable=False
            ) from error
        suffix = path.suffix.lower()
        if suffix in {".png", ".jpg", ".jpeg", ".webp"}:
            media_type = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp"}[suffix]
            data_url = f"data:{media_type};base64,{base64.b64encode(raw).decode('ascii')}"
            vision = {"type": "image_url", "image_url": {"url": data_url}}
            reference = {"type": "image_url", "image_url": {"url": data_url}}
            return vision, reference, path.name
        if suffix in {".txt", ".csv", ".md"}:
            return {"type": "text", "text": raw.decode("utf-8", errors="replace")[:20_000]}, None, path.name
        raise AipotEvaluationUnavailableError(
            "This practical-test source format is not available to the evaluator.", retryable=False
        )

    def _attachments(self, exam_id: str, question: dict[str, Any], spec: dict[str, Any]) -> tuple[list[dict[str, Any]], list[dict[str, Any]], str]:
        if spec.get("availability") == "unavailable":
            raise AipotEvaluationUnavailableError(
                "The original practical-test file is not installed in this study workspace, so this answer cannot be scored.", retryable=False
            )
        asset_names = [str(item) for item in spec.get("input_assets", [])]
        if not asset_names and question.get("asset"):
            asset_names = [Path(str(question["asset"])).name]
        attachments: list[dict[str, Any]] = []
        references: list[dict[str, Any]] = []
        labels: list[str] = []
        for asset_name in asset_names:
            vision, reference, label = self._asset_content(exam_id, Path(asset_name).name)
            attachments.append(vision)
            if reference:
                references.append(reference)
            labels.append(label)
        return attachments, references, ", ".join(labels) if labels else "Question text only"

    @staticmethod
    def _context_markdown(question: dict[str, Any], spec: dict[str, Any]) -> str:
        prompt = str(question.get("prompt", "")).strip()
        supplemental = str(spec.get("context_markdown", "")).strip()
        if not supplemental or supplemental == prompt:
            return prompt
        return f"{prompt}\n\n---\n\n{supplemental}"

    @staticmethod
    def _zero_criteria(rubric: list[dict[str, Any]], alignment: dict[str, str | bool]) -> list[dict[str, Any]]:
        rationale = f"문항 맥락 불일치: {alignment['rationale']}"
        evidence = str(alignment["evidence"])
        return [
            {
                "criterion": str(item["criterion"]), "possible": float(item["points"]), "earned": 0.0,
                "met": False, "rationale": rationale, "evidence": evidence,
            }
            for item in rubric
        ]

    def _sandbox(self, source: str, fixture: dict[str, Any]) -> dict[str, Any]:
        body = json.dumps({"source": source, "stdin": str(fixture.get("stdin", ""))}).encode("utf-8")
        request = (
            b"POST /run HTTP/1.1\r\nHost: localhost\r\nContent-Type: application/json\r\n"
            + f"Content-Length: {len(body)}\r\n\r\n".encode("ascii") + body
        )
        try:
            with socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) as connection:
                connection.settimeout(8)
                connection.connect(str(self.settings.aipot_sandbox_socket))
                connection.sendall(request)
                response = http.client.HTTPResponse(connection)
                response.begin()
                payload = json.loads(response.read().decode("utf-8"))
                if response.status != 200:
                    raise ValueError("sandbox failure")
                return payload
        except (OSError, http.client.HTTPException, ValueError, json.JSONDecodeError) as error:
            raise AipotEvaluationUnavailableError(
                "The isolated code runner is unavailable. Your answer was not locked.", retryable=True
            ) from error

    def evaluate(self, *, exam_id: str, question: dict[str, Any], answer: str, confirm_media: bool) -> dict[str, Any]:
        spec = question.get("evaluation")
        if not isinstance(spec, dict):
            raise AipotEvaluationUnavailableError(
                "This practical question has not yet been prepared for evidence-based evaluation.", retryable=False
            )
        kind = str(spec.get("kind", "unavailable"))
        if kind not in {"text", "image", "code"}:
            raise AipotEvaluationUnavailableError(
                "This practical question cannot be evaluated with the available study material.", retryable=False
            )
        question_hash = self._hash({
            "evaluator_contract_version": EVALUATOR_CONTRACT_VERSION,
            "prompt": question.get("prompt"), "rubric": question.get("rubric"), "evaluation": spec,
        })
        answer_hash = hashlib.sha256(answer.strip().encode("utf-8")).hexdigest()
        cached = self.repository.get_completed_evaluation(
            exam_id=exam_id, question_number=int(question["number"]), answer_hash=answer_hash, question_hash=question_hash,
        )
        if cached:
            return cached.response
        evaluation_id = str(uuid4())
        reservation = self.repository.reserve_evaluation(
            evaluation_id=evaluation_id, exam_id=exam_id, question_number=int(question["number"]),
            answer_hash=answer_hash, question_hash=question_hash,
        )
        if reservation == "completed":
            cached = self.repository.get_completed_evaluation(
                exam_id=exam_id, question_number=int(question["number"]), answer_hash=answer_hash, question_hash=question_hash,
            )
            if cached:
                return cached.response
        if reservation == "pending":
            raise AipotEvaluationUnavailableError(
                "This answer is already being evaluated. Please wait before retrying.", retryable=True
            )
        try:
            attachments, references, input_summary = self._attachments(exam_id, question, spec)
            context_markdown = self._context_markdown(question, spec)
            provider_solution = str(spec.get("provider_solution", "")).strip() or None
            reference_source = str(spec.get("reference_source", "")).strip() or None
            alignment = self.client.assess_context(
                context_markdown=context_markdown, answer=answer, provider_solution=provider_solution,
                attachments=attachments,
            )
            if not alignment["aligned"]:
                response = {
                    "id": evaluation_id, "kind": kind, "submitted_prompt": answer,
                    "input_summary": input_summary, "executor_model": "not run: context mismatch",
                    "judge_model": self.settings.aipot_judge_model,
                    "criteria": self._zero_criteria(list(question.get("rubric", [])), alignment),
                    "artifact": {
                        "kind": kind, "media_type": None, "asset_url": None,
                        "text": "실행하지 않음: 답안이 이 문항의 요구와 일치하지 않습니다.",
                        "stdout": None, "stderr": None, "exit_code": None,
                    },
                    "reference_solution": provider_solution,
                    "reference_source": reference_source,
                    "context_alignment": alignment,
                    "cost_usd": None,
                }
                self.repository.complete_evaluation(
                    evaluation_id=evaluation_id, response=response, artifact=None, artifact_media_type=None,
                )
                return response
            if kind == "image" and not confirm_media:
                raise AipotMediaConfirmationRequiredError()
            if kind == "image":
                execution = self.client.image_execution(answer=answer, references=references, options=spec.get("options", {}))
                artifact_attachment = {
                    "type": "image_url",
                    "image_url": {"url": f"data:{execution.media_type};base64,{base64.b64encode(execution.artifact or b'').decode('ascii')}"},
                }
            else:
                generated = self.client.text_execution(
                    question_text=str(question.get("prompt", "")), answer=answer, attachments=attachments, code=kind == "code",
                )
                if kind == "code":
                    runner = self._sandbox(generated.text or "", dict(spec.get("fixture", {})))
                    execution = ExecutionResult(
                        kind="code", text=generated.text, stdout=str(runner.get("stdout", "")),
                        stderr=str(runner.get("stderr", "")), exit_code=int(runner.get("exit_code", -1)),
                        cost_usd=generated.cost_usd,
                    )
                else:
                    execution = generated
                artifact_attachment = None
            criteria = self.client.judge(
                question_text=str(question.get("prompt", "")), context_markdown=context_markdown,
                provider_solution=provider_solution, answer=answer, rubric=list(question.get("rubric", [])),
                execution=execution, context_attachments=attachments,
                artifact_attachment=artifact_attachment,
            )
            artifact = {
                "kind": kind, "media_type": execution.media_type,
                "asset_url": f"/api/v1/aipot/evaluations/{evaluation_id}/artifact" if execution.artifact else None,
                "text": execution.text, "stdout": execution.stdout, "stderr": execution.stderr,
                "exit_code": execution.exit_code,
            }
            response = {
                "id": evaluation_id, "kind": kind, "submitted_prompt": answer,
                "input_summary": input_summary, "executor_model": self.settings.aipot_image_model if kind == "image" else self.settings.aipot_text_model,
                "judge_model": self.settings.aipot_judge_model, "criteria": criteria,
                "artifact": artifact, "reference_solution": provider_solution,
                "reference_source": reference_source,
                "context_alignment": alignment, "cost_usd": execution.cost_usd,
            }
            self.repository.complete_evaluation(
                evaluation_id=evaluation_id, response=response, artifact=execution.artifact,
                artifact_media_type=execution.media_type,
            )
            return response
        except Exception:
            self.repository.abandon_evaluation(evaluation_id)
            raise

    def completed(self, *, exam_id: str, question: dict[str, Any], answer: str) -> dict[str, Any] | None:
        spec = question.get("evaluation")
        if not answer.strip() or not isinstance(spec, dict):
            return None
        question_hash = self._hash({
            "evaluator_contract_version": EVALUATOR_CONTRACT_VERSION,
            "prompt": question.get("prompt"), "rubric": question.get("rubric"), "evaluation": spec,
        })
        answer_hash = hashlib.sha256(answer.strip().encode("utf-8")).hexdigest()
        stored = self.repository.get_completed_evaluation(
            exam_id=exam_id, question_number=int(question["number"]), answer_hash=answer_hash, question_hash=question_hash,
        )
        return stored.response if stored else None
