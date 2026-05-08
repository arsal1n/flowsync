from datetime import datetime
from typing import Any, Dict

from fastapi import FastAPI

from config import get_backend_config, get_provider_status


def now() -> str:
    return datetime.now().isoformat(timespec="seconds")


COMPLETED_CAPABILITIES = [
    "authentication",
    "role_based_access_control",
    "location_search",
    "adaptive_route_recommendation",
    "route_coordinates_and_polyline",
    "turn_by_turn_steps",
    "navigation_sessions",
    "trip_lifecycle",
    "parking_prediction",
    "admin_control_room_apis",
    "emergency_routing_apis",
    "iot_sensor_demo_apis",
    "crowd_reports",
    "event_simulation",
    "digital_twin_simulation",
    "ride_sharing_foundation",
    "sustainability_metrics",
    "live_polling_updates",
    "server_sent_events_realtime_streaming",
    "background_jobs",
    "database_readiness",
    "real_map_provider_foundation",
    "deployment_readiness",
    "pytest_test_suite",
    "smoke_test_script",
    "frontend_api_contract",
    "mobile_api_contract",
    "admin_api_contract",
    "maps_provider_docs",
    "team_handoff_docs",
]


EXTERNAL_LAUNCH_REQUIREMENTS = [
    "production hosting platform",
    "production domain",
    "HTTPS certificate",
    "real routing/geocoding API key",
    "real traffic data provider",
    "real parking provider",
    "real IoT sensor feed",
    "production PostgreSQL database",
    "production monitoring/logging",
]


TEAM_NEXT_STEPS = {
    "frontend_team": [
        "Use docs/frontend-api-contract.md.",
        "Build login, dashboard, route search, map navigation, parking, alerts, and trip summary screens.",
        "Use /api/client/bootstrap and /api/client/route-contract before integration.",
    ],
    "maps_routing_team": [
        "Use /api/locations/search and /api/routes/recommend.",
        "Draw recommended_route.coordinates or recommended_route.polyline.",
        "Use recommended_route.turn_by_turn_steps for navigation UI.",
        "Read routing_provider and provider_status to detect mock or real provider mode.",
    ],
    "database_team": [
        "Use /api/database/status, /api/database/tables, and /api/database/readiness.",
        "Do not commit backend/flowsync.db, backend/backups, backend/venv, or __pycache__.",
        "Prepare PostgreSQL DATABASE_URL migration later.",
    ],
    "mobile_team": [
        "Use docs/mobile-api-contract.md.",
        "Use laptop IP instead of 127.0.0.1 for real phone testing.",
        "Use navigation session_id and request_id for mobile trip flow.",
    ],
    "admin_dashboard_team": [
        "Use docs/admin-api-contract.md.",
        "Use admin@flowsync.local or rta@flowsync.local demo accounts.",
        "Build control room, emergency dashboard, route loads, jobs, and database readiness screens.",
    ],
}


def get_final_completion_report() -> Dict[str, Any]:
    config = get_backend_config()

    return {
        "generated_at": now(),
        "project": "FlowSync Smart Mobility Backend",
        "backend_version": config["api_version"],
        "status": "Backend Complete v1",
        "backend_complete_v1": True,
        "ready_for_demo": True,
        "ready_for_team_integration": True,
        "ready_for_frontend_integration": True,
        "ready_for_mobile_integration": True,
        "ready_for_maps_integration": True,
        "ready_for_admin_dashboard_integration": True,
        "ready_for_database_handoff": True,
        "completed_capabilities_count": len(COMPLETED_CAPABILITIES),
        "completed_capabilities": COMPLETED_CAPABILITIES,
        "provider_status": get_provider_status(),
        "external_launch_requirements": EXTERNAL_LAUNCH_REQUIREMENTS,
        "message": "FlowSync Backend Complete v1 is ready for frontend, mobile, maps, database, and admin dashboard integration.",
    }


def get_final_test_checklist() -> Dict[str, Any]:
    return {
        "generated_at": now(),
        "required_before_demo": [
            {
                "name": "Python syntax check",
                "command": ".\\venv\\Scripts\\python.exe -m py_compile main.py",
                "folder": "backend",
            },
            {
                "name": "Pytest suite",
                "command": ".\\venv\\Scripts\\python.exe -m pytest",
                "folder": "backend",
            },
            {
                "name": "Run backend",
                "command": ".\\venv\\Scripts\\python.exe -m uvicorn main:app --reload",
                "folder": "backend",
            },
            {
                "name": "Smoke test",
                "command": ".\\venv\\Scripts\\python.exe smoke_test.py",
                "folder": "backend, second terminal while backend is running",
            },
        ],
        "important_demo_urls": [
            "http://127.0.0.1:8000/docs",
            "http://127.0.0.1:8000/api/health",
            "http://127.0.0.1:8000/api/final/status",
            "http://127.0.0.1:8000/api/client/bootstrap",
            "http://127.0.0.1:8000/api/backend/feature-coverage",
        ],
        "expected_result": "All tests should pass and /api/final/status should return backend_complete_v1=true.",
    }


def get_final_team_handoff() -> Dict[str, Any]:
    return {
        "generated_at": now(),
        "handoff_message": "Backend Complete v1 is ready. Frontend, mobile, maps, database, and admin dashboard teams should now integrate around the documented APIs.",
        "team_next_steps": TEAM_NEXT_STEPS,
        "main_contract_endpoints": [
            "/api/client/bootstrap",
            "/api/client/endpoints",
            "/api/client/route-contract",
            "/api/client/integration-status",
            "/api/final/status",
            "/api/final/checklist",
            "/api/final/handoff",
        ],
    }


def register_final_completion_routes(app: FastAPI):
    @app.get("/api/final/status", tags=["Final Completion"])
    def final_status():
        return get_final_completion_report()

    @app.get("/api/final/checklist", tags=["Final Completion"])
    def final_checklist():
        return get_final_test_checklist()

    @app.get("/api/final/handoff", tags=["Final Completion"])
    def final_handoff():
        return get_final_team_handoff()

    @app.get("/api/final/completion-report", tags=["Final Completion"])
    def final_completion_report():
        return {
            "completion_report": get_final_completion_report(),
            "test_checklist": get_final_test_checklist(),
            "team_handoff": get_final_team_handoff(),
        }
