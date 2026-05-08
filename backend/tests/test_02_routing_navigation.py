from conftest import assert_ok, extract_request_id


def test_location_search(client):
    payload = assert_ok(client.get("/api/locations/search?q=dubai"))

    assert "results" in payload
    assert isinstance(payload["results"], list)
    assert payload.get("provider") is not None
    assert payload.get("provider_status") is not None


def test_route_recommendation_navigation_ready(client):
    payload = assert_ok(
        client.post(
            "/api/routes/recommend",
            json={
                "start_location": "Dubai Mall",
                "destination": "Dubai Marina",
                "vehicle_type": "car",
                "route_preference": "balanced",
                "user_role": "driver",
            },
        )
    )

    assert payload.get("routing_provider") is not None
    assert payload.get("provider_status") is not None

    recommended_route = payload.get("recommended_route")

    assert recommended_route is not None
    assert recommended_route.get("coordinates")
    assert recommended_route.get("polyline")
    assert recommended_route.get("turn_by_turn_steps")
    assert recommended_route.get("route_name")


def test_navigation_lifecycle(client):
    route_payload = assert_ok(
        client.post(
            "/api/routes/recommend",
            json={
                "start_location": "Dubai Mall",
                "destination": "Dubai Marina",
                "vehicle_type": "car",
                "route_preference": "balanced",
                "user_role": "driver",
            },
        )
    )

    request_id = extract_request_id(route_payload)

    start_body = {
        "start_location": "Dubai Mall",
        "destination": "Dubai Marina",
        "vehicle_type": "car",
        "route_preference": "balanced",
        "user_role": "driver",
        "user_id": "pytest-driver",
    }

    if request_id is not None:
        start_body["request_id"] = request_id

    start_payload = assert_ok(
        client.post(
            "/api/trips/start",
            json=start_body,
        )
    )

    session = start_payload.get("session") or {}
    session_id = session.get("session_id")

    assert session_id

    detail_payload = assert_ok(client.get(f"/api/trips/session/{session_id}"))
    assert detail_payload.get("found") is True or detail_payload.get("session") is not None

    progress_payload = assert_ok(
        client.post(
            "/api/trips/progress",
            json={
                "session_id": session_id,
                "current_step_index": 1,
            },
        )
    )

    assert isinstance(progress_payload, dict)

    live_payload = assert_ok(client.get(f"/api/live/navigation/{session_id}"))
    assert live_payload.get("found") is True

    end_payload = assert_ok(
        client.post(
            "/api/trips/end",
            json={
                "session_id": session_id,
                "status": "completed",
            },
        )
    )

    assert isinstance(end_payload, dict)

    if request_id is not None:
        summary_payload = assert_ok(client.get(f"/api/trips/{request_id}/summary"))
        assert isinstance(summary_payload, dict)
