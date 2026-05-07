from typing import Any, Dict, Optional

from geocoding_provider import search_locations_provider
from navigation_persistence import (
    end_navigation_session_in_db,
    get_active_navigation_sessions_from_db,
    get_navigation_events,
    get_navigation_session_by_id,
    save_navigation_session,
    update_navigation_step,
)
from route_engine import get_recommended_route
from trip_lifecycle import (
    complete_trip_by_session_id,
    link_trip_to_navigation_session,
    update_trip_progress_event,
)


def search_locations(query: str) -> Dict[str, Any]:
    return search_locations_provider(query)


def start_navigation_session(
    start_location: str,
    destination: str,
    vehicle_type: str = "car",
    route_preference: str = "balanced",
    user_role: str = "driver",
    route_name: Optional[str] = None,
    user_id: str = "demo-driver",
    request_id: Optional[int] = None,
) -> Dict[str, Any]:
    route_result = get_recommended_route(
        start_location=start_location,
        destination=destination,
        route_preference=route_preference,
        user_role=user_role,
    )

    if not route_result.get("recommended_route"):
        return {
            "message": "Navigation session could not be started because no route was available.",
            "persistence": "sqlite",
            "request_id": request_id,
            "routing_result": route_result,
            "session": None,
        }

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

    session = saved_session["session"]

    lifecycle_update = None

    if request_id is not None:
        lifecycle_update = link_trip_to_navigation_session(
            request_id=request_id,
            session_id=session["session_id"],
        )

    return {
        "message": "Navigation session started.",
        "persistence": "sqlite",
        "routing_provider": route_result.get("routing_provider"),
        "provider_status": route_result.get("provider_status"),
        "selected_route_source": selected_route_source,
        "request_id": request_id,
        "trip_lifecycle": lifecycle_update,
        "session": session,
    }


def end_navigation_session(
    session_id: str,
    status: str = "completed",
) -> Dict[str, Any]:
    navigation_result = end_navigation_session_in_db(
        session_id=session_id,
        status=status,
    )

    lifecycle_result = None

    if navigation_result.get("found"):
        lifecycle_result = complete_trip_by_session_id(
            session_id=session_id,
            status=status,
        )

    navigation_result["trip_lifecycle"] = lifecycle_result

    return navigation_result


def get_active_navigation_sessions() -> Dict[str, Any]:
    return get_active_navigation_sessions_from_db()


def get_navigation_session(session_id: str) -> Dict[str, Any]:
    return get_navigation_session_by_id(session_id)


def update_navigation_progress(
    session_id: str,
    current_step_index: int,
) -> Dict[str, Any]:
    navigation_result = update_navigation_step(
        session_id=session_id,
        current_step_index=current_step_index,
    )

    lifecycle_result = None

    if navigation_result.get("found"):
        lifecycle_result = update_trip_progress_event(
            session_id=session_id,
            current_step_index=current_step_index,
        )

    navigation_result["trip_lifecycle"] = lifecycle_result

    return navigation_result


def get_session_events(session_id: str) -> Dict[str, Any]:
    return get_navigation_events(session_id)