from typing import Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from api_utils import (
    clean_text,
    validate_location_query,
    validate_non_negative_integer,
    validate_optional_route_name,
    validate_positive_integer,
    validate_route_preference,
    validate_session_id,
    validate_trip_end_status,
    validate_user_role,
    validate_vehicle_type,
)
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
        clean_query = validate_location_query(q)
        return search_locations(clean_query)

    @app.post("/api/trips/start", tags=["Navigation"])
    def start_trip_navigation(request: StartNavigationRequest):
        start_location = clean_text(request.start_location, "start_location")
        destination = clean_text(request.destination, "destination")
        vehicle_type = validate_vehicle_type(request.vehicle_type)
        route_preference = validate_route_preference(request.route_preference)
        user_role = validate_user_role(request.user_role)
        route_name = validate_optional_route_name(request.route_name)
        user_id = clean_text(request.user_id, "user_id", max_length=120)

        request_id = None
        if request.request_id is not None:
            request_id = validate_positive_integer(request.request_id, "request_id")

        return start_navigation_session(
            start_location=start_location,
            destination=destination,
            vehicle_type=vehicle_type,
            route_preference=route_preference,
            user_role=user_role,
            route_name=route_name,
            user_id=user_id,
            request_id=request_id,
        )

    @app.get("/api/trips/active", tags=["Navigation"])
    def active_navigation_sessions():
        return get_active_navigation_sessions()

    @app.get("/api/trips/session/{session_id}", tags=["Navigation"])
    def navigation_session_detail(session_id: str):
        clean_session_id = validate_session_id(session_id)
        result = get_navigation_session(clean_session_id)

        if not result["found"]:
            raise HTTPException(status_code=404, detail=result["message"])

        return result

    @app.post("/api/trips/progress", tags=["Navigation"])
    def navigation_progress(request: NavigationProgressRequest):
        clean_session_id = validate_session_id(request.session_id)
        current_step_index = validate_non_negative_integer(
            request.current_step_index,
            "current_step_index",
        )

        result = update_navigation_progress(
            session_id=clean_session_id,
            current_step_index=current_step_index,
        )

        if not result["found"]:
            raise HTTPException(status_code=404, detail=result["message"])

        return result

    @app.get("/api/trips/session/{session_id}/events", tags=["Navigation"])
    def navigation_session_events(session_id: str):
        clean_session_id = validate_session_id(session_id)
        session_result = get_navigation_session(clean_session_id)

        if not session_result["found"]:
            raise HTTPException(status_code=404, detail=session_result["message"])

        return get_session_events(clean_session_id)

    @app.post("/api/trips/end", tags=["Navigation"])
    def end_trip_navigation(request: EndNavigationRequest):
        clean_session_id = validate_session_id(request.session_id)
        status = validate_trip_end_status(request.status)

        result = end_navigation_session(
            session_id=clean_session_id,
            status=status,
        )

        if not result["found"]:
            raise HTTPException(status_code=404, detail=result["message"])

        return result