from datetime import UTC, datetime

from fastapi import APIRouter

from app.features.health.schemas import HealthResponse

router = APIRouter(tags=["health"])


def _health(service: str) -> HealthResponse:
    return HealthResponse(status="ok", service=service, timestamp=datetime.now(UTC))


@router.get("/health/live", response_model=HealthResponse, summary="Liveness probe")
def live() -> HealthResponse:
    return _health("api")


@router.get("/health/ready", response_model=HealthResponse, summary="Readiness probe")
def ready() -> HealthResponse:
    return _health("api")
