# backend/providers/openrouteservice_provider.py

"""
Standalone OpenRouteService provider helper for FlowSync.

This file is intentionally NOT wired into backend/main.py yet.

Member 2 can later connect:
- search_places() into GET /api/locations/search
- get_routes() into POST /api/routes/recommend

Required environment variable:
OPENROUTESERVICE_API_KEY

Optional environment variables:
ORS_API_KEY
VITE_OPENROUTE_API_KEY

No external Python package dependency is required.
Uses only Python standard library.
"""

from __future__ import annotations

import json
import os
from typing import Any, Dict, List, Optional, Tuple
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from .maps_contract import (
    PROVIDER_NAME_OPENROUTESERVICE,
    STATUS_PROVIDER_API_KEY_MISSING,
    STATUS_PROVIDER_EMPTY_RESULT,
    STATUS_PROVIDER_INVALID_RESPONSE,
    STATUS_PROVIDER_REQUEST_FAILED,
    make_place_result,
    make_place_search_response,
    make_provider_error,
    make_route_result,
    make_routes_response,
    make_turn_step,
    safe_float,
)


ORS_BASE_URL = "https://api.openrouteservice.org"
ORS_GEOCODE_ENDPOINT = f"{ORS_BASE_URL}/geocode/search"
ORS_DIRECTIONS_GEOJSON_ENDPOINT = (
    f"{ORS_BASE_URL}/v2/directions/driving-car/geojson"
)

DEFAULT_TIMEOUT_SECONDS = 20


def get_openrouteservice_api_key() -> Optional[str]:
    return (
        os.getenv("OPENROUTESERVICE_API_KEY")
        or os.getenv("ORS_API_KEY")
        or os.getenv("VITE_OPENROUTE_API_KEY")
    )


def make_headers(api_key: Optional[str] = None) -> Dict[str, str]:
    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
    }

    if api_key:
        headers["Authorization"] = api_key

    return headers


def read_error_body(error: HTTPError) -> str:
    try:
        return error.read().decode("utf-8", errors="replace")[:500]
    except Exception:
        return ""


def http_get_json(url: str, headers: Optional[Dict[str, str]] = None) -> Tuple[Optional[Dict[str, Any]], Optional[str], Optional[int]]:
    request = Request(url, headers=headers or {}, method="GET")

    try:
        with urlopen(request, timeout=DEFAULT_TIMEOUT_SECONDS) as response:
            body = response.read().decode("utf-8")
            return json.loads(body), None, response.status
    except HTTPError as exc:
        return None, read_error_body(exc), exc.code
    except URLError as exc:
        return None, str(exc.reason), None
    except TimeoutError as exc:
        return None, str(exc), None
    except json.JSONDecodeError:
        return None, "Invalid JSON response.", None


def http_post_json(
    url: str,
    payload: Dict[str, Any],
    headers: Optional[Dict[str, str]] = None,
) -> Tuple[Optional[Dict[str, Any]], Optional[str], Optional[int]]:
    request_body = json.dumps(payload).encode("utf-8")

    request = Request(
        url,
        data=request_body,
        headers=headers or {},
        method="POST",
    )

    try:
        with urlopen(request, timeout=DEFAULT_TIMEOUT_SECONDS) as response:
            body = response.read().decode("utf-8")
            return json.loads(body), None, response.status
    except HTTPError as exc:
        return None, read_error_body(exc), exc.code
    except URLError as exc:
        return None, str(exc.reason), None
    except TimeoutError as exc:
        return None, str(exc), None
    except json.JSONDecodeError:
        return None, "Invalid JSON response.", None


def extract_city_and_area(properties: Dict[str, Any]) -> Tuple[str, str]:
    city = (
        properties.get("locality")
        or properties.get("localadmin")
        or properties.get("county")
        or properties.get("region")
        or ""
    )

    area = (
        properties.get("neighbourhood")
        or properties.get("borough")
        or properties.get("district")
        or properties.get("locality")
        or ""
    )

    return str(city or ""), str(area or "")


def extract_place_name(properties: Dict[str, Any]) -> str:
    return str(
        properties.get("name")
        or properties.get("label")
        or properties.get("street")
        or properties.get("locality")
        or "Unknown place"
    )


def extract_place_category(properties: Dict[str, Any]) -> str:
    layer = str(properties.get("layer") or "").strip()

    if layer:
        return layer

    source = str(properties.get("source") or "").strip()

    if source:
        return source

    return "place"


def search_places(query: str, limit: int = 10) -> Dict[str, Any]:
    api_key = get_openrouteservice_api_key()

    if not api_key:
        return make_provider_error(
            operation="search_places",
            message="OpenRouteService API key is missing.",
            provider_status=STATUS_PROVIDER_API_KEY_MISSING,
        )

    clean_query = (query or "").strip()

    if not clean_query:
        return make_provider_error(
            operation="search_places",
            message="Search query is required.",
            provider_status=STATUS_PROVIDER_EMPTY_RESULT,
        )

    safe_limit = max(1, min(int(limit or 10), 20))

    query_params = {
        "api_key": api_key,
        "text": clean_query,
        "size": safe_limit,
        "boundary.country": "AE",
    }

    request_url = f"{ORS_GEOCODE_ENDPOINT}?{urlencode(query_params)}"

    data, error_message, status_code = http_get_json(
        request_url,
        headers={"Accept": "application/json"},
    )

    if error_message:
        return make_provider_error(
            operation="search_places",
            message=(
                f"OpenRouteService geocoding failed"
                + (f" with HTTP {status_code}" if status_code else "")
                + f": {error_message}"
            ),
            provider_status=STATUS_PROVIDER_REQUEST_FAILED,
        )

    if not isinstance(data, dict):
        return make_provider_error(
            operation="search_places",
            message="OpenRouteService geocoding returned invalid response shape.",
            provider_status=STATUS_PROVIDER_INVALID_RESPONSE,
        )

    features = data.get("features")

    if not isinstance(features, list) or not features:
        return make_provider_error(
            operation="search_places",
            message="No real place results found from OpenRouteService.",
            provider_status=STATUS_PROVIDER_EMPTY_RESULT,
            details={"query": clean_query},
        )

    results: List[Dict[str, Any]] = []

    for index, feature in enumerate(features):
        geometry = feature.get("geometry") or {}
        coordinates = geometry.get("coordinates") or []

        if not isinstance(coordinates, list) or len(coordinates) < 2:
            continue

        longitude = safe_float(coordinates[0])
        latitude = safe_float(coordinates[1])

        if latitude is None or longitude is None:
            continue

        properties = feature.get("properties") or {}

        city, area = extract_city_and_area(properties)
        name = extract_place_name(properties)
        display_name = str(properties.get("label") or name)
        category = extract_place_category(properties)

        place_id = str(
            properties.get("id")
            or properties.get("gid")
            or properties.get("osm_id")
            or f"ors-place-{index}"
        )

        results.append(
            make_place_result(
                place_id=place_id,
                name=name,
                display_name=display_name,
                latitude=latitude,
                longitude=longitude,
                city=city,
                area=area,
                category=category,
                provider_name=PROVIDER_NAME_OPENROUTESERVICE,
                raw=feature,
            )
        )

    if not results:
        return make_provider_error(
            operation="search_places",
            message="OpenRouteService returned features, but none had valid coordinates.",
            provider_status=STATUS_PROVIDER_INVALID_RESPONSE,
            details={"query": clean_query},
        )

    return make_place_search_response(results=results)


def build_directions_payload(
    *,
    start_latitude: float,
    start_longitude: float,
    destination_latitude: float,
    destination_longitude: float,
    preference: str = "balanced",
) -> Dict[str, Any]:
    payload: Dict[str, Any] = {
        "coordinates": [
            [float(start_longitude), float(start_latitude)],
            [float(destination_longitude), float(destination_latitude)],
        ],
        "instructions": True,
        "geometry": True,
        "elevation": False,
        "extra_info": ["roadaccessrestrictions", "waytype", "surface"],
    }

    if preference == "fastest":
        payload["preference"] = "fastest"
    elif preference == "shortest":
        payload["preference"] = "shortest"
    else:
        payload["preference"] = "recommended"

    return payload


def extract_route_coordinates(feature: Dict[str, Any]) -> List[Dict[str, float]]:
    geometry = feature.get("geometry") or {}
    raw_coordinates = geometry.get("coordinates") or []

    route_coordinates: List[Dict[str, float]] = []

    if not isinstance(raw_coordinates, list):
        return route_coordinates

    for point in raw_coordinates:
        if not isinstance(point, list) or len(point) < 2:
            continue

        longitude = safe_float(point[0])
        latitude = safe_float(point[1])

        if latitude is None or longitude is None:
            continue

        route_coordinates.append(
            {
                "latitude": latitude,
                "longitude": longitude,
                "lat": latitude,
                "lng": longitude,
            }
        )

    return route_coordinates


def instruction_text_from_step(step: Dict[str, Any]) -> str:
    instruction = step.get("instruction")

    if instruction:
        return str(instruction)

    name = step.get("name") or "the road"
    return f"Continue on {name}"


def maneuver_from_step(step: Dict[str, Any]) -> str:
    maneuver = step.get("type")

    if maneuver is None:
        return ""

    return str(maneuver)


def find_step_coordinate(
    *,
    route_coordinates: List[Dict[str, float]],
    waypoint_index: int,
) -> Tuple[Optional[float], Optional[float]]:
    if not route_coordinates:
        return None, None

    safe_index = max(0, min(int(waypoint_index or 0), len(route_coordinates) - 1))
    coordinate = route_coordinates[safe_index]

    return coordinate.get("latitude"), coordinate.get("longitude")


def extract_turn_by_turn_steps(
    *,
    feature: Dict[str, Any],
    route_coordinates: List[Dict[str, float]],
) -> List[Dict[str, Any]]:
    properties = feature.get("properties") or {}
    segments = properties.get("segments") or []

    if not isinstance(segments, list):
        return []

    steps: List[Dict[str, Any]] = []

    for segment in segments:
        raw_steps = segment.get("steps") or []

        if not isinstance(raw_steps, list):
            continue

        for raw_step in raw_steps:
            waypoint_indexes = raw_step.get("way_points") or [0]
            waypoint_index = waypoint_indexes[0] if waypoint_indexes else 0

            latitude, longitude = find_step_coordinate(
                route_coordinates=route_coordinates,
                waypoint_index=waypoint_index,
            )

            distance_m = safe_float(raw_step.get("distance")) or 0
            duration_seconds = safe_float(raw_step.get("duration")) or 0

            steps.append(
                make_turn_step(
                    step_index=len(steps),
                    instruction=instruction_text_from_step(raw_step),
                    distance_m=distance_m,
                    duration_min=duration_seconds / 60,
                    maneuver=maneuver_from_step(raw_step),
                    road_name=str(raw_step.get("name") or ""),
                    latitude=latitude,
                    longitude=longitude,
                    raw=raw_step,
                )
            )

    return steps


def extract_summary(feature: Dict[str, Any]) -> Tuple[float, float]:
    properties = feature.get("properties") or {}
    summary = properties.get("summary") or {}

    distance_meters = safe_float(summary.get("distance")) or 0
    duration_seconds = safe_float(summary.get("duration")) or 0

    distance_km = distance_meters / 1000
    estimated_time_min = duration_seconds / 60

    return distance_km, estimated_time_min


def build_route_from_feature(
    *,
    feature: Dict[str, Any],
    route_index: int,
) -> Optional[Dict[str, Any]]:
    route_coordinates = extract_route_coordinates(feature)

    if len(route_coordinates) < 2:
        return None

    turn_by_turn_steps = extract_turn_by_turn_steps(
        feature=feature,
        route_coordinates=route_coordinates,
    )

    distance_km, estimated_time_min = extract_summary(feature)

    return make_route_result(
        route_index=route_index,
        estimated_time_min=estimated_time_min,
        distance_km=distance_km,
        route_coordinates=route_coordinates,
        turn_by_turn_steps=turn_by_turn_steps,
        provider_name=PROVIDER_NAME_OPENROUTESERVICE,
        raw=feature,
    )


def get_routes(
    start_latitude: float,
    start_longitude: float,
    destination_latitude: float,
    destination_longitude: float,
    preference: str = "balanced",
    user_role: str = "driver",
) -> Dict[str, Any]:
    api_key = get_openrouteservice_api_key()

    if not api_key:
        return make_provider_error(
            operation="get_routes",
            message="OpenRouteService API key is missing.",
            provider_status=STATUS_PROVIDER_API_KEY_MISSING,
        )

    start_lat = safe_float(start_latitude)
    start_lng = safe_float(start_longitude)
    dest_lat = safe_float(destination_latitude)
    dest_lng = safe_float(destination_longitude)

    if None in [start_lat, start_lng, dest_lat, dest_lng]:
        return make_provider_error(
            operation="get_routes",
            message="Start and destination coordinates are required.",
            provider_status=STATUS_PROVIDER_INVALID_RESPONSE,
        )

    if start_lat == dest_lat and start_lng == dest_lng:
        return make_provider_error(
            operation="get_routes",
            message="Start and destination coordinates are the same.",
            provider_status=STATUS_PROVIDER_EMPTY_RESULT,
            details={
                "start_latitude": start_lat,
                "start_longitude": start_lng,
                "destination_latitude": dest_lat,
                "destination_longitude": dest_lng,
            },
        )

    payload = build_directions_payload(
        start_latitude=start_lat,
        start_longitude=start_lng,
        destination_latitude=dest_lat,
        destination_longitude=dest_lng,
        preference=preference,
    )

    data, error_message, status_code = http_post_json(
        ORS_DIRECTIONS_GEOJSON_ENDPOINT,
        payload=payload,
        headers=make_headers(api_key),
    )

    if error_message:
        return make_provider_error(
            operation="get_routes",
            message=(
                f"OpenRouteService routing failed"
                + (f" with HTTP {status_code}" if status_code else "")
                + f": {error_message}"
            ),
            provider_status=STATUS_PROVIDER_REQUEST_FAILED,
        )

    if not isinstance(data, dict):
        return make_provider_error(
            operation="get_routes",
            message="OpenRouteService routing returned invalid response shape.",
            provider_status=STATUS_PROVIDER_INVALID_RESPONSE,
        )

    features = data.get("features")

    if not isinstance(features, list) or not features:
        return make_provider_error(
            operation="get_routes",
            message="OpenRouteService returned no route features.",
            provider_status=STATUS_PROVIDER_EMPTY_RESULT,
        )

    routes: List[Dict[str, Any]] = []

    for route_index, feature in enumerate(features):
        route = build_route_from_feature(
            feature=feature,
            route_index=route_index,
        )

        if route:
            routes.append(route)

    if not routes:
        return make_provider_error(
            operation="get_routes",
            message="OpenRouteService returned features, but no valid route geometry.",
            provider_status=STATUS_PROVIDER_INVALID_RESPONSE,
        )

    return make_routes_response(routes=routes)
    