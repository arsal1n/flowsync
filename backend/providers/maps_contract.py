# backend/providers/maps_contract.py

"""
Shared contract helpers for FlowSync real maps/routing providers.

This file keeps provider output consistent before Member 2 connects it
to the main backend API.

It is intentionally standalone and does not modify backend/main.py.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional


PROVIDER_NAME_OPENROUTESERVICE = "openrouteservice"

STATUS_REAL_GEOCODING_SUCCESS = "real_geocoding_success"
STATUS_REAL_ROUTING_SUCCESS = "real_routing_success"

STATUS_PROVIDER_API_KEY_MISSING = "provider_api_key_missing"
STATUS_PROVIDER_REQUEST_FAILED = "provider_request_failed"
STATUS_PROVIDER_NO_PLACES_FOUND = "provider_no_places_found"
STATUS_PROVIDER_NO_ROUTES_FOUND = "provider_no_routes_found"
STATUS_PROVIDER_INVALID_RESPONSE = "provider_invalid_response"
STATUS_INVALID_COORDINATES = "invalid_coordinates"
STATUS_SAME_LOCATION = "same_location"
STATUS_RATE_LIMITED = "rate_limited"

# Backward-compatible alias for older helper code.
STATUS_PROVIDER_EMPTY_RESULT = STATUS_PROVIDER_NO_ROUTES_FOUND


def safe_float(value: Any) -> Optional[float]:
    try:
        number_value = float(value)
    except (TypeError, ValueError):
        return None

    return number_value


def is_valid_coordinate(latitude: Any, longitude: Any) -> bool:
    lat = safe_float(latitude)
    lng = safe_float(longitude)

    if lat is None or lng is None:
        return False

    return -90 <= lat <= 90 and -180 <= lng <= 180


def make_provider_error(
    *,
    operation: str,
    message: str,
    provider: str = PROVIDER_NAME_OPENROUTESERVICE,
    provider_status: str = STATUS_PROVIDER_REQUEST_FAILED,
    details: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    response: Dict[str, Any] = {
        "provider": provider,
        "provider_status": provider_status,
        "success": False,
        "operation": operation,
        "message": message,
        "error": message,
        "real_geometry": False,
        "mock_fallback": False,
    }

    if operation == "search_places":
        response["results"] = []

    if operation == "get_routes":
        response["routes"] = []
        response["all_routes"] = []
        response["recommended_route"] = None
        response["recommended_route_id"] = None

    if provider_status == STATUS_SAME_LOCATION:
        response["same_location"] = True

    if details:
        response["details"] = details

    return response


def make_place_result(
    *,
    place_id: str,
    name: str,
    display_name: str,
    latitude: float,
    longitude: float,
    city: str = "",
    area: str = "",
    category: str = "place",
    provider_name: str = PROVIDER_NAME_OPENROUTESERVICE,
    raw: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    return {
        "place_id": place_id,
        "name": name,
        "display_name": display_name,
        "latitude": latitude,
        "longitude": longitude,
        "lat": latitude,
        "lng": longitude,
        "city": city,
        "area": area,
        "category": category,
        "provider_name": provider_name,
        "provider": provider_name,
        "raw": raw or {},
    }


def make_place_search_response(
    *,
    results: List[Dict[str, Any]],
    provider: str = PROVIDER_NAME_OPENROUTESERVICE,
    provider_status: str = STATUS_REAL_GEOCODING_SUCCESS,
) -> Dict[str, Any]:
    return {
        "results": results,
        "provider": provider,
        "provider_status": provider_status,
        "success": True,
        "mock_fallback": False,
    }


def route_id_from_index(index: int) -> str:
    route_letters = ["A", "B", "C", "D", "E", "F"]

    if 0 <= index < len(route_letters):
        return f"ROUTE-{route_letters[index]}"

    return f"ROUTE-{index + 1}"


def route_name_from_index(index: int) -> str:
    route_letters = ["A", "B", "C", "D", "E", "F"]

    if 0 <= index < len(route_letters):
        return f"Route {route_letters[index]} - Real Road Route"

    return f"Route {index + 1} - Real Road Route"


def format_eta_text(minutes: float) -> str:
    if minutes <= 0:
        return "0 min"

    if minutes < 60:
        return f"{round(minutes)} min"

    hours = int(minutes // 60)
    remaining_minutes = round(minutes % 60)

    if remaining_minutes == 0:
        return f"{hours} hr"

    return f"{hours} hr {remaining_minutes} min"


def format_distance_text(distance_km: float) -> str:
    if distance_km < 1:
        return f"{round(distance_km * 1000)} m"

    return f"{distance_km:.1f} km"


def make_turn_step(
    *,
    step_index: int,
    instruction: str,
    distance_m: float,
    duration_min: float,
    maneuver: str = "",
    road_name: str = "",
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    raw: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    return {
        "step_index": step_index,
        "step_number": step_index + 1,
        "instruction": instruction,
        "distance_m": round(float(distance_m or 0), 2),
        "duration_min": round(float(duration_min or 0), 2),
        "maneuver": maneuver,
        "road_name": road_name,
        "latitude": latitude,
        "longitude": longitude,
        "lat": latitude,
        "lng": longitude,
        "raw": raw or {},
    }


def make_route_result(
    *,
    route_index: int,
    estimated_time_min: float,
    distance_km: float,
    route_coordinates: List[Dict[str, float]],
    turn_by_turn_steps: List[Dict[str, Any]],
    provider_name: str = PROVIDER_NAME_OPENROUTESERVICE,
    raw: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    route_id = route_id_from_index(route_index)
    route_name = route_name_from_index(route_index)

    safe_eta = round(float(estimated_time_min or 0), 2)
    safe_distance = round(float(distance_km or 0), 2)

    # These are placeholder FlowSync fields for backend ranking to refine later.
    # They are not fake geometry and do not affect road-following route data.
    traffic_delay_min = 0
    congestion_score = 0
    assigned_users = 0
    road_capacity = 0
    load_ratio = 0
    route_score = safe_eta

    return {
        "route_id": route_id,
        "route_name": route_name,
        "estimated_time_min": safe_eta,
        "estimated_time": safe_eta,
        "eta_text": format_eta_text(safe_eta),
        "distance_km": safe_distance,
        "distance_text": format_distance_text(safe_distance),
        "traffic_delay_min": traffic_delay_min,
        "congestion_level": "unknown",
        "congestion_score": congestion_score,
        "traffic_score": congestion_score,
        "traffic_display": "Traffic data unavailable from ORS",
        "assigned_users": assigned_users,
        "road_capacity": road_capacity,
        "load_ratio": load_ratio,
        "load_status": "unknown",
        "route_score": route_score,
        "flowsync_score": route_score,
        "is_recommended": route_index == 0,
        "recommendation_reason": (
            "Real OpenRouteService road route returned. "
            "FlowSync backend can rank this with congestion/load data."
        ),
        "provider_name": provider_name,
        "provider": provider_name,
        "provider_status": STATUS_REAL_ROUTING_SUCCESS,
        "route_coordinates": route_coordinates,
        "coordinates": route_coordinates,
        "polyline": route_coordinates,
        "turn_by_turn_steps": turn_by_turn_steps,
        "steps": turn_by_turn_steps,
        "incidents": [],
        "alerts": [],
        "warnings": [],
        "in_app_navigation": True,
        "external_navigation_required": False,
        "real_geometry": True,
        "mock_fallback": False,
        "raw": raw or {},
    }


def make_routes_response(
    *,
    routes: List[Dict[str, Any]],
    provider: str = PROVIDER_NAME_OPENROUTESERVICE,
    provider_status: str = STATUS_REAL_ROUTING_SUCCESS,
) -> Dict[str, Any]:
    recommended_route = routes[0] if routes else None

    return {
        "provider": provider,
        "provider_status": provider_status,
        "success": True,
        "real_geometry": bool(routes),
        "mock_fallback": False,
        "recommended_route_id": recommended_route.get("route_id")
        if recommended_route
        else None,
        "recommended_route": recommended_route,
        "routes": routes,
        "all_routes": routes,
        "coordinate_count": len(recommended_route.get("route_coordinates", []))
        if recommended_route
        else 0,
        "turn_by_turn_steps_count": len(
            recommended_route.get("turn_by_turn_steps", [])
        )
        if recommended_route
        else 0,
    }
    