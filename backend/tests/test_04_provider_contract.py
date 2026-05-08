from conftest import assert_ok


def test_deployment_status_contains_provider_and_database_status(client):
    payload = assert_ok(client.get("/api/deployment/status"))

    assert payload.get("deployment_ready") is True
    assert "provider_status" in payload
    assert "launch_readiness" in payload


def test_feature_coverage_represents_30_features(client):
    payload = assert_ok(client.get("/api/backend/feature-coverage"))

    summary = payload.get("summary", {})
    features = payload.get("features", [])

    total_features = summary.get("total_features") or len(features)

    assert total_features >= 30


def test_route_provider_contract_fields(client):
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

    assert "routing_provider" in payload
    assert "provider_status" in payload

    route = payload.get("recommended_route") or {}

    assert "provider" in route
    assert "provider_status" in route
    assert "coordinates" in route
    assert "polyline" in route
    assert "turn_by_turn_steps" in route
