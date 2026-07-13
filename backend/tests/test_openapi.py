from app.main import app


def test_openapi_contains_required_contract_routes() -> None:
    document = app.openapi()
    paths = document["paths"]
    assert "/health/live" in paths
    assert "/health/ready" in paths
    assert "/api/v1/meta" in paths
    assert "/api/v1/samples" in paths
    assert "/api/v1/samples/{item_id}" in paths
    assert "/api/v1/samples/{item_id}/actions" in paths
    action_responses = paths["/api/v1/samples/{item_id}/actions"]["post"]["responses"]
    assert action_responses["422"]["content"]["application/json"]["schema"]["$ref"].endswith("/ErrorEnvelope")
    assert action_responses["500"]["content"]["application/json"]["schema"]["$ref"].endswith("/ErrorEnvelope")
