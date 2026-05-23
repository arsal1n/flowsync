import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request


API_BASE_URL = os.getenv("FLOWSYNC_API_BASE_URL", "https://flowsync-ox5z.onrender.com").rstrip("/")


def print_section(title):
    print("\n" + "=" * 70)
    print(title)
    print("=" * 70)


def request_json(method, path, payload=None, timeout=30):
    url = f"{API_BASE_URL}{path}"
    data = None
    headers = {"Content-Type": "application/json"}

    if payload is not None:
        data = json.dumps(payload).encode("utf-8")

    request = urllib.request.Request(url, data=data, headers=headers, method=method)

    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            raw = response.read().decode("utf-8")
            try:
                body = json.loads(raw)
            except json.JSONDecodeError:
                body = {"raw": raw}
            return True, response.status, body
    except urllib.error.HTTPError as error:
        raw = error.read().decode("utf-8")
        try:
            body = json.loads(raw)
        except json.JSONDecodeError:
            body = {"raw": raw}
        return False, error.code, body
    except Exception as error:
        return False, None, {"error": str(error)}


def print_result(name, ok, status, body, pass_condition=True):
    result = "PASS" if ok and pass_condition else "FAIL"
    print(f"{result}: {name}")
    print(f"HTTP status: {status}")
    print(json.dumps(body, indent=2)[:2000])
    return ok and pass_condition


def find_routes(response_body):
    if isinstance(response_body, dict):
        if isinstance(response_body.get("all_routes"), list):
            return response_body["all_routes"]
        if isinstance(response_body.get("routes"), list):
            return response_body["routes"]
        if isinstance(response_body.get("route_options"), list):
            return response_body["route_options"]
    return []


def get_trip_id(response_body):
    if not isinstance(response_body, dict):
        return None
    return (
        response_body.get("trip_id")
        or response_body.get("trip_request_id")
        or response_body.get("request_id")
    )


def get_recommended_route_id(response_body, routes):
    if isinstance(response_body, dict):
        for key in ["recommended_route_id", "selected_route_id", "route_id"]:
            if response_body.get(key):
                return response_body.get(key)

    for route in routes:
        if route.get("is_recommended"):
            return route.get("route_id")

    if routes:
        return routes[0].get("route_id")

    return None


def get_route_name(routes, selected_route_id):
    for route in routes:
        if route.get("route_id") == selected_route_id:
            return route.get("route_name")
    if routes:
        return routes[0].get("route_name")
    return "Selected Route"


def main():
    print("FlowSync Final API Smoke Test")
    print(f"API_BASE_URL = {API_BASE_URL}")

    all_passed = True

    print_section("1. Health Check")
    ok, status, body = request_json("GET", "/api/health")
    all_passed &= print_result("/api/health", ok, status, body)

    print_section("2. Location Search Checks")

    for query, should_have_results in [
        ("Manipal", True),
        ("Rivington Heights", True),
        ("randomxyznotreal", False),
    ]:
        encoded = urllib.parse.quote(query)
        ok, status, body = request_json("GET", f"/api/locations/search?q={encoded}")

        results = []
        if isinstance(body, dict):
            results = body.get("results") or body.get("locations") or []

        pass_condition = len(results) > 0 if should_have_results else len(results) == 0
        all_passed &= print_result(
            f"/api/locations/search?q={query}",
            ok,
            status,
            body,
            pass_condition=pass_condition,
        )

    print_section("3. Route Recommend Check")

    route_payload = {
        "start_location": "Manipal University Dubai",
        "destination": "Dubai Marina",
        "start_latitude": 25.1256,
        "start_longitude": 55.4209,
        "destination_latitude": 25.0800,
        "destination_longitude": 55.1400,
        "vehicle_type": "car",
        "route_preference": "balanced",
        "user_role": "driver",
    }

    ok, status, route_body = request_json("POST", "/api/routes/recommend", route_payload, timeout=60)
    routes = find_routes(route_body)
    trip_id = get_trip_id(route_body)
    selected_route_id = get_recommended_route_id(route_body, routes)
    route_name = get_route_name(routes, selected_route_id)

    coordinate_count = 0
    step_count = 0
    real_geometry = False
    mock_fallback = None

    if routes:
        route = routes[0]
        coordinate_count = (
            route.get("coordinate_count")
            or len(route.get("route_coordinates") or [])
        )
        step_count = len(route.get("turn_by_turn_steps") or route.get("steps") or [])
        real_geometry = bool(route.get("real_geometry", coordinate_count > 50))
        mock_fallback = route.get("mock_fallback")

    pass_condition = bool(routes) and coordinate_count > 50 and real_geometry is True
    all_passed &= print_result(
        "/api/routes/recommend",
        ok,
        status,
        route_body,
        pass_condition=pass_condition,
    )

    print(f"Detected trip_id: {trip_id}")
    print(f"Detected selected_route_id: {selected_route_id}")
    print(f"Detected route_name: {route_name}")
    print(f"Detected coordinate_count: {coordinate_count}")
    print(f"Detected step_count: {step_count}")
    print(f"Detected real_geometry: {real_geometry}")
    print(f"Detected mock_fallback: {mock_fallback}")

    if not trip_id or not selected_route_id:
        print("\nFAIL: Cannot continue trip lifecycle test because trip_id or selected_route_id is missing.")
        sys.exit(1)

    print_section("4. Trip Start Check")

    start_payload = {
        "trip_id": trip_id,
        "selected_route_id": selected_route_id,
        "route_name": route_name,
        "start_location": "Manipal University Dubai",
        "destination": "Dubai Marina",
    }

    ok, status, start_body = request_json("POST", "/api/trips/start", start_payload)

    session_id = None
    if isinstance(start_body, dict):
        session_id = start_body.get("session_id") or start_body.get("id")

    pass_condition = bool(session_id)
    all_passed &= print_result(
        "/api/trips/start",
        ok,
        status,
        start_body,
        pass_condition=pass_condition,
    )

    print(f"Detected session_id: {session_id}")

    if not session_id:
        print("\nFAIL: Cannot continue progress/end tests because session_id is missing.")
        sys.exit(1)

    time.sleep(1)

    print_section("5. Trip Progress Check")

    progress_payload = {
        "session_id": session_id,
        "current_step_index": 1,
        "latitude": 25.1600,
        "longitude": 55.3000,
        "remaining_distance_km": 12.4,
        "remaining_time_min": 16,
        "progress_percentage": 45,
    }

    ok, status, progress_body = request_json("POST", "/api/trips/progress", progress_payload)

    pass_condition = ok
    if isinstance(progress_body, dict):
        status_value = str(progress_body.get("status", "")).lower()
        pass_condition = pass_condition and (
            "progress" in status_value
            or "in_progress" in status_value
            or "updated" in json.dumps(progress_body).lower()
            or status_value in ["active", "in_progress"]
        )

    all_passed &= print_result(
        "/api/trips/progress",
        ok,
        status,
        progress_body,
        pass_condition=pass_condition,
    )

    print_section("6. Trip End Completed Check")

    end_completed_payload = {
        "session_id": session_id,
        "status": "completed",
    }

    ok, status, end_completed_body = request_json("POST", "/api/trips/end", end_completed_payload)

    pass_condition = ok
    if isinstance(end_completed_body, dict):
        text = json.dumps(end_completed_body).lower()
        pass_condition = pass_condition and "completed" in text

    all_passed &= print_result(
        "/api/trips/end completed",
        ok,
        status,
        end_completed_body,
        pass_condition=pass_condition,
    )

    print_section("7. Trip End Cancelled Check")

    # Start a second session so cancellation does not reuse the completed session.
    ok, status, start_cancel_body = request_json("POST", "/api/trips/start", start_payload)
    cancel_session_id = None

    if isinstance(start_cancel_body, dict):
        cancel_session_id = start_cancel_body.get("session_id") or start_cancel_body.get("id")

    if not cancel_session_id:
        print("FAIL: Could not create second session for cancellation test.")
        all_passed = False
    else:
        cancel_payload = {
            "session_id": cancel_session_id,
            "status": "cancelled",
        }

        ok, status, cancel_body = request_json("POST", "/api/trips/end", cancel_payload)

        pass_condition = ok
        if isinstance(cancel_body, dict):
            text = json.dumps(cancel_body).lower()
            pass_condition = pass_condition and "cancel" in text

        all_passed &= print_result(
            "/api/trips/end cancelled",
            ok,
            status,
            cancel_body,
            pass_condition=pass_condition,
        )

    print_section("FINAL RESULT")

    if all_passed:
        print("PASS: Final API smoke test passed.")
    else:
        print("FAIL: One or more API smoke test checks failed.")
        sys.exit(1)


if __name__ == "__main__":
    main()