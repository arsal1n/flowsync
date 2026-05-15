import re
import time
from typing import Any, Dict, List, Optional

from fastapi import Request
from fastapi.responses import JSONResponse

from routing_provider import get_provider_route_options


TRIP_CACHE: Dict[str, Dict[str, Any]] = {}
SESSION_CACHE: Dict[str, Dict[str, Any]] = {}


def now_id(prefix: str) -> str:
    return f"{prefix}-{int(time.time() * 1000)}"


def load_store() -> None:
    return None


def save_store() -> None:
    return None


def number(value: Any, fallback: Any = 0.0) -> Any:
    try:
        if value is None:
            return fallback

        return float(value)
    except Exception:
        return fallback


def route_letter(route_name: str, index: int) -> str:
    match = re.search(r"Route\s+([A-Z])", route_name or "", re.IGNORECASE)

    if match:
        return match.group(1).upper()

    return chr(ord("A") + index)


def route_id_for(route: Dict[str, Any], index: int) -> str:
    existing = route.get("route_id") or route.get("id")

    if existing:
        return str(existing)

    route_name = str(route.get("route_name") or route.get("name") or "")

    return f"ROUTE-{route_letter(route_name, index)}"


def normalize_coordinates(route: Dict[str, Any]) -> List[Dict[str, float]]:
    raw = (
        route.get("route_coordinates")
        or route.get("coordinates")
        or route.get("polyline")
        or []
    )

    normalized = []

    if not isinstance(raw, list):
        return normalized

    for point in raw:
        if isinstance(point, dict):
            lat = number(point.get("latitude", point.get("lat")), None)
            lng = number(point.get("longitude", point.get("lng")), None)

            if lat is not None and lng is not None:
                normalized.append(
                    {
                        "latitude": round(lat, 6),
                        "longitude": round(lng, 6),
                        "lat": round(lat, 6),
                        "lng": round(lng, 6),
                    }
                )

        elif isinstance(point, (list, tuple)) and len(point) >= 2:
            lat = number(point[0], None)
            lng = number(point[1], None)

            if lat is not None and lng is not None:
                normalized.append(
                    {
                        "latitude": round(lat, 6),
                        "longitude": round(lng, 6),
                        "lat": round(lat, 6),
                        "lng": round(lng, 6),
                    }
                )

    return normalized


def normalize_steps(route: Dict[str, Any]) -> List[Dict[str, Any]]:
    raw = (
        route.get("turn_by_turn_steps")
        or route.get("turn_steps")
        or route.get("steps")
        or []
    )

    steps = []

    if not isinstance(raw, list):
        return steps

    for index, step in enumerate(raw):
        if not isinstance(step, dict):
            continue

        coordinate = step.get("coordinate") or {}

        lat = number(
            step.get(
                "latitude",
                step.get("lat", coordinate.get("latitude", coordinate.get("lat"))),
            ),
            None,
        )

        lng = number(
            step.get(
                "longitude",
                step.get("lng", coordinate.get("longitude", coordinate.get("lng"))),
            ),
            None,
        )

        step_payload = {
            "step_index": index,
            "instruction": step.get("instruction")
            or step.get("text")
            or f"Continue to step {index + 1}.",
            "distance_m": int(number(step.get("distance_m", step.get("distance", 500)), 500)),
            "duration_min": int(number(step.get("duration_min", step.get("duration", 2)), 2)),
            "maneuver": step.get("maneuver") or "continue",
            "road_name": step.get("road_name") or step.get("name") or "FlowSync route",
            "latitude": lat,
            "longitude": lng,
        }

        if lat is not None and lng is not None:
            step_payload["coordinate"] = {
                "latitude": lat,
                "longitude": lng,
                "lat": lat,
                "lng": lng,
            }

        steps.append(step_payload)

    return steps


def traffic_label(score: float) -> str:
    if score >= 8:
        return "Heavy"
    if score >= 6:
        return "Moderate"
    if score >= 4:
        return "Light"

    return "Clear"


def traffic_display(score: float) -> str:
    return f"{traffic_label(score)} traffic • {int(score)}/10"


def route_score(route: Dict[str, Any]) -> float:
    estimated_time_min = number(
        route.get("estimated_time_min", route.get("estimated_time", route.get("duration_min"))),
        0,
    )

    congestion_score = number(
        route.get("congestion_score", route.get("traffic_score")),
        0,
    )

    assigned_users = number(route.get("assigned_users"), max(1, congestion_score))

    traffic_delay_min = number(
        route.get("traffic_delay_min"),
        max(0, congestion_score - 3) * 2,
    )

    incident_penalty = number(route.get("incident_penalty"), 0)

    incidents = route.get("incidents") or []
    alerts = route.get("alerts") or []

    if isinstance(incidents, list):
        incident_penalty += len(incidents) * 4

    if isinstance(alerts, list):
        incident_penalty += len(
            [
                alert
                for alert in alerts
                if isinstance(alert, dict)
                and str(alert.get("severity", "")).lower() == "high"
            ]
        ) * 3

    road_closure_penalty = number(route.get("road_closure_penalty"), 0)

    if route.get("road_closed") is True:
        road_closure_penalty += 999

    score = (
        estimated_time_min
        + traffic_delay_min
        + congestion_score * 2
        + assigned_users * 1.5
        + incident_penalty
        + road_closure_penalty
    )

    return round(score, 2)


def normalize_route(route: Dict[str, Any], index: int) -> Dict[str, Any]:
    next_route = dict(route)

    route_id = route_id_for(next_route, index)
    route_name = next_route.get("route_name") or next_route.get("name") or route_id

    estimated_time_min = int(
        number(
            next_route.get(
                "estimated_time_min",
                next_route.get("estimated_time", next_route.get("duration_min")),
            ),
            0,
        )
    )

    distance_km = round(number(next_route.get("distance_km"), 0), 1)

    congestion_score = int(
        number(next_route.get("congestion_score", next_route.get("traffic_score")), 0)
    )

    traffic_delay_min = int(
        number(next_route.get("traffic_delay_min"), max(0, congestion_score - 3) * 2)
    )

    assigned_users = int(number(next_route.get("assigned_users"), max(1, congestion_score)))
    road_capacity = int(number(next_route.get("road_capacity"), 20))
    load_ratio = round(assigned_users / road_capacity, 2) if road_capacity else 0

    if load_ratio >= 0.85:
        load_status = "high"
    elif load_ratio >= 0.55:
        load_status = "medium"
    else:
        load_status = "low"

    coordinates = normalize_coordinates(next_route)
    steps = normalize_steps(next_route)

    next_route.update(
        {
            "route_id": route_id,
            "route_name": route_name,
            "estimated_time_min": estimated_time_min,
            "eta_text": f"{estimated_time_min} min",
            "distance_km": distance_km,
            "distance_text": f"{distance_km} km",
            "traffic_delay_min": traffic_delay_min,
            "congestion_score": congestion_score,
            "traffic_score": congestion_score,
            "traffic_display": next_route.get("traffic_display")
            or traffic_display(congestion_score),
            "assigned_users": assigned_users,
            "road_capacity": road_capacity,
            "load_ratio": load_ratio,
            "load_status": load_status,
            "route_coordinates": coordinates,
            "coordinates": coordinates,
            "polyline": coordinates,
            "turn_by_turn_steps": steps,
            "steps": steps,
            "in_app_navigation": True,
            "external_navigation_required": False,
        }
    )

    score = route_score(next_route)

    next_route["route_score"] = score
    next_route["flowsync_score"] = score
    next_route["recommendation_score"] = score
    next_route["is_recommended"] = False

    return next_route


def rank_routes(routes: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    normalized = [normalize_route(route, index) for index, route in enumerate(routes)]
    normalized.sort(key=lambda item: item.get("route_score", 999999))

    for index, route in enumerate(normalized):
        route["rank"] = index + 1
        route["is_recommended"] = index == 0

        if index == 0:
            route["recommendation_reason"] = (
                "Best balanced FlowSync route based on ETA, traffic delay, congestion, route load, incidents, and road capacity."
            )
        else:
            route["recommendation_reason"] = (
                "Alternative route ranked by ETA, traffic delay, congestion, route load, incidents, and road capacity."
            )

    return normalized


def find_route(routes: List[Dict[str, Any]], selected_route_id: Optional[str]) -> Dict[str, Any]:
    if selected_route_id:
        selected = str(selected_route_id).upper()

        for route in routes:
            if str(route.get("route_id", "")).upper() == selected:
                return route

    for route in routes:
        if route.get("is_recommended"):
            return route

    return routes[0] if routes else {}


async def read_json(request: Request) -> Dict[str, Any]:
    try:
        payload = await request.json()

        if isinstance(payload, dict):
            return payload

        return {}
    except Exception:
        return {}


async def handle_recommend(request: Request) -> JSONResponse:
    body = await read_json(request)

    start_location = (
        body.get("start_location")
        or body.get("start")
        or body.get("origin")
        or "Dubai Mall"
    )

    destination = body.get("destination") or "Dubai Marina"

    provider_result = get_provider_route_options(start_location, destination)
    raw_routes = provider_result.get("routes") or []

    ranked_routes = rank_routes(raw_routes)

    trip_id = str(body.get("trip_id") or body.get("request_id") or now_id("TRIP"))
    request_id = trip_id

    recommended_route = ranked_routes[0] if ranked_routes else {}
    recommended_route_id = recommended_route.get("route_id")

    TRIP_CACHE[trip_id] = {
        "trip_id": trip_id,
        "request_id": request_id,
        "start_location": start_location,
        "destination": destination,
        "recommended_route_id": recommended_route_id,
        "all_routes": ranked_routes,
        "created_at": time.time(),
    }

    save_store()

    return JSONResponse(
        {
            "trip_id": trip_id,
            "request_id": request_id,
            "database_record": {
                "trip_id": trip_id,
                "request_id": request_id,
            },
            "recommended_route_id": recommended_route_id,
            "recommendation_reason": (
                "Best balanced FlowSync route based on ETA, traffic delay, congestion, route load, incidents, and road capacity."
            ),
            "routing_provider": provider_result.get("provider", "flowsync_simulated"),
            "routing_provider_status": "in_app_navigation_best_route_ranked",
            "provider": provider_result.get("provider", "flowsync_simulated"),
            "provider_status": "in_app_navigation_best_route_ranked",
            "best_route_strategy": "eta_traffic_delay_congestion_load_incidents_capacity",
            "recommended_route": recommended_route,
            "all_routes": ranked_routes,
            "routes": ranked_routes,
            "route_options": ranked_routes,
            "route_count": len(ranked_routes),
        }
    )


async def handle_start(request: Request) -> JSONResponse:
    body = await read_json(request)

    trip_id = str(body.get("trip_id") or body.get("request_id") or now_id("TRIP"))
    request_id = trip_id

    selected_route_id = (
        body.get("selected_route_id")
        or body.get("route_id")
        or (body.get("selected_route") if isinstance(body.get("selected_route"), str) else None)
    )

    trip = TRIP_CACHE.get(trip_id)

    if not trip:
        start_location = body.get("start_location") or "Dubai Mall"
        destination = body.get("destination") or "Dubai Marina"

        provider_result = get_provider_route_options(start_location, destination)
        ranked_routes = rank_routes(provider_result.get("routes") or [])

        trip = {
            "trip_id": trip_id,
            "request_id": request_id,
            "start_location": start_location,
            "destination": destination,
            "recommended_route_id": ranked_routes[0].get("route_id") if ranked_routes else None,
            "all_routes": ranked_routes,
        }

        TRIP_CACHE[trip_id] = trip

    routes = trip.get("all_routes") or []

    if body.get("selected_route") and isinstance(body.get("selected_route"), dict):
        selected_route = normalize_route(body["selected_route"], 0)
    elif body.get("route") and isinstance(body.get("route"), dict):
        selected_route = normalize_route(body["route"], 0)
    else:
        selected_route = find_route(routes, selected_route_id)

    selected_route_id = selected_route.get("route_id")
    session_id = str(body.get("session_id") or now_id("NAV"))

    session = {
        "session_id": session_id,
        "trip_id": trip_id,
        "request_id": request_id,
        "selected_route_id": selected_route_id,
        "status": "active",
        "route": selected_route,
        "current_step_index": 0,
        "progress_percentage": 0,
        "remaining_distance_km": selected_route.get("distance_km", 0),
        "remaining_time_min": selected_route.get("estimated_time_min", 0),
        "started_at": time.time(),
    }

    SESSION_CACHE[session_id] = session
    save_store()

    session_response = {
        "session_id": session_id,
        "trip_id": trip_id,
        "request_id": request_id,
        "selected_route_id": selected_route_id,
        "status": "active",
        "current_step_index": 0,
        "progress_percentage": 0,
        "remaining_distance_km": selected_route.get("distance_km", 0),
        "remaining_time_min": selected_route.get("estimated_time_min", 0),
        "route_id": selected_route_id,
        "route_name": selected_route.get("route_name"),
    }

    return JSONResponse(
        {
            "session": session_response,
            "navigation_session": session_response,
            "session_id": session_id,
            "trip_id": trip_id,
            "request_id": request_id,
            "selected_route_id": selected_route_id,
            "status": "active",
            "route_id": selected_route_id,
            "route_name": selected_route.get("route_name"),
            "route_coordinates": selected_route.get("route_coordinates", []),
            "coordinates": selected_route.get("route_coordinates", []),
            "turn_by_turn_steps": selected_route.get("turn_by_turn_steps", []),
            "steps": selected_route.get("turn_by_turn_steps", []),
            "estimated_time_min": selected_route.get("estimated_time_min", 0),
            "eta_text": selected_route.get("eta_text"),
            "distance_km": selected_route.get("distance_km", 0),
            "distance_text": selected_route.get("distance_text"),
            "traffic_display": selected_route.get("traffic_display"),
            "selected_route": selected_route,
        }
    )


async def handle_session_detail(request: Request) -> JSONResponse:
    session_id = request.url.path.rstrip("/").split("/")[-1]
    session = SESSION_CACHE.get(session_id)

    if not session:
        return JSONResponse(
            {
                "detail": "Navigation session not found.",
                "error": "session_not_found",
                "message": "Navigation session was not found.",
            },
            status_code=404,
        )

    route = session.get("route") or {}

    session_response = {
        "session_id": session_id,
        "trip_id": session.get("trip_id"),
        "request_id": session.get("request_id"),
        "selected_route_id": session.get("selected_route_id"),
        "status": session.get("status", "active"),
        "current_step_index": session.get("current_step_index", 0),
        "progress_percentage": session.get("progress_percentage", 0),
        "remaining_distance_km": session.get(
            "remaining_distance_km", route.get("distance_km", 0)
        ),
        "remaining_time_min": session.get(
            "remaining_time_min", route.get("estimated_time_min", 0)
        ),
        "route_id": session.get("selected_route_id"),
        "route_name": route.get("route_name"),
    }

    return JSONResponse(
        {
            "session": session_response,
            "navigation_session": session_response,
            "session_id": session_id,
            "trip_id": session.get("trip_id"),
            "request_id": session.get("request_id"),
            "selected_route_id": session.get("selected_route_id"),
            "status": session.get("status", "active"),
            "current_step_index": session.get("current_step_index", 0),
            "progress_percentage": session.get("progress_percentage", 0),
            "remaining_distance_km": session.get(
                "remaining_distance_km", route.get("distance_km", 0)
            ),
            "remaining_time_min": session.get(
                "remaining_time_min", route.get("estimated_time_min", 0)
            ),
            "route_coordinates": route.get("route_coordinates", []),
            "coordinates": route.get("route_coordinates", []),
            "turn_by_turn_steps": route.get("turn_by_turn_steps", []),
            "steps": route.get("turn_by_turn_steps", []),
            "estimated_time_min": route.get("estimated_time_min", 0),
            "distance_km": route.get("distance_km", 0),
            "traffic_display": route.get("traffic_display"),
            "selected_route": route,
        }
    )


async def handle_progress(request: Request) -> JSONResponse:
    body = await read_json(request)

    session_id = str(body.get("session_id") or "")
    session = SESSION_CACHE.get(session_id)

    if not session:
        return JSONResponse(
            {
                "error": "session_not_found",
                "message": "Navigation session was not found.",
            },
            status_code=404,
        )

    route = session.get("route") or {}

    current_step_index = int(
        number(body.get("current_step_index"), session.get("current_step_index", 0))
    )

    progress_percentage = int(
        number(body.get("progress_percentage"), session.get("progress_percentage", 0))
    )

    if "progress_percentage" not in body:
        steps = route.get("turn_by_turn_steps") or []
        total_steps = max(len(steps), 1)
        progress_percentage = min(100, int(((current_step_index + 1) / total_steps) * 100))

    total_distance = number(route.get("distance_km"), 0)
    total_time = number(route.get("estimated_time_min"), 0)
    remaining_ratio = max(0, 1 - progress_percentage / 100)

    remaining_distance_km = round(
        number(body.get("remaining_distance_km"), total_distance * remaining_ratio),
        1,
    )

    remaining_time_min = int(
        number(body.get("remaining_time_min"), total_time * remaining_ratio)
    )

    session.update(
        {
            "status": "in_progress" if progress_percentage < 100 else "arriving",
            "current_step_index": current_step_index,
            "progress_percentage": progress_percentage,
            "remaining_distance_km": remaining_distance_km,
            "remaining_time_min": remaining_time_min,
            "updated_at": time.time(),
        }
    )

    SESSION_CACHE[session_id] = session
    save_store()

    return JSONResponse(
        {
            "session_id": session_id,
            "trip_id": session.get("trip_id"),
            "request_id": session.get("request_id"),
            "selected_route_id": session.get("selected_route_id"),
            "status": session.get("status"),
            "current_step_index": current_step_index,
            "progress_percentage": progress_percentage,
            "remaining_distance_km": remaining_distance_km,
            "remaining_time_min": remaining_time_min,
            "eta_text": "Arriving now"
            if remaining_time_min <= 0
            else f"{remaining_time_min} min remaining",
            "distance_text": f"{remaining_distance_km} km remaining",
        }
    )


async def handle_end(request: Request) -> JSONResponse:
    body = await read_json(request)

    session_id = str(body.get("session_id") or "")
    session = SESSION_CACHE.get(session_id)

    if not session:
        return JSONResponse(
            {
                "error": "session_not_found",
                "message": "Navigation session was not found.",
            },
            status_code=404,
        )

    route = session.get("route") or {}

    duration_min = int(number(route.get("estimated_time_min"), 0) + 3)
    distance_km = round(number(route.get("distance_km"), 0), 1)

    fuel_saved_liters = round(max(0.2, distance_km * 0.05), 2)
    co2_saved_kg = round(fuel_saved_liters * 2.31, 2)

    congestion_score = number(route.get("congestion_score"), 5)
    congestion_reduction = int(max(5, 30 - congestion_score * 3))

    session["status"] = "completed"
    session["completed_at"] = time.time()
    SESSION_CACHE[session_id] = session
    save_store()

    return JSONResponse(
        {
            "session_id": session_id,
            "trip_id": session.get("trip_id"),
            "request_id": session.get("request_id"),
            "selected_route_id": session.get("selected_route_id"),
            "status": "completed",
            "route_id": session.get("selected_route_id"),
            "route_name": route.get("route_name"),
            "distance_km": distance_km,
            "duration_min": duration_min,
            "fuel_saved_liters": fuel_saved_liters,
            "co2_saved_kg": co2_saved_kg,
            "congestion_reduction": congestion_reduction,
            "traffic_display": route.get("traffic_display"),
            "summary_message": "Trip completed successfully using the selected FlowSync route.",
        }
    )


def register_mobile_v2_middleware(app):
    load_store()

    @app.middleware("http")
    async def mobile_v2_contract_middleware(request: Request, call_next):
        path = request.url.path
        method = request.method.upper()

        try:
            if method == "GET" and path.startswith("/api/live/navigation/"):
                return await handle_session_detail(request)

            if method == "GET" and path.startswith("/api/trips/session/"):
                return await handle_session_detail(request)

            if method == "POST" and path == "/api/routes/recommend":
                return await handle_recommend(request)

            if method == "POST" and path == "/api/trips/start":
                return await handle_start(request)

            if method == "POST" and path == "/api/trips/progress":
                return await handle_progress(request)

            if method == "POST" and path == "/api/trips/end":
                return await handle_end(request)

        except Exception as exc:
            return JSONResponse(
                {
                    "error": "mobile_v2_backend_error",
                    "message": str(exc),
                },
                status_code=500,
            )

        return await call_next(request)

