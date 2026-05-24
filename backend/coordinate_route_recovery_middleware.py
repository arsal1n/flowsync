import json
import os
import time
import urllib.error
import urllib.request
from typing import Any, Dict, List, Optional

from fastapi import Request
from starlette.responses import JSONResponse, Response


ORS_DIRECTIONS_URL = "https://api.openrouteservice.org/v2/directions"


def _to_float(value: Any) -> Optional[float]:
    try:
        if value is None or value == "":
            return None
        return float(value)
    except Exception:
        return None


def _ors_key() -> str:
    return (
        os.getenv("FLOWSYNC_ORS_API_KEY")
        or os.getenv("OPENROUTESERVICE_API_KEY")
        or ""
    ).strip()


def _profile(vehicle_type: str) -> str:
    vehicle = str(vehicle_type or "car").lower().strip()

    if vehicle in {"walk", "walking", "pedestrian", "foot"}:
        return "foot-walking"

    if vehicle in {"bike", "bicycle", "cycling", "cycle"}:
        return "cycling-regular"

    return "driving-car"


def _has_request_coordinates(payload: Dict[str, Any]) -> bool:
    return (
        _to_float(payload.get("start_latitude")) is not None
        and _to_float(payload.get("start_longitude")) is not None
        and _to_float(payload.get("destination_latitude")) is not None
        and _to_float(payload.get("destination_longitude")) is not None
    )


def _route_coordinates(route: Dict[str, Any]) -> List[Dict[str, Any]]:
    coords = (
        route.get("route_coordinates")
        or route.get("coordinates")
        or route.get("polyline")
        or []
    )

    return coords if isinstance(coords, list) else []


def _payload_has_usable_route(payload: Dict[str, Any]) -> bool:
    recommended = payload.get("recommended_route")

    if isinstance(recommended, dict) and len(_route_coordinates(recommended)) > 1:
        return True

    for key in ["all_routes", "routes", "route_options"]:
        routes = payload.get(key)

        if isinstance(routes, list):
            for route in routes:
                if isinstance(route, dict) and len(_route_coordinates(route)) > 1:
                    return True

    return False


def _call_ors_direct(request_payload: Dict[str, Any]) -> Dict[str, Any]:
    key = _ors_key()

    if not key:
        raise RuntimeError("OpenRouteService API key missing")

    start_lat = float(request_payload["start_latitude"])
    start_lng = float(request_payload["start_longitude"])
    dest_lat = float(request_payload["destination_latitude"])
    dest_lng = float(request_payload["destination_longitude"])

    url = f"{ORS_DIRECTIONS_URL}/{_profile(request_payload.get('vehicle_type') or 'car')}/geojson"

    body = json.dumps(
        {
            "coordinates": [
                [start_lng, start_lat],
                [dest_lng, dest_lat],
            ],
            "instructions": True,
            "geometry_simplify": False,
        }
    ).encode("utf-8")

    request = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={
            "Authorization": key,
            "Content-Type": "application/json",
            "Accept": "application/geo+json, application/json, */*",
            "User-Agent": "FlowSync/1.0",
        },
    )

    with urllib.request.urlopen(request, timeout=20) as response:
        return json.loads(response.read().decode("utf-8"))


def _convert_ors_to_route(ors_payload: Dict[str, Any], request_payload: Dict[str, Any]) -> Dict[str, Any]:
    features = ors_payload.get("features") or []

    if not features:
        raise RuntimeError("ORS returned no route features")

    feature = features[0]
    geometry = feature.get("geometry") or {}
    raw_coords = geometry.get("coordinates") or []

    if len(raw_coords) < 2:
        raise RuntimeError("ORS returned too few route coordinates")

    route_coordinates = []

    for point in raw_coords:
        if len(point) < 2:
            continue

        lng = float(point[0])
        lat = float(point[1])

        route_coordinates.append(
            {
                "latitude": lat,
                "longitude": lng,
                "lat": lat,
                "lng": lng,
            }
        )

    if len(route_coordinates) < 2:
        raise RuntimeError("Converted ORS route has too few coordinates")

    properties = feature.get("properties") or {}
    summary = properties.get("summary") or {}

    distance_m = float(summary.get("distance") or 0)
    duration_s = float(summary.get("duration") or 0)

    distance_km = round(distance_m / 1000, 1)
    estimated_time_min = max(1, int(round(duration_s / 60)))

    steps = []
    segments = properties.get("segments") or []

    for segment in segments:
        for step in segment.get("steps") or []:
            way_points = step.get("way_points") or [0, 0]
            point_index = int(way_points[0] or 0)

            if point_index < 0 or point_index >= len(route_coordinates):
                point_index = 0

            coord = route_coordinates[point_index]

            steps.append(
                {
                    "step_index": len(steps),
                    "instruction": step.get("instruction") or "Continue",
                    "maneuver": str(step.get("type", "continue")),
                    "street_name": step.get("name") or "",
                    "distance_m": round(float(step.get("distance") or 0), 1),
                    "duration_min": round(float(step.get("duration") or 0) / 60, 1),
                    "latitude": coord["latitude"],
                    "longitude": coord["longitude"],
                    "coordinate": coord,
                    "way_points": way_points,
                }
            )

    if not steps:
        steps = [
            {
                "step_index": 0,
                "instruction": "Start navigation",
                "maneuver": "start",
                "street_name": "",
                "distance_m": 0,
                "duration_min": 0,
                "latitude": route_coordinates[0]["latitude"],
                "longitude": route_coordinates[0]["longitude"],
                "coordinate": route_coordinates[0],
            },
            {
                "step_index": 1,
                "instruction": "Arrive at destination",
                "maneuver": "arrive",
                "street_name": "",
                "distance_m": 0,
                "duration_min": 0,
                "latitude": route_coordinates[-1]["latitude"],
                "longitude": route_coordinates[-1]["longitude"],
                "coordinate": route_coordinates[-1],
            },
        ]

    route = {
        "route_id": "ROUTE-A",
        "route_public_id": "ROUTE-A",
        "route_name": "Route A - Real Road Route",
        "estimated_time_min": estimated_time_min,
        "eta_text": f"{estimated_time_min} min",
        "distance_km": distance_km,
        "distance_text": f"{distance_km} km",
        "traffic_delay_min": 0,
        "congestion_score": 0,
        "traffic_display": "Real road route • live traffic enrichment pending",
        "route_score": round(max(1, 100 - estimated_time_min), 2),
        "flowsync_score": round(max(1, 100 - estimated_time_min), 2),
        "assigned_users": 0,
        "road_capacity": 0,
        "load_ratio": 0,
        "load_status": "real_provider",
        "is_recommended": True,
        "recommendation_reason": "Recovered real ORS route directly from request coordinates.",
        "route_coordinates": route_coordinates,
        "coordinates": route_coordinates,
        "polyline": route_coordinates,
        "turn_by_turn_steps": steps,
        "steps": steps,
        "coordinate_count": len(route_coordinates),
        "real_geometry": True,
        "mock_fallback": False,
        "provider": "openrouteservice",
        "provider_status": "real_routing_success",
        "geometry_source": "coordinate_empty_route_recovery_ors",
        "route_recovered_from_request_coordinates": True,
        "in_app_navigation": True,
        "external_navigation_required": False,
        "alerts": [],
        "incidents": [],
    }

    return route


def _clean_no_route_response(request_payload: Dict[str, Any], error_message: str) -> Dict[str, Any]:
    return {
        "success": False,
        "provider": "openrouteservice",
        "provider_status": "provider_no_routes_found",
        "routing_provider": "openrouteservice",
        "routing_provider_status": "provider_no_routes_found",
        "error": "no_drivable_route_found",
        "message": "No drivable route found to the selected destination. Please choose a nearby road-accessible location.",
        "provider_error": error_message,
        "same_location": False,
        "no_route_needed": False,
        "recommended_route": None,
        "recommended_route_id": None,
        "routes": [],
        "all_routes": [],
        "route_options": [],
        "real_geometry": False,
        "mock_fallback": False,
        "in_app_navigation": False,
        "external_navigation_required": False,
        "request_start": {
            "latitude": _to_float(request_payload.get("start_latitude")),
            "longitude": _to_float(request_payload.get("start_longitude")),
        },
        "request_destination": {
            "latitude": _to_float(request_payload.get("destination_latitude")),
            "longitude": _to_float(request_payload.get("destination_longitude")),
        },
    }


def _build_recovered_payload(original_payload: Dict[str, Any], request_payload: Dict[str, Any], route: Dict[str, Any]) -> Dict[str, Any]:
    trip_id = (
        original_payload.get("trip_id")
        or original_payload.get("request_id")
        or int(time.time() * 1000)
    )

    payload = dict(original_payload)

    payload.update(
        {
            "success": True,
            "trip_id": trip_id,
            "request_id": trip_id,
            "provider": "openrouteservice",
            "provider_status": "real_routing_success",
            "routing_provider": "openrouteservice",
            "routing_provider_status": "real_routing_success",
            "message": "Recovered real ORS route directly from request coordinates.",
            "same_location": False,
            "no_route_needed": False,
            "recommended_route": route,
            "recommended_route_id": route["route_id"],
            "routes": [route],
            "all_routes": [route],
            "route_options": [route],
            "route_count": 1,
            "routes_count": 1,
            "total_routes": 1,
            "unique_route_count": 1,
            "alternatives_available": False,
            "real_geometry": True,
            "mock_fallback": False,
            "in_app_navigation": True,
            "external_navigation_required": False,
            "geometry_source": "coordinate_empty_route_recovery_ors",
            "route_recovered_from_request_coordinates": True,
            "request_start": {
                "latitude": float(request_payload["start_latitude"]),
                "longitude": float(request_payload["start_longitude"]),
            },
            "request_destination": {
                "latitude": float(request_payload["destination_latitude"]),
                "longitude": float(request_payload["destination_longitude"]),
            },
        }
    )

    return payload


async def _collect_response_body(response: Response) -> bytes:
    chunks = []

    async for chunk in response.body_iterator:
        if isinstance(chunk, bytes):
            chunks.append(chunk)
        else:
            chunks.append(str(chunk).encode("utf-8"))

    return b"".join(chunks)


def register_coordinate_route_recovery_middleware(app):
    @app.middleware("http")
    async def coordinate_route_recovery_middleware(request: Request, call_next):
        method = request.method.upper()
        path = request.url.path

        if method != "POST" or path != "/api/routes/recommend":
            return await call_next(request)

        request_body = await request.body()

        try:
            request_payload = json.loads(request_body.decode("utf-8")) if request_body else {}
        except Exception:
            request_payload = {}

        async def receive():
            return {
                "type": "http.request",
                "body": request_body,
                "more_body": False,
            }

        request._receive = receive

        response = await call_next(request)
        response_body = await _collect_response_body(response)

        headers = dict(response.headers)
        headers.pop("content-length", None)

        try:
            response_payload = json.loads(response_body.decode("utf-8"))
        except Exception:
            return Response(
                content=response_body,
                status_code=response.status_code,
                headers=headers,
                media_type=response.media_type,
                background=response.background,
            )

        if not isinstance(request_payload, dict) or not isinstance(response_payload, dict):
            return JSONResponse(
                status_code=response.status_code,
                content=response_payload,
                headers=headers,
            )

        if not _has_request_coordinates(request_payload):
            return JSONResponse(
                status_code=response.status_code,
                content=response_payload,
                headers=headers,
            )

        if _payload_has_usable_route(response_payload):
            return JSONResponse(
                status_code=response.status_code,
                content=response_payload,
                headers=headers,
            )

        try:
            ors_payload = _call_ors_direct(request_payload)
            recovered_route = _convert_ors_to_route(ors_payload, request_payload)
            recovered_payload = _build_recovered_payload(response_payload, request_payload, recovered_route)

            return JSONResponse(
                status_code=200,
                content=recovered_payload,
            )

        except urllib.error.HTTPError as exc:
            try:
                error_body = exc.read().decode("utf-8")
            except Exception:
                error_body = str(exc)

            clean_error = _clean_no_route_response(request_payload, f"HTTP {exc.code}: {error_body}")

            return JSONResponse(
                status_code=404,
                content=clean_error,
            )

        except Exception as exc:
            clean_error = _clean_no_route_response(request_payload, str(exc))

            return JSONResponse(
                status_code=404,
                content=clean_error,
            )
