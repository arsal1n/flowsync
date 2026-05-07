import json
import sqlite3
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import uuid4

from database import get_connection


LOCATION_SEED_DATA = [
    {
        "name": "Dubai Mall",
        "address": "Downtown Dubai",
        "lat": 25.1972,
        "lng": 55.2744,
        "type": "mall",
    },
    {
        "name": "Burj Khalifa",
        "address": "Downtown Dubai",
        "lat": 25.1975,
        "lng": 55.2743,
        "type": "landmark",
    },
    {
        "name": "Dubai Marina",
        "address": "Dubai Marina",
        "lat": 25.0800,
        "lng": 55.1400,
        "type": "district",
    },
    {
        "name": "Business Bay",
        "address": "Business Bay",
        "lat": 25.1850,
        "lng": 55.2800,
        "type": "district",
    },
    {
        "name": "Dubai Arena",
        "address": "City Walk Dubai",
        "lat": 25.2075,
        "lng": 55.2605,
        "type": "event_venue",
    },
    {
        "name": "Rashid Hospital",
        "address": "Umm Hurair, Dubai",
        "lat": 25.2371,
        "lng": 55.3136,
        "type": "hospital",
    },
    {
        "name": "Dubai International Airport",
        "address": "Garhoud, Dubai",
        "lat": 25.2532,
        "lng": 55.3657,
        "type": "airport",
    },
    {
        "name": "Mall of the Emirates",
        "address": "Al Barsha, Dubai",
        "lat": 25.1181,
        "lng": 55.2006,
        "type": "mall",
    },
    {
        "name": "Jumeirah Beach",
        "address": "Jumeirah, Dubai",
        "lat": 25.2048,
        "lng": 55.2500,
        "type": "beach",
    },
    {
        "name": "Sharjah City Centre",
        "address": "Al Wahda Street, Sharjah",
        "lat": 25.3315,
        "lng": 55.3955,
        "type": "mall",
    },
]


def current_time() -> str:
    return datetime.now().isoformat(timespec="seconds")


def init_navigation_persistence() -> None:
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS locations (
            location_id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            address TEXT NOT NULL,
            lat REAL NOT NULL,
            lng REAL NOT NULL,
            type TEXT NOT NULL,
            search_text TEXT NOT NULL,
            created_time TEXT NOT NULL,
            UNIQUE(name, address)
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS navigation_sessions (
            session_id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            status TEXT NOT NULL,
            start_location TEXT NOT NULL,
            destination TEXT NOT NULL,
            vehicle_type TEXT NOT NULL,
            route_preference TEXT NOT NULL,
            user_role TEXT NOT NULL,
            route_name TEXT NOT NULL,
            selected_route_json TEXT NOT NULL,
            current_step_index INTEGER DEFAULT 0,
            started_time TEXT NOT NULL,
            ended_time TEXT
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS navigation_session_events (
            event_id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            event_type TEXT NOT NULL,
            payload_json TEXT,
            event_time TEXT NOT NULL,
            FOREIGN KEY (session_id) REFERENCES navigation_sessions(session_id)
        )
    """)

    seed_locations(cursor)

    connection.commit()
    connection.close()


def seed_locations(cursor) -> None:
    existing_count = cursor.execute(
        "SELECT COUNT(*) AS count FROM locations"
    ).fetchone()["count"]

    if existing_count > 0:
        return

    now = current_time()

    for location in LOCATION_SEED_DATA:
        search_text = (
            f"{location['name']} "
            f"{location['address']} "
            f"{location['type']}"
        ).lower()

        cursor.execute("""
            INSERT OR IGNORE INTO locations (
                name,
                address,
                lat,
                lng,
                type,
                search_text,
                created_time
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            location["name"],
            location["address"],
            location["lat"],
            location["lng"],
            location["type"],
            search_text,
            now,
        ))


def search_locations_from_db(query: str, limit: int = 10) -> Dict[str, Any]:
    init_navigation_persistence()

    query = (query or "").strip().lower()

    connection = get_connection()
    cursor = connection.cursor()

    if query:
        rows = cursor.execute("""
            SELECT
                name,
                address,
                lat,
                lng,
                type
            FROM locations
            WHERE search_text LIKE ?
            ORDER BY
                CASE
                    WHEN LOWER(name) LIKE ? THEN 0
                    WHEN LOWER(address) LIKE ? THEN 1
                    ELSE 2
                END,
                name ASC
            LIMIT ?
        """, (
            f"%{query}%",
            f"{query}%",
            f"{query}%",
            limit,
        )).fetchall()
    else:
        rows = cursor.execute("""
            SELECT
                name,
                address,
                lat,
                lng,
                type
            FROM locations
            ORDER BY name ASC
            LIMIT ?
        """, (limit,)).fetchall()

    connection.close()

    results = [dict(row) for row in rows]

    return {
        "query": query,
        "results": results,
        "count": len(results),
        "source": "sqlite_locations_table",
    }


def save_navigation_event(
    session_id: str,
    event_type: str,
    payload: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    connection = get_connection()
    cursor = connection.cursor()

    event_time = current_time()

    cursor.execute("""
        INSERT INTO navigation_session_events (
            session_id,
            event_type,
            payload_json,
            event_time
        )
        VALUES (?, ?, ?, ?)
    """, (
        session_id,
        event_type,
        json.dumps(payload or {}),
        event_time,
    ))

    event_id = cursor.lastrowid

    connection.commit()
    connection.close()

    return {
        "event_id": event_id,
        "event_time": event_time,
    }


def save_navigation_session(
    user_id: str,
    start_location: str,
    destination: str,
    vehicle_type: str,
    route_preference: str,
    user_role: str,
    selected_route: Dict[str, Any],
) -> Dict[str, Any]:
    init_navigation_persistence()

    session_id = f"NAV-{uuid4().hex[:10].upper()}"
    started_time = current_time()

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        INSERT INTO navigation_sessions (
            session_id,
            user_id,
            status,
            start_location,
            destination,
            vehicle_type,
            route_preference,
            user_role,
            route_name,
            selected_route_json,
            current_step_index,
            started_time,
            ended_time
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        session_id,
        user_id,
        "active",
        start_location,
        destination,
        vehicle_type,
        route_preference,
        user_role,
        selected_route["route_name"],
        json.dumps(selected_route),
        0,
        started_time,
        None,
    ))

    connection.commit()
    connection.close()

    save_navigation_event(
        session_id=session_id,
        event_type="started",
        payload={
            "route_name": selected_route["route_name"],
            "destination": destination,
        },
    )

    return get_navigation_session_by_id(session_id)


def row_to_navigation_session(row) -> Dict[str, Any]:
    selected_route = json.loads(row["selected_route_json"])

    turn_steps = (
        selected_route.get("turn_by_turn_steps")
        or selected_route.get("turn_steps")
        or []
    )

    current_step_index = row["current_step_index"] or 0
    current_step_index = max(0, min(current_step_index, len(turn_steps)))

    remaining_steps = turn_steps[current_step_index:]

    if remaining_steps:
        next_instruction = remaining_steps[0].get(
            "instruction",
            "Continue on the selected route."
        )
    else:
        next_instruction = "You have arrived at your destination."

    return {
        "session_id": row["session_id"],
        "user_id": row["user_id"],
        "status": row["status"],
        "start_location": row["start_location"],
        "destination": row["destination"],
        "vehicle_type": row["vehicle_type"],
        "route_preference": row["route_preference"],
        "user_role": row["user_role"],
        "route_name": row["route_name"],
        "selected_route": selected_route,
        "current_step_index": current_step_index,
        "started_time": row["started_time"],
        "ended_time": row["ended_time"],
        "live_navigation": {
            "current_step_index": current_step_index,
            "next_instruction": next_instruction,
            "remaining_steps": remaining_steps,
            "route_coordinates": selected_route.get("coordinates", []),
            "polyline": selected_route.get("polyline", []),
            "alerts": selected_route.get("alerts", []),
            "incidents": selected_route.get("incidents", []),
        },
    }


def get_navigation_session_by_id(session_id: str) -> Dict[str, Any]:
    init_navigation_persistence()

    connection = get_connection()
    cursor = connection.cursor()

    row = cursor.execute("""
        SELECT *
        FROM navigation_sessions
        WHERE session_id = ?
    """, (session_id,)).fetchone()

    connection.close()

    if not row:
        return {
            "found": False,
            "session_id": session_id,
            "message": "Navigation session not found.",
        }

    return {
        "found": True,
        "session": row_to_navigation_session(row),
    }


def get_navigation_sessions(status: Optional[str] = None) -> Dict[str, Any]:
    init_navigation_persistence()

    connection = get_connection()
    cursor = connection.cursor()

    if status:
        rows = cursor.execute("""
            SELECT *
            FROM navigation_sessions
            WHERE status = ?
            ORDER BY started_time DESC
        """, (status,)).fetchall()
    else:
        rows = cursor.execute("""
            SELECT *
            FROM navigation_sessions
            ORDER BY started_time DESC
        """).fetchall()

    connection.close()

    sessions = [row_to_navigation_session(row) for row in rows]

    return {
        "sessions": sessions,
        "count": len(sessions),
        "source": "sqlite_navigation_sessions_table",
    }


def get_active_navigation_sessions_from_db() -> Dict[str, Any]:
    result = get_navigation_sessions(status="active")

    return {
        "active_navigation_sessions": result["sessions"],
        "active_count": result["count"],
        "source": result["source"],
    }


def update_navigation_step(
    session_id: str,
    current_step_index: int,
) -> Dict[str, Any]:
    session_result = get_navigation_session_by_id(session_id)

    if not session_result["found"]:
        return session_result

    session = session_result["session"]
    selected_route = session["selected_route"]

    turn_steps = (
        selected_route.get("turn_by_turn_steps")
        or selected_route.get("turn_steps")
        or []
    )

    safe_index = max(0, min(current_step_index, len(turn_steps)))

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        UPDATE navigation_sessions
        SET current_step_index = ?
        WHERE session_id = ?
    """, (
        safe_index,
        session_id,
    ))

    connection.commit()
    connection.close()

    save_navigation_event(
        session_id=session_id,
        event_type="progress_updated",
        payload={
            "current_step_index": safe_index,
        },
    )

    updated_session = get_navigation_session_by_id(session_id)

    return {
        "found": True,
        "message": "Navigation progress updated.",
        "session": updated_session["session"],
    }


def end_navigation_session_in_db(
    session_id: str,
    status: str = "completed",
) -> Dict[str, Any]:
    init_navigation_persistence()

    allowed_statuses = {"completed", "cancelled", "interrupted"}

    if status not in allowed_statuses:
        status = "completed"

    session_result = get_navigation_session_by_id(session_id)

    if not session_result["found"]:
        return session_result

    ended_time = current_time()

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        UPDATE navigation_sessions
        SET status = ?, ended_time = ?
        WHERE session_id = ?
    """, (
        status,
        ended_time,
        session_id,
    ))

    connection.commit()
    connection.close()

    save_navigation_event(
        session_id=session_id,
        event_type="ended",
        payload={
            "status": status,
            "ended_time": ended_time,
        },
    )

    updated_session = get_navigation_session_by_id(session_id)

    return {
        "found": True,
        "message": "Navigation session ended.",
        "session": updated_session["session"],
    }


def get_navigation_events(session_id: str) -> Dict[str, Any]:
    init_navigation_persistence()

    connection = get_connection()
    cursor = connection.cursor()

    rows = cursor.execute("""
        SELECT
            event_id,
            session_id,
            event_type,
            payload_json,
            event_time
        FROM navigation_session_events
        WHERE session_id = ?
        ORDER BY event_id ASC
    """, (session_id,)).fetchall()

    connection.close()

    events = []

    for row in rows:
        events.append({
            "event_id": row["event_id"],
            "session_id": row["session_id"],
            "event_type": row["event_type"],
            "payload": json.loads(row["payload_json"] or "{}"),
            "event_time": row["event_time"],
        })

    return {
        "session_id": session_id,
        "events": events,
        "count": len(events),
    }