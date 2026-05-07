from typing import Any, Dict, Optional

from navigation_persistence import (
    end_navigation_session_in_db,
    get_active_navigation_sessions_from_db,
    get_navigation_events,
    get_navigation_session_by_id,
    save_navigation_session,
    search_locations_from_db,
    update_navigation_step,
)
from route_engine import get_recommended_route


def search_locations(query: str) -> Dict[str, Any]:
    return search_locations_from_db(query)


def start_navigation_session(
    start_location: str,
    destination: str,
    vehicle_type: str = "car",
    route_preference: str = "balanced",
    user_role: str = "driver",
    route_name: Optional[str] = None,
    user_id: str = "demo-driver",
) -> Dict[str, Any]:
    route_result = get_recommended_route(
        start_location=start_location,
        destination=destination,
        route_preference=route_preference,
        user_role=user_role,
    )

    selected_route = route_result["recommended_route"]
    selected_route_source = "recommended_route"

    if route_name:
        for route in route_result["all_routes"]:
            if route["route_name"] == route_name:
                selected_route = route
                selected_route_source = "frontend_selected_route"
                break

    saved_session = save_navigation_session(
        user_id=user_id,
        start_location=start_location,
        destination=destination,
        vehicle_type=vehicle_type,
        route_preference=route_preference,
        user_role=user_role,
        selected_route=selected_route,
    )

    return {
        "message": "Navigation session started.",
        "persistence": "sqlite",
        "selected_route_source": selected_route_source,
        "session": saved_session["session"],
    }


def end_navigation_session(
    session_id: str,
    status: str = "completed",
) -> Dict[str, Any]:
    return end_navigation_session_in_db(
        session_id=session_id,
        status=status,
    )


def get_active_navigation_sessions() -> Dict[str, Any]:
    return get_active_navigation_sessions_from_db()


def get_navigation_session(session_id: str) -> Dict[str, Any]:
    return get_navigation_session_by_id(session_id)


def update_navigation_progress(
    session_id: str,
    current_step_index: int,
) -> Dict[str, Any]:
    return update_navigation_step(
        session_id=session_id,
        current_step_index=current_step_index,
    )


def get_session_events(session_id: str) -> Dict[str, Any]:
    return get_navigation_events(session_id)