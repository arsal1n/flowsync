import re
import time
from typing import Any, Dict, List

from fastapi import Request
from fastapi.responses import JSONResponse

from mobile_v2_middleware import (
    SESSION_CACHE,
    TRIP_CACHE,
    handle_end as mobile_v2_handle_end,
    handle_recommend as mobile_v2_handle_recommend,
    number,
)


ROLE_CAPABILITIES = {
    "driver": {
        "role": "driver",
        "label": "Driver",
        "home_screen": "driver_dashboard",
        "capabilities": [
            "route_recommendation",
            "selected_route_navigation",
            "real_gps_navigation",
            "turn_by_turn_steps",
            "trip_summary",
            "saved_places",
        ],
    },
    "admin": {
        "role": "admin",
        "label": "Admin",
        "home_screen": "admin_dashboard",
        "capabilities": [
            "system_dashboard",
            "user_management",
            "route_analytics",
            "trip_analytics",
            "alerts_management",
            "operations_summary",
        ],
    },
    "rta": {
        "role": "rta",
        "label": "RTA Operator",
        "home_screen": "rta_operations_dashboard",
        "capabilities": [
            "traffic_operations",
            "route_load_monitoring",
            "sensor_monitoring",
            "incident_review",
            "city_mobility_dashboard",
            "congestion_management",
        ],
    },
    "emergency": {
        "role": "emergency",
        "label": "Emergency",
        "home_screen": "emergency_dashboard",
        "capabilities": [
            "priority_navigation",
            "emergency_vehicle_support",
            "incident_response",
            "route_clearance",
            "hospital_route_support",
            "live_alerts",
        ],
    },
}


DEMO_USERS = {
    "driver@flowsync.local": {
        "user_id": "demo-driver",
        "name": "FlowSync Driver",
        "email": "driver@flowsync.local",
        "role": "driver",
    },
    "admin@flowsync.local": {
        "user_id": "demo-admin",
        "name": "FlowSync Admin",
        "email": "admin@flowsync.local",
        "role": "admin",
    },
    "rta@flowsync.local": {
        "user_id": "demo-rta",
        "name": "RTA Operator",
        "email": "rta@flowsync.local",
        "role": "rta",
    },
    "emergency@flowsync.local": {
        "user_id": "demo-emergency",
        "name": "Emergency Operator",
        "email": "emergency@flowsync.local",
        "role": "emergency",
    },
}


UAE_LOCATION_CATALOG = [
    {"name": "Dubai Mall", "address": "Downtown Dubai", "city": "Dubai", "category": "mall", "latitude": 25.1972, "longitude": 55.2744},
    {"name": "Burj Khalifa", "address": "Downtown Dubai", "city": "Dubai", "category": "landmark", "latitude": 25.1975, "longitude": 55.2743},
    {"name": "Downtown Dubai", "address": "Downtown Dubai", "city": "Dubai", "category": "district", "latitude": 25.1948, "longitude": 55.2708},
    {"name": "Business Bay", "address": "Business Bay", "city": "Dubai", "category": "business", "latitude": 25.1860, "longitude": 55.2608},
    {"name": "Dubai Marina", "address": "Dubai Marina", "city": "Dubai", "category": "district", "latitude": 25.0800, "longitude": 55.1400},
    {"name": "JBR", "address": "Jumeirah Beach Residence", "city": "Dubai", "category": "beach", "latitude": 25.0793, "longitude": 55.1338},
    {"name": "Palm Jumeirah", "address": "Palm Jumeirah", "city": "Dubai", "category": "landmark", "latitude": 25.1124, "longitude": 55.1390},
    {"name": "Mall of the Emirates", "address": "Al Barsha", "city": "Dubai", "category": "mall", "latitude": 25.1181, "longitude": 55.2006},
    {"name": "DXB Airport", "address": "Dubai International Airport", "city": "Dubai", "category": "airport", "latitude": 25.2532, "longitude": 55.3657},
    {"name": "Dubai Festival City", "address": "Festival City", "city": "Dubai", "category": "mall", "latitude": 25.2222, "longitude": 55.3494},
    {"name": "Deira City Centre", "address": "Deira", "city": "Dubai", "category": "mall", "latitude": 25.2536, "longitude": 55.3306},
    {"name": "Dubai Silicon Oasis", "address": "DSO", "city": "Dubai", "category": "technology", "latitude": 25.1250, "longitude": 55.3800},
    {"name": "Academic City", "address": "Dubai Academic City", "city": "Dubai", "category": "education", "latitude": 25.1256, "longitude": 55.4209},
    {"name": "Dubai Internet City", "address": "Dubai Internet City", "city": "Dubai", "category": "business", "latitude": 25.0953, "longitude": 55.1562},
    {"name": "Dubai Media City", "address": "Dubai Media City", "city": "Dubai", "category": "business", "latitude": 25.0923, "longitude": 55.1525},
    {"name": "Jumeirah", "address": "Jumeirah Beach Road", "city": "Dubai", "category": "district", "latitude": 25.2048, "longitude": 55.2553},
    {"name": "Rashid Hospital", "address": "Umm Hurair", "city": "Dubai", "category": "hospital", "latitude": 25.2371, "longitude": 55.3136},
    {"name": "Dubai Creek Harbour", "address": "Dubai Creek", "city": "Dubai", "category": "district", "latitude": 25.1970, "longitude": 55.3489},
    {"name": "City Walk", "address": "Al Wasl", "city": "Dubai", "category": "retail", "latitude": 25.2075, "longitude": 55.2620},
    {"name": "JLT", "address": "Jumeirah Lake Towers", "city": "Dubai", "category": "district", "latitude": 25.0694, "longitude": 55.1412},
    {"name": "Al Barsha", "address": "Al Barsha", "city": "Dubai", "category": "district", "latitude": 25.1107, "longitude": 55.2009},
    {"name": "Mirdif City Centre", "address": "Mirdif", "city": "Dubai", "category": "mall", "latitude": 25.2167, "longitude": 55.4070},
    {"name": "Karama", "address": "Al Karama", "city": "Dubai", "category": "district", "latitude": 25.2412, "longitude": 55.3036},
    {"name": "Al Rigga", "address": "Deira", "city": "Dubai", "category": "street", "latitude": 25.2664, "longitude": 55.3188},
    {"name": "Sheikh Zayed Road", "address": "E11", "city": "Dubai", "category": "road", "latitude": 25.2048, "longitude": 55.2708},
    {"name": "Al Khail Road", "address": "E44", "city": "Dubai", "category": "road", "latitude": 25.1680, "longitude": 55.2920},
    {"name": "Dubai Mall Food Court", "address": "Dubai Mall", "city": "Dubai", "category": "cafeteria", "latitude": 25.1970, "longitude": 55.2790},
    {"name": "Business Bay Cafeteria", "address": "Business Bay", "city": "Dubai", "category": "cafeteria", "latitude": 25.1847, "longitude": 55.2589},

    {"name": "Sharjah", "address": "Sharjah City", "city": "Sharjah", "category": "city", "latitude": 25.3463, "longitude": 55.4209},
    {"name": "Sharjah City Centre", "address": "Al Wahda Street", "city": "Sharjah", "category": "mall", "latitude": 25.3315, "longitude": 55.3955},
    {"name": "University City Sharjah", "address": "University City", "city": "Sharjah", "category": "education", "latitude": 25.2867, "longitude": 55.4636},
    {"name": "Sharjah International Airport", "address": "Sharjah Airport", "city": "Sharjah", "category": "airport", "latitude": 25.3286, "longitude": 55.5172},
    {"name": "Al Majaz Waterfront", "address": "Al Majaz", "city": "Sharjah", "category": "waterfront", "latitude": 25.3223, "longitude": 55.3764},
    {"name": "Al Qasba", "address": "Al Khan", "city": "Sharjah", "category": "landmark", "latitude": 25.3217, "longitude": 55.3769},
    {"name": "Mega Mall Sharjah", "address": "Bu Daniq", "city": "Sharjah", "category": "mall", "latitude": 25.3497, "longitude": 55.3987},
    {"name": "Sahara Centre", "address": "Al Nahda", "city": "Sharjah", "category": "mall", "latitude": 25.2969, "longitude": 55.3732},
    {"name": "Al Nahda Sharjah", "address": "Al Nahda", "city": "Sharjah", "category": "district", "latitude": 25.2943, "longitude": 55.3769},
    {"name": "Sharjah Corniche", "address": "Corniche Street", "city": "Sharjah", "category": "street", "latitude": 25.3622, "longitude": 55.3897},
    {"name": "Rolla Sharjah", "address": "Rolla Area", "city": "Sharjah", "category": "district", "latitude": 25.3575, "longitude": 55.3890},
    {"name": "Al Ittihad Road", "address": "E11 Dubai-Sharjah", "city": "Sharjah", "category": "road", "latitude": 25.3120, "longitude": 55.3840},
]


def clean_text(value: Any) -> str:
    return re.sub(r"[^a-z0-9]+", " ", str(value or "").lower()).strip()


def place_key(value: Any) -> str:
    value = clean_text(value)

    aliases = {
        "shj": "sharjah",
        "dxb": "dxb airport",
        "dubai airport": "dxb airport",
        "moe": "mall of the emirates",
        "dso": "dubai silicon oasis",
        "marina": "dubai marina",
        "dubai mall food court": "dubai mall",
        "the dubai mall": "dubai mall",
    }

    return aliases.get(value, value)


def location_payload(item: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "name": item["name"],
        "address": item["address"],
        "city": item["city"],
        "category": item["category"],
        "type": item["category"],
        "latitude": item["latitude"],
        "longitude": item["longitude"],
        "lat": item["latitude"],
        "lng": item["longitude"],
        "source": "flowsync_uae_catalog_v3",
    }


def infer_role_from_email(email: str) -> str:
    email = str(email or "").lower()

    if email.startswith("admin"):
        return "admin"

    if email.startswith("rta"):
        return "rta"

    if email.startswith("emergency") or email.startswith("ambulance") or email.startswith("police"):
        return "emergency"

    return "driver"


async def safe_json(request: Request) -> Dict[str, Any]:
    try:
        payload = await request.json()
        return payload if isinstance(payload, dict) else {}
    except Exception:
        return {}


async def handle_login(request: Request) -> JSONResponse:
    body = await safe_json(request)

    email = str(body.get("email") or "").strip().lower()
    role = str(body.get("role") or infer_role_from_email(email)).strip().lower()

    if role == "rta_operator":
        role = "rta"

    if role not in ROLE_CAPABILITIES:
        role = "driver"

    if not email:
        return JSONResponse(
            {
                "detail": "Email is required.",
                "error": "missing_email",
            },
            status_code=401,
        )

    user = DEMO_USERS.get(email)

    if not user and email.endswith("@flowsync.local"):
        user = {
            "user_id": f"demo-{role}",
            "name": ROLE_CAPABILITIES[role]["label"],
            "email": email,
            "role": role,
        }

    if not user:
        return JSONResponse(
            {
                "detail": "Invalid demo account.",
                "error": "invalid_demo_account",
                "allowed_demo_accounts": list(DEMO_USERS.keys()),
            },
            status_code=401,
        )

    user = dict(user)
    user["role"] = role
    user["capabilities"] = ROLE_CAPABILITIES[role]["capabilities"]
    user["home_screen"] = ROLE_CAPABILITIES[role]["home_screen"]

    token = f"DEMO-{role.upper()}-{int(time.time())}"

    return JSONResponse(
        {
            "access_token": token,
            "token": token,
            "jwt": token,
            "token_type": "bearer",
            "user": user,
            "role": role,
            "role_capabilities": ROLE_CAPABILITIES[role],
            "message": f"{ROLE_CAPABILITIES[role]['label']} login successful.",
        }
    )


async def handle_role_capabilities(request: Request) -> JSONResponse:
    role = str(request.query_params.get("role") or "").strip().lower()

    if role == "rta_operator":
        role = "rta"

    if role and role in ROLE_CAPABILITIES:
        return JSONResponse(
            {
                "role": role,
                "role_capabilities": ROLE_CAPABILITIES[role],
            }
        )

    return JSONResponse(
        {
            "roles": ROLE_CAPABILITIES,
            "role_order": ["driver", "admin", "rta", "emergency"],
        }
    )


async def handle_location_search(request: Request) -> JSONResponse:
    query = str(
        request.query_params.get("q")
        or request.query_params.get("query")
        or ""
    ).strip()

    limit = int(number(request.query_params.get("limit"), 15))
    clean_query = place_key(query)

    if clean_query in {"", "all", "uae"}:
        matches = UAE_LOCATION_CATALOG[:limit]
        no_exact_match = False
    elif clean_query == "dubai":
        matches = [item for item in UAE_LOCATION_CATALOG if item["city"].lower() == "dubai"][:limit]
        no_exact_match = False
    elif clean_query == "sharjah":
        matches = [item for item in UAE_LOCATION_CATALOG if item["city"].lower() == "sharjah"][:limit]
        no_exact_match = False
    else:
        matches = []

        for item in UAE_LOCATION_CATALOG:
            haystack = clean_text(
                f"{item['name']} {item['address']} {item['city']} {item['category']}"
            )

            if clean_query in haystack or haystack in clean_query:
                matches.append(item)

        matches = matches[:limit]
        no_exact_match = len(matches) == 0

    popular_places = [
        location_payload(item)
        for item in UAE_LOCATION_CATALOG
        if item["category"] in {"mall", "airport", "district", "landmark"}
    ][:10]

    results = [location_payload(item) for item in matches]

    return JSONResponse(
        {
            "query": query,
            "count": len(results),
            "results": results,
            "locations": results,
            "no_exact_match": no_exact_match,
            "popular_places": popular_places,
            "provider": "flowsync_uae_catalog_v3",
            "provider_status": "catalog_search_exact_or_empty",
            "message": "Exact matches returned. Popular places are separate fallback suggestions.",
        }
    )


async def handle_route_recommend(request: Request) -> JSONResponse:
    body = await safe_json(request)

    start_location = (
        body.get("start_location")
        or body.get("start")
        or body.get("origin")
        or ""
    )

    destination = body.get("destination") or ""

    start_key = place_key(start_location)
    destination_key = place_key(destination)

    if start_key and destination_key and start_key == destination_key:
        trip_id = str(int(time.time() * 1000))

        TRIP_CACHE[trip_id] = {
            "trip_id": trip_id,
            "request_id": int(trip_id),
            "start_location": start_location,
            "destination": destination,
            "same_location": True,
            "all_routes": [],
            "recommended_route_id": None,
            "created_at": time.time(),
        }

        return JSONResponse(
            {
                "trip_id": trip_id,
                "request_id": int(trip_id),
                "database_record": {
                    "trip_id": trip_id,
                    "request_id": int(trip_id),
                },
                "same_location": True,
                "no_route_needed": True,
                "already_at_destination": True,
                "recommended_route_id": None,
                "recommended_route": None,
                "all_routes": [],
                "routes": [],
                "route_count": 0,
                "provider": "flowsync_same_location_guard",
                "provider_status": "same_location_no_route_needed",
                "message": "Start and destination are the same. You are already at this location.",
                "suggested_action": "show_arrived_state",
            }
        )

    return await mobile_v2_handle_recommend(request)


async def handle_trip_end(request: Request) -> JSONResponse:
    body = await safe_json(request)

    session_id = str(body.get("session_id") or "")
    requested_status = str(body.get("status") or "completed").strip().lower()

    if requested_status == "canceled":
        requested_status = "cancelled"

    if requested_status not in {"cancelled", "interrupted", "completed", "arrived"}:
        requested_status = "completed"

    if requested_status in {"completed", "arrived"}:
        return await mobile_v2_handle_end(request)

    session = SESSION_CACHE.get(session_id)

    if not session:
        return JSONResponse(
            {
                "error": "session_not_found",
                "message": "Navigation session was not found.",
            },
            status_code=404,
        )

    route = session.get("route") or {}

    distance_km = round(number(route.get("distance_km"), 0), 1)
    estimated_time = int(number(route.get("estimated_time_min"), 0))

    session["status"] = requested_status
    session["ended_at"] = time.time()
    SESSION_CACHE[session_id] = session

    return JSONResponse(
        {
            "session_id": session_id,
            "trip_id": session.get("trip_id"),
            "request_id": session.get("request_id"),
            "selected_route_id": session.get("selected_route_id"),
            "status": requested_status,
            "route_id": session.get("selected_route_id"),
            "route_name": route.get("route_name"),
            "distance_km": distance_km,
            "duration_min": estimated_time,
            "fuel_saved_liters": 0,
            "co2_saved_kg": 0,
            "congestion_reduction": 0,
            "traffic_display": route.get("traffic_display"),
            "summary_message": (
                "Trip cancelled before completion."
                if requested_status == "cancelled"
                else "Trip interrupted before completion."
            ),
        }
    )



def register_mobile_v3_polish(app):
    @app.middleware("http")
    async def mobile_v3_polish_middleware(request: Request, call_next):
        path = request.url.path
        method = request.method.upper()

        try:
            if method == "GET" and path in {"/api/roles/capabilities", "/api/auth/role-capabilities"}:
                return await handle_role_capabilities(request)

            if method == "GET" and path == "/api/locations/search":
                return await handle_location_search(request)

            if method == "POST" and path == "/api/routes/recommend":
                return await handle_route_recommend(request)

            if method == "POST" and path == "/api/trips/end":
                return await handle_trip_end(request)

        except Exception as exc:
            return JSONResponse(
                {
                    "error": "mobile_v3_polish_error",
                    "message": str(exc),
                },
                status_code=500,
            )

        return await call_next(request)
