from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from api_utils import clean_text, validate_session_id
from live_updates import (
    get_live_admin_control_room,
    get_live_dashboard,
    get_live_emergency_status,
    get_live_feed,
    get_live_heartbeat,
    get_live_navigation_overview,
    get_live_navigation_session,
    get_live_system_status,
)


class HeartbeatRequest(BaseModel):
    client_id: str = "frontend-client"


def register_live_update_routes(app: FastAPI):
    @app.get("/api/live/system", tags=["Live Updates"])
    def live_system():
        return get_live_system_status()

    @app.get("/api/live/dashboard", tags=["Live Updates"])
    def live_dashboard():
        return get_live_dashboard()

    @app.get("/api/live/navigation", tags=["Live Updates"])
    def live_navigation():
        return get_live_navigation_overview()

    @app.get("/api/live/navigation/{session_id}", tags=["Live Updates"])
    def live_navigation_session(session_id: str):
        clean_session_id = validate_session_id(session_id)
        result = get_live_navigation_session(clean_session_id)

        if not result["found"]:
            raise HTTPException(status_code=404, detail=result["message"])

        return result

    @app.get("/api/live/admin", tags=["Live Updates"])
    def live_admin():
        return get_live_admin_control_room()

    @app.get("/api/live/emergency", tags=["Live Updates"])
    def live_emergency():
        return get_live_emergency_status()

    @app.get("/api/live/feed", tags=["Live Updates"])
    def live_feed():
        return get_live_feed()

    @app.post("/api/live/heartbeat", tags=["Live Updates"])
    def live_heartbeat(request: HeartbeatRequest):
        client_id = clean_text(
            request.client_id,
            "client_id",
            max_length=120,
        )

        return get_live_heartbeat(client_id)