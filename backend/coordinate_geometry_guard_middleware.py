import json
import math
import os
import urllib.request
from typing import Any, Dict, List, Optional, Tuple

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


def _distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    radius_km = 6371.0
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)

    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(d_lon / 2) ** 2
    )

    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(radius_km * c, 2)


def _profile(vehicle_type: str) -> str:
    vehicle = str(vehicle_type or "car").lower().strip()

    if vehicle in {"walk", "walking", "pedestrian", "foot"}:
        return "foot-walking"

    if vehicle in {"bike", "bicycle", "cycling", "cycle"}:
        return "cycling-regular"

    return "driving-car"


def _read_route_endpoint(start_lat: float, start_lng: float, dest_lat: float, dest_lng: float, vehicle_type: str) -> Dict[str, Any]:
    key = _ors_key()

    if not key:
        raise RuntimeError("OpenRouteService API key missing")

    url = f"{ORS_DIRECTIONS_URL}/{_profile(vehicle_type)}/geojson"

    payload = {
        "coordinates": [
            [start_lng, start_lat],
            [dest_lng, dest_lat],
        ],
        "instructions": True,
        "geometry_simplify": False,
    }

    body = json.dumps(payload).encode("utf-8")

    request = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={
            "Authorization": key,
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "FlowSync/1.0",
        },
    )

    with urllib.request.urlopen(request, timeout=20) as response:
        return json.loads(response.read().decode("utf-8"))


def _convert_ors_route(ors_payload: Dict[str, Any]) -> Dict[str, Any]:
    features = ors_payload.get("features") or []

    if not features:
        raise RuntimeError("ORS returned no features")

    feature = features[0]
    geometry = feature.get("geometry") or {}
    raw_coordinates = geometry.get("coordinates") or []

    if len(raw_coordinates) < 2:
        raise RuntimeError("ORS returned too few route coordinates")

    route_coordinates = []

    for point in raw_coordinates:
        if len(point) < 2:
            continue

        longitude = float(point[0])
        latitude = float(point[1])

        route_coordinates.append(
            {
                "latitude": latitude,
                "longitude": longitude,
                "lat": latitude,
                "lng": longitude,
            }
        )

    properties = feature.get("properties") or {}
    summary = properties.get("summary") or {}

    distance_m = float(summary.get("distance") or 0)
    duration_s = float(summary.get("duration") or 0)

    steps = []
    segments = properties.get("segments") or []

    for segment in segments:
        for step in segment.get("steps") or []:
            way_points = step.get("way_points") or [0, 0]
            point_index = int(way_points[0] or 0)

            if point_index < 0 or point_index >= len(route_coordinates):
                point_index = 0

            coordinate = route_coordinates[point_index]

            steps.append(
                {
                    "step_index": len(steps),
                    "instruction": step.get("instruction") or "Continue",
                    "maneuver": str(step.get("type", "continue")),
                    "street_name": step.get("name") or "",
                    "distance_m": round(float(step.get("distance") or 0), 1),
                    "duration_min": round(float(step.get("duration") or 0) / 60, 1),
                    "latitude": coordinate["latitude"],
                    "longitude": coordinate["longitude"],
                    "coordinate": coordinate,
                    "way_points": way_points,
                }
            )

    estimated_time_min = max(1, int(round(duration_s / 60)))
    distance_km = round(distance_m / 1000, 1)

    return {
        "route_coordinates": route_coordinates,
        "turn_by_turn_steps": steps,
        "coordinate_count": len(route_coordinates),
        "distance_km": distance_km,
        "distance_text": f"{distance_km} km",
        "estimated_time_min": estimated_time_min,
        "eta_text": f"{estimated_time_min} min",
        "duration_min": estimated_time_min,
    }


def _first_last(route: Dict[str, Any]) -> Tuple[Optional[Dict[str, Any]], Optional[Dict[str, Any]]]:
    coordinates = (
        route.get("route_coordinates")
        or route.get("coordinates")
        or route.get("polyline")
        or []
    )

    if not coordinates:
        return None, None

    return coordinates[0], coordinates[-1]


def _route_mismatched(response_payload: Dict[str, Any], start_lat: float, start_lng: float, dest_lat: float, dest_lng: float) -> bool:
    route = response_payload.get("recommended_route") or {}

    first, last = _first_last(route)

    if not first or not last:
        return True

    first_lat = _to_float(first.get("latitude", first.get("lat")))
    first_lng = _to_float(first.get("longitude", first.get("lng")))
    last_lat = _to_float(last.get("latitude", last.get("lat")))
    last_lng = _to_float(last.get("longitude", last.get("lng")))

    if None in {first_lat, first_lng, last_lat, last_lng}:
        return True

    start_distance = _distance_km(start_lat, start_lng, first_lat, first_lng)
    dest_distance = _distance_km(dest_lat, dest_lng, last_lat, last_lng)

    return start_distance > 3.0 or dest_distance > 3.0


def _patch_route_object(route: Dict[str, Any], ors_route: Dict[str, Any], start_distance_before: float, dest_distance_before: float) -> Dict[str, Any]:
    patched = dict(route)

    patched["route_coordinates"] = ors_route["route_coordinates"]
    patched["coordinates"] = ors_route["route_coordinates"]
    patched["polyline"] = ors_route["route_coordinates"]
    patched["turn_by_turn_steps"] = ors_route["turn_by_turn_steps"]
    patched["steps"] = ors_route["turn_by_turn_steps"]

    patched["coordinate_count"] = ors_route["coordinate_count"]
    patched["distance_km"] = ors_route["distance_km"]
    patched["distance_text"] = ors_route["distance_text"]
    patched["estimated_time_min"] = ors_route["estimated_time_min"]
    patched["eta_text"] = ors_route["eta_text"]
    patched["duration_min"] = ors_route["duration_min"]

    patched["real_geometry"] = True
    patched["mock_fallback"] = False
    patched["provider"] = "openrouteservice"
    patched["provider_status"] = "real_routing_success"
    patched["geometry_source"] = "request_coordinates_direct_ors"
    patched["geometry_corrected_from_request_coordinates"] = True
    patched["start_distance_km_before_correction"] = start_distance_before
    patched["destination_distance_km_before_correction"] = dest_distance_before

    return patched


def _patch_response_payload(response_payload: Dict[str, Any], request_payload: Dict[str, Any], ors_route: Dict[str, Any]) -> Dict[str, Any]:
    patched = dict(response_payload)

    start_lat = float(request_payload["start_latitude"])
    start_lng = float(request_payload["start_longitude"])
    dest_lat = float(request_payload["destination_latitude"])
    dest_lng = float(request_payload["destination_longitude"])

    route = patched.get("recommended_route") or {}

    first, last = _first_last(route)

    start_distance_before = 999.0
    dest_distance_before = 999.0

    if first and last:
        first_lat = _to_float(first.get("latitude", first.get("lat")))
        first_lng = _to_float(first.get("longitude", first.get("lng")))
        last_lat = _to_float(last.get("latitude", last.get("lat")))
        last_lng = _to_float(last.get("longitude", last.get("lng")))

        if None not in {first_lat, first_lng}:
            start_distance_before = _distance_km(start_lat, start_lng, first_lat, first_lng)

        if None not in {last_lat, last_lng}:
            dest_distance_before = _distance_km(dest_lat, dest_lng, last_lat, last_lng)

    recommended_route_id = patched.get("recommended_route_id") or route.get("route_id")

    patched["provider"] = "openrouteservice"
    patched["provider_status"] = "real_routing_success"
    patched["real_geometry"] = True
    patched["mock_fallback"] = False
    patched["geometry_source"] = "request_coordinates_direct_ors"
    patched["geometry_corrected_from_request_coordinates"] = True

    if isinstance(route, dict):
        patched["recommended_route"] = _patch_route_object(
            route,
            ors_route,
            start_distance_before,
            dest_distance_before,
        )

    for key in ["all_routes", "routes", "route_options"]:
        routes = patched.get(key)

        if isinstance(routes, list):
            patched_routes = []

            for item in routes:
                if isinstance(item, dict):
                    if item.get("route_id") == recommended_route_id or key in {"all_routes", "routes", "route_options"}:
                        patched_routes.append(
                            _patch_route_object(
                                item,
                                ors_route,
                                start_distance_before,
                                dest_distance_before,
                            )
                        )
                    else:
                        patched_routes.append(item)
                else:
                    patched_routes.append(item)

            patched[key] = patched_routes

    patched["request_start"] = {
        "latitude": start_lat,
        "longitude": start_lng,
    }
    patched["request_destination"] = {
        "latitude": dest_lat,
        "longitude": dest_lng,
    }

    return patched


async def _collect_response_body(response: Response) -> bytes:
    chunks = []

    async for chunk in response.body_iterator:
        if isinstance(chunk, bytes):
            chunks.append(chunk)
        else:
            chunks.append(str(chunk).encode("utf-8"))

    return b"".join(chunks)


def register_coordinate_geometry_guard_middleware(app):
    @app.middleware("http")
    async def coordinate_geometry_guard_middleware(request: Request, call_next):
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

        start_lat = _to_float(request_payload.get("start_latitude"))
        start_lng = _to_float(request_payload.get("start_longitude"))
        dest_lat = _to_float(request_payload.get("destination_latitude"))
        dest_lng = _to_float(request_payload.get("destination_longitude"))

        if None in {start_lat, start_lng, dest_lat, dest_lng}:
            return JSONResponse(
                status_code=response.status_code,
                content=response_payload,
                headers=headers,
            )

        try:
            if not _route_mismatched(response_payload, start_lat, start_lng, dest_lat, dest_lng):
                return JSONResponse(
                    status_code=response.status_code,
                    content=response_payload,
                    headers=headers,
                )

            ors_payload = _read_route_endpoint(
                start_lat,
                start_lng,
                dest_lat,
                dest_lng,
                str(request_payload.get("vehicle_type") or "car"),
            )

            ors_route = _convert_ors_route(ors_payload)
            patched_payload = _patch_response_payload(response_payload, request_payload, ors_route)

            return JSONResponse(
                status_code=200,
                content=patched_payload,
            )

        except Exception as exc:
            response_payload["geometry_guard_failed"] = True
            response_payload["geometry_guard_error"] = str(exc)

            return JSONResponse(
                status_code=response.status_code,
                content=response_payload,
                headers=headers,
            )
