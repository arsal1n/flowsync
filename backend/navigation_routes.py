from typing import Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from navigation_engine import (
    end_navigation_session,
    get_active_navigation_sessions,
    get_navigation_session,
    get_session_events,
    search_locations,
    start_navigation_session,
    update_navigation_progress,
)
from navigation_persistence import init_navigation_persistence


class StartNavigationRequest(BaseModel):
    start_location: str
    destination: str
    vehicle_type: str = "car"
    route_preference: str = "balanced"
    user_role: str = "driver"
    route_name: Optional[str] = None
    user_id: str = "demo-driver"
    request_id: Optional[int] = None


class EndNavigationRequest(BaseModel):
    session_id: str
    status: str = "completed"


class NavigationProgressRequest(BaseModel):
    session_id: str
    current_step_index: int


def register_navigation_routes(app: FastAPI):
    init_navigation_persistence()

    @app.get("/api/locations/search", tags=["Navigation"])
    def location_search(q: str = ""):
        return search_locations(q)

    @app.post("/api/trips/start", tags=["Navigation"])
    def start_trip_navigation(request: StartNavigationRequest):
        return start_navigation_session(
            start_location=request.start_location,
            destination=request.destination,
            vehicle_type=request.vehicle_type,
            route_preference=request.route_preference,
            user_role=request.user_role,
            route_name=request.route_name,
            user_id=request.user_id,
            request_id=request.request_id,
        )

    @app.get("/api/trips/active", tags=["Navigation"])
    def active_navigation_sessions():
        return get_active_navigation_sessions()

    @app.get("/api/trips/session/{session_id}", tags=["Navigation"])
    def navigation_session_detail(session_id: str):
        result = get_navigation_session(session_id)

        if not result["found"]:
            raise HTTPException(status_code=404, detail=result["message"])

        return result

    @app.post("/api/trips/progress", tags=["Navigation"])
    def navigation_progress(request: NavigationProgressRequest):
        result = update_navigation_progress(
            session_id=request.session_id,
            current_step_index=request.current_step_index,
        )

        if not result["found"]:
            raise HTTPException(status_code=404, detail=result["message"])

        return result

    @app.get("/api/trips/session/{session_id}/events", tags=["Navigation"])
    def navigation_session_events(session_id: str):
        session_result = get_navigation_session(session_id)

        if not session_result["found"]:
            raise HTTPException(status_code=404, detail=session_result["message"])

        return get_session_events(session_id)

    @app.post("/api/trips/end", tags=["Navigation"])
    def end_trip_navigation(request: EndNavigationRequest):
        result = end_navigation_session(
            session_id=request.session_id,
            status=request.status,
        )

        if not result["found"]:
            raise HTTPException(status_code=404, detail=result["message"])

        return result