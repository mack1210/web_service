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
        self.assessment_calls: list[dict] = []
        self.judge_calls: list[dict] = []
        self.aligned = True

    def assess_context(self, **kwargs: object) -> dict:
        self.assessment_calls.append(kwargs)
        return {
            "aligned": self.aligned,
            "rationale": "문항의 냉방병 팁 범위를 따르지 않았습니다." if not self.aligned else "문항의 입력과 목표가 일치합니다.",
            "evidence": "거실 이미지 생성은 냉방병 팁 3개 요청과 무관합니다." if not self.aligned else "요구된 자료와 형식을 사용합니다.",
        }

    def text_execution(self, **_kwargs: object) -> ExecutionResult:
        self.text_calls += 1
        return ExecutionResult(kind="text", text="실제 생성 결과")

    def image_execution(self, **_kwargs: object) -> ExecutionResult:
        self.image_calls += 1
        return ExecutionResult(kind="image", artifact=b"png-bytes", media_type="image/png", cost_usd=0.01)

    def judge(self, *, rubric: list[dict], **kwargs: object) -> list[dict]:
        self.judge_calls.append(kwargs)
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
    assert fake.assessment_calls[0]["context_markdown"] == question()["prompt"]


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


def test_irrelevant_practical_prompt_scores_zero_without_execution(tmp_path: Path):
    fake = FakeClient()
    fake.aligned = False
    subject = evaluator(tmp_path, fake)
    public_a_q36 = question()
    public_a_q36["prompt"] = "범위 한정 기법으로 냉방병 예방 팁 3개만 출력하는 프롬프트를 작성하세요."
    public_a_q36["evaluation"]["context_markdown"] = (
        "## 요구\n냉방병 예방 팁 중 `적절한 온도 조절`, `규칙적인 환기`, `적절한 복장`만 간단히 출력하게 하세요."
    )
    public_a_q36["evaluation"]["provider_solution"] = "세 가지 지정 팁만 간결히 제시하도록 범위를 한정한다."
    public_a_q36["evaluation"]["reference_source"] = "기본서 구매인증자료 p.58"

    result = subject.evaluate(
        exam_id="public-set-a", question=public_a_q36,
        answer="역할: 이미지 생성 AI; 목표: 북유럽풍 거실을 16:9로 생성", confirm_media=False,
    )

    assert fake.text_calls == 0
    assert fake.image_calls == 0
    assert all(item["earned"] == 0 and not item["met"] for item in result["criteria"])
    assert result["reference_solution"] == "세 가지 지정 팁만 간결히 제시하도록 범위를 한정한다."
    assert result["reference_source"] == "기본서 구매인증자료 p.58"
    assert result["context_alignment"]["aligned"] is False


def test_context_and_reference_are_given_to_execution_and_judge(tmp_path: Path):
    fake = FakeClient()
    subject = evaluator(tmp_path, fake)
    contextual = question()
    contextual["evaluation"].update({
        "context_markdown": "## 입력 자료\n제공된 수박·포도·사과·복숭아 수치를 소수 둘째 자리로 변환합니다.",
        "provider_solution": "각 값은 천 단위로 나누어 소수 둘째 자리로 표시한다.",
    })

    subject.evaluate(exam_id="public-set-a", question=contextual, answer="자료를 소수 둘째 자리로 표기해줘", confirm_media=False)

    assert fake.judge_calls[0]["context_markdown"].startswith(contextual["prompt"])
    assert fake.judge_calls[0]["provider_solution"] == contextual["evaluation"]["provider_solution"]
