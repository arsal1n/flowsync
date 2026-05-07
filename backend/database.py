import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

DB_PATH = Path(__file__).resolve().parent / "flowsync.db"


def get_connection():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def current_time():
    return datetime.now().isoformat(timespec="seconds")


def table_has_column(cursor, table_name: str, column_name: str) -> bool:
    cursor.execute(f"PRAGMA table_info({table_name})")
    columns = [row["name"] for row in cursor.fetchall()]
    return column_name in columns


def add_column_if_missing(cursor, table_name: str, column_name: str, column_definition: str):
    if not table_has_column(cursor, table_name, column_name):
        cursor.execute(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_definition}")


def init_db():
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

    add_column_if_missing(cursor, "trip_requests", "vehicle_type", "TEXT DEFAULT 'car'")
    add_column_if_missing(cursor, "trip_requests", "route_preference", "TEXT DEFAULT 'balanced'")
    add_column_if_missing(cursor, "trip_requests", "user_role", "TEXT DEFAULT 'driver'")

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS route_assignments (
            assignment_id INTEGER PRIMARY KEY AUTOINCREMENT,
            request_id INTEGER NOT NULL,
            route_name TEXT NOT NULL,
            estimated_time REAL NOT NULL,
            distance_km REAL NOT NULL,
            congestion_score REAL NOT NULL,
            assigned_users INTEGER DEFAULT 0,
            route_score REAL NOT NULL,
            road_capacity REAL DEFAULT 0,
            route_type TEXT DEFAULT 'standard',
            capacity_ratio REAL DEFAULT 0,
            fairness_penalty REAL DEFAULT 0,
            assigned_time TEXT NOT NULL,
            FOREIGN KEY (request_id) REFERENCES trip_requests(request_id)
        )
    """)

    add_column_if_missing(cursor, "route_assignments", "road_capacity", "REAL DEFAULT 0")
    add_column_if_missing(cursor, "route_assignments", "route_type", "TEXT DEFAULT 'standard'")
    add_column_if_missing(cursor, "route_assignments", "capacity_ratio", "REAL DEFAULT 0")
    add_column_if_missing(cursor, "route_assignments", "fairness_penalty", "REAL DEFAULT 0")

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS parking_zones (
            zone_id INTEGER PRIMARY KEY AUTOINCREMENT,
            zone_name TEXT UNIQUE NOT NULL,
            total_spaces INTEGER NOT NULL,
            occupied_spaces INTEGER NOT NULL,
            walking_distance_m INTEGER NOT NULL,
            safety_score REAL NOT NULL,
            updated_time TEXT NOT NULL
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sensor_readings (
            sensor_id INTEGER PRIMARY KEY AUTOINCREMENT,
            sensor_type TEXT NOT NULL,
            zone_name TEXT NOT NULL,
            vehicle_count INTEGER DEFAULT 0,
            average_speed REAL DEFAULT 0,
            congestion_level REAL DEFAULT 0,
            parking_occupancy REAL DEFAULT 0,
            road_capacity_score REAL DEFAULT 0,
            recorded_time TEXT NOT NULL
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS driver_alerts (
            alert_id INTEGER PRIMARY KEY AUTOINCREMENT,
            alert_type TEXT NOT NULL,
            message TEXT NOT NULL,
            zone_name TEXT NOT NULL,
            severity TEXT DEFAULT 'medium',
            created_time TEXT NOT NULL
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS incidents (
            incident_id INTEGER PRIMARY KEY AUTOINCREMENT,
            incident_type TEXT NOT NULL,
            location TEXT NOT NULL,
            severity TEXT DEFAULT 'medium',
            description TEXT,
            status TEXT DEFAULT 'active',
            reported_time TEXT NOT NULL
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS events (
            event_id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_name TEXT NOT NULL,
            location TEXT NOT NULL,
            expected_drivers INTEGER DEFAULT 0,
            event_time TEXT NOT NULL,
            status TEXT DEFAULT 'planned',
            created_time TEXT NOT NULL
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS admin_actions (
            action_id INTEGER PRIMARY KEY AUTOINCREMENT,
            action_type TEXT NOT NULL,
            target_area TEXT NOT NULL,
            description TEXT NOT NULL,
            status TEXT DEFAULT 'active',
            created_time TEXT NOT NULL
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_reports (
            report_id INTEGER PRIMARY KEY AUTOINCREMENT,
            report_type TEXT NOT NULL,
            location TEXT NOT NULL,
            description TEXT NOT NULL,
            validation_status TEXT DEFAULT 'pending_ai_validation',
            created_time TEXT NOT NULL
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS emergency_vehicles (
            vehicle_id INTEGER PRIMARY KEY AUTOINCREMENT,
            vehicle_type TEXT NOT NULL,
            unit_name TEXT NOT NULL,
            current_location TEXT NOT NULL,
            status TEXT DEFAULT 'available',
            updated_time TEXT NOT NULL
        )
    """)

    seed_initial_data(cursor)

    connection.commit()
    connection.close()


def seed_initial_data(cursor):
    now = current_time()

    parking_count = cursor.execute("SELECT COUNT(*) AS count FROM parking_zones").fetchone()["count"]
    if parking_count == 0:
        parking_zones = [
            ("Dubai Mall Parking A", 500, 390, 120, 8.7, now),
            ("Dubai Mall Parking B", 420, 230, 250, 8.1, now),
            ("Business Bay Smart Parking", 300, 140, 500, 7.6, now),
            ("Dubai Marina Parking Hub", 350, 280, 300, 8.4, now),
        ]

        cursor.executemany("""
            INSERT OR IGNORE INTO parking_zones (
                zone_name,
                total_spaces,
                occupied_spaces,
                walking_distance_m,
                safety_score,
                updated_time
            )
            VALUES (?, ?, ?, ?, ?, ?)
        """, parking_zones)

    sensor_count = cursor.execute("SELECT COUNT(*) AS count FROM sensor_readings").fetchone()["count"]
    if sensor_count == 0:
        sensors = [
            ("traffic", "Sheikh Zayed Road", 920, 38, 8.2, 0, 78, now),
            ("traffic", "Al Khail Road", 610, 54, 4.7, 0, 62, now),
            ("traffic", "Business Bay", 430, 42, 5.3, 0, 58, now),
            ("parking", "Dubai Mall", 0, 0, 0, 78, 0, now),
        ]

        cursor.executemany("""
            INSERT INTO sensor_readings (
                sensor_type,
                zone_name,
                vehicle_count,
                average_speed,
                congestion_level,
                parking_occupancy,
                road_capacity_score,
                recorded_time
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, sensors)

    incident_count = cursor.execute("SELECT COUNT(*) AS count FROM incidents").fetchone()["count"]
    if incident_count == 0:
        incidents = [
            ("slowdown", "Business Bay", "medium", "Sudden speed drop detected near exit road.", "active", now),
            ("construction", "Dubai Marina", "low", "Minor roadwork causing lane narrowing.", "active", now),
        ]

        cursor.executemany("""
            INSERT INTO incidents (
                incident_type,
                location,
                severity,
                description,
                status,
                reported_time
            )
            VALUES (?, ?, ?, ?, ?, ?)
        """, incidents)

    emergency_count = cursor.execute("SELECT COUNT(*) AS count FROM emergency_vehicles").fetchone()["count"]
    if emergency_count == 0:
        emergency_vehicles = [
            ("ambulance", "Ambulance Unit A1", "Downtown Dubai", "available", now),
            ("police", "Police Patrol P7", "Business Bay", "available", now),
            ("fire_truck", "Fire Unit F3", "Dubai Marina", "available", now),
        ]

        cursor.executemany("""
            INSERT INTO emergency_vehicles (
                vehicle_type,
                unit_name,
                current_location,
                status,
                updated_time
            )
            VALUES (?, ?, ?, ?, ?)
        """, emergency_vehicles)


def save_trip_and_route(
    start_location: str,
    destination: str,
    vehicle_type: str,
    recommended_route: Dict[str, Any],
    route_preference: str = "balanced",
    user_role: str = "driver"
):
    connection = get_connection()
    cursor = connection.cursor()

    request_time = current_time()

    cursor.execute("""
        INSERT INTO trip_requests (
            start_location,
            destination,
            vehicle_type,
            route_preference,
            user_role,
            request_time
        )
        VALUES (?, ?, ?, ?, ?, ?)
    """, (
        start_location,
        destination,
        vehicle_type,
        route_preference,
        user_role,
        request_time
    ))

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
            road_capacity,
            route_type,
            capacity_ratio,
            fairness_penalty,
            assigned_time
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        request_id,
        recommended_route["route_name"],
        recommended_route["estimated_time"],
        recommended_route["distance_km"],
        recommended_route["congestion_score"],
        recommended_route.get("assigned_users", 0),
        recommended_route["route_score"],
        recommended_route.get("road_capacity", 0),
        recommended_route.get("route_type", "standard"),
        recommended_route.get("capacity_ratio", 0),
        recommended_route.get("fairness_penalty", 0),
        request_time
    ))

    assignment_id = cursor.lastrowid

    connection.commit()
    connection.close()

    return {
        "request_id": request_id,
        "assignment_id": assignment_id
    }


def get_route_assignment_counts() -> Dict[str, int]:
    connection = get_connection()
    cursor = connection.cursor()

    rows = cursor.execute("""
        SELECT route_name, COUNT(*) AS assigned_users
        FROM route_assignments
        GROUP BY route_name
    """).fetchall()

    connection.close()

    return {
        row["route_name"]: row["assigned_users"]
        for row in rows
    }


def get_route_loads() -> List[Dict[str, Any]]:
    route_capacities = {
        "Route A - Sheikh Zayed Road": 18,
        "Route B - Al Khail Road": 15,
        "Route C - Business Bay Side Streets": 10,
        "Route D - Jumeirah Coastal Alternative": 12,
    }

    counts = get_route_assignment_counts()
    route_names = set(route_capacities.keys()) | set(counts.keys())

    route_loads = []

    for route_name in sorted(route_names):
        assigned_users = counts.get(route_name, 0)
        capacity = route_capacities.get(route_name, 10)
        capacity_ratio = assigned_users / max(capacity, 1)

        if capacity_ratio >= 1:
            status = "overloaded"
        elif capacity_ratio >= 0.7:
            status = "high"
        elif capacity_ratio >= 0.4:
            status = "moderate"
        else:
            status = "low"

        route_loads.append({
            "route_name": route_name,
            "assigned_users": assigned_users,
            "road_capacity": capacity,
            "capacity_ratio": round(capacity_ratio, 2),
            "load_status": status
        })

    return route_loads


def get_dashboard_stats():
    connection = get_connection()
    cursor = connection.cursor()

    total_trip_requests = cursor.execute(
        "SELECT COUNT(*) AS count FROM trip_requests"
    ).fetchone()["count"]

    route_rows = cursor.execute("""
        SELECT route_name, COUNT(*) AS users
        FROM route_assignments
        GROUP BY route_name
    """).fetchall()

    route_distribution = {
        row["route_name"]: row["users"]
        for row in route_rows
    }

    connection.close()

    return {
        "total_trip_requests": total_trip_requests,
        "route_distribution": route_distribution,
        "route_loads": get_route_loads(),
        "estimated_congestion_reduction": "24%",
        "average_time_saved": "7 minutes",
        "fuel_saved_estimate": "2.4 liters",
        "system_status": "FlowSync smart-city backend active"
    }


def get_recent_trips(limit: int = 10):
    connection = get_connection()
    cursor = connection.cursor()

    rows = cursor.execute("""
        SELECT
            tr.request_id,
            tr.start_location,
            tr.destination,
            tr.vehicle_type,
            tr.route_preference,
            tr.user_role,
            tr.request_time,
            ra.route_name,
            ra.estimated_time,
            ra.distance_km,
            ra.congestion_score,
            ra.assigned_users,
            ra.route_score,
            ra.route_type,
            ra.capacity_ratio
        FROM trip_requests tr
        JOIN route_assignments ra
        ON tr.request_id = ra.request_id
        ORDER BY tr.request_id DESC
        LIMIT ?
    """, (limit,)).fetchall()

    trips = [dict(row) for row in rows]

    connection.close()

    return trips


def get_parking_zones():
    connection = get_connection()
    cursor = connection.cursor()

    rows = cursor.execute("""
        SELECT *
        FROM parking_zones
        ORDER BY zone_id ASC
    """).fetchall()

    connection.close()

    return [dict(row) for row in rows]


def save_sensor_reading(
    sensor_type: str,
    zone_name: str,
    vehicle_count: int = 0,
    average_speed: float = 0,
    congestion_level: float = 0,
    parking_occupancy: float = 0,
    road_capacity_score: float = 0
):
    connection = get_connection()
    cursor = connection.cursor()

    recorded_time = current_time()

    cursor.execute("""
        INSERT INTO sensor_readings (
            sensor_type,
            zone_name,
            vehicle_count,
            average_speed,
            congestion_level,
            parking_occupancy,
            road_capacity_score,
            recorded_time
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        sensor_type,
        zone_name,
        vehicle_count,
        average_speed,
        congestion_level,
        parking_occupancy,
        road_capacity_score,
        recorded_time
    ))

    sensor_id = cursor.lastrowid

    connection.commit()
    connection.close()

    return {
        "sensor_id": sensor_id,
        "recorded_time": recorded_time
    }


def get_latest_sensor_readings(limit: int = 10):
    connection = get_connection()
    cursor = connection.cursor()

    rows = cursor.execute("""
        SELECT *
        FROM sensor_readings
        ORDER BY sensor_id DESC
        LIMIT ?
    """, (limit,)).fetchall()

    connection.close()

    return [dict(row) for row in rows]


def save_driver_alert(
    alert_type: str,
    message: str,
    zone_name: str,
    severity: str = "medium"
):
    connection = get_connection()
    cursor = connection.cursor()

    created_time = current_time()

    cursor.execute("""
        INSERT INTO driver_alerts (
            alert_type,
            message,
            zone_name,
            severity,
            created_time
        )
        VALUES (?, ?, ?, ?, ?)
    """, (
        alert_type,
        message,
        zone_name,
        severity,
        created_time
    ))

    alert_id = cursor.lastrowid

    connection.commit()
    connection.close()

    return {
        "alert_id": alert_id,
        "created_time": created_time
    }


def get_driver_alerts(limit: int = 10):
    connection = get_connection()
    cursor = connection.cursor()

    rows = cursor.execute("""
        SELECT *
        FROM driver_alerts
        ORDER BY alert_id DESC
        LIMIT ?
    """, (limit,)).fetchall()

    connection.close()

    return [dict(row) for row in rows]


def get_latest_incidents(limit: int = 10):
    connection = get_connection()
    cursor = connection.cursor()

    rows = cursor.execute("""
        SELECT *
        FROM incidents
        ORDER BY incident_id DESC
        LIMIT ?
    """, (limit,)).fetchall()

    connection.close()

    return [dict(row) for row in rows]


def save_event(
    event_name: str,
    location: str,
    expected_drivers: int,
    event_time: str,
    status: str = "planned"
):
    connection = get_connection()
    cursor = connection.cursor()

    created_time = current_time()

    cursor.execute("""
        INSERT INTO events (
            event_name,
            location,
            expected_drivers,
            event_time,
            status,
            created_time
        )
        VALUES (?, ?, ?, ?, ?, ?)
    """, (
        event_name,
        location,
        expected_drivers,
        event_time,
        status,
        created_time
    ))

    event_id = cursor.lastrowid

    connection.commit()
    connection.close()

    return {
        "event_id": event_id,
        "created_time": created_time
    }


def get_events(limit: int = 10):
    connection = get_connection()
    cursor = connection.cursor()

    rows = cursor.execute("""
        SELECT *
        FROM events
        ORDER BY event_id DESC
        LIMIT ?
    """, (limit,)).fetchall()

    connection.close()

    return [dict(row) for row in rows]


def save_admin_action(action_type: str, target_area: str, description: str):
    connection = get_connection()
    cursor = connection.cursor()

    created_time = current_time()

    cursor.execute("""
        INSERT INTO admin_actions (
            action_type,
            target_area,
            description,
            status,
            created_time
        )
        VALUES (?, ?, ?, ?, ?)
    """, (
        action_type,
        target_area,
        description,
        "active",
        created_time
    ))

    action_id = cursor.lastrowid

    connection.commit()
    connection.close()

    return {
        "action_id": action_id,
        "created_time": created_time
    }


def save_user_report(report_type: str, location: str, description: str):
    connection = get_connection()
    cursor = connection.cursor()

    created_time = current_time()

    cursor.execute("""
        INSERT INTO user_reports (
            report_type,
            location,
            description,
            validation_status,
            created_time
        )
        VALUES (?, ?, ?, ?, ?)
    """, (
        report_type,
        location,
        description,
        "pending_ai_validation",
        created_time
    ))

    report_id = cursor.lastrowid

    connection.commit()
    connection.close()

    return {
        "report_id": report_id,
        "created_time": created_time,
        "validation_status": "pending_ai_validation"
    }


def get_latest_reports(limit: int = 10):
    connection = get_connection()
    cursor = connection.cursor()

    rows = cursor.execute("""
        SELECT *
        FROM user_reports
        ORDER BY report_id DESC
        LIMIT ?
    """, (limit,)).fetchall()

    connection.close()

    return [dict(row) for row in rows]


def get_emergency_vehicles():
    connection = get_connection()
    cursor = connection.cursor()

    rows = cursor.execute("""
        SELECT *
        FROM emergency_vehicles
        ORDER BY vehicle_id ASC
    """).fetchall()

    connection.close()

    return [dict(row) for row in rows]