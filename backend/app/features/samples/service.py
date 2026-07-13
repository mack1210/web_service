from datetime import UTC, datetime

from app.core.config import settings
from app.core.errors import DependencyUnavailableError, NotFoundError
from app.features.samples.schemas import (
    ActionRequest,
    ActionResponse,
    SampleDetail,
    SampleListResponse,
    SampleMetrics,
    SampleSummary,
)

_NOW = datetime(2026, 7, 10, 12, 0, tzinfo=UTC)

_LONG_CODE = '''from collections.abc import Iterable


def normalize_scores(values: Iterable[float]) -> dict[str, float]:
    """A deliberately readable sample for the code viewer."""
    materialized = [value for value in values if value >= 0]
    total = sum(materialized)
    if not materialized or total == 0:
        return {"count": 0, "normalized_total": 0.0}
    return {
        "count": len(materialized),
        "normalized_total": round(sum(value / total for value in materialized), 8),
    }
'''

_DETAILS: tuple[SampleDetail, ...] = (
    SampleDetail(
        id="customer-retention-kor-long-title",
        title="장기 고객 유지율 예측: 서울·부산·제주 세그먼트를 아우르는 매우 긴 한글 제목과 English identifier",
        subtitle="retention_forecast_v2026_07_experimental",
        status="ready",
        tags=["korean", "forecast", "priority", "production", "long-tag-example"],
        updated_at=_NOW,
        owner="Data Reliability Team",
        score=98.7345,
        description="최근 실행의 품질 지표와 입력 계약을 확인한 뒤 대표 검증 작업을 실행할 수 있는 샘플입니다.",
        code=_LONG_CODE,
        traceback=None,
        metrics=SampleMetrics(executions=1842, success_rate=0.992, median_duration_ms=642),
        attributes={
            "region": "서울 / Busan / 제주 🌊",
            "source": "warehouse.daily_retention",
            "threshold": 0.975,
            "optional_image": None,
        },
    ),
    SampleDetail(
        id="inventory-reconciliation",
        title="Inventory reconciliation with null image and a very long English operational note",
        subtitle=None,
        status="attention",
        tags=["inventory", "null", "review"],
        updated_at=datetime(2026, 7, 9, 8, 30, tzinfo=UTC),
        owner="Operations",
        score=72.1,
        description="One optional source is missing. Available data remains useful and can still be inspected.",
        code="result = reconcile(source_a, source_b, tolerance=0.000000000000001)\n",
        traceback="Traceback (most recent call last):\n  File 'worker.py', line 42, in reconcile\nTimeoutError: optional image metadata source did not respond",
        metrics=SampleMetrics(executions=329, success_rate=0.88, median_duration_ms=2280),
        attributes={
            "region": "Global",
            "source": "erp.sync",
            "threshold": 1e-15,
            "optional_image": None,
        },
    ),
    SampleDetail(
        id="pipeline-drift-monitor",
        title="Pipeline drift monitor",
        subtitle="feature_store.alpha",
        status="processing",
        tags=["ml", "drift", "nightly"],
        updated_at=datetime(2026, 7, 8, 18, 45, tzinfo=UTC),
        owner="ML Platform",
        score=89.0,
        description="A representative item with a currently processing status.",
        code="def compare(reference, candidate):\n    return candidate.mean() - reference.mean()\n",
        traceback=None,
        metrics=SampleMetrics(executions=733, success_rate=0.954, median_duration_ms=911),
        attributes={
            "region": "APAC",
            "source": "feature_store",
            "threshold": 0.02,
            "optional_image": None,
        },
    ),
    SampleDetail(
        id="archived-policy-check",
        title="Archived policy compliance check",
        subtitle="legacy-policy-2019",
        status="archived",
        tags=["archive", "policy"],
        updated_at=datetime(2025, 12, 1, 0, 0, tzinfo=UTC),
        owner="Governance",
        score=61.23,
        description="An archived item remains visible to prove filtering and low-priority content handling.",
        code="assert policy.version == '2019.12'\n",
        traceback=None,
        metrics=SampleMetrics(executions=48, success_rate=0.75, median_duration_ms=324),
        attributes={
            "region": "EU",
            "source": "policy_archive",
            "threshold": 0.8,
            "optional_image": None,
        },
    ),
)


def _summary(item: SampleDetail) -> SampleSummary:
    return SampleSummary(
        id=item.id,
        title=item.title,
        subtitle=item.subtitle,
        status=item.status,
        tags=item.tags,
        updated_at=item.updated_at,
        owner=item.owner,
        score=item.score,
        missing_fields=["optional_image"] if item.id == "inventory-reconciliation" else [],
    )


def list_samples(
    query: str | None = None,
    status: str | None = None,
    sort: str = "updated",
) -> SampleListResponse:
    normalized_query = query.strip() if query else None
    if normalized_query == "__error__" and settings.app_env != "production":
        raise DependencyUnavailableError()

    filtered = list(_DETAILS)
    if normalized_query:
        needle = normalized_query.casefold()
        filtered = [
            item
            for item in filtered
            if needle in item.title.casefold()
            or needle in (item.subtitle or "").casefold()
            or any(needle in tag.casefold() for tag in item.tags)
        ]
    if status:
        filtered = [item for item in filtered if item.status == status]

    if sort == "score":
        filtered.sort(key=lambda item: item.score, reverse=True)
    elif sort == "title":
        filtered.sort(key=lambda item: item.title.casefold())
    else:
        filtered.sort(key=lambda item: item.updated_at, reverse=True)

    return SampleListResponse(
        items=[_summary(item) for item in filtered],
        total=len(filtered),
        partial=any(item.id == "inventory-reconciliation" for item in filtered),
        missing_sources=["optional image metadata"]
        if any(item.id == "inventory-reconciliation" for item in filtered)
        else [],
    )


def get_sample(item_id: str) -> SampleDetail:
    for item in _DETAILS:
        if item.id == item_id:
            return item
    raise NotFoundError()


def run_action(item_id: str, request: ActionRequest) -> ActionResponse:
    get_sample(item_id)
    if request.force_failure:
        return ActionResponse(
            item_id=item_id,
            action=request.action,
            status="failed",
            message="The representative action failed safely. You can retry without losing context.",
            result={"reason": "forced_failure", "attempt": 1},
            completed_at=datetime.now(UTC),
        )
    return ActionResponse(
        item_id=item_id,
        action=request.action,
        status="succeeded",
        message="Validation completed and the input contract is healthy.",
        result={"validated_records": 1248, "confidence": 0.992, "duration_ms": 642},
        completed_at=datetime.now(UTC),
    )
