# backend/providers/openrouteservice_provider.py

"""
Standalone OpenRouteService provider helper for FlowSync.

This file is intentionally NOT wired into backend/main.py yet.

Member 2 can later connect:
- search_places() into GET /api/locations/search
- get_routes() into POST /api/routes/recommend

Required environment variable:
OPENROUTESERVICE_API_KEY

Also supported:
FLOWSYNC_ORS_API_KEY
ORS_API_KEY
VITE_OPENROUTE_API_KEY

No external Python package dependency is required.
Uses only Python standard library.
"""

from __future__ import annotations

import json
import math
import os
from typing import Any, Dict, List, Optional, Tuple
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from .maps_contract import (
    PROVIDER_NAME_OPENROUTESERVICE,
    STATUS_INVALID_COORDINATES,
    STATUS_PROVIDER_API_KEY_MISSING,
    STATUS_PROVIDER_INVALID_RESPONSE,
    STATUS_PROVIDER_NO_PLACES_FOUND,
    STATUS_PROVIDER_NO_ROUTES_FOUND,
    STATUS_PROVIDER_REQUEST_FAILED,
    STATUS_RATE_LIMITED,
    STATUS_SAME_LOCATION,
    is_valid_coordinate,
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
ORS_DIRECTIONS_JSON_ENDPOINT = f"{ORS_BASE_URL}/v2/directions/driving-car/json"
ORS_DIRECTIONS_GEOJSON_ENDPOINT = (
    f"{ORS_BASE_URL}/v2/directions/driving-car/geojson"
)

DEFAULT_TIMEOUT_SECONDS = 20
SAME_LOCATION_THRESHOLD_KM = 0.05


def get_openrouteservice_api_key() -> Optional[str]:
    return (
        os.getenv("FLOWSYNC_ORS_API_KEY")
        or os.getenv("OPENROUTESERVICE_API_KEY")
        or os.getenv("ORS_API_KEY")
        or os.getenv("VITE_OPENROUTE_API_KEY")
    )


def make_headers(api_key: Optional[str] = None) -> Dict[str, str]:
    headers = {
        "Accept": "application/json, application/geo+json",
        "Content-Type": "application/json",
    }

    if api_key:
        headers["Authorization"] = api_key

    return headers


def read_error_body(error: HTTPError) -> str:
    try:
        return error.read().decode("utf-8", errors="replace")[:700]
    except Exception:
        return ""


def http_get_json(
    url: str,
    headers: Optional[Dict[str, str]] = None,
) -> Tuple[Optional[Dict[str, Any]], Optional[str], Optional[int]]:
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


def status_from_http_failure(
    *,
    status_code: Optional[int],
    default_status: str = STATUS_PROVIDER_REQUEST_FAILED,
) -> str:
    if status_code == 429:
        return STATUS_RATE_LIMITED

    return default_status


def calculate_distance_km(
    start_latitude: float,
    start_longitude: float,
    destination_latitude: float,
    destination_longitude: float,
) -> float:
    earth_radius_km = 6371.0

    lat1 = math.radians(start_latitude)
    lon1 = math.radians(start_longitude)
    lat2 = math.radians(destination_latitude)
    lon2 = math.radians(destination_longitude)

    delta_lat = lat2 - lat1
    delta_lon = lon2 - lon1

    haversine_value = (
        math.sin(delta_lat / 2) ** 2
        + math.cos(lat1) * math.cos(lat2) * math.sin(delta_lon / 2) ** 2
    )

    central_angle = 2 * math.atan2(
        math.sqrt(haversine_value),
        math.sqrt(1 - haversine_value),
    )

    return earth_radius_km * central_angle


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
            provider_status=STATUS_PROVIDER_NO_PLACES_FOUND,
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
                "OpenRouteService geocoding failed"
                + (f" with HTTP {status_code}" if status_code else "")
                + f": {error_message}"
            ),
            provider_status=status_from_http_failure(status_code=status_code),
            details={"query": clean_query},
        )

    if not isinstance(data, dict):
        return make_provider_error(
            operation="search_places",
            message="OpenRouteService geocoding returned invalid response shape.",
            provider_status=STATUS_PROVIDER_INVALID_RESPONSE,
            details={"query": clean_query},
        )

    features = data.get("features")

    if not isinstance(features, list) or not features:
        return make_provider_error(
            operation="search_places",
            message="No real place results found from OpenRouteService.",
            provider_status=STATUS_PROVIDER_NO_PLACES_FOUND,
            details={"query": clean_query},
        )

    results: List[Dict[str, Any]] = []

    for index, feature in enumerate(features):
        geometry = feature.get("geometry") or {}
        coordinates = geometry.get("coordinates") or []

        if not isinstance(coordinates, list) or len(coordinates) < 2:
            continue

        # ORS GeoJSON coordinates are [longitude, latitude].
        longitude = safe_float(coordinates[0])
        latitude = safe_float(coordinates[1])

        if latitude is None or longitude is None:
            continue

        if not is_valid_coordinate(latitude, longitude):
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
    include_alternatives: bool = False,
    geometry_format: str = "geojson",
) -> Dict[str, Any]:
    payload: Dict[str, Any] = {
        # ORS expects [longitude, latitude].
        "coordinates": [
            [float(start_longitude), float(start_latitude)],
            [float(destination_longitude), float(destination_latitude)],
        ],
        "instructions": True,
        "geometry": True,
        "elevation": False,
    }

    if geometry_format:
        payload["geometry_format"] = geometry_format

    if preference == "fastest":
        payload["preference"] = "fastest"
    elif preference == "shortest":
        payload["preference"] = "shortest"
    else:
        payload["preference"] = "recommended"

    if include_alternatives:
        payload["alternative_routes"] = {
            "target_count": 3,
            "share_factor": 0.6,
            "weight_factor": 1.4,
        }

    return payload


def decode_polyline(encoded: str, precision: int = 5) -> List[Dict[str, float]]:
    """
    Decode encoded polyline as fallback if ORS returns encoded geometry.

    Most FlowSync tests should use geometry_format=geojson, so this is rarely needed.
    """
    coordinates: List[Dict[str, float]] = []

    if not encoded:
        return coordinates

    index = 0
    lat = 0
    lng = 0
    factor = 10**precision

    while index < len(encoded):
        result = 1
        shift = 0

        while True:
            b = ord(encoded[index]) - 63 - 1
            index += 1
            result += b << shift
            shift += 5

            if b < 0x1F:
                break

        delta_lat = ~(result >> 1) if result & 1 else result >> 1
        lat += delta_lat

        result = 1
        shift = 0

        while True:
            b = ord(encoded[index]) - 63 - 1
            index += 1
            result += b << shift
            shift += 5

            if b < 0x1F:
                break

        delta_lng = ~(result >> 1) if result & 1 else result >> 1
        lng += delta_lng

        latitude = lat / factor
        longitude = lng / factor

        if is_valid_coordinate(latitude, longitude):
            coordinates.append(
                {
                    "latitude": latitude,
                    "longitude": longitude,
                    "lat": latitude,
                    "lng": longitude,
                }
            )

    return coordinates


def coordinates_from_raw_points(raw_coordinates: Any) -> List[Dict[str, float]]:
    route_coordinates: List[Dict[str, float]] = []

    if not isinstance(raw_coordinates, list):
        return route_coordinates

    for point in raw_coordinates:
        if not isinstance(point, list) or len(point) < 2:
            continue

        # ORS GeoJSON coordinates are [longitude, latitude].
        longitude = safe_float(point[0])
        latitude = safe_float(point[1])

        if latitude is None or longitude is None:
            continue

        if not is_valid_coordinate(latitude, longitude):
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


def extract_route_coordinates(route_object: Dict[str, Any]) -> List[Dict[str, float]]:
    geometry = route_object.get("geometry") or {}

    if isinstance(geometry, dict):
        return coordinates_from_raw_points(geometry.get("coordinates"))

    if isinstance(geometry, str):
        decoded_coordinates = decode_polyline(geometry, precision=5)

        if decoded_coordinates:
            return decoded_coordinates

        return decode_polyline(geometry, precision=6)

    return []


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
    route_object: Dict[str, Any],
    route_coordinates: List[Dict[str, float]],
) -> List[Dict[str, Any]]:
    properties = route_object.get("properties") or route_object
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


def extract_summary(route_object: Dict[str, Any]) -> Tuple[float, float]:
    properties = route_object.get("properties") or route_object
    summary = properties.get("summary") or {}

    distance_meters = safe_float(summary.get("distance")) or 0
    duration_seconds = safe_float(summary.get("duration")) or 0

    distance_km = distance_meters / 1000
    estimated_time_min = duration_seconds / 60

    return distance_km, estimated_time_min


def build_route_from_object(
    *,
    route_object: Dict[str, Any],
    route_index: int,
) -> Optional[Dict[str, Any]]:
    route_coordinates = extract_route_coordinates(route_object)

    if len(route_coordinates) < 2:
        return None

    turn_by_turn_steps = extract_turn_by_turn_steps(
        route_object=route_object,
        route_coordinates=route_coordinates,
    )

    distance_km, estimated_time_min = extract_summary(route_object)

    return make_route_result(
        route_index=route_index,
        estimated_time_min=estimated_time_min,
        distance_km=distance_km,
        route_coordinates=route_coordinates,
        turn_by_turn_steps=turn_by_turn_steps,
        provider_name=PROVIDER_NAME_OPENROUTESERVICE,
        raw=route_object,
    )


def extract_route_objects(data: Dict[str, Any]) -> List[Dict[str, Any]]:
    if isinstance(data.get("features"), list):
        return data["features"]

    if isinstance(data.get("routes"), list):
        return data["routes"]

    return []


def call_ors_directions_once(
    *,
    api_key: str,
    endpoint: str,
    start_latitude: float,
    start_longitude: float,
    destination_latitude: float,
    destination_longitude: float,
    preference: str,
    include_alternatives: bool,
    geometry_format: str,
) -> Tuple[Optional[Dict[str, Any]], Optional[str], Optional[int]]:
    payload = build_directions_payload(
        start_latitude=start_latitude,
        start_longitude=start_longitude,
        destination_latitude=destination_latitude,
        destination_longitude=destination_longitude,
        preference=preference,
        include_alternatives=include_alternatives,
        geometry_format=geometry_format,
    )

    return http_post_json(
        endpoint,
        payload=payload,
        headers=make_headers(api_key),
    )


def call_ors_directions(
    *,
    api_key: str,
    start_latitude: float,
    start_longitude: float,
    destination_latitude: float,
    destination_longitude: float,
    preference: str,
) -> Tuple[Optional[Dict[str, Any]], Optional[str], Optional[int], List[str]]:
    attempts = [
        {
            "name": "json_geojson_geometry_no_alternatives",
            "endpoint": ORS_DIRECTIONS_JSON_ENDPOINT,
            "include_alternatives": False,
            "geometry_format": "geojson",
        },
        {
            "name": "json_geojson_geometry_with_alternatives",
            "endpoint": ORS_DIRECTIONS_JSON_ENDPOINT,
            "include_alternatives": True,
            "geometry_format": "geojson",
        },
        {
            "name": "json_encoded_geometry_no_alternatives",
            "endpoint": ORS_DIRECTIONS_JSON_ENDPOINT,
            "include_alternatives": False,
            "geometry_format": "encodedpolyline",
        },
        {
            "name": "geojson_endpoint_no_alternatives",
            "endpoint": ORS_DIRECTIONS_GEOJSON_ENDPOINT,
            "include_alternatives": False,
            "geometry_format": "",
        },
    ]

    attempt_logs: List[str] = []
    last_error: Optional[str] = None
    last_status_code: Optional[int] = None

    for attempt in attempts:
        data, error_message, status_code = call_ors_directions_once(
            api_key=api_key,
            endpoint=attempt["endpoint"],
            start_latitude=start_latitude,
            start_longitude=start_longitude,
            destination_latitude=destination_latitude,
            destination_longitude=destination_longitude,
            preference=preference,
            include_alternatives=attempt["include_alternatives"],
            geometry_format=attempt["geometry_format"],
        )

        if error_message:
            last_error = error_message
            last_status_code = status_code
            attempt_logs.append(
                f"{attempt['name']} failed"
                + (f" HTTP {status_code}" if status_code else "")
                + f": {error_message[:180]}"
            )
            continue

        if isinstance(data, dict):
            attempt_logs.append(f"{attempt['name']} succeeded")
            return data, None, status_code, attempt_logs

        last_error = "Invalid response shape"
        last_status_code = status_code
        attempt_logs.append(f"{attempt['name']} returned invalid response shape")

    return None, last_error, last_status_code, attempt_logs


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
            provider_status=STATUS_INVALID_COORDINATES,
        )

    if not is_valid_coordinate(start_lat, start_lng) or not is_valid_coordinate(
        dest_lat,
        dest_lng,
    ):
        return make_provider_error(
            operation="get_routes",
            message="Start or destination coordinates are invalid.",
            provider_status=STATUS_INVALID_COORDINATES,
            details={
                "start_latitude": start_lat,
                "start_longitude": start_lng,
                "destination_latitude": dest_lat,
                "destination_longitude": dest_lng,
            },
        )

    direct_distance_km = calculate_distance_km(
        start_lat,
        start_lng,
        dest_lat,
        dest_lng,
    )

    if direct_distance_km <= SAME_LOCATION_THRESHOLD_KM:
        return make_provider_error(
            operation="get_routes",
            message="Start and destination are the same or too close.",
            provider_status=STATUS_SAME_LOCATION,
            details={
                "same_location": True,
                "distance_km": round(direct_distance_km, 4),
                "threshold_km": SAME_LOCATION_THRESHOLD_KM,
                "start_latitude": start_lat,
                "start_longitude": start_lng,
                "destination_latitude": dest_lat,
                "destination_longitude": dest_lng,
            },
        )

    data, error_message, status_code, attempt_logs = call_ors_directions(
        api_key=api_key,
        start_latitude=start_lat,
        start_longitude=start_lng,
        destination_latitude=dest_lat,
        destination_longitude=dest_lng,
        preference=preference,
    )

    if error_message:
        return make_provider_error(
            operation="get_routes",
            message=(
                "OpenRouteService routing failed"
                + (f" with HTTP {status_code}" if status_code else "")
                + f": {error_message}"
            ),
            provider_status=status_from_http_failure(status_code=status_code),
            details={"attempts": attempt_logs},
        )

    if not isinstance(data, dict):
        return make_provider_error(
            operation="get_routes",
            message="OpenRouteService routing returned invalid response shape.",
            provider_status=STATUS_PROVIDER_INVALID_RESPONSE,
            details={"attempts": attempt_logs},
        )

    route_objects = extract_route_objects(data)

    if not route_objects:
        return make_provider_error(
            operation="get_routes",
            message="OpenRouteService returned no route features/routes.",
            provider_status=STATUS_PROVIDER_NO_ROUTES_FOUND,
            details={"attempts": attempt_logs},
        )

    routes: List[Dict[str, Any]] = []

    for route_index, route_object in enumerate(route_objects):
        route = build_route_from_object(
            route_object=route_object,
            route_index=route_index,
        )

        if route:
            routes.append(route)

    if not routes:
        return make_provider_error(
            operation="get_routes",
            message="OpenRouteService returned route objects, but no valid route geometry.",
            provider_status=STATUS_PROVIDER_INVALID_RESPONSE,
            details={"attempts": attempt_logs},
        )

    response = make_routes_response(routes=routes)
    response["details"] = {"attempts": attempt_logs}
    return response
    