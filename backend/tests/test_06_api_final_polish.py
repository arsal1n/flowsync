from conftest import assert_ok


def test_api_meta(client):
    payload = assert_ok(client.get("/api/meta"))

    assert payload.get("service") == "FlowSync Smart Mobility Backend"
    assert payload.get("version") is not None


def test_client_bootstrap(client):
    payload = assert_ok(client.get("/api/client/bootstrap"))

    assert payload.get("backend") is not None
    assert payload.get("auth") is not None
    assert payload.get("routing") is not None
    assert payload.get("endpoint_groups") is not None


def test_client_endpoints(client):
    payload = assert_ok(client.get("/api/client/endpoints"))

    groups = payload.get("endpoint_groups", {})

    assert "frontend" in groups
    assert "mobile" in groups
    assert "admin" in groups
    assert "emergency" in groups


def test_client_error_format(client):
    payload = assert_ok(client.get("/api/client/error-format"))

    assert "success_example" in payload
    assert "error_example" in payload


def test_client_integration_status(client):
    payload = assert_ok(client.get("/api/client/integration-status"))

    assert payload.get("backend_complete_v1") is True
    assert payload.get("ready_for_frontend_integration") is True
    assert payload.get("ready_for_mobile_integration") is True
    assert payload.get("ready_for_maps_integration") is True


def test_route_contract(client):
    payload = assert_ok(client.get("/api/client/route-contract"))

    assert "request" in payload
    assert "required_response_fields" in payload
    assert "recommended_route.coordinates" in payload["required_response_fields"]
