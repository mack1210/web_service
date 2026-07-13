from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_list_filters_and_sorts_samples() -> None:
    response = client.get("/api/v1/samples", params={"q": "inventory", "sort": "title"})
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["id"] == "inventory-reconciliation"
    assert body["partial"] is True


def test_list_normalizes_whitespace_like_the_mock_adapter() -> None:
    response = client.get("/api/v1/samples", params={"q": "  inventory  "})
    assert response.status_code == 200
    assert response.json()["items"][0]["id"] == "inventory-reconciliation"


def test_missing_sample_uses_safe_error_contract() -> None:
    response = client.get("/api/v1/samples/missing")
    assert response.status_code == 404
    body = response.json()
    assert body["code"] == "sample_not_found"
    assert "traceback" not in response.text.lower()
    assert body["request_id"]


def test_action_success_and_safe_failure_are_explicit() -> None:
    success = client.post(
        "/api/v1/samples/pipeline-drift-monitor/actions",
        json={"action": "validate"},
    )
    assert success.status_code == 200
    assert success.json()["status"] == "succeeded"

    failure = client.post(
        "/api/v1/samples/pipeline-drift-monitor/actions",
        json={"action": "simulate", "force_failure": True},
    )
    assert failure.status_code == 200
    assert failure.json()["status"] == "failed"


def test_action_rejects_unknown_fields_with_the_shared_error_envelope() -> None:
    response = client.post(
        "/api/v1/samples/pipeline-drift-monitor/actions",
        json={"action": "validate", "unexpected": True},
    )
    assert response.status_code == 422
    body = response.json()
    assert body["code"] == "validation_error"
    assert body["fields"]


def test_upstream_error_contract_is_retryable() -> None:
    response = client.get("/api/v1/samples", params={"q": "__error__"})
    assert response.status_code == 503
    assert response.json()["retryable"] is True
