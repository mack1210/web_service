import type { SampleDetail } from "@/lib/api/types";

const now = "2026-07-10T12:00:00Z";

export const sampleDetails: SampleDetail[] = [
  {
    id: "customer-retention-kor-long-title",
    title:
      "장기 고객 유지율 예측: 서울·부산·제주 세그먼트를 아우르는 매우 긴 한글 제목과 English identifier",
    subtitle: "retention_forecast_v2026_07_experimental",
    status: "ready",
    tags: ["korean", "forecast", "priority", "production", "long-tag-example"],
    updated_at: now,
    owner: "Data Reliability Team",
    score: 98.7345,
    missing_fields: [],
    description:
      "최근 실행의 품질 지표와 입력 계약을 확인한 뒤 대표 검증 작업을 실행할 수 있는 샘플입니다. 긴 한글, English identifiers, 숫자와 이모지를 한 화면에서 검증합니다. ✨",
    code: `from collections.abc import Iterable


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
`,
    traceback: null,
    metrics: { executions: 1842, success_rate: 0.992, median_duration_ms: 642 },
    attributes: {
      region: "서울 / Busan / 제주 🌊",
      source: "warehouse.daily_retention",
      threshold: 0.975,
      optional_image: null,
    },
  },
  {
    id: "inventory-reconciliation",
    title: "Inventory reconciliation with null image and a very long English operational note",
    subtitle: null,
    status: "attention",
    tags: ["inventory", "null", "review"],
    updated_at: "2026-07-09T08:30:00Z",
    owner: "Operations",
    score: 72.1,
    missing_fields: ["optional_image"],
    description: "One optional source is missing. Available data remains useful and can still be inspected.",
    code: "result = reconcile(source_a, source_b, tolerance=0.000000000000001)\n",
    traceback:
      "Traceback (most recent call last):\n  File 'worker.py', line 42, in reconcile\nTimeoutError: optional image metadata source did not respond",
    metrics: { executions: 329, success_rate: 0.88, median_duration_ms: 2280 },
    attributes: { region: "Global", source: "erp.sync", threshold: 1e-15, optional_image: null },
  },
  {
    id: "pipeline-drift-monitor",
    title: "Pipeline drift monitor",
    subtitle: "feature_store.alpha",
    status: "processing",
    tags: ["ml", "drift", "nightly"],
    updated_at: "2026-07-08T18:45:00Z",
    owner: "ML Platform",
    score: 89,
    missing_fields: [],
    description: "A representative item with a currently processing status.",
    code: "def compare(reference, candidate):\n    return candidate.mean() - reference.mean()\n",
    traceback: null,
    metrics: { executions: 733, success_rate: 0.954, median_duration_ms: 911 },
    attributes: { region: "APAC", source: "feature_store", threshold: 0.02, optional_image: null },
  },
  {
    id: "archived-policy-check",
    title: "Archived policy compliance check",
    subtitle: "legacy-policy-2019",
    status: "archived",
    tags: ["archive", "policy"],
    updated_at: "2025-12-01T00:00:00Z",
    owner: "Governance",
    score: 61.23,
    missing_fields: [],
    description: "An archived item remains visible to prove filtering and low-priority content handling.",
    code: "assert policy.version == '2019.12'\n",
    traceback: null,
    metrics: { executions: 48, success_rate: 0.75, median_duration_ms: 324 },
    attributes: { region: "EU", source: "policy_archive", threshold: 0.8, optional_image: null },
  },
];
