from typing import Annotated, Literal

from fastapi import APIRouter, Path, Query

from app.features.samples import service
from app.features.samples.schemas import (
    ActionRequest,
    ActionResponse,
    ErrorEnvelope,
    HealthMeta,
    SampleDetail,
    SampleListResponse,
)

router = APIRouter(prefix="/api/v1", tags=["samples"])

ERROR_RESPONSES = {
    404: {"model": ErrorEnvelope, "description": "A requested sample was not found."},
    422: {"model": ErrorEnvelope, "description": "One or more request values are invalid."},
    503: {"model": ErrorEnvelope, "description": "A transient dependency is unavailable."},
    500: {"model": ErrorEnvelope, "description": "An unexpected server error occurred."},
}


@router.get("/meta", response_model=HealthMeta, summary="Application metadata")
def meta() -> HealthMeta:
    from datetime import UTC, datetime

    from app.core.config import settings

    return HealthMeta(
        app_name=settings.app_name,
        version=settings.version,
        generated_at=datetime.now(UTC),
        features=["typed-contract", "mock-compatible", "representative-action"],
    )


@router.get("/samples", response_model=SampleListResponse, responses=ERROR_RESPONSES)
def samples(
    q: Annotated[str | None, Query(max_length=100)] = None,
    status: Annotated[
        Literal["ready", "processing", "attention", "archived"] | None, Query()
    ] = None,
    sort: Annotated[Literal["updated", "score", "title"], Query()] = "updated",
) -> SampleListResponse:
    return service.list_samples(query=q, status=status, sort=sort)


@router.get("/samples/{item_id}", response_model=SampleDetail, responses=ERROR_RESPONSES)
def sample_detail(
    item_id: Annotated[str, Path(min_length=1, max_length=120)],
) -> SampleDetail:
    return service.get_sample(item_id)


@router.post("/samples/{item_id}/actions", response_model=ActionResponse, responses=ERROR_RESPONSES)
def sample_action(
    item_id: Annotated[str, Path(min_length=1, max_length=120)],
    request: ActionRequest,
) -> ActionResponse:
    return service.run_action(item_id, request)
