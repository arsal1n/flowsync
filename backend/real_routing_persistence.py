import json
import math
import time
from datetime import datetime, timedelta, timezone
from hashlib import sha256
from typing import Any, Dict, List, Optional

from fastapi import Request
from starlette.responses import Response

from database import get_connection


TARGET_PATHS = {
    ("GET", "/api/locations/search"),
    ("POST", "/api/routes/recommend"),
    ("POST", "/api/trips/start"),
    ("POST", "/api/trips/progress"),
    ("POST", "/api/trips/end"),
}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def json_safe(value: Any) -> str:
    try:
        return json.dumps(value, ensure_ascii=False, default=str)
    except Exception:
        return "{}"


def number(value: Any, fallback: float = 0.0) -> float:
    try:
        if value is None:
            return fallback
        return float(value)
    except Exception:
        return fallback


def bool_int(value: Any) -> int:
    return 1 if value is True or str(value).lower() in {"1", "true", "yes"} else 0


def hash_payload(value: Any) -> str:
    return sha256(json_safe(value).encode("utf-8")).hexdigest()


def table_exists(connection, table_name: str) -> bool:
    row = connection.execute(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
        (table_name,),
    ).fetchone()
    return row is not None


def table_columns(connection, table_name: str) -> Dict[str, Any]:
    if not table_exists(connection, table_name):
        return {}

    rows = connection.execute(f'PRAGMA table_info("{table_name}")').fetchall()
    return {row["name"]: row for row in rows}


def filter_payload(connection, table_name: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    columns = table_columns(connection, table_name)
    return {
        key: value
        for key, value in payload.items()
        if key in columns and value is not None
    }


def insert_row(connection, table_name: str, payload: Dict[str, Any], ignore: bool = False) -> Optional[int]:
    filtered = filter_payload(connection, table_name, payload)

    if not filtered:
        return None

    columns = list(filtered.keys())
    placeholders = ", ".join(["?"] * len(columns))
    column_sql = ", ".join([f'"{column}"' for column in columns])
    verb = "INSERT OR IGNORE" if ignore else "INSERT"

    sql = f'{verb} INTO "{table_name}" ({column_sql}) VALUES ({placeholders})'

    try:
        cursor = connection.execute(sql, [filtered[column] for column in columns])
        return cursor.lastrowid
    except Exception as exc:
        print(f"[persistence] insert failed for {table_name}: {exc}")
        return None


def update_row(connection, table_name: str, payload: Dict[str, Any], where_sql: str, where_values: List[Any]) -> None:
    filtered = filter_payload(connection, table_name, payload)

    if not filtered:
        return

    set_sql = ", ".join([f'"{key}" = ?' for key in filtered.keys()])
    values = list(filtered.values()) + where_values

    try:
        connection.execute(
            f'UPDATE "{table_name}" SET {set_sql} WHERE {where_sql}',
            values,
        )
    except Exception as exc:
        print(f"[persistence] update failed for {table_name}: {exc}")


def clean_text(value: Any) -> str:
    return str(value or "").strip()


def first_present(*values: Any) -> Any:
    for value in values:
        if value not in (None, ""):
            return value
    return None


def coordinate_distance_m(a: Dict[str, Any], b: Dict[str, Any]) -> float:
    lat1 = math.radians(number(a.get("latitude", a.get("lat"))))
    lon1 = math.radians(number(a.get("longitude", a.get("lng"))))
    lat2 = math.radians(number(b.get("latitude", b.get("lat"))))
    lon2 = math.radians(number(b.get("longitude", b.get("lng"))))

    radius = 6371000
    d_lat = lat2 - lat1
    d_lon = lon2 - lon1

    haversine = (
        math.sin(d_lat / 2) ** 2
        + math.cos(lat1) * math.cos(lat2) * math.sin(d_lon / 2) ** 2
    )

    return radius * 2 * math.atan2(math.sqrt(haversine), math.sqrt(1 - haversine))


def normalize_location_result(result: Dict[str, Any], query: str) -> Dict[str, Any]:
    latitude = number(first_present(result.get("latitude"), result.get("lat")))
    longitude = number(first_present(result.get("longitude"), result.get("lng"), result.get("lon")))

    name = clean_text(first_present(result.get("name"), result.get("display_name"), result.get("address"), query))
    display_name = clean_text(first_present(result.get("display_name"), result.get("address"), name))

    search_keywords = " ".join(
        [
            name,
            display_name,
            clean_text(result.get("city")),
            clean_text(result.get("area")),
            clean_text(result.get("category")),
        ]
    ).strip()

    return {
        "name": name,
        "display_name": display_name,
        "address": clean_text(first_present(result.get("address"), display_name)),
        "search_keywords": search_keywords,
        "aliases": json_safe(result.get("aliases") or []),
        "city": clean_text(first_present(result.get("city"), "Dubai")),
        "area": clean_text(result.get("area")),
        "category": clean_text(first_present(result.get("category"), result.get("type"), "place")),
        "provider_name": clean_text(first_present(result.get("provider_name"), result.get("provider"), "openrouteservice")),
        "external_place_id": clean_text(first_present(result.get("external_place_id"), result.get("place_id"), result.get("id"))),
        "latitude": latitude,
        "longitude": longitude,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }


def persist_location_search(request_payload: Dict[str, Any], response_payload: Dict[str, Any]) -> None:
    query = clean_text(request_payload.get("query") or request_payload.get("q") or response_payload.get("query"))
    provider = clean_text(first_present(response_payload.get("provider"), "openrouteservice"))
    results = response_payload.get("results") or response_payload.get("locations") or []

    connection = get_connection()

    try:
        cache_payload = {
            "query": query,
            "request_query": query,
            "request_hash": hash_payload({"query": query, "provider": provider}),
            "cache_key": hash_payload({"query": query, "provider": provider}),
            "provider_name": provider,
            "provider_status": response_payload.get("provider_status"),
            "raw_response": json_safe(response_payload),
            "json_response": json_safe(response_payload),
            "response_json": json_safe(response_payload),
            "created_at": now_iso(),
            "updated_at": now_iso(),
            "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        }

        insert_row(connection, "geocoding_cache", cache_payload, ignore=True)
        insert_row(connection, "map_provider_cache", cache_payload, ignore=True)

        for result in results:
            location_payload = normalize_location_result(result, query)
            insert_row(connection, "locations", location_payload, ignore=True)

        connection.commit()
    finally:
        connection.close()


def find_trip_request_id(connection, trip_id: Any, request_id: Any) -> Optional[int]:
    columns = table_columns(connection, "trip_requests")

    if "trip_request_id" not in columns:
        return None

    for column_name, value in [
        ("trip_id", trip_id),
        ("request_id", request_id),
        ("trip_public_id", trip_id),
    ]:
        if column_name in columns and value not in (None, ""):
            row = connection.execute(
                f'SELECT trip_request_id FROM trip_requests WHERE "{column_name}" = ? ORDER BY trip_request_id DESC LIMIT 1',
                (value,),
            ).fetchone()

            if row:
                return row["trip_request_id"]

    return None


def find_route_option_id(connection, route_public_id: Any, trip_request_id: Optional[int] = None) -> Optional[Any]:
    columns = table_columns(connection, "route_options")

    if "route_id" not in columns:
        return None

    route_public_id = clean_text(route_public_id)

    if not route_public_id:
        return None

    if "route_public_id" in columns:
        if trip_request_id is not None and "trip_request_id" in columns:
            row = connection.execute(
                """
                SELECT route_id
                FROM route_options
                WHERE route_public_id = ? AND trip_request_id = ?
                ORDER BY route_id DESC
                LIMIT 1
                """,
                (route_public_id, trip_request_id),
            ).fetchone()
        else:
            row = connection.execute(
                """
                SELECT route_id
                FROM route_options
                WHERE route_public_id = ?
                ORDER BY route_id DESC
                LIMIT 1
                """,
                (route_public_id,),
            ).fetchone()

        if row:
            return row["route_id"]

    return None


def normalize_route_payload(route: Dict[str, Any], trip_request_id: Optional[int], trip_id: Any) -> Dict[str, Any]:
    route_public_id = clean_text(route.get("route_id") or route.get("route_public_id"))

    return {
        "trip_request_id": trip_request_id,
        "trip_id": trip_id,
        "route_public_id": route_public_id,
        "route_name": clean_text(route.get("route_name")),
        "estimated_time_min": int(number(route.get("estimated_time_min"), 0)),
        "eta_text": clean_text(first_present(route.get("eta_text"), f"{route.get('estimated_time_min', 0)} min")),
        "distance_km": number(route.get("distance_km"), 0),
        "distance_text": clean_text(first_present(route.get("distance_text"), f"{route.get('distance_km', 0)} km")),
        "traffic_delay_min": int(number(route.get("traffic_delay_min"), 0)),
        "congestion_score": number(route.get("congestion_score"), 0),
        "traffic_score": number(route.get("traffic_score"), route.get("congestion_score", 0)),
        "traffic_display": clean_text(route.get("traffic_display")),
        "flowsync_score": number(first_present(route.get("flowsync_score"), route.get("route_score")), 0),
        "route_score": number(first_present(route.get("route_score"), route.get("flowsync_score")), 0),
        "assigned_users": int(number(route.get("assigned_users"), 0)),
        "road_capacity": int(number(route.get("road_capacity"), 0)),
        "load_ratio": number(route.get("load_ratio"), 0),
        "load_status": clean_text(route.get("load_status")),
        "recommendation_reason": clean_text(route.get("recommendation_reason")),
        "is_recommended": bool_int(route.get("is_recommended")),
        "provider_name": clean_text(first_present(route.get("provider"), route.get("routing_provider"), "openrouteservice")),
        "provider_status": clean_text(first_present(route.get("provider_status"), route.get("routing_provider_status"))),
        "raw_response": json_safe(route),
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }


def delete_existing_route_children(connection, route_id: Any, route_public_id: str) -> None:
    if route_id in (None, ""):
        return

    for table_name in ["route_coordinates", "route_steps"]:
        columns = table_columns(connection, table_name)

        if not columns:
            continue

        try:
            if "route_id" in columns:
                connection.execute(f'DELETE FROM "{table_name}" WHERE route_id = ?', (route_id,))
            elif "route_public_id" in columns:
                connection.execute(f'DELETE FROM "{table_name}" WHERE route_public_id = ?', (route_public_id,))
        except Exception as exc:
            print(f"[persistence] delete children failed for {table_name}: {exc}")


def persist_route_coordinates(connection, route_id: Any, route_public_id: str, coordinates: List[Dict[str, Any]]) -> None:
    running_distance = 0.0
    previous = None

    for index, point in enumerate(coordinates):
        latitude = number(first_present(point.get("latitude"), point.get("lat")))
        longitude = number(first_present(point.get("longitude"), point.get("lng"), point.get("lon")))

        current = {"latitude": latitude, "longitude": longitude}

        if previous is not None:
            running_distance += coordinate_distance_m(previous, current)

        payload = {
            "route_id": route_id,
            "route_public_id": route_public_id,
            "point_index": index,
            "latitude": latitude,
            "longitude": longitude,
            "distance_from_start_m": round(running_distance, 2),
            "created_at": now_iso(),
        }

        insert_row(connection, "route_coordinates", payload, ignore=False)
        previous = current


def persist_route_steps(connection, route_id: Any, route_public_id: str, steps: List[Dict[str, Any]]) -> None:
    for index, step in enumerate(steps):
        coordinate = step.get("coordinate") or {}

        latitude = number(
            first_present(
                step.get("latitude"),
                step.get("lat"),
                coordinate.get("latitude"),
                coordinate.get("lat"),
            )
        )

        longitude = number(
            first_present(
                step.get("longitude"),
                step.get("lng"),
                coordinate.get("longitude"),
                coordinate.get("lng"),
                coordinate.get("lon"),
            )
        )

        payload = {
            "route_id": route_id,
            "route_public_id": route_public_id,
            "step_index": int(number(first_present(step.get("step_index"), index), index)),
            "instruction": clean_text(step.get("instruction")),
            "maneuver": clean_text(first_present(step.get("maneuver"), step.get("type"), "continue")),
            "street_name": clean_text(first_present(step.get("street_name"), step.get("road_name"), step.get("name"))),
            "distance_m": int(number(step.get("distance_m"), 0)),
            "duration_min": int(number(step.get("duration_min"), 0)),
            "latitude": latitude,
            "longitude": longitude,
            "created_at": now_iso(),
        }

        insert_row(connection, "route_steps", payload, ignore=False)


def persist_route_recommendation(request_payload: Dict[str, Any], response_payload: Dict[str, Any]) -> None:
    trip_id = first_present(response_payload.get("trip_id"), request_payload.get("trip_id"))
    request_id = first_present(response_payload.get("request_id"), request_payload.get("request_id"), trip_id)
    routes = response_payload.get("all_routes") or response_payload.get("routes") or []

    connection = get_connection()

    try:
        trip_payload = {
            "trip_id": trip_id,
            "request_id": request_id,
            "trip_public_id": trip_id,
            "start_location": clean_text(request_payload.get("start_location")),
            "destination": clean_text(request_payload.get("destination")),
            "start_latitude": number(request_payload.get("start_latitude"), 0) or None,
            "start_longitude": number(request_payload.get("start_longitude"), 0) or None,
            "destination_latitude": number(request_payload.get("destination_latitude"), 0) or None,
            "destination_longitude": number(request_payload.get("destination_longitude"), 0) or None,
            "vehicle_type": clean_text(request_payload.get("vehicle_type")),
            "route_preference": clean_text(request_payload.get("route_preference")),
            "user_role": clean_text(request_payload.get("user_role")),
            "provider_name": clean_text(response_payload.get("provider")),
            "provider_status": clean_text(response_payload.get("provider_status")),
            "created_at": now_iso(),
            "requested_at": now_iso(),
        }

        inserted_trip_id = insert_row(connection, "trip_requests", trip_payload, ignore=True)
        trip_request_id = find_trip_request_id(connection, trip_id, request_id) or inserted_trip_id

        for route in routes:
            route_public_id = clean_text(route.get("route_id") or route.get("route_public_id"))
            route_payload = normalize_route_payload(route, trip_request_id, trip_id)

            inserted_route_id = insert_row(connection, "route_options", route_payload, ignore=False)
            route_db_id = inserted_route_id or find_route_option_id(connection, route_public_id, trip_request_id)

            delete_existing_route_children(connection, route_db_id, route_public_id)

            coordinates = (
                route.get("route_coordinates")
                or route.get("coordinates")
                or route.get("polyline")
                or []
            )

            steps = (
                route.get("turn_by_turn_steps")
                or route.get("steps")
                or []
            )

            persist_route_coordinates(connection, route_db_id, route_public_id, coordinates)
            persist_route_steps(connection, route_db_id, route_public_id, steps)

        connection.commit()
    finally:
        connection.close()


def persist_trip_start(request_payload: Dict[str, Any], response_payload: Dict[str, Any]) -> None:
    session_id = clean_text(first_present(response_payload.get("session_id"), response_payload.get("session", {}).get("session_id")))
    selected_route_public_id = clean_text(first_present(response_payload.get("selected_route_id"), request_payload.get("selected_route_id")))
    trip_id = first_present(response_payload.get("trip_id"), request_payload.get("trip_id"))
    request_id = first_present(response_payload.get("request_id"), trip_id)

    if not session_id:
        return

    connection = get_connection()

    try:
        route_db_id = find_route_option_id(connection, selected_route_public_id)

        payload = {
            "session_id": session_id,
            "trip_id": trip_id,
            "request_id": request_id,
            "selected_route_id": route_db_id,
            "selected_route_public_id": selected_route_public_id,
            "status": clean_text(first_present(response_payload.get("status"), "active")),
            "started_at": now_iso(),
            "route_name": clean_text(response_payload.get("route_name")),
            "total_distance_km": number(response_payload.get("distance_km"), 0),
            "total_time_min": int(number(response_payload.get("estimated_time_min"), 0)),
            "summary_congestion_score": number(response_payload.get("congestion_score"), 0),
            "summary_flowsync_score": number(response_payload.get("flowsync_score"), 0),
            "created_at": now_iso(),
            "updated_at": now_iso(),
        }

        insert_row(connection, "trip_sessions", payload, ignore=True)

        update_row(
            connection,
            "trip_sessions",
            payload,
            "session_id = ?",
            [session_id],
        )

        connection.commit()
    finally:
        connection.close()


def persist_trip_progress(request_payload: Dict[str, Any], response_payload: Dict[str, Any]) -> None:
    session_id = clean_text(first_present(response_payload.get("session_id"), request_payload.get("session_id")))

    if not session_id:
        return

    payload = {
        "session_id": session_id,
        "current_step_index": int(number(first_present(response_payload.get("current_step_index"), request_payload.get("current_step_index")), 0)),
        "closest_route_point_index": int(number(first_present(response_payload.get("closest_route_point_index"), request_payload.get("closest_route_point_index")), 0)),
        "latitude": number(first_present(response_payload.get("latitude"), request_payload.get("latitude")), 0) or None,
        "longitude": number(first_present(response_payload.get("longitude"), request_payload.get("longitude")), 0) or None,
        "remaining_distance_km": number(first_present(response_payload.get("remaining_distance_km"), request_payload.get("remaining_distance_km")), 0),
        "remaining_time_min": int(number(first_present(response_payload.get("remaining_time_min"), request_payload.get("remaining_time_min")), 0)),
        "progress_percentage": number(first_present(response_payload.get("progress_percentage"), request_payload.get("progress_percentage")), 0),
        "recorded_at": now_iso(),
        "updated_at": now_iso(),
    }

    connection = get_connection()

    try:
        insert_row(connection, "navigation_progress", payload, ignore=False)
        connection.commit()
    finally:
        connection.close()


def persist_trip_end(request_payload: Dict[str, Any], response_payload: Dict[str, Any]) -> None:
    session_id = clean_text(first_present(response_payload.get("session_id"), request_payload.get("session_id")))

    if not session_id:
        return

    payload = {
        "status": clean_text(first_present(response_payload.get("status"), request_payload.get("status"), "completed")),
        "ended_at": now_iso(),
        "total_distance_km": number(response_payload.get("distance_km"), 0),
        "total_time_min": int(number(response_payload.get("duration_min"), 0)),
        "summary_congestion_score": number(response_payload.get("congestion_score"), 0),
        "summary_flowsync_score": number(response_payload.get("flowsync_score"), 0),
        "fuel_saved_estimate": number(response_payload.get("fuel_saved_liters"), 0),
        "co2_saved_estimate": number(response_payload.get("co2_saved_kg"), 0),
        "updated_at": now_iso(),
    }

    connection = get_connection()

    try:
        update_row(
            connection,
            "trip_sessions",
            payload,
            "session_id = ?",
            [session_id],
        )

        analytics_payload = {
            "session_id": session_id,
            "trip_id": response_payload.get("trip_id"),
            "selected_route_id": response_payload.get("selected_route_id"),
            "status": payload["status"],
            "distance_km": payload["total_distance_km"],
            "duration_min": payload["total_time_min"],
            "fuel_saved_liters": payload["fuel_saved_estimate"],
            "co2_saved_kg": payload["co2_saved_estimate"],
            "created_at": now_iso(),
        }

        insert_row(connection, "trip_analytics", analytics_payload, ignore=True)
        connection.commit()
    finally:
        connection.close()


def persist_api_result(method: str, path: str, request_payload: Dict[str, Any], response_payload: Dict[str, Any]) -> None:
    try:
        if method == "GET" and path == "/api/locations/search":
            persist_location_search(request_payload, response_payload)

        elif method == "POST" and path == "/api/routes/recommend":
            persist_route_recommendation(request_payload, response_payload)

        elif method == "POST" and path == "/api/trips/start":
            persist_trip_start(request_payload, response_payload)

        elif method == "POST" and path == "/api/trips/progress":
            persist_trip_progress(request_payload, response_payload)

        elif method == "POST" and path == "/api/trips/end":
            persist_trip_end(request_payload, response_payload)

    except Exception as exc:
        print(f"[persistence] skipped persistence for {method} {path}: {exc}")


async def parse_request_payload(request: Request, body_bytes: bytes) -> Dict[str, Any]:
    if request.method.upper() == "GET":
        return dict(request.query_params)

    if not body_bytes:
        return {}

    try:
        payload = json.loads(body_bytes.decode("utf-8"))
        return payload if isinstance(payload, dict) else {}
    except Exception:
        return {}


def restore_request_body(request: Request, body_bytes: bytes) -> None:
    async def receive():
        return {
            "type": "http.request",
            "body": body_bytes,
            "more_body": False,
        }

    request._receive = receive


async def collect_response_body(response) -> bytes:
    chunks = []

    async for chunk in response.body_iterator:
        if isinstance(chunk, bytes):
            chunks.append(chunk)
        else:
            chunks.append(str(chunk).encode("utf-8"))

    return b"".join(chunks)


def clone_response(response, body_bytes: bytes) -> Response:
    headers = dict(response.headers)
    headers.pop("content-length", None)

    return Response(
        content=body_bytes,
        status_code=response.status_code,
        headers=headers,
        media_type=response.media_type,
        background=response.background,
    )


def register_real_routing_persistence(app):
    @app.middleware("http")
    async def real_routing_persistence_middleware(request: Request, call_next):
        method = request.method.upper()
        path = request.url.path

        if (method, path) not in TARGET_PATHS:
            return await call_next(request)

        body_bytes = await request.body()
        request_payload = await parse_request_payload(request, body_bytes)

        restore_request_body(request, body_bytes)

        response = await call_next(request)

        body = await collect_response_body(response)
        cloned_response = clone_response(response, body)

        if 200 <= response.status_code < 300 and body:
            try:
                response_payload = json.loads(body.decode("utf-8"))

                if isinstance(response_payload, dict):
                    persist_api_result(method, path, request_payload, response_payload)

            except Exception as exc:
                print(f"[persistence] response parse failed for {method} {path}: {exc}")

        return cloned_response
