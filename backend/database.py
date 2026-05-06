import sqlite3
from datetime import datetime
from pathlib import Path

DB_PATH = Path(__file__).parent / "flowsync.db"


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS trip_requests (
            request_id INTEGER PRIMARY KEY AUTOINCREMENT,
            start_location TEXT NOT NULL,
            destination TEXT NOT NULL,
            vehicle_type TEXT NOT NULL,
            request_time TEXT NOT NULL
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS route_assignments (
            assignment_id INTEGER PRIMARY KEY AUTOINCREMENT,
            request_id INTEGER NOT NULL,
            route_name TEXT NOT NULL,
            estimated_time REAL NOT NULL,
            distance_km REAL NOT NULL,
            congestion_score REAL NOT NULL,
            assigned_users INTEGER NOT NULL,
            route_score REAL NOT NULL,
            assigned_time TEXT NOT NULL,
            FOREIGN KEY (request_id) REFERENCES trip_requests(request_id)
        )
    """)

    conn.commit()
    conn.close()


def save_trip_and_route(start_location, destination, vehicle_type, recommended_route):
    conn = get_connection()
    cursor = conn.cursor()

    request_time = datetime.now().isoformat(timespec="seconds")

    cursor.execute("""
        INSERT INTO trip_requests (
            start_location,
            destination,
            vehicle_type,
            request_time
        )
        VALUES (?, ?, ?, ?)
    """, (start_location, destination, vehicle_type, request_time))

    request_id = cursor.lastrowid

    cursor.execute("""
        INSERT INTO route_assignments (
            request_id,
            route_name,
            estimated_time,
            distance_km,
            congestion_score,
            assigned_users,
            route_score,
            assigned_time
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        request_id,
        recommended_route["route_name"],
        recommended_route["estimated_time"],
        recommended_route["distance_km"],
        recommended_route["congestion_score"],
        recommended_route["assigned_users"],
        recommended_route["route_score"],
        request_time
    ))

    assignment_id = cursor.lastrowid

    conn.commit()
    conn.close()

    return {
        "request_id": request_id,
        "assignment_id": assignment_id
    }


def get_dashboard_stats():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) AS total FROM trip_requests")
    total_trip_requests = cursor.fetchone()["total"]

    cursor.execute("""
        SELECT route_name, COUNT(*) AS users
        FROM route_assignments
        GROUP BY route_name
    """)
    route_counts = cursor.fetchall()

    routes = {}
    for row in route_counts:
        routes[row["route_name"]] = row["users"]

    conn.close()

    return {
        "total_trip_requests": total_trip_requests,
        "route_distribution": routes,
        "estimated_congestion_reduction": "18%",
        "average_time_saved": "7 minutes",
        "fuel_saved_estimate": "2.4 liters"
    }


def get_recent_trips():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT
            tr.request_id,
            tr.start_location,
            tr.destination,
            tr.vehicle_type,
            tr.request_time,
            ra.route_name,
            ra.estimated_time,
            ra.distance_km,
            ra.congestion_score,
            ra.route_score
        FROM trip_requests tr
        JOIN route_assignments ra
        ON tr.request_id = ra.request_id
        ORDER BY tr.request_id DESC
        LIMIT 10
    """)

    trips = [dict(row) for row in cursor.fetchall()]

    conn.close()

    return trips
