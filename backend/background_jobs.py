import json
import time
from datetime import datetime, timedelta
from typing import Any, Callable, Dict, List, Optional

from database import (
    get_connection,
    get_dashboard_stats,
    get_driver_alerts,
    get_emergency_vehicles,
    get_latest_sensor_readings,
    get_route_loads,
)
from live_updates import get_live_system_status
from platform_engine import (
    get_ai_congestion_prediction,
    get_parking_prediction,
)


def current_time() -> str:
    return datetime.now().isoformat(timespec="seconds")


def table_exists(cursor, table_name: str) -> bool:
    row = cursor.execute("""
        SELECT name
        FROM sqlite_master
        WHERE type = 'table' AND name = ?
    """, (table_name,)).fetchone()

    return row is not None


def init_background_job_tables() -> None:
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS background_job_runs (
            run_id INTEGER PRIMARY KEY AUTOINCREMENT,
            job_name TEXT NOT NULL,
            status TEXT NOT NULL,
            message TEXT NOT NULL,
            payload_json TEXT,
            duration_ms INTEGER NOT NULL,
            started_time TEXT NOT NULL,
            finished_time TEXT NOT NULL
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS background_job_snapshots (
            snapshot_id INTEGER PRIMARY KEY AUTOINCREMENT,
            snapshot_type TEXT NOT NULL,
            payload_json TEXT NOT NULL,
            created_time TEXT NOT NULL
        )
    """)

    connection.commit()
    connection.close()


def save_snapshot(snapshot_type: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    init_background_job_tables()

    connection = get_connection()
    cursor = connection.cursor()

    created_time = current_time()

    cursor.execute("""
        INSERT INTO background_job_snapshots (
            snapshot_type,
            payload_json,
            created_time
        )
        VALUES (?, ?, ?)
    """, (
        snapshot_type,
        json.dumps(payload),
        created_time,
    ))

    snapshot_id = cursor.lastrowid

    connection.commit()
    connection.close()

    return {
        "snapshot_id": snapshot_id,
        "snapshot_type": snapshot_type,
        "created_time": created_time,
    }


def log_job_run(
    job_name: str,
    status: str,
    message: str,
    payload: Optional[Dict[str, Any]],
    duration_ms: int,
    started_time: str,
    finished_time: str,
) -> Dict[str, Any]:
    init_background_job_tables()

    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute("""
        INSERT INTO background_job_runs (
            job_name,
            status,
            message,
            payload_json,
            duration_ms,
            started_time,
            finished_time
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        job_name,
        status,
        message,
        json.dumps(payload or {}),
        duration_ms,
        started_time,
        finished_time,
    ))

    run_id = cursor.lastrowid

    connection.commit()
    connection.close()

    return {
        "run_id": run_id,
        "job_name": job_name,
        "status": status,
        "message": message,
        "duration_ms": duration_ms,
        "started_time": started_time,
        "finished_time": finished_time,
        "payload": payload or {},
    }


def cleanup_stale_navigation_sessions() -> Dict[str, Any]:
    connection = get_connection()
    cursor = connection.cursor()

    if not table_exists(cursor, "navigation_sessions"):
        connection.close()
        return {
            "checked": False,
            "cleaned_sessions": 0,
            "message": "navigation_sessions table does not exist yet.",
        }

    cutoff_time = datetime.now() - timedelta(hours=6)

    rows = cursor.execute("""
        SELECT
            session_id,
            started_time
        FROM navigation_sessions
        WHERE status = 'active'
    """).fetchall()

    stale_sessions = []

    for row in rows:
        try:
            started_time = datetime.fromisoformat(row["started_time"])
        except Exception:
            continue

        if started_time < cutoff_time:
            stale_sessions.append(row["session_id"])

    ended_time = current_time()

    for session_id in stale_sessions:
        cursor.execute("""
            UPDATE navigation_sessions
            SET status = 'interrupted',
                ended_time = ?
            WHERE session_id = ?
        """, (
            ended_time,
            session_id,
        ))

    connection.commit()
    connection.close()

    return {
        "checked": True,
        "cleaned_sessions": len(stale_sessions),
        "stale_session_ids": stale_sessions,
        "cutoff_hours": 6,
        "message": "Stale active navigation sessions cleaned.",
    }


def generate_live_system_snapshot() -> Dict[str, Any]:
    payload = get_live_system_status()
    snapshot = save_snapshot("live_system_status", payload)

    return {
        "snapshot": snapshot,
        "payload": payload,
        "message": "Live system snapshot saved.",
    }


def refresh_route_load_snapshot() -> Dict[str, Any]:
    route_loads = get_route_loads()
    dashboard = get_dashboard_stats()

    payload = {
        "route_loads": route_loads,
        "dashboard": dashboard,
        "generated_at": current_time(),
    }

    snapshot = save_snapshot("route_load_refresh", payload)

    return {
        "snapshot": snapshot,
        "route_load_count": len(route_loads) if isinstance(route_loads, list) else 0,
        "payload": payload,
        "message": "Route load snapshot refreshed.",
    }


def scan_emergency_alerts() -> Dict[str, Any]:
    emergency_vehicles = get_emergency_vehicles()
    driver_alerts = get_driver_alerts()
    latest_sensors = get_latest_sensor_readings()

    emergency_alerts = []

    if isinstance(driver_alerts, list):
        for alert in driver_alerts:
            alert_text = str(alert).lower()

            if (
                "emergency" in alert_text
                or "ambulance" in alert_text
                or "police" in alert_text
                or "fire" in alert_text
            ):
                emergency_alerts.append(alert)

    payload = {
        "emergency_vehicles": emergency_vehicles,
        "emergency_alerts": emergency_alerts,
        "latest_sensor_readings": latest_sensors,
        "generated_at": current_time(),
    }

    snapshot = save_snapshot("emergency_alert_scan", payload)

    return {
        "snapshot": snapshot,
        "emergency_vehicle_count": len(emergency_vehicles) if isinstance(emergency_vehicles, list) else 0,
        "emergency_alert_count": len(emergency_alerts),
        "payload": payload,
        "message": "Emergency alert scan completed.",
    }


def refresh_parking_and_congestion_predictions() -> Dict[str, Any]:
    parking_prediction = get_parking_prediction("Dubai Mall")
    congestion_prediction = get_ai_congestion_prediction(
        start_location="Dubai",
        destination="Sharjah",
        time_of_day="17:00",
    )

    payload = {
        "parking_prediction": parking_prediction,
        "congestion_prediction": congestion_prediction,
        "generated_at": current_time(),
    }

    snapshot = save_snapshot("parking_congestion_refresh", payload)

    return {
        "snapshot": snapshot,
        "payload": payload,
        "message": "Parking and congestion predictions refreshed.",
    }


JOB_REGISTRY: Dict[str, Callable[[], Dict[str, Any]]] = {
    "cleanup_stale_navigation": cleanup_stale_navigation_sessions,
    "generate_live_system_snapshot": generate_live_system_snapshot,
    "refresh_route_load_snapshot": refresh_route_load_snapshot,
    "scan_emergency_alerts": scan_emergency_alerts,
    "refresh_parking_congestion": refresh_parking_and_congestion_predictions,
}


def run_background_job(job_name: str) -> Dict[str, Any]:
    init_background_job_tables()

    if job_name not in JOB_REGISTRY:
        return {
            "found": False,
            "job_name": job_name,
            "status": "not_found",
            "message": "Background job not found.",
            "available_jobs": sorted(JOB_REGISTRY.keys()),
        }

    started_time = current_time()
    start = time.perf_counter()

    try:
        payload = JOB_REGISTRY[job_name]()
        status = "success"
        message = payload.get("message", "Job completed successfully.")
    except Exception as error:
        payload = {
            "error": str(error),
        }
        status = "failed"
        message = f"Job failed: {error}"

    duration_ms = int((time.perf_counter() - start) * 1000)
    finished_time = current_time()

    run_record = log_job_run(
        job_name=job_name,
        status=status,
        message=message,
        payload=payload,
        duration_ms=duration_ms,
        started_time=started_time,
        finished_time=finished_time,
    )

    return {
        "found": True,
        "job": run_record,
    }


def run_all_background_jobs() -> Dict[str, Any]:
    results = []

    for job_name in JOB_REGISTRY.keys():
        results.append(run_background_job(job_name))

    success_count = sum(
        1 for result in results
        if result.get("job", {}).get("status") == "success"
    )

    failed_count = sum(
        1 for result in results
        if result.get("job", {}).get("status") == "failed"
    )

    return {
        "message": "Background job run completed.",
        "total_jobs": len(results),
        "success_count": success_count,
        "failed_count": failed_count,
        "results": results,
    }


def get_background_job_history(limit: int = 20) -> Dict[str, Any]:
    init_background_job_tables()

    connection = get_connection()
    cursor = connection.cursor()

    rows = cursor.execute("""
        SELECT
            run_id,
            job_name,
            status,
            message,
            payload_json,
            duration_ms,
            started_time,
            finished_time
        FROM background_job_runs
        ORDER BY run_id DESC
        LIMIT ?
    """, (limit,)).fetchall()

    connection.close()

    history = []

    for row in rows:
        history.append({
            "run_id": row["run_id"],
            "job_name": row["job_name"],
            "status": row["status"],
            "message": row["message"],
            "payload": json.loads(row["payload_json"] or "{}"),
            "duration_ms": row["duration_ms"],
            "started_time": row["started_time"],
            "finished_time": row["finished_time"],
        })

    return {
        "history": history,
        "count": len(history),
    }


def get_background_job_status() -> Dict[str, Any]:
    init_background_job_tables()

    connection = get_connection()
    cursor = connection.cursor()

    total_runs = cursor.execute("""
        SELECT COUNT(*) AS count
        FROM background_job_runs
    """).fetchone()["count"]

    successful_runs = cursor.execute("""
        SELECT COUNT(*) AS count
        FROM background_job_runs
        WHERE status = 'success'
    """).fetchone()["count"]

    failed_runs = cursor.execute("""
        SELECT COUNT(*) AS count
        FROM background_job_runs
        WHERE status = 'failed'
    """).fetchone()["count"]

    last_runs = cursor.execute("""
        SELECT
            job_name,
            status,
            message,
            duration_ms,
            finished_time
        FROM background_job_runs
        ORDER BY run_id DESC
        LIMIT 10
    """).fetchall()

    snapshot_count = cursor.execute("""
        SELECT COUNT(*) AS count
        FROM background_job_snapshots
    """).fetchone()["count"]

    connection.close()

    return {
        "background_jobs_enabled": True,
        "available_jobs": sorted(JOB_REGISTRY.keys()),
        "total_runs": total_runs,
        "successful_runs": successful_runs,
        "failed_runs": failed_runs,
        "snapshot_count": snapshot_count,
        "last_runs": [dict(row) for row in last_runs],
        "recommended_admin_usage": [
            "Run all jobs before a demo.",
            "Run cleanup_stale_navigation periodically.",
            "Run scan_emergency_alerts during emergency dashboard demos.",
            "Run refresh_route_load_snapshot before checking admin control room.",
        ],
    }
