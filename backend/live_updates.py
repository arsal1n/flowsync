from datetime import datetime
from typing import Any, Dict, List

from config import get_provider_status
from database import (
    get_dashboard_stats,
    get_driver_alerts,
    get_emergency_vehicles,
    get_latest_sensor_readings,
    get_recent_trips,
    get_route_loads,
)
from navigation_engine import (
    get_active_navigation_sessions,
    get_navigation_session,
)
from platform_engine import get_admin_dashboard_payload
from trip_lifecycle import (
    get_recent_lifecycle_trips,
    get_trip_lifecycle_dashboard,
)


def current_time() -> str:
    return datetime.now().isoformat(timespec="seconds")


def safe_call(function, fallback):
    try:
        return function()
    except Exception as error:
        return {
            "error": str(error),
            "fallback": fallback,
        }


def live_event(
    event_type: str,
    title: str,
    message: str,
    severity: str = "info",
    category: str = "system",
    payload: Dict[str, Any] | None = None,
) -> Dict[str, Any]:
    return {
        "event_type": event_type,
        "title": title,
        "message": message,
        "severity": severity,
        "category": category,
        "payload": payload or {},
        "created_time": current_time(),
    }


def get_live_system_status() -> Dict[str, Any]:
    dashboard = safe_call(get_dashboard_stats, {})
    active_navigation = safe_call(get_active_navigation_sessions, {})
    lifecycle_dashboard = safe_call(get_trip_lifecycle_dashboard, {})
    provider_status = safe_call(get_provider_status, {})

    return {
        "live": True,
        "generated_at": current_time(),
        "recommended_poll_interval_seconds": 5,
        "system_status": "online",
        "backend_version": "1.0.1",
        "provider_status": provider_status,
        "summary": {
            "total_trip_requests": dashboard.get("total_trip_requests", 0),
            "active_navigation_sessions": active_navigation.get("active_count", 0),
            "active_trips": lifecycle_dashboard.get("active_trips", 0),
            "completed_trips": lifecycle_dashboard.get("completed_trips", 0),
        },
        "message": "FlowSync live backend status generated successfully.",
    }


def get_live_dashboard() -> Dict[str, Any]:
    dashboard = safe_call(get_dashboard_stats, {})
    route_loads = safe_call(get_route_loads, [])
    active_navigation = safe_call(get_active_navigation_sessions, {})
    lifecycle_dashboard = safe_call(get_trip_lifecycle_dashboard, {})
    recent_lifecycle_trips = safe_call(lambda: get_recent_lifecycle_trips(5), {})
    latest_sensors = safe_call(get_latest_sensor_readings, [])
    driver_alerts = safe_call(get_driver_alerts, [])

    return {
        "live": True,
        "generated_at": current_time(),
        "recommended_poll_interval_seconds": 5,
        "dashboard": dashboard,
        "route_loads": route_loads,
        "active_navigation": active_navigation,
        "trip_lifecycle": lifecycle_dashboard,
        "recent_lifecycle_trips": recent_lifecycle_trips,
        "latest_sensor_readings": latest_sensors,
        "driver_alerts": driver_alerts,
    }


def get_live_navigation_overview() -> Dict[str, Any]:
    active_navigation = safe_call(get_active_navigation_sessions, {})

    return {
        "live": True,
        "generated_at": current_time(),
        "recommended_poll_interval_seconds": 3,
        "navigation": active_navigation,
        "message": "Live navigation overview generated successfully.",
    }


def get_live_navigation_session(session_id: str) -> Dict[str, Any]:
    session_result = get_navigation_session(session_id)

    if not session_result.get("found"):
        return {
            "found": False,
            "session_id": session_id,
            "generated_at": current_time(),
            "message": session_result.get("message", "Navigation session not found."),
        }

    session = session_result["session"]

    return {
        "found": True,
        "live": True,
        "generated_at": current_time(),
        "recommended_poll_interval_seconds": 3,
        "session": session,
        "live_navigation": session.get("live_navigation", {}),
        "message": "Live navigation session state generated successfully.",
    }


def get_live_admin_control_room() -> Dict[str, Any]:
    admin_dashboard = safe_call(get_admin_dashboard_payload, {})
    route_loads = safe_call(get_route_loads, [])
    latest_sensors = safe_call(get_latest_sensor_readings, [])
    active_navigation = safe_call(get_active_navigation_sessions, {})
    lifecycle_dashboard = safe_call(get_trip_lifecycle_dashboard, {})
    emergency_vehicles = safe_call(get_emergency_vehicles, [])
    driver_alerts = safe_call(get_driver_alerts, [])

    return {
        "live": True,
        "generated_at": current_time(),
        "recommended_poll_interval_seconds": 5,
        "dashboard_type": "live_admin_control_room",
        "admin_dashboard": admin_dashboard,
        "route_loads": route_loads,
        "latest_sensor_readings": latest_sensors,
        "active_navigation": active_navigation,
        "trip_lifecycle": lifecycle_dashboard,
        "emergency_vehicles": emergency_vehicles,
        "driver_alerts": driver_alerts,
    }


def get_live_emergency_status() -> Dict[str, Any]:
    emergency_vehicles = safe_call(get_emergency_vehicles, [])
    driver_alerts = safe_call(get_driver_alerts, [])
    active_navigation = safe_call(get_active_navigation_sessions, {})

    emergency_alerts = []

    if isinstance(driver_alerts, list):
        emergency_alerts = [
            alert for alert in driver_alerts
            if "emergency" in str(alert).lower()
            or "ambulance" in str(alert).lower()
            or "police" in str(alert).lower()
        ]

    return {
        "live": True,
        "generated_at": current_time(),
        "recommended_poll_interval_seconds": 3,
        "emergency_vehicles": emergency_vehicles,
        "emergency_alerts": emergency_alerts,
        "active_navigation": active_navigation,
        "message": "Live emergency status generated successfully.",
    }


def get_live_feed() -> Dict[str, Any]:
    events: List[Dict[str, Any]] = []

    dashboard = safe_call(get_dashboard_stats, {})
    route_loads = safe_call(get_route_loads, [])
    active_navigation = safe_call(get_active_navigation_sessions, {})
    latest_sensors = safe_call(get_latest_sensor_readings, [])
    driver_alerts = safe_call(get_driver_alerts, [])
    recent_trips = safe_call(get_recent_trips, [])

    events.append(
        live_event(
            event_type="system_status",
            title="FlowSync backend online",
            message="Live update service is active.",
            severity="info",
            category="system",
        )
    )

    events.append(
        live_event(
            event_type="dashboard_snapshot",
            title="Dashboard updated",
            message="Latest dashboard statistics are available.",
            severity="info",
            category="dashboard",
            payload={
                "total_trip_requests": dashboard.get("total_trip_requests", 0),
            },
        )
    )

    if isinstance(active_navigation, dict):
        events.append(
            live_event(
                event_type="active_navigation",
                title="Active navigation sessions updated",
                message=f"{active_navigation.get('active_count', 0)} active navigation sessions found.",
                severity="info",
                category="navigation",
                payload=active_navigation,
            )
        )

    if isinstance(route_loads, list):
        events.append(
            live_event(
                event_type="route_load_update",
                title="Route load data refreshed",
                message=f"{len(route_loads)} route load records available.",
                severity="info",
                category="routing",
            )
        )

    if isinstance(latest_sensors, list) and latest_sensors:
        events.append(
            live_event(
                event_type="sensor_update",
                title="IoT sensor readings updated",
                message=f"{len(latest_sensors)} sensor readings available.",
                severity="info",
                category="iot",
            )
        )

    if isinstance(driver_alerts, list):
        for alert in driver_alerts[:5]:
            events.append(
                live_event(
                    event_type="driver_alert",
                    title="Driver alert",
                    message=str(alert.get("message", "Driver alert available.")) if isinstance(alert, dict) else str(alert),
                    severity=str(alert.get("severity", "medium")) if isinstance(alert, dict) else "medium",
                    category="alerts",
                    payload=alert if isinstance(alert, dict) else {"raw": str(alert)},
                )
            )

    return {
        "live": True,
        "generated_at": current_time(),
        "recommended_poll_interval_seconds": 5,
        "events": events,
        "event_count": len(events),
        "recent_trips": recent_trips,
    }


def get_live_heartbeat(client_id: str = "frontend-client") -> Dict[str, Any]:
    return {
        "live": True,
        "client_id": client_id,
        "server_time": current_time(),
        "recommended_poll_interval_seconds": 5,
        "message": "Heartbeat received.",
    }