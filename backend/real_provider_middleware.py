import json
import math
import os
import re
import time
import urllib.parse
import urllib.request
from typing import Any, Dict, List, Optional

from fastapi import Request
from fastapi.responses import JSONResponse

from mobile_v2_middleware import TRIP_CACHE


ORS_GEOCODE_URL = "https://api.openrouteservice.org/geocode/search"
ORS_DIRECTIONS_URL = "https://api.openrouteservice.org/v2/directions/driving-car/geojson"


def _now_trip_id() -> str:
    return str(int(time.time() * 1000))


def _clean_text(value: Any) -> str:
    return re.sub(r"[^a-z0-9]+", " ", str(value or "").lower()).strip()


def _provider_enabled() -> bool:
    provider = str(os.getenv("FLOWSYNC_ROUTING_PROVIDER", "")).lower().strip()

    return provider in {"openrouteservice", "ors", "real"} and bool(_ors_key())


def _real_provider_required() -> bool:
    required = str(os.getenv("FLOWSYNC_REQUIRE_REAL_PROVIDER", "")).lower().strip()
    fallback = str(os.getenv("FLOWSYNC_MOCK_FALLBACK", "")).lower().strip()

    return required in {"1", "true", "yes", "on"} or fallback in {"0", "false", "no", "off"}


def _real_provider_error(endpoint: str, message: str, status_code: int = 503) -> JSONResponse:
    return JSONResponse(
        {
            "error": "real_provider_required",
            "endpoint": endpoint,
            "message": message,
            "provider": "openrouteservice",
            "provider_status": "real_provider_unavailable",
            "real_geometry": False,
            "mock_fallback": False,
            "traffic_provider": "none",
            "traffic_provider_status": "no_real_traffic_provider",
            "traffic_is_live": False,
        },
        status_code=status_code,
    )


def _ors_key() -> str:
    return (
        os.getenv("FLOWSYNC_ORS_API_KEY")
        or os.getenv("OPENROUTESERVICE_API_KEY")
        or os.getenv("ORS_API_KEY")
        or ""
    ).strip()


def _http_get_json(url: str, headers: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
    request = urllib.request.Request(
        url,
        headers=headers or {},
        method="GET",
    )

    with urllib.request.urlopen(request, timeout=25) as response:
        return json.loads(response.read().decode("utf-8"))


def _http_post_json(url: str, payload: Dict[str, Any], headers: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
    body = json.dumps(payload).encode("utf-8")

    request = urllib.request.Request(
        url,
        data=body,
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json, application/geo+json",
            **(headers or {}),
        },
        method="POST",
    )

    with urllib.request.urlopen(request, timeout=35) as response:
        return json.loads(response.read().decode("utf-8"))


def _number(value: Any, fallback: float = 0.0) -> float:
    try:
        if value is None:
            return fallback

        return float(value)
    except Exception:
        return fallback


def _coordinate_payload(latitude: float, longitude: float) -> Dict[str, float]:
    return {
        "latitude": round(float(latitude), 6),
        "longitude": round(float(longitude), 6),
        "lat": round(float(latitude), 6),
        "lng": round(float(longitude), 6),
    }


def _parse_inline_coordinate(value: Any) -> Optional[Dict[str, Any]]:
    if isinstance(value, dict):
        lat = value.get("latitude", value.get("lat"))
        lng = value.get("longitude", value.get("lng", value.get("lon")))

        if lat is not None and lng is not None:
            return {
                "name": value.get("name") or "Current location",
                "address": value.get("address") or "GPS location",
                "city": value.get("city") or "UAE",
                "category": value.get("category") or "gps",
                **_coordinate_payload(_number(lat), _number(lng)),
            }

    text = str(value or "").strip()
    match = re.match(r"^\s*(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)\s*$", text)

    if match:
        lat = float(match.group(1))
        lng = float(match.group(3))

        return {
            "name": "GPS coordinate",
            "address": text,
            "city": "UAE",
            "category": "coordinate",
            **_coordinate_payload(lat, lng),
        }

    return None


def _location_from_feature(feature: Dict[str, Any]) -> Dict[str, Any]:
    props = feature.get("properties") or {}
    geometry = feature.get("geometry") or {}
    coordinates = geometry.get("coordinates") or [0, 0]

    lng = coordinates[0]
    lat = coordinates[1]

    label = (
        props.get("label")
        or props.get("name")
        or props.get("street")
        or props.get("locality")
        or "UAE location"
    )

    city = (
        props.get("locality")
        or props.get("county")
        or props.get("region")
        or props.get("country")
        or "UAE"
    )

    category = props.get("layer") or props.get("source") or "place"

    return {
        "name": props.get("name") or label,
        "address": label,
        "city": city,
        "category": category,
        "type": category,
        "provider": "openrouteservice",
        "provider_status": "real_geocoding_success",
        **_coordinate_payload(lat, lng),
    }


def _geocode_place(value: Any, limit: int = 1) -> List[Dict[str, Any]]:
    inline = _parse_inline_coordinate(value)

    if inline:
        return [inline]

    query = str(value or "").strip()

    if not query:
        return []

    search_text = query

    if "uae" not in query.lower() and "united arab emirates" not in query.lower():
        search_text = f"{query}, United Arab Emirates"

    params = urllib.parse.urlencode(
        {
            "api_key": _ors_key(),
            "text": search_text,
            "boundary.country": "AE",
            "size": str(limit),
        }
    )

    payload = _http_get_json(f"{ORS_GEOCODE_URL}?{params}")
    features = payload.get("features") or []

    return [_location_from_feature(feature) for feature in features[:limit]]


def _coords_for_ors(location: Dict[str, Any]) -> List[float]:
    return [
        _number(location.get("longitude", location.get("lng"))),
        _number(location.get("latitude", location.get("lat"))),
    ]


def _to_route_coordinates(raw_coordinates: List[List[float]]) -> List[Dict[str, float]]:
    points = []

    for point in raw_coordinates:
        if isinstance(point, list) and len(point) >= 2:
            lng = point[0]
            lat = point[1]
            points.append(_coordinate_payload(lat, lng))

    return points


def _distance_km(value: Any) -> float:
    distance = _number(value)

    if distance > 300:
        distance = distance / 1000

    return round(distance, 1)


def _step_distance_m(value: Any) -> int:
    distance = _number(value)

    if distance < 100:
        distance = distance * 1000

    return int(round(distance))


def _build_steps(raw_steps: List[Dict[str, Any]], coordinates: List[Dict[str, float]]) -> List[Dict[str, Any]]:
    steps = []

    for index, step in enumerate(raw_steps):
        way_points = step.get("way_points") or [0, 0]
        coord_index = 0

        if isinstance(way_points, list) and way_points:
            coord_index = int(max(0, min(way_points[0], len(coordinates) - 1)))

        coordinate = coordinates[coord_index] if coordinates else None

        steps.append(
            {
                "step_index": index,
                "instruction": step.get("instruction") or f"Continue to step {index + 1}.",
                "distance_m": _step_distance_m(step.get("distance")),
                "duration_min": max(1, int(math.ceil(_number(step.get("duration")) / 60))),
                "maneuver": str(step.get("type", "continue")),
                "road_name": step.get("name") or "Road",
                "latitude": coordinate.get("latitude") if coordinate else None,
                "longitude": coordinate.get("longitude") if coordinate else None,
                "coordinate": coordinate,
                "provider": "openrouteservice",
            }
        )

    return steps


def _route_from_feature(feature: Dict[str, Any], index: int) -> Dict[str, Any]:
    props = feature.get("properties") or {}
    geometry = feature.get("geometry") or {}

    raw_coordinates = geometry.get("coordinates") or []
    route_coordinates = _to_route_coordinates(raw_coordinates)

    summary = props.get("summary") or {}
    segments = props.get("segments") or []

    raw_steps = []

    for segment in segments:
        raw_steps.extend(segment.get("steps") or [])

    steps = _build_steps(raw_steps, route_coordinates)

    distance_km = _distance_km(summary.get("distance"))
    estimated_time_min = max(1, int(math.ceil(_number(summary.get("duration")) / 60)))

    route_score = round(estimated_time_min + (distance_km * 0.15) + (index * 2), 2)
    route_letter = chr(ord("A") + index)
    route_id = f"ROUTE-{route_letter}"

    return {
        "route_id": route_id,
        "route_name": f"Route {route_letter} - Real Road Route",
        "rank": index + 1,
        "is_recommended": index == 0,
        "recommendation_reason": "Real road-following route from OpenRouteService.",
        "estimated_time_min": estimated_time_min,
        "estimated_time": estimated_time_min,
        "eta_text": f"{estimated_time_min} min",
        "distance_km": distance_km,
        "distance_text": f"{distance_km} km",
        "traffic_delay_min": 0,
        "congestion_score": 0,
        "traffic_score": 0,
        "traffic_display": "Real road route • live traffic provider not connected",
        "route_score": route_score,
        "flowsync_score": route_score,
        "assigned_users": 0,
        "road_capacity": 0,
        "load_ratio": 0,
        "load_status": "real_provider",
        "route_coordinates": route_coordinates,
        "coordinates": route_coordinates,
        "polyline": route_coordinates,
        "turn_by_turn_steps": steps,
        "steps": steps,
        "coordinate_count": len(route_coordinates),
        "provider": "openrouteservice",
        "provider_status": "real_routing_success",
        "routing_provider": "openrouteservice",
        "routing_provider_status": "real_routing_success",
        "real_geometry": True,
        "mock_fallback": False,
        "in_app_navigation": True,
        "external_navigation_required": False,
    }


def _same_location(start: Dict[str, Any], destination: Dict[str, Any]) -> bool:
    if not start or not destination:
        return False

    same_name = _clean_text(start.get("name")) and _clean_text(start.get("name")) == _clean_text(destination.get("name"))

    lat_diff = abs(_number(start.get("latitude")) - _number(destination.get("latitude")))
    lng_diff = abs(_number(start.get("longitude")) - _number(destination.get("longitude")))

    return same_name or (lat_diff < 0.0004 and lng_diff < 0.0004)


def _same_location_response(start_location: Any, destination: Any) -> JSONResponse:
    trip_id = _now_trip_id()

    TRIP_CACHE[trip_id] = {
        "trip_id": trip_id,
        "request_id": int(trip_id),
        "start_location": start_location,
        "destination": destination,
        "same_location": True,
        "all_routes": [],
        "recommended_route_id": None,
        "created_at": time.time(),
    }

    return JSONResponse(
        {
            "trip_id": trip_id,
            "request_id": int(trip_id),
            "database_record": {
                "trip_id": trip_id,
                "request_id": int(trip_id),
            },
            "same_location": True,
            "no_route_needed": True,
            "already_at_destination": True,
            "recommended_route_id": None,
            "recommended_route": None,
            "all_routes": [],
            "routes": [],
            "route_count": 0,
            "provider": "openrouteservice",
            "provider_status": "same_location_no_route_needed",
            "message": "Start and destination are the same. You are already at this location.",
            "suggested_action": "show_arrived_state",
        }
    )


async def _handle_real_location_search(request: Request) -> JSONResponse:
    query = str(
        request.query_params.get("q")
        or request.query_params.get("query")
        or ""
    ).strip()

    limit = int(_number(request.query_params.get("limit"), 10))

    results = _geocode_place(query, limit=limit) if query else []

    return JSONResponse(
        {
            "query": query,
            "count": len(results),
            "results": results,
            "locations": results,
            "no_exact_match": len(results) == 0,
            "popular_places": [],
            "provider": "openrouteservice",
            "provider_status": "real_geocoding_success",
            "mock_fallback": False,
        }
    )


async def _handle_real_route_recommend(request: Request) -> JSONResponse:
    body = await request.json()

    start_location = (
        body.get("start_location")
        or body.get("start")
        or body.get("origin")
        or ""
    )

    destination = body.get("destination") or ""

    start_matches = _geocode_place(start_location, limit=1)
    destination_matches = _geocode_place(destination, limit=1)

    if not start_matches or not destination_matches:
        raise RuntimeError("Real geocoding did not return start or destination.")

    start = start_matches[0]
    end = destination_matches[0]

    if _same_location(start, end):
        return _same_location_response(start_location, destination)

    payload = {
        "coordinates": [
            _coords_for_ors(start),
            _coords_for_ors(end),
        ],
        "instructions": True,
        "geometry": True,
        "geometry_simplify": False,
        "units": "km",
        "language": "en",
        "alternative_routes": {
            "target_count": 3,
            "weight_factor": 1.6,
            "share_factor": 0.6,
        },
    }

    provider_payload = _http_post_json(
        ORS_DIRECTIONS_URL,
        payload,
        headers={"Authorization": _ors_key()},
    )

    features = provider_payload.get("features") or []

    if not features:
        raise RuntimeError("OpenRouteService returned no route features.")

    routes = [_route_from_feature(feature, index) for index, feature in enumerate(features)]
    routes.sort(key=lambda route: route.get("route_score", 999999))

    for index, route in enumerate(routes):
        route["rank"] = index + 1
        route["is_recommended"] = index == 0
        route["route_id"] = f"ROUTE-{chr(ord('A') + index)}"
        route["route_name"] = route["route_name"].replace(
            route["route_name"].split(" - ")[0],
            f"Route {chr(ord('A') + index)}",
        )

    trip_id = str(body.get("trip_id") or body.get("request_id") or _now_trip_id())
    request_id = int(_number(trip_id, int(time.time() * 1000)))

    recommended_route = routes[0]
    recommended_route_id = recommended_route["route_id"]

    TRIP_CACHE[trip_id] = {
        "trip_id": trip_id,
        "request_id": request_id,
        "start_location": start_location,
        "destination": destination,
        "start_coordinate": start,
        "destination_coordinate": end,
        "recommended_route_id": recommended_route_id,
        "all_routes": routes,
        "created_at": time.time(),
        "provider": "openrouteservice",
        "provider_status": "real_routing_success",
    }

    return JSONResponse(
        {
            "trip_id": trip_id,
            "request_id": request_id,
            "database_record": {
                "trip_id": trip_id,
                "request_id": request_id,
            },
            "recommended_route_id": recommended_route_id,
            "recommendation_reason": "Best real road-following route from OpenRouteService.",
            "provider": "openrouteservice",
            "provider_status": "real_routing_success",
            "routing_provider": "openrouteservice",
            "routing_provider_status": "real_routing_success",
            "mock_fallback": False,
            "real_geometry": True,
            "start_location": start_location,
            "destination": destination,
            "start_coordinate": start,
            "destination_coordinate": end,
            "recommended_route": recommended_route,
            "all_routes": routes,
            "routes": routes,
            "route_options": routes,
            "route_count": len(routes),
        }
    )


async def _restore_body_and_continue(request: Request, call_next, body_bytes: bytes):
    async def receive():
        return {
            "type": "http.request",
            "body": body_bytes,
            "more_body": False,
        }

    request._receive = receive
    return await call_next(request)



def register_real_provider_middleware(app):
    @app.middleware("http")
    async def real_provider_middleware(request: Request, call_next):
        path = request.url.path
        method = request.method.upper()

        is_real_maps_endpoint = (
            (method == "GET" and path == "/api/locations/search")
            or (method == "POST" and path == "/api/routes/recommend")
        )

        if not _provider_enabled():
            if is_real_maps_endpoint and _real_provider_required():
                if not _ors_key():
                    return _real_provider_error(
                        path,
                        "OpenRouteService API key is missing. Set FLOWSYNC_ORS_API_KEY in Render/local env.",
                        503,
                    )

                return _real_provider_error(
                    path,
                    "Real routing provider is not enabled. Set FLOWSYNC_ROUTING_PROVIDER=openrouteservice.",
                    503,
                )

            return await call_next(request)

        if method == "GET" and path == "/api/locations/search":
            try:
                return await _handle_real_location_search(request)
            except Exception as exc:
                if _real_provider_required():
                    return _real_provider_error(
                        path,
                        f"Real geocoding provider failed: {str(exc)}",
                        502,
                    )

                return await call_next(request)

        if method == "POST" and path == "/api/routes/recommend":
            body_bytes = await request.body()

            try:
                async def receive():
                    return {
                        "type": "http.request",
                        "body": body_bytes,
                        "more_body": False,
                    }

                request._receive = receive
                return await _handle_real_route_recommend(request)

            except Exception as exc:
                if _real_provider_required():
                    return _real_provider_error(
                        path,
                        f"Real routing provider failed: {str(exc)}",
                        502,
                    )

                return await _restore_body_and_continue(request, call_next, body_bytes)

        return await call_next(request)
