from datetime import datetime
from typing import Any, Dict, List

from fastapi import FastAPI

from config import get_backend_config, get_provider_status


def now() -> str:
    return datetime.now().isoformat(timespec="seconds")


def endpoint(
    method: str,
    path: str,
    purpose: str,
    auth_required: bool = False,
    roles: List[str] | None = None,
) -> Dict[str, Any]:
    return {
        "method": method,
        "path": path,
        "purpose": purpose,
        "auth_required": auth_required,
        "roles": roles or [],
    }


FRONTEND_ENDPOINTS = [
    endpoint("GET", "/api/health", "Backend health check."),
    endpoint("GET", "/api/features", "List FlowSync feature catalog."),
    endpoint("POST", "/api/auth/login", "Login and receive Bearer token."),
    endpoint("GET", "/api/auth/me", "Get current logged-in user.", True),
    endpoint("GET", "/api/locations/search?q=dubai", "Location search/autocomplete."),
    endpoint("POST", "/api/routes/recommend", "Get route options with coordinates and turn steps."),
    endpoint("POST", "/api/trips/start", "Start navigation session."),
    endpoint("GET", "/api/trips/active", "Get active navigation sessions."),
    endpoint("GET", "/api/trips/session/{session_id}", "Get one navigation session."),
    endpoint("POST", "/api/trips/progress", "Update current navigation step."),
    endpoint("POST", "/api/trips/end", "End navigation session."),
    endpoint("GET", "/api/trips/{request_id}/summary", "Get trip summary."),
    endpoint("GET", "/api/dashboard", "Main dashboard data."),
    endpoint("GET", "/api/live/dashboard", "Live dashboard polling fallback."),
    endpoint("GET", "/api/live/navigation/{session_id}", "Live navigation polling fallback."),
    endpoint("GET", "/api/stream/dashboard", "SSE dashboard stream."),
    endpoint("GET", "/api/stream/navigation/{session_id}", "SSE navigation stream."),
    endpoint("GET", "/api/parking/predict?destination=Dubai%20Mall", "Parking prediction."),
    endpoint("GET", "/api/alerts/driver", "Driver alerts."),
    endpoint("GET", "/api/live/feed", "Live alerts feed."),
]

MOBILE_ENDPOINTS = [
    endpoint("GET", "/api/mobile/home", "Mobile home screen data."),
    endpoint("POST", "/api/auth/login", "Mobile login."),
    endpoint("GET", "/api/locations/search?q=dubai", "Mobile destination search."),
    endpoint("POST", "/api/routes/recommend", "Mobile route recommendation."),
    endpoint("POST", "/api/trips/start", "Start mobile navigation."),
    endpoint("GET", "/api/live/navigation/{session_id}", "Mobile navigation polling."),
    endpoint("GET", "/api/stream/navigation/{session_id}", "Mobile navigation streaming."),
    endpoint("POST", "/api/trips/progress", "Update mobile navigation progress."),
    endpoint("POST", "/api/trips/end", "End mobile navigation."),
    endpoint("GET", "/api/trips/{request_id}/summary", "Mobile trip summary."),
    endpoint("GET", "/api/parking/predict?destination=Dubai%20Mall", "Mobile parking prediction."),
]

ADMIN_ENDPOINTS = [
    endpoint("GET", "/api/admin/dashboard", "Admin control room dashboard.", True, ["admin", "rta_operator"]),
    endpoint("GET", "/api/live/admin", "Live admin dashboard polling.", True, ["admin", "rta_operator"]),
    endpoint("GET", "/api/stream/admin", "Admin SSE stream.", True, ["admin", "rta_operator"]),
    endpoint("POST", "/api/admin/road-closure", "Create road closure.", True, ["admin", "rta_operator"]),
    endpoint("POST", "/api/admin/reroute-zone", "Create reroute zone.", True, ["admin", "rta_operator"]),
    endpoint("POST", "/api/admin/no-entry-zone", "Create no-entry zone.", True, ["admin", "rta_operator"]),
    endpoint("GET", "/api/admin/urban-stress", "Urban stress index.", True, ["admin", "rta_operator"]),
    endpoint("GET", "/api/jobs/status", "Background job status.", True, ["admin", "rta_operator"]),
    endpoint("POST", "/api/jobs/run", "Run all background jobs.", True, ["admin", "rta_operator"]),
    endpoint("GET", "/api/database/status", "Database status."),
    endpoint("POST", "/api/database/admin/apply-indexes", "Apply DB indexes.", True, ["admin", "rta_operator"]),
    endpoint("POST", "/api/database/admin/backup", "Create SQLite backup.", True, ["admin", "rta_operator"]),
]

EMERGENCY_ENDPOINTS = [
    endpoint("POST", "/api/emergency/route", "Emergency priority route.", True, ["admin", "rta_operator", "ambulance", "police", "fire_truck"]),
    endpoint("GET", "/api/emergency/vehicles", "Emergency vehicles.", True, ["admin", "rta_operator", "ambulance", "police", "fire_truck"]),
    endpoint("POST", "/api/emergency/clear-corridor", "Clear emergency corridor.", True, ["admin", "rta_operator", "ambulance", "police", "fire_truck"]),
    endpoint("POST", "/api/emergency/convoy", "Emergency convoy mode.", True, ["admin", "rta_operator", "ambulance", "police", "fire_truck"]),
    endpoint("GET", "/api/stream/emergency", "Emergency SSE stream.", True, ["admin", "rta_operator", "ambulance", "police", "fire_truck"]),
    endpoint("POST", "/api/priority/vip-route", "VIP priority route.", True, ["admin", "rta_operator", "vip"]),
]


def standard_success_response() -> Dict[str, Any]:
    return {
        "success": True,
        "message": "Request completed successfully.",
        "generated_at": now(),
        "data": {
            "example": "Endpoint-specific payload goes here."
        },
        "metadata": {
            "api_version": get_backend_config()["api_version"],
            "service": "FlowSync Smart Mobility Backend",
        },
    }


def standard_error_response() -> Dict[str, Any]:
    return {
        "detail": {
            "error": {
                "message": "Human-readable error message.",
                "required_roles": ["admin"],
                "your_role": "driver",
            }
        }
    }


def get_endpoint_groups() -> Dict[str, Any]:
    return {
        "frontend": FRONTEND_ENDPOINTS,
        "mobile": MOBILE_ENDPOINTS,
        "admin": ADMIN_ENDPOINTS,
        "emergency": EMERGENCY_ENDPOINTS,
    }


def get_client_bootstrap_payload() -> Dict[str, Any]:
    config = get_backend_config()
    provider_status = get_provider_status()

    return {
        "generated_at": now(),
        "backend": {
            "name": "FlowSync Smart Mobility Backend",
            "version": config["api_version"],
            "environment": config["environment"],
            "base_url_local": "http://127.0.0.1:8000",
            "swagger_url_local": "http://127.0.0.1:8000/docs",
        },
        "auth": {
            "token_type": "Bearer",
            "login_endpoint": "/api/auth/login",
            "me_endpoint": "/api/auth/me",
            "demo_accounts": {
                "admin": "admin@flowsync.local / flowsync123",
                "driver": "driver@flowsync.local / flowsync123",
                "ambulance": "ambulance@flowsync.local / flowsync123",
                "police": "police@flowsync.local / flowsync123",
                "rta": "rta@flowsync.local / flowsync123",
                "vip": "vip@flowsync.local / flowsync123",
            },
        },
        "routing": {
            "default_start": "Dubai Mall",
            "default_destination": "Dubai Marina",
            "route_preferences": [
                "balanced",
                "fastest",
                "eco",
                "cheapest",
                "low_stress",
            ],
            "required_map_fields": [
                "recommended_route.coordinates",
                "recommended_route.polyline",
                "recommended_route.turn_by_turn_steps",
                "recommended_route.alerts",
                "recommended_route.incidents",
                "routing_provider",
                "provider_status",
            ],
        },
        "live_updates": {
            "polling_available": True,
            "sse_streaming_available": True,
            "recommended_navigation_poll_seconds": 3,
            "recommended_dashboard_poll_seconds": 5,
        },
        "provider_status": provider_status,
        "endpoint_groups": get_endpoint_groups(),
    }


def get_integration_status() -> Dict[str, Any]:
    return {
        "generated_at": now(),
        "backend_complete_v1": True,
        "ready_for_frontend_integration": True,
        "ready_for_mobile_integration": True,
        "ready_for_maps_integration": True,
        "ready_for_admin_dashboard_integration": True,
        "ready_for_database_team_handoff": True,
        "completed_backend_capabilities": [
            "authentication",
            "role_based_access_control",
            "adaptive_routing",
            "location_search",
            "route_coordinates",
            "turn_by_turn_steps",
            "navigation_sessions",
            "trip_lifecycle",
            "live_polling",
            "server_sent_events_streaming",
            "background_jobs",
            "database_readiness",
            "real_map_provider_foundation",
            "deployment_readiness",
            "automated_pytest_suite",
            "smoke_test_script",
            "team_api_contract_docs",
        ],
        "remaining_external_launch_requirements": [
            "production hosting",
            "production domain",
            "HTTPS",
            "real map/routing API key",
            "real traffic data provider",
            "real parking provider",
            "real IoT sensor feed",
            "production PostgreSQL database",
        ],
    }


def register_api_contract_routes(app: FastAPI):
    @app.get("/api/meta", tags=["API Contract"])
    def api_meta():
        config = get_backend_config()

        return {
            "service": "FlowSync Smart Mobility Backend",
            "version": config["api_version"],
            "environment": config["environment"],
            "generated_at": now(),
            "docs": "/docs",
            "openapi": "/openapi.json",
            "health": "/api/health",
        }

    @app.get("/api/client/bootstrap", tags=["API Contract"])
    def client_bootstrap():
        return get_client_bootstrap_payload()

    @app.get("/api/client/endpoints", tags=["API Contract"])
    def client_endpoints():
        return {
            "generated_at": now(),
            "endpoint_groups": get_endpoint_groups(),
        }

    @app.get("/api/client/error-format", tags=["API Contract"])
    def client_error_format():
        return {
            "generated_at": now(),
            "success_example": standard_success_response(),
            "error_example": standard_error_response(),
        }

    @app.get("/api/client/integration-status", tags=["API Contract"])
    def client_integration_status():
        return get_integration_status()

    @app.get("/api/client/route-contract", tags=["API Contract"])
    def route_contract():
        return {
            "generated_at": now(),
            "request": {
                "start_location": "Dubai Mall",
                "destination": "Dubai Marina",
                "vehicle_type": "car",
                "route_preference": "balanced",
                "user_role": "driver",
            },
            "required_response_fields": [
                "recommended_route",
                "all_routes",
                "recommended_route.coordinates",
                "recommended_route.polyline",
                "recommended_route.turn_by_turn_steps",
                "recommended_route.estimated_time",
                "recommended_route.distance_km",
                "recommended_route.congestion_score",
                "recommended_route.route_score",
                "recommended_route.assigned_users",
                "recommended_route.road_capacity",
                "recommended_route.alerts",
                "recommended_route.incidents",
                "database_record.request_id",
                "routing_provider",
                "provider_status",
            ],
        }
