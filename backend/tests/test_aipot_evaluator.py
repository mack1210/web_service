from dataclasses import replace
from pathlib import Path

import pytest

from app.core.config import settings
from app.core.errors import AipotEvaluationUnavailableError, AipotMediaConfirmationRequiredError
from app.features.aipot.evaluator import AipotPracticalEvaluator, ExecutionResult
from app.features.aipot.repository import AipotRepository


class FakeClient:
    def __init__(self) -> None:
        self.text_calls = 0
        self.image_calls = 0

    def text_execution(self, **_kwargs: object) -> ExecutionResult:
        self.text_calls += 1
        return ExecutionResult(kind="text", text="실제 생성 결과")

    def image_execution(self, **_kwargs: object) -> ExecutionResult:
        self.image_calls += 1
        return ExecutionResult(kind="image", artifact=b"png-bytes", media_type="image/png", cost_usd=0.01)

    def judge(self, *, rubric: list[dict], **_kwargs: object) -> list[dict]:
        return [
            {
                "criterion": item["criterion"], "possible": float(item["points"]),
                "earned": float(item["points"]), "met": True,
                "rationale": "요구 사항을 충족했습니다.", "evidence": "실제 결과에 포함되어 있습니다.",
            }
            for item in rubric
        ]


def question(kind: str = "text") -> dict:
    return {
        "number": 36,
        "prompt": "제공된 자료를 바탕으로 결과를 생성하는 프롬프트를 작성하세요.",
        "rubric": [{"criterion": "목표", "points": 1}, {"criterion": "출력", "points": 1}],
        "evaluation": {"kind": kind, "availability": "available"},
    }


def evaluator(tmp_path: Path, fake: FakeClient) -> AipotPracticalEvaluator:
    repository = AipotRepository(tmp_path / "aipot.sqlite3", tmp_path / "history.json")
    repository.initialize()
    return AipotPracticalEvaluator(
        replace(settings, aipot_database_file=tmp_path / "aipot.sqlite3"), repository,
        lambda _exam_id, _asset_name: tmp_path / "missing", client=fake,  # no assets in these fixtures
    )


def test_text_evaluation_is_evidence_backed_and_idempotent(tmp_path: Path):
    fake = FakeClient()
    subject = evaluator(tmp_path, fake)

    first = subject.evaluate(exam_id="generated-mock-01", question=question(), answer="표로 정리해줘", confirm_media=False)
    second = subject.evaluate(exam_id="generated-mock-01", question=question(), answer="표로 정리해줘", confirm_media=False)

    assert first == second
    assert fake.text_calls == 1
    assert first["artifact"]["text"] == "실제 생성 결과"
    assert first["criteria"][0]["earned"] == 1


def test_image_evaluation_requires_confirmation_and_persists_artifact(tmp_path: Path):
    fake = FakeClient()
    subject = evaluator(tmp_path, fake)

    with pytest.raises(AipotMediaConfirmationRequiredError):
        subject.evaluate(exam_id="generated-mock-01", question=question("image"), answer="이미지를 만들어줘", confirm_media=False)

    result = subject.evaluate(exam_id="generated-mock-01", question=question("image"), answer="이미지를 만들어줘", confirm_media=True)

    assert fake.image_calls == 1
    assert result["artifact"]["asset_url"].endswith("/artifact")
    artifact = subject.repository.artifact(result["id"])
    assert artifact == (b"png-bytes", "image/png")


def test_unavailable_practical_source_fails_without_reservation(tmp_path: Path):
    fake = FakeClient()
    subject = evaluator(tmp_path, fake)
    blocked = question()
    blocked["evaluation"] = {"kind": "unavailable", "availability": "unavailable"}

    with pytest.raises(AipotEvaluationUnavailableError):
        subject.evaluate(exam_id="source-round-01", question=blocked, answer="답안", confirm_media=False)

    assert subject.repository.list_attempts() == []
