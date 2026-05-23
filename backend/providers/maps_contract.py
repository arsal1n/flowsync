# backend/providers/maps_contract.py

"""
Shared contract helpers for FlowSync map/routing providers.

This file keeps provider output consistent before Member 2 connects it
to the main backend API.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional


PROVIDER_NAME_OPENROUTESERVICE = "openrouteservice"

STATUS_REAL_GEOCODING_SUCCESS = "real_geocoding_success"
STATUS_REAL_ROUTING_SUCCESS = "real_routing_success"

STATUS_PROVIDER_API_KEY_MISSING = "provider_api_key_missing"
STATUS_PROVIDER_REQUEST_FAILED = "provider_request_failed"
STATUS_PROVIDER_EMPTY_RESULT = "provider_empty_result"
STATUS_PROVIDER_INVALID_RESPONSE = "provider_invalid_response"


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
        "error": message,
    }

    if operation == "search_places":
        response["results"] = []

    if operation == "get_routes":
        response["routes"] = []

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
        "city": city,
        "area": area,
        "category": category,
        "provider_name": provider_name,
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

    return {
        "route_id": route_id,
        "route_name": route_name,
        "estimated_time_min": round(float(estimated_time_min or 0), 2),
        "estimated_time": round(float(estimated_time_min or 0), 2),
        "distance_km": round(float(distance_km or 0), 2),
        "traffic_delay_min": 0,
        "congestion_level": "unknown",
        "congestion_score": 0,
        "assigned_users": 0,
        "route_score": round(float(estimated_time_min or 0), 2),
        "provider_name": provider_name,
        "provider": provider_name,
        "route_coordinates": route_coordinates,
        "coordinates": route_coordinates,
        "polyline": route_coordinates,
        "turn_by_turn_steps": turn_by_turn_steps,
        "steps": turn_by_turn_steps,
        "incidents": [],
        "alerts": [],
        "warnings": [],
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
    }
    