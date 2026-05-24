import json
from typing import Any, Dict, List, Tuple

from fastapi import Request
from starlette.responses import JSONResponse, Response


def _to_float(value: Any, fallback: float = 0.0) -> float:
    try:
        if value is None:
            return fallback
        return float(value)
    except Exception:
        return fallback


def _route_coordinates(route: Dict[str, Any]) -> List[Dict[str, Any]]:
    coordinates = (
        route.get("route_coordinates")
        or route.get("coordinates")
        or route.get("polyline")
        or []
    )

    if not isinstance(coordinates, list):
        return []

    return coordinates


def _point_key(point: Dict[str, Any]) -> Tuple[float, float]:
    lat = _to_float(point.get("latitude", point.get("lat")))
    lng = _to_float(point.get("longitude", point.get("lng")))

    return (round(lat, 5), round(lng, 5))


def _route_signature(route: Dict[str, Any]) -> Tuple[Any, ...]:
    coordinates = _route_coordinates(route)

    if not coordinates:
        return (
            "empty",
            round(_to_float(route.get("distance_km")), 1),
            int(round(_to_float(route.get("estimated_time_min")))),
        )

    first = coordinates[0]
    middle = coordinates[len(coordinates) // 2]
    last = coordinates[-1]

    return (
        len(coordinates),
        _point_key(first),
        _point_key(middle),
        _point_key(last),
        round(_to_float(route.get("distance_km")), 1),
        int(round(_to_float(route.get("estimated_time_min")))),
    )


def _dedupe_routes(routes: Any) -> Tuple[List[Dict[str, Any]], int]:
    if not isinstance(routes, list):
        return [], 0

    seen = set()
    unique_routes = []
    duplicate_count = 0

    for route in routes:
        if not isinstance(route, dict):
            continue

        signature = _route_signature(route)

        if signature in seen:
            duplicate_count += 1
            continue

        seen.add(signature)
        unique_routes.append(route)

    return unique_routes, duplicate_count


def _sync_route_lists(payload: Dict[str, Any]) -> Dict[str, Any]:
    updated = dict(payload)

    source_routes = None

    for key in ["all_routes", "routes", "route_options"]:
        value = updated.get(key)

        if isinstance(value, list) and value:
            source_routes = value
            break

    if not source_routes:
        return updated

    unique_routes, duplicate_count = _dedupe_routes(source_routes)

    if not unique_routes:
        return updated

    for key in ["all_routes", "routes", "route_options"]:
        if isinstance(updated.get(key), list):
            updated[key] = unique_routes

    recommended_route = updated.get("recommended_route")

    if isinstance(recommended_route, dict):
        recommended_id = (
            updated.get("recommended_route_id")
            or recommended_route.get("route_id")
        )

        matching = [
            route for route in unique_routes
            if route.get("route_id") == recommended_id
        ]

        if matching:
            updated["recommended_route"] = matching[0]
            updated["recommended_route_id"] = matching[0].get("route_id")
        else:
            updated["recommended_route"] = unique_routes[0]
            updated["recommended_route_id"] = unique_routes[0].get("route_id")
    else:
        updated["recommended_route"] = unique_routes[0]
        updated["recommended_route_id"] = unique_routes[0].get("route_id")

    updated["route_count"] = len(unique_routes)
    updated["routes_count"] = len(unique_routes)
    updated["total_routes"] = len(unique_routes)
    updated["unique_route_count"] = len(unique_routes)
    updated["duplicate_route_count"] = duplicate_count
    updated["alternatives_available"] = len(unique_routes) > 1
    updated["route_alternatives_deduped"] = duplicate_count > 0

    if duplicate_count > 0:
        updated["message"] = (
            "Only unique real road route alternatives are returned. "
            "Duplicate route geometries were removed."
        )

    return updated


async def _collect_response_body(response: Response) -> bytes:
    chunks = []

    async for chunk in response.body_iterator:
        if isinstance(chunk, bytes):
            chunks.append(chunk)
        else:
            chunks.append(str(chunk).encode("utf-8"))

    return b"".join(chunks)


def register_route_alternative_dedupe_middleware(app):
    @app.middleware("http")
    async def route_alternative_dedupe_middleware(request: Request, call_next):
        method = request.method.upper()
        path = request.url.path

        if method != "POST" or path != "/api/routes/recommend":
            return await call_next(request)

        response = await call_next(request)
        response_body = await _collect_response_body(response)

        headers = dict(response.headers)
        headers.pop("content-length", None)

        try:
            payload = json.loads(response_body.decode("utf-8"))
        except Exception:
            return Response(
                content=response_body,
                status_code=response.status_code,
                headers=headers,
                media_type=response.media_type,
                background=response.background,
            )

        if not isinstance(payload, dict):
            return JSONResponse(
                status_code=response.status_code,
                content=payload,
                headers=headers,
            )

        updated_payload = _sync_route_lists(payload)

        return JSONResponse(
            status_code=response.status_code,
            content=updated_payload,
            headers=headers,
        )
