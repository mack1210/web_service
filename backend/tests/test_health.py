from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_liveness_and_readiness_have_request_ids() -> None:
    for path in ("/health/live", "/health/ready"):
        response = client.get(path)
        assert response.status_code == 200
        assert response.json()["status"] == "ok"
        assert response.headers["X-Request-ID"]


def test_invalid_external_request_id_is_replaced() -> None:
    response = client.get("/health/live", headers={"X-Request-ID": "invalid request id"})
    assert response.status_code == 200
    assert response.headers["X-Request-ID"] != "invalid request id"
    assert len(response.headers["X-Request-ID"]) == 36
