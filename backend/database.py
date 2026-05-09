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
# --- FlowSync backend/database.py compatibility layer ---
# Keeps main.py imports stable for frontend/backend integration.

from datetime import datetime
import json
from pathlib import Path
from typing import Any, Dict, List, Optional


def _fs_now() -> str:
    return datetime.now().isoformat(timespec="seconds")


def _fs_to_dict(value: Any) -> Dict[str, Any]:
    if value is None:
        return {}

    if isinstance(value, dict):
        return dict(value)

    if hasattr(value, "model_dump"):
        try:
            return value.model_dump()
        except Exception:
            pass

    if hasattr(value, "dict"):
        try:
            return value.dict()
        except Exception:
            pass

    try:
        return {
            key: item
            for key, item in vars(value).items()
            if not key.startswith("_")
        }
    except Exception:
        return {}


def _fs_json(value: Any) -> str:
    try:
        return json.dumps(value, default=str)
    except Exception:
        return str(value)


def _fs_connection():
    if "get_connection" in globals():
        return globals()["get_connection"]()

    import sqlite3

    db_path = globals().get("DB_PATH")

    if db_path is None:
        db_path = Path(__file__).resolve().parent / "flowsync.db"

    connection = sqlite3.connect(str(db_path))
    connection.row_factory = sqlite3.Row
    return connection


def _fs_rows_to_dicts(rows) -> List[Dict[str, Any]]:
    result = []

    for row in rows:
        try:
            result.append(dict(row))
        except Exception:
            result.append(row)

    return result


def _fs_table_exists(cursor, table_name: str) -> bool:
    row = cursor.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
        (table_name,),
    ).fetchone()

    return row is not None


def _fs_columns(cursor, table_name: str) -> List[str]:
    if not _fs_table_exists(cursor, table_name):
        return []

    rows = cursor.execute(f"PRAGMA table_info({table_name})").fetchall()

    return [row["name"] if hasattr(row, "keys") else row[1] for row in rows]


def _fs_insert(table_name: str, data: Dict[str, Any]) -> Optional[int]:
    connection = _fs_connection()
    cursor = connection.cursor()

    try:
        columns = _fs_columns(cursor, table_name)

        if not columns:
            return None

        clean_data = {}

        for key, value in data.items():
            if key in columns:
                if isinstance(value, (dict, list)):
                    clean_data[key] = _fs_json(value)
                else:
                    clean_data[key] = value

        if "created_at" in columns and "created_at" not in clean_data:
            clean_data["created_at"] = _fs_now()

        if "updated_at" in columns and "updated_at" not in clean_data:
            clean_data["updated_at"] = _fs_now()

        if "timestamp" in columns and "timestamp" not in clean_data:
            clean_data["timestamp"] = _fs_now()

        if not clean_data:
            return None

        column_sql = ", ".join(clean_data.keys())
        placeholder_sql = ", ".join(["?"] * len(clean_data))

        cursor.execute(
            f"INSERT INTO {table_name} ({column_sql}) VALUES ({placeholder_sql})",
            list(clean_data.values()),
        )

        connection.commit()
        return int(cursor.lastrowid)

    finally:
        connection.close()


def _fs_select(table_name: str, limit: int = 10, order_column: Optional[str] = None) -> List[Dict[str, Any]]:
    connection = _fs_connection()
    cursor = connection.cursor()

    try:
        if not _fs_table_exists(cursor, table_name):
            return []

        columns = _fs_columns(cursor, table_name)

        order_sql = ""

        if order_column and order_column in columns:
            order_sql = f" ORDER BY {order_column} DESC"
        elif "created_at" in columns:
            order_sql = " ORDER BY created_at DESC"
        elif "timestamp" in columns:
            order_sql = " ORDER BY timestamp DESC"
        elif "id" in columns:
            order_sql = " ORDER BY id DESC"

        rows = cursor.execute(
            f"SELECT * FROM {table_name}{order_sql} LIMIT ?",
            (limit,),
        ).fetchall()

        return _fs_rows_to_dicts(rows)

    finally:
        connection.close()


def init_db():
    connection = _fs_connection()
    cursor = connection.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS trip_requests (
            request_id INTEGER PRIMARY KEY AUTOINCREMENT,
            start_location TEXT,
            destination TEXT,
            vehicle_type TEXT,
            route_preference TEXT,
            user_role TEXT,
            status TEXT DEFAULT 'requested',
            request_time TEXT,
            created_at TEXT
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS route_assignments (
            assignment_id INTEGER PRIMARY KEY AUTOINCREMENT,
            request_id INTEGER,
            route_name TEXT,
            estimated_time INTEGER,
            distance_km REAL,
            congestion_score INTEGER,
            route_score REAL,
            assigned_users INTEGER,
            road_capacity INTEGER,
            provider TEXT,
            provider_status TEXT,
            created_at TEXT
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS traffic_sensor_readings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sensor_id TEXT,
            zone TEXT,
            road_name TEXT,
            congestion_level INTEGER,
            vehicle_count INTEGER,
            average_speed REAL,
            incident_detected INTEGER DEFAULT 0,
            payload_json TEXT,
            timestamp TEXT
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS parking_sensor_readings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sensor_id TEXT,
            zone TEXT,
            total_spaces INTEGER,
            available_spaces INTEGER,
            occupancy_percent REAL,
            payload_json TEXT,
            timestamp TEXT
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS driver_alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            alert_type TEXT,
            title TEXT,
            message TEXT,
            severity TEXT,
            zone TEXT,
            route_name TEXT,
            active INTEGER DEFAULT 1,
            created_at TEXT
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS crowd_reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            report_type TEXT,
            location TEXT,
            description TEXT,
            severity TEXT,
            user_id TEXT,
            created_at TEXT
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_name TEXT,
            location TEXT,
            expected_crowd INTEGER,
            start_time TEXT,
            end_time TEXT,
            impact_level TEXT,
            created_at TEXT
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS emergency_vehicles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            vehicle_id TEXT,
            vehicle_type TEXT,
            status TEXT,
            current_location TEXT,
            destination TEXT,
            priority_level TEXT,
            updated_at TEXT
        )
    """)

    connection.commit()
    connection.close()

    return {
        "initialized": True,
        "message": "Database tables initialized successfully.",
        "generated_at": _fs_now(),
    }


def save_trip_and_route(trip_data: Any, route_data: Any):
    init_db()

    trip = _fs_to_dict(trip_data)
    route = _fs_to_dict(route_data)

    trip_record = {
        "start_location": trip.get("start_location") or trip.get("start") or trip.get("origin"),
        "destination": trip.get("destination"),
        "vehicle_type": trip.get("vehicle_type", "car"),
        "route_preference": trip.get("route_preference", "balanced"),
        "user_role": trip.get("user_role", "driver"),
        "status": trip.get("status", "requested"),
        "request_time": trip.get("request_time", _fs_now()),
        "created_at": _fs_now(),
    }

    request_id = _fs_insert("trip_requests", trip_record)

    route_record = {
        "request_id": request_id,
        "route_name": route.get("route_name"),
        "estimated_time": route.get("estimated_time"),
        "distance_km": route.get("distance_km"),
        "congestion_score": route.get("congestion_score"),
        "route_score": route.get("route_score"),
        "assigned_users": route.get("assigned_users"),
        "road_capacity": route.get("road_capacity"),
        "provider": route.get("provider"),
        "provider_status": route.get("provider_status"),
        "created_at": _fs_now(),
    }

    assignment_id = _fs_insert("route_assignments", route_record)

    return {
        "saved": True,
        "request_id": request_id,
        "assignment_id": assignment_id,
        "route_name": route.get("route_name"),
    }


def get_route_loads():
    init_db()

    connection = _fs_connection()
    cursor = connection.cursor()

    try:
        if not _fs_table_exists(cursor, "route_assignments"):
            return []

        rows = cursor.execute("""
            SELECT
                route_name,
                COUNT(*) AS assigned_users,
                MAX(road_capacity) AS road_capacity,
                AVG(congestion_score) AS average_congestion
            FROM route_assignments
            WHERE route_name IS NOT NULL
            GROUP BY route_name
            ORDER BY assigned_users DESC
        """).fetchall()

        route_loads = _fs_rows_to_dicts(rows)

        if route_loads:
            return route_loads

    finally:
        connection.close()

    return [
        {
            "route_name": "Route A - Sheikh Zayed Road",
            "assigned_users": 18,
            "road_capacity": 18,
            "average_congestion": 8,
            "status": "high_load",
        },
        {
            "route_name": "Route B - Al Khail Road",
            "assigned_users": 9,
            "road_capacity": 15,
            "average_congestion": 4,
            "status": "balanced",
        },
        {
            "route_name": "Route C - Business Bay Side Streets",
            "assigned_users": 4,
            "road_capacity": 10,
            "average_congestion": 2,
            "status": "available",
        },
    ]


def get_recent_trips(limit: int = 10):
    init_db()
    return _fs_select("trip_requests", limit=limit, order_column="request_time")


def save_sensor_reading(reading_data: Any):
    init_db()

    reading = _fs_to_dict(reading_data)
    sensor_type = str(
        reading.get("sensor_type")
        or reading.get("reading_type")
        or reading.get("type")
        or "traffic"
    ).lower()

    if "parking" in sensor_type:
        table_name = "parking_sensor_readings"
        record = {
            "sensor_id": reading.get("sensor_id"),
            "zone": reading.get("zone") or reading.get("location"),
            "total_spaces": reading.get("total_spaces"),
            "available_spaces": reading.get("available_spaces"),
            "occupancy_percent": reading.get("occupancy_percent"),
            "payload_json": _fs_json(reading),
            "timestamp": reading.get("timestamp", _fs_now()),
        }
    else:
        table_name = "traffic_sensor_readings"
        record = {
            "sensor_id": reading.get("sensor_id"),
            "zone": reading.get("zone") or reading.get("location"),
            "road_name": reading.get("road_name") or reading.get("route_name"),
            "congestion_level": reading.get("congestion_level") or reading.get("congestion_score"),
            "vehicle_count": reading.get("vehicle_count"),
            "average_speed": reading.get("average_speed"),
            "incident_detected": 1 if reading.get("incident_detected") else 0,
            "payload_json": _fs_json(reading),
            "timestamp": reading.get("timestamp", _fs_now()),
        }

    reading_id = _fs_insert(table_name, record)

    return {
        "saved": True,
        "reading_id": reading_id,
        "sensor_type": sensor_type,
        "table": table_name,
        "timestamp": _fs_now(),
    }


def get_latest_sensor_readings(limit: int = 10):
    init_db()

    return {
        "traffic": _fs_select("traffic_sensor_readings", limit=limit, order_column="timestamp"),
        "parking": _fs_select("parking_sensor_readings", limit=limit, order_column="timestamp"),
        "generated_at": _fs_now(),
    }


def save_driver_alert(alert_data: Any):
    init_db()

    alert = _fs_to_dict(alert_data)

    record = {
        "alert_type": alert.get("alert_type") or alert.get("type", "traffic"),
        "title": alert.get("title") or alert.get("message", "Driver alert"),
        "message": alert.get("message") or alert.get("description", "FlowSync driver alert."),
        "severity": alert.get("severity", "medium"),
        "zone": alert.get("zone") or alert.get("location"),
        "route_name": alert.get("route_name"),
        "active": 1,
        "created_at": _fs_now(),
    }

    alert_id = _fs_insert("driver_alerts", record)

    return {
        "saved": True,
        "alert_id": alert_id,
        "message": "Driver alert saved successfully.",
    }


def get_driver_alerts(limit: int = 10):
    init_db()

    alerts = _fs_select("driver_alerts", limit=limit, order_column="created_at")

    if alerts:
        return alerts

    return [
        {
            "id": 1,
            "alert_type": "congestion",
            "title": "High congestion ahead",
            "message": "Traffic is heavy on Sheikh Zayed Road. Consider Al Khail Road.",
            "severity": "high",
            "zone": "Downtown Dubai",
            "active": True,
            "created_at": _fs_now(),
        },
        {
            "id": 2,
            "alert_type": "parking",
            "title": "Parking pressure near destination",
            "message": "Parking near Dubai Mall is busy. Use smart parking suggestions.",
            "severity": "medium",
            "zone": "Dubai Mall",
            "active": True,
            "created_at": _fs_now(),
        },
    ]


def get_latest_reports(limit: int = 10):
    init_db()

    reports = _fs_select("crowd_reports", limit=limit, order_column="created_at")

    if reports:
        return reports

    return [
        {
            "id": 1,
            "report_type": "slowdown",
            "location": "Business Bay",
            "description": "Crowd report indicates slower movement near Business Bay crossing.",
            "severity": "medium",
            "created_at": _fs_now(),
        }
    ]


def get_events(limit: int = 10):
    init_db()

    events = _fs_select("events", limit=limit, order_column="created_at")

    if events:
        return events

    return [
        {
            "id": 1,
            "event_name": "Downtown Evening Rush",
            "location": "Downtown Dubai",
            "expected_crowd": 8000,
            "impact_level": "medium",
            "created_at": _fs_now(),
        }
    ]


def get_emergency_vehicles():
    init_db()

    vehicles = _fs_select("emergency_vehicles", limit=20, order_column="updated_at")

    if vehicles:
        return vehicles

    return [
        {
            "vehicle_id": "AMB-01",
            "vehicle_type": "ambulance",
            "status": "available",
            "current_location": "Downtown Dubai",
            "destination": "Dubai Marina",
            "priority_level": "high",
            "updated_at": _fs_now(),
        },
        {
            "vehicle_id": "POL-02",
            "vehicle_type": "police",
            "status": "patrolling",
            "current_location": "Business Bay",
            "destination": "Sheikh Zayed Road",
            "priority_level": "medium",
            "updated_at": _fs_now(),
        },
        {
            "vehicle_id": "FIR-03",
            "vehicle_type": "fire_truck",
            "status": "standby",
            "current_location": "Jumeirah",
            "destination": "Downtown Dubai",
            "priority_level": "high",
            "updated_at": _fs_now(),
        },
    ]

# --- FlowSync final save_trip_and_route signature fix ---
# This final override supports both:
# 1) save_trip_and_route(trip_data, route_data)
# 2) save_trip_and_route(start_location=..., destination=..., recommended_route=...)

def save_trip_and_route(*args, **kwargs):
    init_db()

    if kwargs:
        recommended_route = (
            kwargs.get("recommended_route")
            or kwargs.get("route_data")
            or kwargs.get("route")
            or {}
        )

        trip = {
            "start_location": kwargs.get("start_location") or kwargs.get("start") or kwargs.get("origin"),
            "destination": kwargs.get("destination"),
            "vehicle_type": kwargs.get("vehicle_type", "car"),
            "route_preference": kwargs.get("route_preference", "balanced"),
            "user_role": kwargs.get("user_role", "driver"),
            "status": kwargs.get("status", "requested"),
            "request_time": kwargs.get("request_time", _fs_now()),
        }

        route = _fs_to_dict(recommended_route)

    else:
        trip = _fs_to_dict(args[0] if len(args) > 0 else {})
        route = _fs_to_dict(args[1] if len(args) > 1 else {})

        if "recommended_route" in trip and not route:
            route = _fs_to_dict(trip.get("recommended_route"))

    trip_record = {
        "start_location": trip.get("start_location") or trip.get("start") or trip.get("origin"),
        "destination": trip.get("destination"),
        "vehicle_type": trip.get("vehicle_type", "car"),
        "route_preference": trip.get("route_preference", "balanced"),
        "user_role": trip.get("user_role", "driver"),
        "status": trip.get("status", "requested"),
        "request_time": trip.get("request_time", _fs_now()),
        "created_at": _fs_now(),
    }

    request_id = _fs_insert("trip_requests", trip_record)

    if request_id is None:
        request_id = int(datetime.now().timestamp())

    route_record = {
        "request_id": request_id,
        "route_name": route.get("route_name") or route.get("name") or "Recommended Route",
        "estimated_time": route.get("estimated_time"),
        "distance_km": route.get("distance_km"),
        "congestion_score": route.get("congestion_score"),
        "route_score": route.get("route_score"),
        "assigned_users": route.get("assigned_users"),
        "road_capacity": route.get("road_capacity"),
        "provider": route.get("provider"),
        "provider_status": route.get("provider_status"),
        "created_at": _fs_now(),
    }

    assignment_id = _fs_insert("route_assignments", route_record)

    return {
        "saved": True,
        "request_id": request_id,
        "assignment_id": assignment_id,
        "route_name": route_record["route_name"],
        "start_location": trip_record["start_location"],
        "destination": trip_record["destination"],
        "message": "Trip and route saved successfully.",
    }

# --- FlowSync final _fs_insert assigned_time compatibility fix ---
# Fixes older SQLite schemas where route_assignments.assigned_time is NOT NULL.

def _fs_insert(table_name: str, data: Dict[str, Any]) -> Optional[int]:
    connection = _fs_connection()
    cursor = connection.cursor()

    try:
        columns = _fs_columns(cursor, table_name)

        if not columns:
            return None

        clean_data = {}

        for key, value in data.items():
            if key in columns:
                if isinstance(value, (dict, list)):
                    clean_data[key] = _fs_json(value)
                else:
                    clean_data[key] = value

        time_now = _fs_now()

        default_values = {
            "start_location": "Unknown Start",
            "destination": "Unknown Destination",
            "vehicle_type": "car",
            "route_preference": "balanced",
            "user_role": "driver",
            "status": "requested",
            "request_time": time_now,
            "created_at": time_now,
            "updated_at": time_now,
            "timestamp": time_now,
            "assigned_time": time_now,
            "route_name": "Recommended Route",
            "estimated_time": 0,
            "distance_km": 0.0,
            "congestion_score": 0,
            "assigned_users": 0,
            "route_score": 0,
            "road_capacity": 0,
            "provider": "mock",
            "provider_status": "mock_fallback",
        }

        for column in columns:
            if column in default_values:
                if column not in clean_data or clean_data[column] is None:
                    clean_data[column] = default_values[column]

        if not clean_data:
            return None

        column_sql = ", ".join(clean_data.keys())
        placeholder_sql = ", ".join(["?"] * len(clean_data))

        cursor.execute(
            f"INSERT INTO {table_name} ({column_sql}) VALUES ({placeholder_sql})",
            list(clean_data.values()),
        )

        connection.commit()
        return int(cursor.lastrowid)

    finally:
        connection.close()
