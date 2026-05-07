import json
import sys
import urllib.error
import urllib.request
from typing import Any, Dict, Optional


BASE_URL = "http://127.0.0.1:8000"


class SmokeTestError(Exception):
    pass


def request_json(
    method: str,
    path: str,
    body: Optional[Dict[str, Any]] = None,
    token: Optional[str] = None,
    expected_status: int = 200,
) -> Dict[str, Any]:
    url = f"{BASE_URL}{path}"
    data = None

    headers = {
        "Accept": "application/json",
    }

    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"

    if token:
        headers["Authorization"] = f"Bearer {token}"

    request = urllib.request.Request(
        url=url,
        data=data,
        headers=headers,
        method=method.upper(),
    )

    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            status = response.status
            response_body = response.read().decode("utf-8")

            if status != expected_status:
                raise SmokeTestError(
                    f"{method} {path} expected {expected_status}, got {status}: {response_body}"
                )

            if not response_body:
                return {}

            return json.loads(response_body)

    except urllib.error.HTTPError as error:
        response_body = error.read().decode("utf-8")

        if error.code == expected_status:
            try:
                return json.loads(response_body)
            except json.JSONDecodeError:
                return {
                    "raw": response_body,
                }

        raise SmokeTestError(
            f"{method} {path} expected {expected_status}, got {error.code}: {response_body}"
        )

    except urllib.error.URLError as error:
        raise SmokeTestError(
            f"Could not connect to backend at {BASE_URL}. Make sure uvicorn is running. Error: {error}"
        )


def assert_key(payload: Dict[str, Any], key: str, label: str):
    if key not in payload:
        raise SmokeTestError(f"{label} missing key: {key}")


def print_ok(message: str):
    print(f"[PASS] {message}")


def test_system():
    payload = request_json("GET", "/")
    assert_key(payload, "message", "home")
    assert_key(payload, "version", "home")
    print_ok("System health endpoint works")

    features = request_json("GET", "/api/features")
    if features.get("total_features") != 30:
        raise SmokeTestError("Expected /api/features to return 30 features")
    print_ok("Feature catalog returns 30 features")


def test_authentication():
    status = request_json("GET", "/api/auth/status")
    assert_key(status, "auth_enabled", "auth status")
    print_ok("Auth status works")

    login = request_json(
        "POST",
        "/api/auth/login",
        {
            "email": "admin@flowsync.local",
            "password": "flowsync123",
        },
    )

    if not login.get("authenticated"):
        raise SmokeTestError("Admin login failed")

    token = login["session"]["access_token"]
    print_ok("Admin login works")

    me = request_json("GET", "/api/auth/me", token=token)
    if me["user"]["role"] != "admin":
        raise SmokeTestError("Expected admin role from /api/auth/me")
    print_ok("Authenticated /api/auth/me works")

    return token


def test_role_access(admin_token: str):
    request_json(
        "GET",
        "/api/admin/dashboard",
        expected_status=401,
    )
    print_ok("Admin dashboard blocks unauthenticated requests")

    admin_dashboard = request_json(
        "GET",
        "/api/admin/dashboard",
        token=admin_token,
    )
    assert_key(admin_dashboard, "dashboard_type", "admin dashboard")
    print_ok("Admin dashboard works with admin token")

    request_json(
        "POST",
        "/api/demo/seed",
        token=admin_token,
    )
    print_ok("Admin token can seed demo data")


def test_routing_and_navigation():
    locations = request_json("GET", "/api/locations/search?q=dubai")
    if locations.get("count", 0) <= 0:
        raise SmokeTestError("Expected location search results")
    print_ok("Location search works")

    route_response = request_json(
        "POST",
        "/api/routes/recommend",
        {
            "start_location": "Dubai Mall",
            "destination": "Dubai Marina",
            "vehicle_type": "car",
            "route_preference": "balanced",
            "user_role": "driver",
        },
    )

    assert_key(route_response, "recommended_route", "route recommend")
    assert_key(route_response, "database_record", "route recommend")

    recommended = route_response["recommended_route"]

    for key in ["coordinates", "polyline", "turn_steps", "turn_by_turn_steps", "alerts", "incidents"]:
        if key not in recommended:
            raise SmokeTestError(f"Recommended route missing navigation key: {key}")

    request_id = route_response["database_record"]["request_id"]
    print_ok("Route recommendation returns navigation-ready route data")

    navigation = request_json(
        "POST",
        "/api/trips/start",
        {
            "start_location": "Dubai Mall",
            "destination": "Dubai Marina",
            "vehicle_type": "car",
            "route_preference": "balanced",
            "user_role": "driver",
            "user_id": "smoke-test-driver",
            "request_id": request_id,
        },
    )

    session_id = navigation["session"]["session_id"]
    print_ok("Navigation session starts and links to trip request")

    active = request_json("GET", "/api/trips/active")
    if active.get("active_count", 0) <= 0:
        raise SmokeTestError("Expected at least one active navigation session")
    print_ok("Active trips endpoint works")

    detail = request_json("GET", f"/api/trips/session/{session_id}")
    if detail["session"]["session_id"] != session_id:
        raise SmokeTestError("Session detail returned wrong session")
    print_ok("Navigation session detail works")

    progress = request_json(
        "POST",
        "/api/trips/progress",
        {
            "session_id": session_id,
            "current_step_index": 1,
        },
    )
    if not progress.get("found"):
        raise SmokeTestError("Navigation progress update failed")
    print_ok("Navigation progress update works")

    lifecycle = request_json("GET", f"/api/trips/{request_id}/lifecycle")
    if not lifecycle.get("found"):
        raise SmokeTestError("Trip lifecycle not found")
    print_ok("Trip lifecycle endpoint works")

    summary = request_json("GET", f"/api/trips/{request_id}/summary")
    if not summary.get("found"):
        raise SmokeTestError("Trip summary not found")
    print_ok("Trip summary endpoint works")

    ended = request_json(
        "POST",
        "/api/trips/end",
        {
            "session_id": session_id,
            "status": "completed",
        },
    )
    if not ended.get("found"):
        raise SmokeTestError("Trip end failed")
    print_ok("Navigation session ends successfully")

    lifecycle_dashboard = request_json("GET", "/api/trips/lifecycle/dashboard")
    assert_key(lifecycle_dashboard, "total_trips", "lifecycle dashboard")
    print_ok("Trip lifecycle dashboard works")


def test_platform_features(admin_token: str):
    dashboard = request_json("GET", "/api/dashboard")
    assert_key(dashboard, "total_trip_requests", "dashboard")
    print_ok("Main dashboard works")

    parking = request_json("GET", "/api/parking/predict?destination=Dubai Mall")
    assert_key(parking, "parking_predictions", "parking")
    print_ok("Parking prediction works")

    ai = request_json("GET", "/api/ai/congestion-prediction?start_location=Dubai&destination=Sharjah&time_of_day=17:00")
    assert_key(ai, "predicted_congestion_risk", "ai prediction")
    print_ok("AI congestion prediction works")

    emergency = request_json(
        "POST",
        "/api/emergency/route",
        {
            "start_location": "Downtown Dubai",
            "destination": "Rashid Hospital",
            "emergency_type": "ambulance",
        },
        token=admin_token,
    )
    assert_key(emergency, "recommended_route", "emergency route")
    print_ok("Emergency route works with admin token")

    digital_twin = request_json(
        "POST",
        "/api/digital-twin/simulate",
        {
            "scenario_type": "event_traffic",
            "area": "Downtown Dubai",
            "total_vehicles": 500,
        },
    )
    assert_key(digital_twin, "simulation_status", "digital twin")
    print_ok("Digital twin simulation works")


def run_smoke_tests():
    print("Starting FlowSync backend smoke tests...")
    print(f"Backend URL: {BASE_URL}")
    print("")

    test_system()
    admin_token = test_authentication()
    test_role_access(admin_token)
    test_routing_and_navigation()
    test_platform_features(admin_token)

    print("")
    print("All FlowSync backend smoke tests passed.")


if __name__ == "__main__":
    try:
        run_smoke_tests()
    except SmokeTestError as error:
        print("")
        print("[FAIL] Smoke test failed")
        print(error)
        sys.exit(1)