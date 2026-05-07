import json
import sqlite3
from datetime import datetime
from typing import Any, Dict, List, Optional

from database import get_connection


def current_time() -> str:
    return datetime.now().isoformat(timespec="seconds")


def table_exists(cursor, table_name: str) -> bool:
    row = cursor.execute("""
        SELECT name
        FROM sqlite_master
        WHERE type = 'table' AND name = ?
    """, (table_name,)).fetchone()

    return row is not None


def table_has_column(cursor, table_name: str, column_name: str) -> bool:
    if not table_exists(cursor, table_name):
        return False

    cursor.execute(f"PRAGMA table_info({table_name})")
    columns = [row["name"] for row in cursor.fetchall()]
    return column_name in columns


def add_column_if_missing(cursor, table_name: str, column_name: str, column_definition: str):
    if not table_has_column(cursor, table_name, column_name):
        cursor.execute(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_definition}")


def init_trip_lifecycle() -> None:
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS trip_requests (
            request_id INTEGER PRIMARY KEY AUTOINCREMENT,
            start_location TEXT NOT NULL,
            destination TEXT NOT NULL,
            vehicle_type TEXT DEFAULT 'car',
            route_preference TEXT DEFAULT 'balanced',
            user_role TEXT DEFAULT 'driver',
            request_time TEXT NOT NULL
        )
    """)

    add_column_if_missing(cursor, "trip_requests", "trip_status", "TEXT DEFAULT 'recommended'")
    add_column_if_missing(cursor, "trip_requests", "navigation_session_id", "TEXT")
    add_column_if_missing(cursor, "trip_requests", "started_time", "TEXT")
    add_column_if_missing(cursor, "trip_requests", "completed_time", "TEXT")
    add_column_if_missing(cursor, "trip_requests", "cancelled_time", "TEXT")
    add_column_if_missing(cursor, "trip_requests", "last_updated", "TEXT")

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS trip_lifecycle_events (
            event_id INTEGER PRIMARY KEY AUTOINCREMENT,
            request_id INTEGER NOT NULL,
            session_id TEXT,
            event_type TEXT NOT NULL,
            status TEXT NOT NULL,
            description TEXT NOT NULL,
            payload_json TEXT,
            event_time TEXT NOT NULL,
            FOREIGN KEY (request_id) REFERENCES trip_requests(request_id)
        )
    """)

    cursor.execute("""
        UPDATE trip_requests
        SET trip_status = 'recommended'
        WHERE trip_status IS NULL OR trip_status = ''
    """)

    connection.commit()
    connection.close()


def log_trip_event(
    request_id: int,
    event_type: str,
    status: str,
    description: str,
    session_id: Optional[str] = None,
    payload: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    init_trip_lifecycle()

    connection = get_connection()
    cursor = connection.cursor()

    event_time = current_time()

    cursor.execute("""
        INSERT INTO trip_lifecycle_events (
            request_id,
            session_id,
            event_type,
            status,
            description,
            payload_json,
            event_time
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        request_id,
        session_id,
        event_type,
        status,
        description,
        json.dumps(payload or {}),
        event_time,
    ))

    event_id = cursor.lastrowid

    connection.commit()
    connection.close()

    return {
        "event_id": event_id,
        "request_id": request_id,
        "session_id": session_id,
        "event_type": event_type,
        "status": status,
        "description": description,
        "event_time": event_time,
    }


def get_trip_detail(request_id: int) -> Dict[str, Any]:
    init_trip_lifecycle()

    connection = get_connection()
    cursor = connection.cursor()

    row = cursor.execute("""
        SELECT
            tr.request_id,
            tr.start_location,
            tr.destination,
            tr.vehicle_type,
            tr.route_preference,
            tr.user_role,
            tr.request_time,
            tr.trip_status,
            tr.navigation_session_id,
            tr.started_time,
            tr.completed_time,
            tr.cancelled_time,
            tr.last_updated,
            ra.assignment_id,
            ra.route_name,
            ra.estimated_time,
            ra.distance_km,
            ra.congestion_score,
            ra.assigned_users,
            ra.route_score,
            ra.route_type,
            ra.capacity_ratio
        FROM trip_requests tr
        LEFT JOIN route_assignments ra
        ON tr.request_id = ra.request_id
        WHERE tr.request_id = ?
        ORDER BY ra.assignment_id DESC
        LIMIT 1
    """, (request_id,)).fetchone()

    if not row:
        connection.close()
        return {
            "found": False,
            "request_id": request_id,
            "message": "Trip request not found.",
        }

    trip = dict(row)

    navigation_session = None

    if trip.get("navigation_session_id") and table_exists(cursor, "navigation_sessions"):
        nav_row = cursor.execute("""
            SELECT
                session_id,
                user_id,
                status,
                start_location,
                destination,
                route_name,
                current_step_index,
                started_time,
                ended_time
            FROM navigation_sessions
            WHERE session_id = ?
        """, (trip["navigation_session_id"],)).fetchone()

        if nav_row:
            navigation_session = dict(nav_row)

    connection.close()

    return {
        "found": True,
        "trip": trip,
        "navigation_session": navigation_session,
    }


def get_lifecycle_events(request_id: int) -> List[Dict[str, Any]]:
    init_trip_lifecycle()

    connection = get_connection()
    cursor = connection.cursor()

    rows = cursor.execute("""
        SELECT
            event_id,
            request_id,
            session_id,
            event_type,
            status,
            description,
            payload_json,
            event_time
        FROM trip_lifecycle_events
        WHERE request_id = ?
        ORDER BY event_id ASC
    """, (request_id,)).fetchall()

    events = []

    for row in rows:
        events.append({
            "event_id": row["event_id"],
            "request_id": row["request_id"],
            "session_id": row["session_id"],
            "event_type": row["event_type"],
            "status": row["status"],
            "description": row["description"],
            "payload": json.loads(row["payload_json"] or "{}"),
            "event_time": row["event_time"],
            "synthetic": False,
        })

    trip_row = cursor.execute("""
        SELECT
            tr.request_id,
            tr.request_time,
            tr.trip_status,
            ra.route_name
        FROM trip_requests tr
        LEFT JOIN route_assignments ra
        ON tr.request_id = ra.request_id
        WHERE tr.request_id = ?
        ORDER BY ra.assignment_id DESC
        LIMIT 1
    """, (request_id,)).fetchone()

    connection.close()

    if trip_row and not events:
        events.append({
            "event_id": None,
            "request_id": request_id,
            "session_id": None,
            "event_type": "route_recommended",
            "status": trip_row["trip_status"] or "recommended",
            "description": "Route was recommended and saved to the database.",
            "payload": {
                "route_name": trip_row["route_name"],
            },
            "event_time": trip_row["request_time"],
            "synthetic": True,
        })

    return events


def get_trip_lifecycle(request_id: int) -> Dict[str, Any]:
    trip_result = get_trip_detail(request_id)

    if not trip_result["found"]:
        return trip_result

    return {
        "found": True,
        "trip": trip_result["trip"],
        "navigation_session": trip_result["navigation_session"],
        "lifecycle_events": get_lifecycle_events(request_id),
    }


def link_trip_to_navigation_session(
    request_id: int,
    session_id: str,
) -> Dict[str, Any]:
    init_trip_lifecycle()

    trip_result = get_trip_detail(request_id)

    if not trip_result["found"]:
        return trip_result

    now = current_time()

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        UPDATE trip_requests
        SET
            trip_status = 'active',
            navigation_session_id = ?,
            started_time = ?,
            last_updated = ?
        WHERE request_id = ?
    """, (
        session_id,
        now,
        now,
        request_id,
    ))

    connection.commit()
    connection.close()

    event = log_trip_event(
        request_id=request_id,
        session_id=session_id,
        event_type="navigation_started",
        status="active",
        description="Navigation session started and linked to trip request.",
        payload={
            "session_id": session_id,
        },
    )

    updated_trip = get_trip_detail(request_id)

    return {
        "found": True,
        "message": "Trip linked to navigation session.",
        "trip": updated_trip["trip"],
        "event": event,
    }


def complete_trip_by_session_id(
    session_id: str,
    status: str = "completed",
) -> Dict[str, Any]:
    init_trip_lifecycle()

    allowed_statuses = {"completed", "cancelled", "interrupted"}

    if status not in allowed_statuses:
        status = "completed"

    connection = get_connection()
    cursor = connection.cursor()

    row = cursor.execute("""
        SELECT request_id
        FROM trip_requests
        WHERE navigation_session_id = ?
        ORDER BY request_id DESC
        LIMIT 1
    """, (session_id,)).fetchone()

    if not row:
        connection.close()
        return {
            "found": False,
            "session_id": session_id,
            "message": "No trip request is linked to this navigation session.",
        }

    request_id = row["request_id"]
    now = current_time()

    completed_time = now if status == "completed" else None
    cancelled_time = now if status in {"cancelled", "interrupted"} else None

    cursor.execute("""
        UPDATE trip_requests
        SET
            trip_status = ?,
            completed_time = COALESCE(?, completed_time),
            cancelled_time = COALESCE(?, cancelled_time),
            last_updated = ?
        WHERE request_id = ?
    """, (
        status,
        completed_time,
        cancelled_time,
        now,
        request_id,
    ))

    connection.commit()
    connection.close()

    event = log_trip_event(
        request_id=request_id,
        session_id=session_id,
        event_type="navigation_ended",
        status=status,
        description=f"Navigation session ended with status: {status}.",
        payload={
            "session_id": session_id,
            "status": status,
        },
    )

    updated_trip = get_trip_detail(request_id)

    return {
        "found": True,
        "message": "Trip lifecycle updated after navigation ended.",
        "trip": updated_trip["trip"],
        "event": event,
    }


def update_trip_progress_event(
    session_id: str,
    current_step_index: int,
) -> Dict[str, Any]:
    init_trip_lifecycle()

    connection = get_connection()
    cursor = connection.cursor()

    row = cursor.execute("""
        SELECT request_id
        FROM trip_requests
        WHERE navigation_session_id = ?
        ORDER BY request_id DESC
        LIMIT 1
    """, (session_id,)).fetchone()

    connection.close()

    if not row:
        return {
            "found": False,
            "session_id": session_id,
            "message": "No trip request is linked to this navigation session.",
        }

    event = log_trip_event(
        request_id=row["request_id"],
        session_id=session_id,
        event_type="navigation_progress",
        status="active",
        description=f"Navigation progress updated to step {current_step_index}.",
        payload={
            "current_step_index": current_step_index,
        },
    )

    return {
        "found": True,
        "event": event,
    }


def cancel_trip(
    request_id: int,
    reason: str = "Cancelled by user.",
) -> Dict[str, Any]:
    init_trip_lifecycle()

    trip_result = get_trip_detail(request_id)

    if not trip_result["found"]:
        return trip_result

    now = current_time()

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        UPDATE trip_requests
        SET
            trip_status = 'cancelled',
            cancelled_time = ?,
            last_updated = ?
        WHERE request_id = ?
    """, (
        now,
        now,
        request_id,
    ))

    connection.commit()
    connection.close()

    event = log_trip_event(
        request_id=request_id,
        session_id=trip_result["trip"].get("navigation_session_id"),
        event_type="trip_cancelled",
        status="cancelled",
        description=reason,
        payload={
            "reason": reason,
        },
    )

    updated_trip = get_trip_detail(request_id)

    return {
        "found": True,
        "message": "Trip cancelled.",
        "trip": updated_trip["trip"],
        "event": event,
    }


def get_trip_summary(request_id: int) -> Dict[str, Any]:
    lifecycle = get_trip_lifecycle(request_id)

    if not lifecycle["found"]:
        return lifecycle

    trip = lifecycle["trip"]

    distance_km = trip.get("distance_km") or 0
    estimated_time = trip.get("estimated_time") or 0
    congestion_score = trip.get("congestion_score") or 0

    fuel_saved_liters = round(max(0.1, congestion_score * 0.08), 2)
    co2_saved_kg = round(fuel_saved_liters * 2.31, 2)

    return {
        "found": True,
        "request_id": request_id,
        "trip_status": trip.get("trip_status"),
        "start_location": trip.get("start_location"),
        "destination": trip.get("destination"),
        "route_name": trip.get("route_name"),
        "estimated_time": estimated_time,
        "distance_km": distance_km,
        "route_score": trip.get("route_score"),
        "started_time": trip.get("started_time"),
        "completed_time": trip.get("completed_time"),
        "cancelled_time": trip.get("cancelled_time"),
        "lifecycle_event_count": len(lifecycle["lifecycle_events"]),
        "sustainability_summary": {
            "estimated_fuel_saved_liters": fuel_saved_liters,
            "estimated_co2_saved_kg": co2_saved_kg,
        },
        "message": "Trip summary generated from saved lifecycle data.",
    }


def get_trip_lifecycle_dashboard() -> Dict[str, Any]:
    init_trip_lifecycle()

    connection = get_connection()
    cursor = connection.cursor()

    rows = cursor.execute("""
        SELECT
            COALESCE(trip_status, 'recommended') AS status,
            COUNT(*) AS count
        FROM trip_requests
        GROUP BY COALESCE(trip_status, 'recommended')
    """).fetchall()

    total = cursor.execute("""
        SELECT COUNT(*) AS count
        FROM trip_requests
    """).fetchone()["count"]

    active_count = cursor.execute("""
        SELECT COUNT(*) AS count
        FROM trip_requests
        WHERE trip_status = 'active'
    """).fetchone()["count"]

    completed_count = cursor.execute("""
        SELECT COUNT(*) AS count
        FROM trip_requests
        WHERE trip_status = 'completed'
    """).fetchone()["count"]

    cancelled_count = cursor.execute("""
        SELECT COUNT(*) AS count
        FROM trip_requests
        WHERE trip_status = 'cancelled'
    """).fetchone()["count"]

    connection.close()

    status_distribution = {
        row["status"]: row["count"]
        for row in rows
    }

    return {
        "total_trips": total,
        "active_trips": active_count,
        "completed_trips": completed_count,
        "cancelled_trips": cancelled_count,
        "status_distribution": status_distribution,
        "message": "Trip lifecycle dashboard generated from SQLite.",
    }


def get_recent_lifecycle_trips(limit: int = 10) -> Dict[str, Any]:
    init_trip_lifecycle()

    connection = get_connection()
    cursor = connection.cursor()

    rows = cursor.execute("""
        SELECT
            request_id,
            start_location,
            destination,
            vehicle_type,
            route_preference,
            user_role,
            request_time,
            trip_status,
            navigation_session_id,
            started_time,
            completed_time,
            cancelled_time,
            last_updated
        FROM trip_requests
        ORDER BY request_id DESC
        LIMIT ?
    """, (limit,)).fetchall()

    connection.close()

    return {
        "recent_lifecycle_trips": [dict(row) for row in rows],
        "count": len(rows),
    }