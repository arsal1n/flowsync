from conftest import assert_ok, auth_headers


def test_realtime_stream_status(client):
    payload = assert_ok(client.get("/api/stream/status"))

    assert payload.get("realtime_streaming_enabled") is True
    assert payload.get("transport") == "server_sent_events"
    assert "streams" in payload


def test_system_stream_one_event(client):
    with client.stream(
        "GET",
        "/api/stream/system?interval_seconds=1&max_events=1",
    ) as response:
        assert response.status_code == 200
        body = response.read().decode("utf-8")

    assert "event: system" in body
    assert "data:" in body


def test_dashboard_stream_one_event(client):
    with client.stream(
        "GET",
        "/api/stream/dashboard?interval_seconds=1&max_events=1",
    ) as response:
        assert response.status_code == 200
        body = response.read().decode("utf-8")

    assert "event: dashboard" in body
    assert "data:" in body


def test_admin_stream_requires_auth(client):
    response = client.get("/api/stream/admin?max_events=1")

    assert response.status_code in {401, 403}


def test_admin_stream_with_admin_token(client, admin_token):
    with client.stream(
        "GET",
        "/api/stream/admin?interval_seconds=1&max_events=1",
        headers=auth_headers(admin_token),
    ) as response:
        assert response.status_code == 200
        body = response.read().decode("utf-8")

    assert "event: admin" in body
    assert "data:" in body