import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent / "flowsync.db"

def get_connection():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection

def rows_to_dicts(rows):
    return [dict(row) for row in rows]

def get_dashboard_stats():
    connection = get_connection()
    cursor = connection.cursor()

    total_trips = cursor.execute(
        "SELECT COUNT(*) AS count FROM trip_requests"
    ).fetchone()["count"]

    total_routes = cursor.execute(
        "SELECT COUNT(*) AS count FROM route_options"
    ).fetchone()["count"]

    total_locations = cursor.execute(
        "SELECT COUNT(*) AS count FROM locations"
    ).fetchone()["count"]

    active_sessions = cursor.execute(
        "SELECT COUNT(*) AS count FROM trip_sessions WHERE status = 'active'"
    ).fetchone()["count"]

    total_alerts = cursor.execute(
        "SELECT COUNT(*) AS count FROM alerts"
    ).fetchone()["count"]

    recommended_routes = cursor.execute("""
        SELECT route_name, COUNT(*) AS count
        FROM route_options
        WHERE is_recommended = 1
        GROUP BY route_name
    """).fetchall()

    avg_congestion = cursor.execute(
        "SELECT AVG(congestion_score) AS avg_score FROM route_options"
    ).fetchone()["avg_score"]

    connection.close()

    return {
        "total_trips": total_trips,
        "total_routes": total_routes,
        "total_locations": total_locations,
        "active_sessions": active_sessions,
        "total_alerts": total_alerts,
        "recommended_routes": rows_to_dicts(recommended_routes),
        "average_congestion_score": round(avg_congestion or 0, 2)
    }

def search_locations(query=""):
    connection = get_connection()
    cursor = connection.cursor()

    if query:
        rows = cursor.execute("""
            SELECT location_id, name, address, latitude, longitude, category
            FROM locations
            WHERE LOWER(name) LIKE LOWER(?)
               OR LOWER(address) LIKE LOWER(?)
               OR LOWER(category) LIKE LOWER(?)
            ORDER BY name
        """, (f"%{query}%", f"%{query}%", f"%{query}%")).fetchall()
    else:
        rows = cursor.execute("""
            SELECT location_id, name, address, latitude, longitude, category
            FROM locations
            ORDER BY name
        """).fetchall()

    connection.close()
    return rows_to_dicts(rows)

def get_saved_places(user_id):
    connection = get_connection()
    cursor = connection.cursor()

    rows = cursor.execute("""
        SELECT
            saved_places.saved_place_id,
            saved_places.user_id,
            saved_places.label,
            locations.location_id,
            locations.name,
            locations.address,
            locations.latitude,
            locations.longitude,
            locations.category
        FROM saved_places
        JOIN locations ON saved_places.location_id = locations.location_id
        WHERE saved_places.user_id = ?
        ORDER BY saved_places.label
    """, (user_id,)).fetchall()

    connection.close()
    return rows_to_dicts(rows)

def get_user_preferences(user_id):
    connection = get_connection()
    cursor = connection.cursor()

    row = cursor.execute("""
        SELECT
            preference_id,
            user_id,
            preferred_route_mode,
            avoid_tolls,
            eco_mode,
            parking_preference,
            updated_at
        FROM user_preferences
        WHERE user_id = ?
    """, (user_id,)).fetchone()

    connection.close()
    return dict(row) if row else None

def get_active_trip_sessions():
    connection = get_connection()
    cursor = connection.cursor()

    rows = cursor.execute("""
        SELECT
            trip_sessions.trip_id,
            trip_sessions.user_id,
            users.name AS user_name,
            trip_sessions.start_location,
            trip_sessions.destination,
            trip_sessions.selected_route,
            route_options.route_name,
            trip_sessions.status,
            trip_sessions.started_at,
            trip_sessions.ended_at
        FROM trip_sessions
        JOIN users ON trip_sessions.user_id = users.user_id
        LEFT JOIN route_options ON trip_sessions.selected_route = route_options.route_id
        WHERE trip_sessions.status = 'active'
        ORDER BY trip_sessions.started_at DESC
    """).fetchall()

    connection.close()
    return rows_to_dicts(rows)

def get_route_steps(route_id):
    connection = get_connection()
    cursor = connection.cursor()

    rows = cursor.execute("""
        SELECT
            step_id,
            route_id,
            step_number,
            instruction,
            distance,
            duration
        FROM route_steps
        WHERE route_id = ?
        ORDER BY step_number
    """, (route_id,)).fetchall()

    connection.close()
    return rows_to_dicts(rows)

def get_alerts():
    connection = get_connection()
    cursor = connection.cursor()

    rows = cursor.execute("""
        SELECT
            alert_id,
            alert_type,
            message,
            zone,
            severity,
            timestamp
        FROM alerts
        ORDER BY timestamp DESC
    """).fetchall()

    connection.close()
    return rows_to_dicts(rows)