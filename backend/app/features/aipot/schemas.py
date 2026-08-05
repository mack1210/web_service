from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

QuestionType = Literal["multiple_choice", "multiple_select", "choice_bank", "short_answer", "practical_prompt"]
ExamKind = Literal["source", "generated", "public"]
EvaluationKind = Literal["text", "image", "code", "unavailable"]


class AipotExamSummary(BaseModel):
    id: str
    title: str
    kind: ExamKind
    question_count: int = Field(ge=1)
    image_first: bool


class AipotQuestion(BaseModel):
    number: int = Field(ge=1, le=40)
    type: QuestionType
    chapter: str
    topic: str
    prompt: str
    points: int = Field(ge=1, le=5)
    choices: list[str] = Field(default_factory=list)
    choice_ids: list[str] = Field(default_factory=list)
    multiple_selection: bool = False
    single_concept_explanation: bool = False
    ocr_text: str | None = None
    visual_assets: list["AipotVisualAsset"] = Field(default_factory=list)
    source_page: int | None = None
    asset_url: str | None = None
    evaluation_kind: EvaluationKind | None = None
    evaluation_available: bool = True


class AipotChoiceFeedback(BaseModel):
    id: str
    text: str
    definition: str
    purpose: str
    reason: str
    similarities: str
    differences: str
    correct: bool


class AipotImmediateFeedbackRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    answer: str = Field(max_length=20_000)
    confirm_media: bool = False


class AipotEvaluationCriterion(BaseModel):
    criterion: str
    possible: float = Field(ge=0)
    earned: float = Field(ge=0)
    met: bool
    rationale: str
    evidence: str


class AipotEvaluationArtifact(BaseModel):
    kind: EvaluationKind
    media_type: str | None = None
    asset_url: str | None = None
    text: str | None = None
    stdout: str | None = None
    stderr: str | None = None
    exit_code: int | None = None


class AipotContextAlignment(BaseModel):
    aligned: bool
    rationale: str
    evidence: str


class AipotEvaluationEvidence(BaseModel):
    id: str
    kind: EvaluationKind
    submitted_prompt: str
    input_summary: str
    executor_model: str
    judge_model: str
    criteria: list[AipotEvaluationCriterion]
    artifact: AipotEvaluationArtifact
    reference_solution: str | None = None
    context_alignment: AipotContextAlignment | None = None
    cost_usd: float | None = Field(default=None, ge=0)


class AipotImmediateFeedback(BaseModel):
    number: int = Field(ge=1, le=40)
    earned: float = Field(ge=0)
    possible: float = Field(gt=0)
    correct: bool
    correct_answer: str | None = None
    explanation: str | None = None
    missing: list[str] = Field(default_factory=list)
    choice_feedback: list[AipotChoiceFeedback] = Field(default_factory=list)
    evaluation: AipotEvaluationEvidence | None = None


class AipotVisualAsset(BaseModel):
    marker: str = Field(min_length=1)
    asset_url: str
    alt: str = Field(min_length=1)
    keep_marker_text: bool = False
    replace_following_block: bool = False


class AipotExamDetail(AipotExamSummary):
    questions: list[AipotQuestion]
    known_limitations: list[str] = Field(default_factory=list)


class AipotSubmissionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    client_submission_id: str = Field(min_length=8, max_length=128)
    elapsed_seconds: int = Field(ge=0, le=86_400)
    answers: dict[int, str] = Field(default_factory=dict)


class AipotQuestionReview(BaseModel):
    number: int
    chapter: str
    topic: str
    submitted_answer: str = ""
    correct_answer: str | None = None
    explanation: str | None = None
    score: float = Field(ge=0)
    possible_score: float = Field(gt=0)
    result: str
    missing: list[str] = Field(default_factory=list)
    evaluation: AipotEvaluationEvidence | None = None


class AipotChapterResult(BaseModel):
    chapter: str
    chapter_title: str
    earned: float = Field(ge=0)
    possible: float = Field(gt=0)
    percent: float = Field(ge=0, le=100)
    topics: list[str] = Field(default_factory=list)
    recommendation: str


class AipotAttemptSummary(BaseModel):
    id: str
    exam_id: str
    exam_title: str
    submitted_at: datetime
    score: float = Field(ge=0, le=100)
    answered_count: int = Field(ge=0, le=40)


class AipotAttemptDetail(AipotAttemptSummary):
    elapsed_seconds: int = Field(ge=0)
    reviews: list[AipotQuestionReview]
    chapters: list[AipotChapterResult]


class AipotExamHistory(AipotExamSummary):
    attempts: int = Field(ge=0)
    last_attempt: AipotAttemptSummary | None = None


class AipotWeakness(AipotChapterResult):
    attempts: int = Field(ge=1)


class AipotHistoryResponse(BaseModel):
    exams: list[AipotExamHistory]
    recent_attempts: list[AipotAttemptSummary]
    weaknesses: list[AipotWeakness]
