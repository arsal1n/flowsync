from conftest import assert_ok, auth_headers


def test_home_endpoint(client):
    payload = assert_ok(client.get("/"))

    assert "message" in payload


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

    assert isinstance(payload, dict)


def test_admin_login_and_me(client, admin_token):
    payload = assert_ok(
        client.get(
            "/api/auth/me",
            headers=auth_headers(admin_token),
        )
    )

    assert isinstance(payload, dict)


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
