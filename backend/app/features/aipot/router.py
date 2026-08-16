from typing import Annotated

from fastapi import APIRouter, Path
from fastapi.responses import FileResponse, Response

from app.features.aipot import service
from app.features.aipot.schemas import (
    AipotAttemptDetail,
    AipotExamDetail,
    AipotExamSummary,
    AipotHistoryResponse,
    AipotImmediateFeedback,
    AipotImmediateFeedbackRequest,
    AipotSubmissionRequest,
)
from app.features.samples.schemas import ErrorEnvelope

router = APIRouter(prefix="/api/v1/aipot", tags=["AI-POT study"])
ERROR_RESPONSES = {
    404: {"model": ErrorEnvelope},
    409: {"model": ErrorEnvelope},
    422: {"model": ErrorEnvelope},
    500: {"model": ErrorEnvelope},
    503: {"model": ErrorEnvelope},
}


@router.get("/exams", response_model=list[AipotExamSummary], responses=ERROR_RESPONSES)
def exams() -> list[AipotExamSummary]:
    return service.list_exams()


@router.get("/history", response_model=AipotHistoryResponse, responses=ERROR_RESPONSES)
def study_history() -> AipotHistoryResponse:
    return service.history()


@router.get("/attempts/{attempt_id}", response_model=AipotAttemptDetail, responses=ERROR_RESPONSES)
def attempt(attempt_id: Annotated[str, Path(min_length=1, max_length=128)]) -> AipotAttemptDetail:
    return service.get_attempt(attempt_id)


@router.get("/exams/{exam_id}", response_model=AipotExamDetail, responses=ERROR_RESPONSES)
def exam(exam_id: Annotated[str, Path(min_length=1, max_length=64)]) -> AipotExamDetail:
    return service.get_exam(exam_id)


@router.post("/exams/{exam_id}/questions/{number}/feedback", response_model=AipotImmediateFeedback, responses=ERROR_RESPONSES)
def answer_feedback(
    exam_id: Annotated[str, Path(min_length=1, max_length=64)],
    number: Annotated[int, Path(ge=1, le=100)],
    request: AipotImmediateFeedbackRequest,
) -> AipotImmediateFeedback:
    return service.immediate_feedback(exam_id, number, request.answer, request.confirm_media)


@router.get("/evaluations/{evaluation_id}/artifact", responses=ERROR_RESPONSES)
def evaluation_artifact(
    evaluation_id: Annotated[str, Path(min_length=1, max_length=128)],
) -> Response:
    content, media_type = service.get_evaluation_artifact(evaluation_id)
    return Response(content=content, media_type=media_type, headers={"Cache-Control": "private, no-store"})


@router.get("/exams/{exam_id}/assets/{asset_name}", responses=ERROR_RESPONSES)
def asset(
    exam_id: Annotated[str, Path(min_length=1, max_length=64)],
    asset_name: Annotated[str, Path(min_length=1, max_length=128)],
) -> FileResponse:
    return FileResponse(service.get_asset_path(exam_id, asset_name))


@router.post("/exams/{exam_id}/submissions", response_model=AipotAttemptDetail, responses=ERROR_RESPONSES)
def submit(
    exam_id: Annotated[str, Path(min_length=1, max_length=64)], request: AipotSubmissionRequest
) -> AipotAttemptDetail:
    return service.submit(exam_id, request)
