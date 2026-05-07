from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import uuid4

from route_engine import get_recommended_route


LOCATION_CATALOG = [
    {
        "name": "Dubai Mall",
        "address": "Downtown Dubai",
        "lat": 25.1972,
        "lng": 55.2744,
        "type": "mall",
    },
    {
        "name": "Burj Khalifa",
        "address": "Downtown Dubai",
        "lat": 25.1975,
        "lng": 55.2743,
        "type": "landmark",
    },
    {
        "name": "Dubai Marina",
        "address": "Dubai Marina",
        "lat": 25.0800,
        "lng": 55.1400,
        "type": "district",
    },
    {
        "name": "Business Bay",
        "address": "Business Bay",
        "lat": 25.1850,
        "lng": 55.2800,
        "type": "district",
    },
    {
        "name": "Dubai Arena",
        "address": "City Walk Dubai",
        "lat": 25.2075,
        "lng": 55.2605,
        "type": "event_venue",
    },
    {
        "name": "Rashid Hospital",
        "address": "Umm Hurair, Dubai",
        "lat": 25.2371,
        "lng": 55.3136,
        "type": "hospital",
    },
    {
        "name": "Dubai International Airport",
        "address": "Garhoud, Dubai",
        "lat": 25.2532,
        "lng": 55.3657,
        "type": "airport",
    },
    {
        "name": "Mall of the Emirates",
        "address": "Al Barsha, Dubai",
        "lat": 25.1181,
        "lng": 55.2006,
        "type": "mall",
    },
    {
        "name": "Jumeirah Beach",
        "address": "Jumeirah, Dubai",
        "lat": 25.2048,
        "lng": 55.2500,
        "type": "beach",
    },
    {
        "name": "Sharjah City Centre",
        "address": "Al Wahda Street, Sharjah",
        "lat": 25.3315,
        "lng": 55.3955,
        "type": "mall",
    },
]


ACTIVE_NAVIGATION_SESSIONS: Dict[str, Dict[str, Any]] = {}


def search_locations(query: str) -> Dict[str, Any]:
    query = (query or "").strip().lower()

    if not query:
        results = LOCATION_CATALOG[:6]
    else:
        results = [
            location
            for location in LOCATION_CATALOG
            if query in location["name"].lower()
            or query in location["address"].lower()
            or query in location["type"].lower()
        ]

    return {
        "query": query,
        "results": results,
        "count": len(results),
    }


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

    if route_name:
        for route in route_result["all_routes"]:
            if route["route_name"] == route_name:
                selected_route = route
                break

    session_id = f"NAV-{uuid4().hex[:10].upper()}"
    started_time = datetime.now().isoformat(timespec="seconds")

    session = {
        "session_id": session_id,
        "user_id": user_id,
        "status": "active",
        "start_location": start_location,
        "destination": destination,
        "vehicle_type": vehicle_type,
        "route_preference": route_preference,
        "user_role": user_role,
        "selected_route": selected_route,
        "started_time": started_time,
        "ended_time": None,
        "live_navigation": {
            "current_step_index": 0,
            "next_instruction": selected_route["turn_steps"][0]["instruction"],
            "remaining_steps": selected_route["turn_steps"],
            "route_coordinates": selected_route["coordinates"],
            "polyline": selected_route["polyline"],
            "alerts": selected_route["alerts"],
            "incidents": selected_route["incidents"],
        },
    }

    ACTIVE_NAVIGATION_SESSIONS[session_id] = session

    return {
        "message": "Navigation session started.",
        "session": session,
    }


def end_navigation_session(
    session_id: str,
    status: str = "completed",
) -> Dict[str, Any]:
    session = ACTIVE_NAVIGATION_SESSIONS.get(session_id)

    if not session:
        return {
            "found": False,
            "message": "Navigation session not found.",
            "session_id": session_id,
        }

    session["status"] = status
    session["ended_time"] = datetime.now().isoformat(timespec="seconds")

    ACTIVE_NAVIGATION_SESSIONS[session_id] = session

    return {
        "found": True,
        "message": "Navigation session ended.",
        "session": session,
    }


def get_active_navigation_sessions() -> Dict[str, Any]:
    sessions = list(ACTIVE_NAVIGATION_SESSIONS.values())

    active_sessions = [
        session for session in sessions
        if session["status"] == "active"
    ]

    return {
        "active_navigation_sessions": active_sessions,
        "active_count": len(active_sessions),
        "total_sessions": len(sessions),
    }