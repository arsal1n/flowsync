@'
from conftest import assert_ok, auth_headers


def test_home_endpoint(client):
    payload = assert_ok(client.get("/"))

    assert "message" in payload
    assert "FlowSync" in payload["message"]


def test_feature_catalog_has_30_features(client):
    payload = assert_ok(client.get("/api/features"))

    feature_count = (
        payload.get("feature_count")
        or payload.get("total_features")
        or len(payload.get("features", []))
    )

    assert feature_count >= 30


def test_health_endpoint(client):
    payload = assert_ok(client.get("/api/health"))

    assert payload.get("status") == "healthy"


def test_auth_status(client):
    payload = assert_ok(client.get("/api/auth/status"))

    assert "authentication_enabled" in payload or "status" in payload


def test_admin_login_and_me(client, admin_token):
    payload = assert_ok(
        client.get(
            "/api/auth/me",
            headers=auth_headers(admin_token),
        )
    )

    assert payload.get("authenticated") is True or payload.get("user") is not None


def test_admin_dashboard_requires_token(client):
    response = client.get("/api/admin/dashboard")

    assert response.status_code in {401, 403}


def test_admin_dashboard_with_admin_token(client, admin_token):
    payload = assert_ok(
        client.get(
            "/api/admin/dashboard",
            headers=auth_headers(admin_token),
        )
    )

    assert isinstance(payload, dict)
'@ | Set-Content backend\tests\test_01_system_auth.py -Encoding UTF8