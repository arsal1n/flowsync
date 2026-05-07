import sqlite3
from typing import Any, Dict, List

from database import (
    DB_PATH,
    get_connection,
    get_dashboard_stats,
    get_driver_alerts,
    get_emergency_vehicles,
    get_events,
    get_latest_incidents,
    get_latest_reports,
    get_latest_sensor_readings,
    get_parking_zones,
    get_recent_trips,
    get_route_loads,
    init_db,
    save_admin_action,
    save_driver_alert,
    save_event,
    save_sensor_reading,
    save_trip_and_route,
    save_user_report,
)
from route_engine import get_recommended_route


DEMO_TABLES = [
    "route_assignments",
    "trip_requests",
    "driver_alerts",
    "sensor_readings",
    "parking_zones",
    "incidents",
    "events",
    "admin_actions",
    "user_reports",
    "emergency_vehicles",
]


def get_table_count(table_name: str) -> int:
    connection = get_connection()
    cursor = connection.cursor()

    try:
        row = cursor.execute(
            f"SELECT COUNT(*) AS count FROM {table_name}"
        ).fetchone()
        count = row["count"]
    except sqlite3.OperationalError:
        count = 0

    connection.close()
    return count


def get_demo_status() -> Dict[str, Any]:
    return {
        "demo_ready": True,
        "database_path": str(DB_PATH),
        "dashboard": get_dashboard_stats(),
        "route_loads": get_route_loads(),
        "recent_trips": get_recent_trips(),
        "latest_sensor_readings": get_latest_sensor_readings(),
        "driver_alerts": get_driver_alerts(),
        "events": get_events(),
        "incidents": get_latest_incidents(),
        "reports": get_latest_reports(),
        "parking_zones": get_parking_zones(),
        "emergency_vehicles": get_emergency_vehicles(),
        "table_counts": {
            "trip_requests": get_table_count("trip_requests"),
            "route_assignments": get_table_count("route_assignments"),
            "sensor_readings": get_table_count("sensor_readings"),
            "driver_alerts": get_table_count("driver_alerts"),
            "events": get_table_count("events"),
            "user_reports": get_table_count("user_reports"),
            "parking_zones": get_table_count("parking_zones"),
            "emergency_vehicles": get_table_count("emergency_vehicles"),
        },
    }


def reset_demo_data() -> Dict[str, Any]:
    init_db()

    connection = get_connection()
    cursor = connection.cursor()

    for table_name in DEMO_TABLES:
        try:
            cursor.execute(f"DELETE FROM {table_name}")
        except sqlite3.OperationalError:
            pass

    try:
        placeholders = ",".join(["?"] * len(DEMO_TABLES))
        cursor.execute(
            f"DELETE FROM sqlite_sequence WHERE name IN ({placeholders})",
            DEMO_TABLES
        )
    except sqlite3.OperationalError:
        pass

    connection.commit()
    connection.close()

    init_db()

    return {
        "message": "Demo data reset successfully.",
        "demo_status": get_demo_status(),
    }


def seed_demo_data() -> Dict[str, Any]:
    reset_demo_data()

    sample_trips: List[Dict[str, str]] = [
        {
            "start_location": "Dubai Mall",
            "destination": "Dubai Marina",
            "vehicle_type": "car",
            "route_preference": "balanced",
            "user_role": "driver",
        },
        {
            "start_location": "Dubai Mall",
            "destination": "Dubai Marina",
            "vehicle_type": "car",
            "route_preference": "eco",
            "user_role": "driver",
        },
        {
            "start_location": "Dubai Arena",
            "destination": "City Exit Routes",
            "vehicle_type": "car",
            "route_preference": "balanced",
            "user_role": "driver",
        },
        {
            "start_location": "Downtown Dubai",
            "destination": "Sharjah",
            "vehicle_type": "car",
            "route_preference": "low_stress",
            "user_role": "driver",
        },
        {
            "start_location": "Business Bay",
            "destination": "Rashid Hospital",
            "vehicle_type": "ambulance",
            "route_preference": "fastest",
            "user_role": "ambulance",
        },
        {
            "start_location": "Dubai Police HQ",
            "destination": "Dubai Airport",
            "vehicle_type": "police",
            "route_preference": "fastest",
            "user_role": "police",
        },
    ]

    saved_trips = []

    for trip in sample_trips:
        route_result = get_recommended_route(
            start_location=trip["start_location"],
            destination=trip["destination"],
            route_preference=trip["route_preference"],
            user_role=trip["user_role"],
        )

        saved_record = save_trip_and_route(
            start_location=trip["start_location"],
            destination=trip["destination"],
            vehicle_type=trip["vehicle_type"],
            recommended_route=route_result["recommended_route"],
            route_preference=trip["route_preference"],
            user_role=trip["user_role"],
        )

        saved_trips.append({
            "trip": trip,
            "recommended_route": route_result["recommended_route"]["route_name"],
            "database_record": saved_record,
        })

    sensor_records = [
        save_sensor_reading(
            sensor_type="traffic",
            zone_name="Sheikh Zayed Road",
            vehicle_count=980,
            average_speed=34,
            congestion_level=8.8,
            road_capacity_score=84,
        ),
        save_sensor_reading(
            sensor_type="traffic",
            zone_name="Al Khail Road",
            vehicle_count=650,
            average_speed=52,
            congestion_level=5.1,
            road_capacity_score=66,
        ),
        save_sensor_reading(
            sensor_type="traffic",
            zone_name="Business Bay",
            vehicle_count=520,
            average_speed=39,
            congestion_level=6.2,
            road_capacity_score=60,
        ),
        save_sensor_reading(
            sensor_type="parking",
            zone_name="Dubai Mall",
            parking_occupancy=82,
        ),
    ]

    alert_records = [
        save_driver_alert(
            alert_type="congestion",
            message="Heavy congestion building near Sheikh Zayed Road.",
            zone_name="Sheikh Zayed Road",
            severity="high",
        ),
        save_driver_alert(
            alert_type="emergency_vehicle",
            message="Emergency vehicle approaching near Business Bay. Give way when safe.",
            zone_name="Business Bay",
            severity="critical",
        ),
        save_driver_alert(
            alert_type="parking",
            message="Dubai Mall Parking A is almost full. Use alternative parking.",
            zone_name="Dubai Mall",
            severity="medium",
        ),
    ]

    event_record = save_event(
        event_name="Concert Exit Simulation",
        location="Dubai Arena",
        expected_drivers=100,
        event_time="17:00",
        status="demo_seeded",
    )

    admin_action_record = save_admin_action(
        action_type="reroute_zone",
        target_area="Downtown Dubai",
        description="Demo reroute action to prevent event traffic overload.",
    )

    report_record = save_user_report(
        report_type="accident",
        location="Business Bay",
        description="Demo user report: minor accident near exit road.",
    )

    return {
        "message": "Demo data seeded successfully.",
        "saved_trips": saved_trips,
        "sensor_records": sensor_records,
        "alert_records": alert_records,
        "event_record": event_record,
        "admin_action_record": admin_action_record,
        "report_record": report_record,
        "demo_status": get_demo_status(),
    }