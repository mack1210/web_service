"""Manifest-backed private study delivery and local attempt history."""

from __future__ import annotations

import json
import re
from collections import defaultdict
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

from app.core.config import settings
from app.core.errors import (
    AipotContentUnavailableError,
    AipotEvaluationRequiredError,
    AipotNotFoundError,
)
from app.features.aipot.evaluator import AipotPracticalEvaluator
from app.features.aipot.repository import AipotRepository
from app.features.aipot.schemas import (
    AipotAttemptDetail,
    AipotAttemptSummary,
    AipotChapterResult,
    AipotChoiceFeedback,
    AipotExamDetail,
    AipotExamHistory,
    AipotExamSummary,
    AipotHistoryResponse,
    AipotImmediateFeedback,
    AipotQuestion,
    AipotQuestionReview,
    AipotSubmissionRequest,
    AipotVisualAsset,
    AipotWeakness,
)

CHAPTERS = {
    "C01": "인공지능의 개념·분류·발전사",
    "C02": "머신러닝 핵심 알고리즘과 학습 방식",
    "C03": "신경망·딥러닝·모델 성능 평가",
    "C04": "생성형 AI 개념과 생성 모델",
    "C05": "LLM·토큰·임베딩·트랜스포머",
    "C06": "사전학습·파인튜닝·PEFT·RLHF",
    "C07": "프롬프트 구성 요소와 기본 패턴",
    "C08": "명확한 지시·단계화·메타프롬프트",
    "C09": "데이터 탐색·정보 추출·문서 처리",
    "C10": "고급 프롬프트·안티패턴·A/B 테스트",
    "C11": "멀티모달·이미지·비디오 프롬프트",
    "C12": "RAG·벡터 DB·에이전트 워크플로",
    "C13": "API·파라미터·코딩 활용",
    "C14": "업무 생산성·문서·PPT·Excel·데이터 분석",
    "C15": "환각·편향·드리프트·설명가능성",
    "C16": "프롬프트 주입·보안·개인정보·저작권·윤리",
    "C17": "실습형 프롬프트 작성·시간 관리",
}
_CIRCLED = str.maketrans({"①": "1", "②": "2", "③": "3", "④": "4", "⑤": "5"})
_CIRCLED_TO_NUMBER = {"①": "1", "②": "2", "③": "3", "④": "4", "⑤": "5"}
_EXAM_ID = re.compile(r"^(source-round|generated-mock)-\d{2}$|^public-set-[ab]$")
_OCR_CHOICE = re.compile(r"^\s*(?:(?P<number>[1-5])[.)]|(?P<circled>[①②③④⑤]))\s+(?P<value>.+?)\s*$")
_TABLE_CHOICE = re.compile(r"^(?P<number>[1-5]|[①②③④⑤])$")


def _repository() -> AipotRepository:
    database_file = settings.aipot_database_file
    # Tests and host development often override only the legacy history path.
    # Keep the new database beside that override instead of trying to create /app.
    if database_file == Path("/app/data/aipot.sqlite3") and settings.aipot_history_file != Path("/app/data/aipot-history.json"):
        database_file = settings.aipot_history_file.with_name("aipot.sqlite3")
    repository = AipotRepository(database_file, settings.aipot_history_file)
    repository.initialize()
    return repository


def _content_root() -> Path:
    root = settings.aipot_content_root
    if not root.is_dir():
        raise AipotContentUnavailableError()
    return root


def _load_manifest(exam_id: str) -> dict:
    if not _EXAM_ID.fullmatch(exam_id):
        raise AipotNotFoundError()
    root = _content_root()
    web_manifest = root / "data" / "web-exams" / f"{exam_id}.json"
    if web_manifest.is_file():
        manifest = json.loads(web_manifest.read_text(encoding="utf-8"))
        return _sanitize_manifest(manifest)
    directory = "corpus" if exam_id.startswith("source-round") else "generated"
    path = root / directory / f"{exam_id}.json"
    if not path.is_file():
        raise AipotNotFoundError()
    return _sanitize_manifest(json.loads(path.read_text(encoding="utf-8")))


def _sanitize_manifest(manifest: dict) -> dict:
    """Return only learner-facing stems, never cover or duplicated answer text."""

    for question in manifest.get("questions", []):
        prompt = question.get("prompt")
        if not isinstance(prompt, str):
            continue
        for marker in ("\n## 부록: 정답", "\n### 정답표", "\n## 출제 설계 추출"):
            if marker in prompt:
                prompt = prompt.split(marker, 1)[0].rstrip()
                break
        if question.get("number") == 1:
            prompt = _strip_question_one_preamble(prompt)
        choices = question.get("choices")
        if isinstance(choices, list) and len(choices) >= 2:
            prompt = _strip_terminal_rendered_choices(prompt, len(choices))
        question["prompt"] = prompt
    return manifest


def _strip_question_one_preamble(prompt: str) -> str:
    """Drop the source cover and instructions that precede the first stem."""

    heading = re.search(r"^###\s*(?:객관식|이론\s*시험)\s*$", prompt, flags=re.MULTILINE)
    return prompt[heading.end():].lstrip() if heading else prompt


def _strip_terminal_rendered_choices(prompt: str, choice_count: int) -> str:
    """Remove a final 1→N OCR choice run already represented by UI controls."""

    lines = prompt.splitlines()
    for start, line in enumerate(lines):
        first = _OCR_CHOICE.match(line)
        if not first or _choice_number(first.group("number") or first.group("circled")) != "1":
            continue
        cursor = start
        for expected in range(1, choice_count + 1):
            while cursor < len(lines) and not lines[cursor].strip():
                cursor += 1
            if cursor >= len(lines):
                break
            choice = _OCR_CHOICE.match(lines[cursor])
            if not choice or _choice_number(choice.group("number") or choice.group("circled")) != str(expected):
                break
            cursor += 1
        else:
            if not any(line.strip() for line in lines[cursor:]):
                return "\n".join(lines[:start]).rstrip()
    return prompt


def _all_manifests() -> list[dict]:
    root = _content_root()
    web_paths = sorted((root / "data" / "web-exams").glob("*.json"))
    if web_paths:
        return [_sanitize_manifest(json.loads(path.read_text(encoding="utf-8"))) for path in web_paths]
    paths = [
        *sorted((root / "corpus").glob("source-round-*.json")),
        *sorted((root / "generated").glob("generated-mock-*.json")),
    ]
    return [_sanitize_manifest(json.loads(path.read_text(encoding="utf-8"))) for path in paths]


def _summary(manifest: dict) -> AipotExamSummary:
    source_kind = manifest.get("source_kind", manifest.get("sourceKind"))
    is_source = source_kind == "private_photographed_book"
    is_public = source_kind == "private_reference_pdf"
    return AipotExamSummary(
        id=manifest["id"],
        title=manifest["title"],
        kind="public" if is_public else "source" if is_source else "generated",
        question_count=len(manifest["questions"]),
        image_first=is_source or is_public,
    )


def _ocr_sections(exam_id: str) -> dict[int, str]:
    path = _content_root() / "corpus" / "ocr" / f"{exam_id}.md"
    if not path.is_file():
        return {}
    sections: dict[int, str] = {}
    for match in re.finditer(
        r"^## Q(\d{2})\s*\n(.*?)(?=^## Q\d{2}\s*\n|\Z)",
        path.read_text(encoding="utf-8"),
        flags=re.MULTILINE | re.DOTALL,
    ):
        section = re.sub(r"^- Source:.*\n+", "", match.group(2), flags=re.MULTILINE).strip()
        if match.group(1) == "01":
            section = _strip_exam_preamble(section)
        if section:
            sections[int(match.group(1))] = section
    return sections


def _strip_exam_preamble(section: str) -> str:
    """Keep question one, not the photographed exam-cover instructions."""

    if not section.startswith("`AI-POT 실전 모의고사"):
        return section
    if objective_heading := re.search(r"^### 객관식\s*$", section, flags=re.MULTILINE):
        return section[objective_heading.end():].lstrip()
    return re.sub(r"^`AI-POT 실전 모의고사[^\n]*\n+", "", section).lstrip()


def _choice_number(value: str) -> str:
    return _CIRCLED_TO_NUMBER.get(value, value)


def _split_ocr_multiple_choice(section: str) -> tuple[str, list[str]]:
    """Split the final OCR choice block from the question stem.

    Source transcriptions keep their choices as the final four numbered (or
    circled-number) lines. Requiring a complete 1→4 run avoids treating
    numbered examples inside the question itself as answer choices.
    """

    lines = section.splitlines()
    for start, line in enumerate(lines):
        first = _OCR_CHOICE.match(line)
        if not first or _choice_number(first.group("number") or first.group("circled")) != "1":
            continue

        choices: list[str] = []
        cursor = start
        for expected in range(1, 5):
            while cursor < len(lines) and not lines[cursor].strip():
                cursor += 1
            if cursor >= len(lines):
                break
            match = _OCR_CHOICE.match(lines[cursor])
            if not match:
                break
            number = _choice_number(match.group("number") or match.group("circled"))
            if number != str(expected):
                break
            choices.append(match.group("value"))
            cursor += 1

        if len(choices) == 4 and not any(line.strip() for line in lines[cursor:]):
            return "\n".join(lines[:start]).strip(), choices

    # Some source questions express their answer choices as the final Markdown
    # table. Turn its four numbered rows into normal UI choices so the learner
    # does not have to read the same options in both the stem and answer area.
    for start, line in enumerate(lines):
        if not line.strip().startswith("|"):
            continue
        end = start
        while end < len(lines) and lines[end].strip().startswith("|"):
            end += 1
        table = lines[start:end]
        if len(table) < 6 or any(line.strip() for line in lines[end:]):
            continue
        rows = [[cell.strip() for cell in row.strip().strip("|").split("|")] for row in table]
        data_rows = rows[2:]
        if len(data_rows) != 4:
            continue
        choices = []
        for expected, row in enumerate(data_rows, start=1):
            if not row or not _TABLE_CHOICE.fullmatch(row[0]) or _choice_number(row[0]) != str(expected):
                break
            choices.append(" · ".join(cell for cell in row[1:] if cell))
        if len(choices) == 4:
            return "\n".join(lines[:start]).strip(), choices

    return section, []


def _source_visuals(exam_id: str, question_number: int) -> list[dict]:
    """Read source-image segments from the photographed-round corpus.

    The web manifest owns learner-facing prompt text; the corpus manifest owns
    the reviewed source-image marker, crop filename, and alt text. Keeping that
    visual metadata in one place prevents new source sets from drifting into
    unsegmented raw Markdown.
    """

    path = _content_root() / "corpus" / f"{exam_id}.json"
    if not exam_id.startswith("source-round-") or not path.is_file():
        return []
    corpus = json.loads(path.read_text(encoding="utf-8"))
    source_question = next(
        (item for item in corpus.get("questions", []) if item.get("number") == question_number),
        None,
    )
    return list(source_question.get("visuals", [])) if source_question else []


def _public_question(exam_id: str, question: dict, ocr_sections: dict[int, str]) -> AipotQuestion:
    asset_url = None
    source_page = question.get("source_page")
    ocr_text = ocr_sections.get(question["number"])
    raw_choices = question.get("choices") or []
    choice_ids = [str(item.get("id", index + 1)) if isinstance(item, dict) else str(index + 1) for index, item in enumerate(raw_choices)]
    choices = [str(item.get("text", "")) if isinstance(item, dict) else str(item) for item in raw_choices]
    if ocr_text and question["type"] == "multiple_choice":
        ocr_text, ocr_choices = _split_ocr_multiple_choice(ocr_text)
        choices = ocr_choices or choices
        choice_ids = [str(index) for index in range(1, len(choices) + 1)]
    declared_visuals = _source_visuals(exam_id, question["number"]) or question.get("visuals", [])
    visual_assets = [
        AipotVisualAsset(
            marker=visual["marker"],
            asset_url=f"/api/v1/aipot/exams/{exam_id}/assets/{Path(visual['file']).name}",
            alt=visual["alt"],
            keep_marker_text=visual.get("keep_marker_text", False) or visual["marker"].startswith(("###", "Q")),
            replace_following_block=visual.get("replace_following_block", False),
        )
        for visual in declared_visuals
    ]
    visual_filenames = {Path(visual["file"]).name for visual in declared_visuals}
    if primary_visual := question.get("primary_visual"):
        asset_url = f"/api/v1/aipot/exams/{exam_id}/assets/{Path(primary_visual['file']).name}"
    elif asset := question.get("asset"):
        asset_name = Path(asset).name
        if asset_name not in visual_filenames:
            asset_url = f"/api/v1/aipot/exams/{exam_id}/assets/{asset_name}"
    return AipotQuestion(
        number=question["number"],
        type=question["type"],
        chapter=question["chapter"],
        topic=question["topic"],
        prompt=question["prompt"],
        points=int(question.get("points", _official_points(question["number"]))),
        choices=choices,
        choice_ids=choice_ids,
        multiple_selection=question["type"] == "multiple_select" or "|" in str(question.get("answer", "")),
        single_concept_explanation=bool(question.get("single_concept_explanation", False)),
        ocr_text=ocr_text,
        visual_assets=visual_assets,
        source_page=source_page,
        asset_url=asset_url,
        evaluation_kind=str(question.get("evaluation", {}).get("kind")) if question.get("type") == "practical_prompt" and question.get("evaluation", {}).get("kind") in {"text", "image", "code", "unavailable"} else None,
        evaluation_available=question.get("evaluation", {}).get("availability") != "unavailable",
    )


def list_exams() -> list[AipotExamSummary]:
    return [_summary(manifest) for manifest in _all_manifests()]


def get_exam(exam_id: str) -> AipotExamDetail:
    manifest = _load_manifest(exam_id)
    source_kind = manifest.get("source_kind", manifest.get("sourceKind"))
    ocr_sections = _ocr_sections(exam_id) if source_kind == "private_photographed_book" and not manifest.get("sourceKind") else {}
    return AipotExamDetail(
        **_summary(manifest).model_dump(),
        questions=[_public_question(exam_id, question, ocr_sections) for question in manifest["questions"]],
        known_limitations=manifest.get("known_limitations", []),
    )


def get_asset_path(exam_id: str, asset_name: str) -> Path:
    manifest = _load_manifest(exam_id)
    if manifest.get("sourceKind"):
        root = _content_root()
        candidates = []
        for question in manifest["questions"]:
            asset = question.get("asset")
            if asset:
                # Browser manifests keep paths relative to ``quizzes/`` because
                # their static HTML lives there; resolve the same way when the
                # API serves the private source page.
                candidates.append((root / "quizzes" / asset).resolve())
        for candidate in candidates:
            if candidate.name == asset_name and candidate.is_file() and candidate.is_relative_to(root / "assets"):
                return candidate
        raise AipotNotFoundError("The requested study asset is not available.")
    allowed: set[str] = set()
    if manifest.get("source_kind") == "private_photographed_book":
        allowed = {
            Path(question["primary_visual"]["file"]).name
            for question in manifest["questions"]
            if question.get("primary_visual")
        }
        allowed.update(
            Path(visual["file"]).name
            for question in manifest["questions"]
            for visual in question.get("visuals", [])
        )
        allowed.update(
            Path(question["asset"]).name
            for question in manifest["questions"]
            if question.get("asset")
        )
        path = _content_root() / "assets" / exam_id / asset_name
    else:
        allowed = {Path(question["asset"]).name for question in manifest["questions"] if question.get("asset")}
        path = _content_root() / "assets" / exam_id / asset_name
    if asset_name not in allowed or not path.is_file():
        raise AipotNotFoundError("The requested study asset is not available.")
    return path


def _normalize(answer: str) -> str:
    value = answer.strip().translate(_CIRCLED).lower()
    value = re.sub(r"^(정답|answer)\s*[:：]", "", value).strip()
    pieces = [piece for piece in re.split(r"[,/·ㆍ\s]+", value) if piece]
    if len(pieces) > 1 and all(piece.isdigit() for piece in pieces):
        return "|".join(sorted(set(pieces), key=int))
    return re.sub(r"\s+", " ", value)


def _practical_evaluator() -> AipotPracticalEvaluator:
    return AipotPracticalEvaluator(settings, _repository(), get_asset_path)


def _recommendation(percent: float) -> str:
    if percent < 80:
        return "핵심노트 재학습 + 변형 30문제"
    if percent < 90:
        return "오답 변형 20문제"
    return "다음 챕터 진행"


def _score(manifest: dict, answers: dict[int, str]) -> tuple[list[dict], list[dict], float]:
    rows: list[dict] = []
    chapters: dict[str, dict] = defaultdict(lambda: {"earned": 0.0, "possible": 0.0, "topics": []})
    for question in manifest["questions"]:
        answer = answers.get(question["number"], "").strip()
        evaluation = None
        if question["type"] == "practical_prompt":
            possible = float(question.get("points", _official_points(question["number"])))
            evaluation = _practical_evaluator().completed(
                exam_id=manifest["id"], question=question, answer=answer
            ) if answer else None
            if answer and evaluation is None:
                raise AipotEvaluationRequiredError(
                    f"Q{question['number']:02d} must finish evidence-based evaluation before final submission."
                )
            raw_possible = sum(float(item["points"]) for item in question["rubric"])
            raw_earned = sum(float(item["earned"]) for item in evaluation["criteria"]) if evaluation else 0.0
            missing = [item["criterion"] for item in evaluation["criteria"] if not item["met"]] if evaluation else [item["criterion"] for item in question["rubric"]]
            earned = raw_earned / raw_possible * possible if raw_possible else 0.0
            correct = None
            result = "충족" if earned == possible else "보완 필요"
        else:
            possible = float(question.get("points", _official_points(question["number"])))
            correct = question.get("answer")
            accepted = {_normalize(value) for value in question.get("accepted_answers", [])}
            earned = possible if answer and _normalize(answer) in accepted else 0.0
            missing = [] if earned else [question["topic"]]
            result = "정답" if earned else "오답/미응답"
        chapter = chapters[question["chapter"]]
        chapter["earned"] += earned
        chapter["possible"] += possible
        if earned < possible and question["topic"] not in chapter["topics"]:
            chapter["topics"].append(question["topic"])
        rows.append(
            {
                "number": question["number"],
                "chapter": question["chapter"],
                "topic": question["topic"],
                "submitted_answer": answer,
                "correct_answer": correct,
                "explanation": question.get("explanation"),
                "score": earned,
                "possible_score": possible,
                "result": result,
                "missing": missing,
                "evaluation": evaluation,
            }
        )
    chapter_rows = []
    for code, values in sorted(chapters.items()):
        percent = round(values["earned"] / values["possible"] * 100, 1) if values["possible"] else 0.0
        chapter_rows.append(
            {
                "chapter": code,
                "chapter_title": CHAPTERS[code],
                "earned": round(values["earned"], 2),
                "possible": round(values["possible"], 2),
                "percent": percent,
                "topics": values["topics"][:3],
                "recommendation": _recommendation(percent),
            }
        )
    return rows, chapter_rows, round(sum(row["score"] for row in rows), 1)


def _official_points(number: int) -> int:
    return 2 if number <= 30 else 3 if number <= 35 else 5


def immediate_feedback(exam_id: str, number: int, answer: str, confirm_media: bool = False) -> AipotImmediateFeedback:
    manifest = _load_manifest(exam_id)
    question = next((item for item in manifest["questions"] if item["number"] == number), None)
    if question is None:
        raise AipotNotFoundError("The requested question was not found.")
    possible = float(question.get("points", _official_points(number)))
    if question["type"] == "practical_prompt":
        evaluation = _practical_evaluator().evaluate(
            exam_id=exam_id, question=question, answer=answer.strip(), confirm_media=confirm_media
        )
        raw_possible = sum(float(item["points"]) for item in question.get("rubric", []))
        raw_earned = sum(float(item["earned"]) for item in evaluation["criteria"])
        missing = [item["criterion"] for item in evaluation["criteria"] if not item["met"]]
        earned = raw_earned / raw_possible * possible if raw_possible else 0.0
        correct_answer = None
    else:
        accepted = {_normalize(str(value)) for value in question.get("accepted_answers", [question.get("answer", "")])}
        earned = possible if answer.strip() and _normalize(answer) in accepted else 0.0
        missing = [] if earned else [question["topic"]]
        correct_answer = str(question.get("answer", ""))
    feedback = []
    for choice in question.get("choices", []):
        if not isinstance(choice, dict):
            continue
        detail = choice.get("feedback", {})
        feedback.append(AipotChoiceFeedback(
            id=str(choice["id"]), text=str(choice["text"]), correct=_normalize(str(choice["id"])) == _normalize(str(question.get("answer", ""))),
            definition=str(detail.get("definition", question["topic"])), purpose=str(detail.get("purpose", "")),
            reason=str(detail.get("reason", "")), similarities=str(detail.get("similarities", "")), differences=str(detail.get("differences", "")),
        ))
    return AipotImmediateFeedback(
        number=number, earned=earned, possible=possible, correct=earned == possible,
        correct_answer=correct_answer or None, explanation=question.get("explanation"), missing=missing, choice_feedback=feedback,
        evaluation=evaluation if question["type"] == "practical_prompt" else None,
    )


def _attempt_summary(record: dict) -> AipotAttemptSummary:
    return AipotAttemptSummary(
        id=record["id"],
        exam_id=record["exam_id"],
        exam_title=record["exam_title"],
        submitted_at=datetime.fromisoformat(record["submitted_at"]),
        score=record["score"],
        answered_count=record["answered_count"],
    )


def _attempt_detail(record: dict) -> AipotAttemptDetail:
    return AipotAttemptDetail(
        **_attempt_summary(record).model_dump(),
        elapsed_seconds=record["elapsed_seconds"],
        reviews=[AipotQuestionReview(**review) for review in record["reviews"]],
        chapters=[AipotChapterResult(**chapter) for chapter in record["chapters"]],
    )


def submit(exam_id: str, request: AipotSubmissionRequest) -> AipotAttemptDetail:
    manifest = _load_manifest(exam_id)
    answers = {number: answer.strip() for number, answer in request.answers.items() if 1 <= number <= 40}
    reviews, chapters, score = _score(manifest, answers)
    record = {
        "id": str(uuid4()),
        "client_submission_id": request.client_submission_id,
        "exam_id": exam_id,
        "exam_title": manifest["title"],
        "submitted_at": datetime.now(UTC).isoformat(),
        "elapsed_seconds": request.elapsed_seconds,
        "score": score,
        "answered_count": sum(bool(value) for value in answers.values()),
        "reviews": reviews,
        "chapters": chapters,
    }
    return _attempt_detail(_repository().save_attempt(record))


def get_attempt(attempt_id: str) -> AipotAttemptDetail:
    if record := _repository().get_attempt(attempt_id):
        return _attempt_detail(record)
    raise AipotNotFoundError("The requested study attempt was not found.")


def get_evaluation_artifact(evaluation_id: str) -> tuple[bytes, str]:
    artifact = _repository().artifact(evaluation_id)
    if artifact is None:
        raise AipotNotFoundError("The requested generated evaluation artifact was not found.")
    return artifact


def history() -> AipotHistoryResponse:
    records = _repository().list_attempts()
    manifests = _all_manifests()
    summaries = {_summary(manifest).id: _summary(manifest) for manifest in manifests}
    by_exam: dict[str, list[dict]] = defaultdict(list)
    for record in records:
        by_exam[record["exam_id"]].append(record)
    exam_history = []
    for exam_id, summary in summaries.items():
        attempts = sorted(by_exam[exam_id], key=lambda row: row["submitted_at"], reverse=True)
        exam_history.append(
            AipotExamHistory(
                **summary.model_dump(),
                attempts=len(attempts),
                last_attempt=_attempt_summary(attempts[0]) if attempts else None,
            )
        )
    buckets: dict[str, dict] = defaultdict(lambda: {"earned": 0.0, "possible": 0.0, "topics": [], "attempts": set()})
    for record in records:
        for chapter in record["chapters"]:
            bucket = buckets[chapter["chapter"]]
            bucket["earned"] += chapter["earned"]
            bucket["possible"] += chapter["possible"]
            bucket["attempts"].add(record["id"])
            for topic in chapter["topics"]:
                if topic not in bucket["topics"]:
                    bucket["topics"].append(topic)
    weaknesses = []
    for code, values in buckets.items():
        percent = round(values["earned"] / values["possible"] * 100, 1)
        weaknesses.append(
            AipotWeakness(
                chapter=code,
                chapter_title=CHAPTERS[code],
                earned=round(values["earned"], 2),
                possible=round(values["possible"], 2),
                percent=percent,
                topics=values["topics"][:3],
                recommendation=_recommendation(percent),
                attempts=len(values["attempts"]),
            )
        )
    ordered_records = sorted(records, key=lambda row: row["submitted_at"], reverse=True)
    return AipotHistoryResponse(
        exams=exam_history,
        recent_attempts=[_attempt_summary(record) for record in ordered_records[:8]],
        weaknesses=sorted(weaknesses, key=lambda row: row.percent)[:3],
    )
