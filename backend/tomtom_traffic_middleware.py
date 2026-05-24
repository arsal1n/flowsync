import json
import os
import time
import urllib.parse
import urllib.request
from typing import Any, Dict, List, Optional, Tuple

from fastapi import Request
from starlette.responses import JSONResponse, Response


TOMTOM_FLOW_URL = "https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json"

_CACHE: Dict[str, Tuple[float, Dict[str, Any]]] = {}


def _enabled() -> bool:
    return (
        os.getenv("FLOWSYNC_TRAFFIC_ENABLED", "false").lower() == "true"
        and os.getenv("FLOWSYNC_TRAFFIC_PROVIDER", "").lower() == "tomtom"
        and bool(_tomtom_key())
    )


def _tomtom_key() -> str:
    return (
        os.getenv("FLOWSYNC_TOMTOM_API_KEY")
        or os.getenv("TOMTOM_API_KEY")
        or ""
    ).strip()


def _sample_count() -> int:
    try:
        return max(3, min(int(os.getenv("FLOWSYNC_TRAFFIC_SAMPLE_POINTS", "10")), 15))
    except Exception:
        return 10


def _cache_seconds() -> int:
    try:
        return max(60, min(int(os.getenv("FLOWSYNC_TRAFFIC_CACHE_SECONDS", "300")), 900))
    except Exception:
        return 300


def _to_float(value: Any, fallback: float = 0.0) -> float:
    try:
        if value is None:
            return fallback
        return float(value)
    except Exception:
        return fallback


def _route_coordinates(route: Dict[str, Any]) -> List[Dict[str, Any]]:
    coords = route.get("route_coordinates") or route.get("coordinates") or route.get("polyline") or []
    return coords if isinstance(coords, list) else []


def _sample_route_points(coords: List[Dict[str, Any]], max_points: int) -> List[Tuple[int, float, float]]:
    if not coords:
        return []

    if len(coords) <= max_points:
        raw_indexes = list(range(len(coords)))
    else:
        raw_indexes = []
        last = len(coords) - 1

        for i in range(max_points):
            raw_indexes.append(round(i * last / (max_points - 1)))

    seen = set()
    samples = []

    for index in raw_indexes:
        if index in seen:
            continue

        seen.add(index)
        point = coords[index]

        lat = _to_float(point.get("latitude", point.get("lat")))
        lng = _to_float(point.get("longitude", point.get("lng")))

        if lat and lng:
            samples.append((index, lat, lng))

    return samples


def _cache_key(lat: float, lng: float) -> str:
    return f"{round(lat, 4)},{round(lng, 4)}"


def _get_cached_flow(lat: float, lng: float) -> Optional[Dict[str, Any]]:
    key = _cache_key(lat, lng)
    cached = _CACHE.get(key)

    if not cached:
        return None

    created_at, payload = cached

    if time.time() - created_at > _cache_seconds():
        _CACHE.pop(key, None)
        return None

    return payload


def _set_cached_flow(lat: float, lng: float, payload: Dict[str, Any]) -> None:
    _CACHE[_cache_key(lat, lng)] = (time.time(), payload)


def _tomtom_flow_segment(lat: float, lng: float) -> Dict[str, Any]:
    cached = _get_cached_flow(lat, lng)

    if cached:
        return cached

    params = urllib.parse.urlencode(
        {
            "key": _tomtom_key(),
            "point": f"{lat},{lng}",
            "unit": "kmph",
        }
    )

    url = f"{TOMTOM_FLOW_URL}?{params}"

    request = urllib.request.Request(
        url,
        headers={
            "Accept": "application/json",
            "User-Agent": "FlowSync/1.0",
        },
    )

    with urllib.request.urlopen(request, timeout=10) as response:
        payload = json.loads(response.read().decode("utf-8"))

    _set_cached_flow(lat, lng, payload)
    return payload


def _segment_from_flow(index: int, lat: float, lng: float, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    data = payload.get("flowSegmentData") or {}

    if not data:
        return None

    current_speed = _to_float(data.get("currentSpeed"))
    free_speed = _to_float(data.get("freeFlowSpeed"))
    current_time = _to_float(data.get("currentTravelTime"))
    free_time = _to_float(data.get("freeFlowTravelTime"))
    confidence = _to_float(data.get("confidence"))
    road_closure = bool(data.get("roadClosure", False))

    delay_seconds = max(0.0, current_time - free_time)

    if free_speed > 0:
        speed_ratio = max(0.0, min(current_speed / free_speed, 1.5))
    else:
        speed_ratio = 1.0

    if road_closure:
        congestion = 100
    else:
        congestion = int(max(0, min((1 - min(speed_ratio, 1.0)) * 100, 100)))

    return {
        "point_index": index,
        "latitude": lat,
        "longitude": lng,
        "currentSpeed": current_speed,
        "freeFlowSpeed": free_speed,
        "currentTravelTime": current_time,
        "freeFlowTravelTime": free_time,
        "delaySeconds": round(delay_seconds, 1),
        "confidence": confidence,
        "roadClosure": road_closure,
        "congestion_score": congestion,
    }


def _traffic_display(congestion_score: int, delay_min: int, live: bool) -> str:
    if not live:
        return "Real road route • live traffic unavailable"

    if congestion_score >= 70:
        level = "Heavy traffic"
    elif congestion_score >= 35:
        level = "Moderate traffic"
    elif congestion_score >= 15:
        level = "Light traffic"
    else:
        level = "Clear traffic"

    if delay_min > 0:
        return f"{level} • +{delay_min} min delay"

    return f"{level} • live traffic"


def _enrich_route(route: Dict[str, Any]) -> Dict[str, Any]:
    updated = dict(route)
    coords = _route_coordinates(updated)

    if not _enabled() or not coords:
        updated["traffic_provider"] = "tomtom"
        updated["traffic_status"] = "traffic_not_enabled"
        updated["live_traffic"] = False
        updated["traffic_segments"] = []
        updated["incidents"] = updated.get("incidents") or []
        updated["traffic_display"] = updated.get("traffic_display") or "Real road route • live traffic unavailable"
        return updated

    samples = _sample_route_points(coords, _sample_count())
    segments = []

    for index, lat, lng in samples:
        try:
            payload = _tomtom_flow_segment(lat, lng)
            segment = _segment_from_flow(index, lat, lng, payload)

            if segment:
                segments.append(segment)

        except Exception as exc:
            print(f"[tomtom_traffic] sample failed at {lat},{lng}: {exc}")

    if not segments:
        updated["traffic_provider"] = "tomtom"
        updated["traffic_status"] = "traffic_provider_failed"
        updated["live_traffic"] = False
        updated["traffic_segments"] = []
        updated["incidents"] = updated.get("incidents") or []
        updated["traffic_delay_min"] = 0
        updated["congestion_score"] = updated.get("congestion_score", 0)
        updated["traffic_display"] = "Real road route • live traffic unavailable"
        return updated

    avg_congestion = round(sum(item["congestion_score"] for item in segments) / len(segments))
    avg_delay_seconds = sum(item["delaySeconds"] for item in segments) / len(segments)

    base_eta_min = int(round(_to_float(updated.get("estimated_time_min") or updated.get("duration_min"), 0)))

    delay_ratio = 0.0
    valid_ratio_count = 0

    for item in segments:
        free_time = _to_float(item.get("freeFlowTravelTime"))
        delay = _to_float(item.get("delaySeconds"))

        if free_time > 0:
            delay_ratio += delay / free_time
            valid_ratio_count += 1

    if valid_ratio_count > 0:
        delay_ratio = delay_ratio / valid_ratio_count
    else:
        delay_ratio = 0.0

    traffic_delay_min = int(round(max(0, min(base_eta_min * delay_ratio, 45))))

    updated["traffic_provider"] = "tomtom"
    updated["traffic_status"] = "live_traffic_success"
    updated["live_traffic"] = True
    updated["traffic_segments"] = segments
    updated["traffic_samples"] = len(segments)
    updated["traffic_delay_min"] = traffic_delay_min
    updated["congestion_score"] = avg_congestion
    updated["traffic_display"] = _traffic_display(avg_congestion, traffic_delay_min, True)
    updated["incidents"] = updated.get("incidents") or []

    return updated


def _enrich_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
    updated = dict(payload)

    route_keys = ["all_routes", "routes", "route_options"]

    for key in route_keys:
        routes = updated.get(key)

        if isinstance(routes, list):
            updated[key] = [
                _enrich_route(route) if isinstance(route, dict) else route
                for route in routes
            ]

    recommended = updated.get("recommended_route")

    if isinstance(recommended, dict):
        recommended_id = updated.get("recommended_route_id") or recommended.get("route_id")

        matched = None

        for key in route_keys:
            routes = updated.get(key)

            if isinstance(routes, list):
                for route in routes:
                    if isinstance(route, dict) and route.get("route_id") == recommended_id:
                        matched = route
                        break

            if matched:
                break

        updated["recommended_route"] = matched or _enrich_route(recommended)

        top_route = updated["recommended_route"]

        updated["traffic_provider"] = top_route.get("traffic_provider")
        updated["traffic_status"] = top_route.get("traffic_status")
        updated["live_traffic"] = top_route.get("live_traffic")
        updated["traffic_delay_min"] = top_route.get("traffic_delay_min")
        updated["congestion_score"] = top_route.get("congestion_score")
        updated["traffic_display"] = top_route.get("traffic_display")
        updated["traffic_segments"] = top_route.get("traffic_segments", [])
        updated["incidents"] = top_route.get("incidents", [])

    return updated


async def _collect_response_body(response: Response) -> bytes:
    chunks = []

    async for chunk in response.body_iterator:
        if isinstance(chunk, bytes):
            chunks.append(chunk)
        else:
            chunks.append(str(chunk).encode("utf-8"))

    return b"".join(chunks)


def register_tomtom_traffic_middleware(app):
    @app.middleware("http")
    async def tomtom_traffic_middleware(request: Request, call_next):
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

        try:
            enriched = _enrich_payload(payload)

            return JSONResponse(
                status_code=response.status_code,
                content=enriched,
                headers=headers,
            )

        except Exception as exc:
            payload["traffic_provider"] = "tomtom"
            payload["traffic_status"] = "traffic_enrichment_failed"
            payload["live_traffic"] = False
            payload["traffic_error"] = str(exc)

            return JSONResponse(
                status_code=response.status_code,
                content=payload,
                headers=headers,
            )
