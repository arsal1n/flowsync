from conftest import assert_ok, auth_headers


def test_live_public_endpoints(client):
    endpoints = [
        "/api/live/system",
        "/api/live/dashboard",
        "/api/live/navigation",
        "/api/live/feed",
    ]

    for endpoint in endpoints:
        payload = assert_ok(client.get(endpoint))
        assert isinstance(payload, dict)


def test_live_heartbeat(client):
    payload = assert_ok(
        client.post(
            "/api/live/heartbeat",
            json={
                "client_id": "pytest-client",
            },
        )
    )

    assert payload.get("live") is True
    assert payload.get("client_id") == "pytest-client"


def test_live_admin_requires_auth(client):
    response = client.get("/api/live/admin")

    assert response.status_code in {401, 403}


def test_live_admin_with_admin_token(client, admin_token):
    payload = assert_ok(
        client.get(
            "/api/live/admin",
            headers=auth_headers(admin_token),
        )
    )

    assert isinstance(payload, dict)


def test_background_jobs_require_auth(client):
    response = client.get("/api/jobs/status")

    assert response.status_code in {401, 403}


def test_background_jobs_with_admin_token(client, admin_token):
    status_payload = assert_ok(
        client.get(
            "/api/jobs/status",
            headers=auth_headers(admin_token),
        )
    )

    assert status_payload.get("background_jobs_enabled") is True

    run_payload = assert_ok(
        client.post(
            "/api/jobs/run/cleanup_stale_navigation",
            headers=auth_headers(admin_token),
        )
    )

    assert run_payload.get("found") is True

    history_payload = assert_ok(
        client.get(
            "/api/jobs/history",
            headers=auth_headers(admin_token),
        )
    )

    assert "history" in history_payload


def test_database_public_endpoints(client):
    endpoints = [
        "/api/database/status",
        "/api/database/tables",
        "/api/database/readiness",
    ]

    for endpoint in endpoints:
        payload = assert_ok(client.get(endpoint))
        assert isinstance(payload, dict)


def test_database_admin_indexes(client, admin_token):
    payload = assert_ok(
        client.post(
            "/api/database/admin/apply-indexes",
            headers=auth_headers(admin_token),
        )
    )

    assert "created_or_verified" in payload
    assert "skipped" in payload
