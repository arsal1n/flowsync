from copy import deepcopy
from math import atan2, cos, radians, sin, sqrt
from typing import Any, Dict, List, Optional

from config import get_routing_provider_name, is_mock_fallback_enabled
from real_map_provider import get_openrouteservice_route_options

REAL_ROUTING_PROVIDERS = {"openrouteservice", "ors"}

PLACE_CATALOG = [
    {"name": "Dubai Mall", "aliases": ["dubai mall", "the dubai mall"], "lat": 25.1972, "lng": 55.2744, "category": "mall", "city": "Dubai"},
    {"name": "Burj Khalifa", "aliases": ["burj khalifa", "downtown tower"], "lat": 25.1975, "lng": 55.2743, "category": "landmark", "city": "Dubai"},
    {"name": "Downtown Dubai", "aliases": ["downtown", "downtown dubai"], "lat": 25.1948, "lng": 55.2708, "category": "district", "city": "Dubai"},
    {"name": "Business Bay", "aliases": ["business bay"], "lat": 25.1860, "lng": 55.2608, "category": "business", "city": "Dubai"},
    {"name": "Dubai Marina", "aliases": ["marina", "dubai marina"], "lat": 25.0800, "lng": 55.1400, "category": "district", "city": "Dubai"},
    {"name": "JBR", "aliases": ["jbr", "jumeirah beach residence"], "lat": 25.0793, "lng": 55.1338, "category": "beach", "city": "Dubai"},
    {"name": "Palm Jumeirah", "aliases": ["palm", "palm jumeirah"], "lat": 25.1124, "lng": 55.1390, "category": "landmark", "city": "Dubai"},
    {"name": "Mall of the Emirates", "aliases": ["moe", "mall of emirates", "mall of the emirates"], "lat": 25.1181, "lng": 55.2006, "category": "mall", "city": "Dubai"},
    {"name": "DXB Airport", "aliases": ["dxb", "dxb airport", "dubai airport", "dubai international airport"], "lat": 25.2532, "lng": 55.3657, "category": "airport", "city": "Dubai"},
    {"name": "Dubai Festival City", "aliases": ["festival city", "dubai festival city"], "lat": 25.2222, "lng": 55.3494, "category": "mall", "city": "Dubai"},
    {"name": "Deira City Centre", "aliases": ["deira", "city centre deira", "deira city centre"], "lat": 25.2536, "lng": 55.3306, "category": "mall", "city": "Dubai"},
    {"name": "Dubai Silicon Oasis", "aliases": ["dso", "silicon oasis", "dubai silicon oasis"], "lat": 25.1250, "lng": 55.3800, "category": "technology", "city": "Dubai"},
    {"name": "Academic City", "aliases": ["academic city", "dubai academic city"], "lat": 25.1256, "lng": 55.4209, "category": "education", "city": "Dubai"},
    {"name": "Dubai Internet City", "aliases": ["internet city", "dubai internet city"], "lat": 25.0953, "lng": 55.1562, "category": "business", "city": "Dubai"},
    {"name": "Dubai Media City", "aliases": ["media city", "dubai media city"], "lat": 25.0923, "lng": 55.1525, "category": "business", "city": "Dubai"},
    {"name": "Jumeirah", "aliases": ["jumeirah", "jumeirah beach"], "lat": 25.2048, "lng": 55.2553, "category": "district", "city": "Dubai"},
    {"name": "Sharjah", "aliases": ["sharjah", "shj", "sharjah city"], "lat": 25.3463, "lng": 55.4209, "category": "city", "city": "Sharjah"},
    {"name": "Sharjah City Centre", "aliases": ["sharjah city centre", "city centre sharjah", "shj city centre"], "lat": 25.3315, "lng": 55.3955, "category": "mall", "city": "Sharjah"},
    {"name": "University City Sharjah", "aliases": ["university city", "university city sharjah"], "lat": 25.2867, "lng": 55.4636, "category": "education", "city": "Sharjah"},
    {"name": "Sharjah International Airport", "aliases": ["sharjah airport", "shj airport"], "lat": 25.3286, "lng": 55.5172, "category": "airport", "city": "Sharjah"},
]


def _normalise(value: str) -> str:
    return (value or "").strip().lower().replace("-", " ")


def geocode_location(location: str) -> Dict[str, Any]:
    query = _normalise(location)

    for place in PLACE_CATALOG:
        names = [place["name"].lower(), *place.get("aliases", [])]
        if query in names:
            return deepcopy(place)

    for place in PLACE_CATALOG:
        names = [place["name"].lower(), *place.get("aliases", [])]
        if any(query in item or item in query for item in names):
            return deepcopy(place)

    return {
        "name": location or "Dubai",
        "aliases": [],
        "lat": 25.2048,
        "lng": 55.2708,
        "category": "custom",
        "city": "Dubai",
    }


def _haversine_km(start: Dict[str, Any], end: Dict[str, Any]) -> float:
    radius_km = 6371.0
    lat1 = radians(float(start["lat"]))
    lon1 = radians(float(start["lng"]))
    lat2 = radians(float(end["lat"]))
    lon2 = radians(float(end["lng"]))

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    value = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    return round(radius_km * 2 * atan2(sqrt(value), sqrt(1 - value)), 1)


def _traffic_label(score: int) -> str:
    if score >= 8:
        return "Heavy"
    if score >= 6:
        return "Moderate"
    if score >= 4:
        return "Light"
    return "Clear"


def _traffic_description(score: int) -> str:
    label = _traffic_label(score)
    return f"{label} traffic • {score}/10"


def _coordinate(lat: float, lng: float) -> Dict[str, float]:
    return {
        "lat": round(float(lat), 6),
        "lng": round(float(lng), 6),
        "latitude": round(float(lat), 6),
        "longitude": round(float(lng), 6),
    }


def _build_route_coordinates(
    start: Dict[str, Any],
    end: Dict[str, Any],
    variant_index: int,
) -> List[Dict[str, float]]:
    start_lat = float(start["lat"])
    start_lng = float(start["lng"])
    end_lat = float(end["lat"])
    end_lng = float(end["lng"])

    curve_offsets = [
        (0.000, 0.000),
        (-0.018, 0.030),
        (0.026, -0.018),
        (0.018, 0.045),
    ]

    off_lat, off_lng = curve_offsets[variant_index % len(curve_offsets)]

    coordinates = []

    for index in range(7):
        ratio = index / 6
        bend = sin(ratio * 3.14159)
        lat = start_lat + (end_lat - start_lat) * ratio + (off_lat * bend)
        lng = start_lng + (end_lng - start_lng) * ratio + (off_lng * bend)
        coordinates.append(_coordinate(lat, lng))

    return coordinates


def _route_names(start: Dict[str, Any], end: Dict[str, Any]) -> List[Dict[str, Any]]:
    is_sharjah_route = (
        start.get("city") == "Sharjah"
        or end.get("city") == "Sharjah"
        or "sharjah" in _normalise(start.get("name", ""))
        or "sharjah" in _normalise(end.get("name", ""))
    )

    if is_sharjah_route:
        return [
            {"name": "Route A - Al Ittihad Road", "type": "main_road", "road": "Al Ittihad Road", "traffic": 8, "capacity": 18, "toll": 0, "eco": 4},
            {"name": "Route B - Sheikh Mohammed Bin Zayed Road", "type": "highway", "road": "E311 / SMBZ Road", "traffic": 6, "capacity": 22, "toll": 0, "eco": 6},
            {"name": "Route C - Emirates Road Alternative", "type": "outer_ring", "road": "E611 / Emirates Road", "traffic": 4, "capacity": 25, "toll": 0, "eco": 7},
            {"name": "Route D - Airport Tunnel Connector", "type": "airport_connector", "road": "Airport Tunnel / D89", "traffic": 7, "capacity": 16, "toll": 0, "eco": 5},
        ]

    return [
        {"name": "Route A - Sheikh Zayed Road", "type": "main_road", "road": "Sheikh Zayed Road", "traffic": 7, "capacity": 18, "toll": 4, "eco": 5},
        {"name": "Route B - Al Khail Road", "type": "arterial_road", "road": "Al Khail Road", "traffic": 5, "capacity": 20, "toll": 0, "eco": 7},
        {"name": "Route C - Business Bay Connector", "type": "city_connector", "road": "Business Bay Connector", "traffic": 4, "capacity": 12, "toll": 0, "eco": 6},
        {"name": "Route D - Jumeirah Coastal Alternative", "type": "coastal", "road": "Jumeirah Coastal Road", "traffic": 3, "capacity": 14, "toll": 0, "eco": 8},
    ]


def step(
    instruction: str,
    distance_m: int,
    duration_min: int,
    maneuver: str,
    road_name: str,
    lat: float,
    lng: float,
) -> Dict[str, Any]:
    return {
        "instruction": instruction,
        "distance_m": distance_m,
        "duration_min": duration_min,
        "maneuver": maneuver,
        "road_name": road_name,
        "lat": round(float(lat), 6),
        "lng": round(float(lng), 6),
        "coordinate": _coordinate(lat, lng),
    }


def _build_steps(
    start: Dict[str, Any],
    end: Dict[str, Any],
    coordinates: List[Dict[str, float]],
    route_name: str,
    primary_road: str,
    estimated_time: int,
    distance_km: float,
) -> List[Dict[str, Any]]:
    segment_distance = max(500, int((distance_km * 1000) / 5))
    segment_time = max(1, int(estimated_time / 5))

    return [
        step(
            f"Start from {start['name']} and head toward {primary_road}.",
            segment_distance,
            segment_time,
            "depart",
            start["name"],
            coordinates[0]["lat"],
            coordinates[0]["lng"],
        ),
        step(
            f"Merge onto {primary_road}.",
            segment_distance,
            segment_time,
            "merge",
            primary_road,
            coordinates[1]["lat"],
            coordinates[1]["lng"],
        ),
        step(
            f"Continue on {primary_road}; follow FlowSync traffic-balanced guidance.",
            segment_distance,
            segment_time,
            "straight",
            primary_road,
            coordinates[3]["lat"],
            coordinates[3]["lng"],
        ),
        step(
            f"Take the connector toward {end['name']}.",
            segment_distance,
            segment_time,
            "exit",
            route_name,
            coordinates[5]["lat"],
            coordinates[5]["lng"],
        ),
        step(
            f"Arrive at {end['name']}.",
            max(250, int(segment_distance / 2)),
            1,
            "arrive",
            end["name"],
            coordinates[-1]["lat"],
            coordinates[-1]["lng"],
        ),
    ]


def _map_bounds(coordinates: List[Dict[str, float]]) -> Dict[str, float]:
    latitudes = [point["lat"] for point in coordinates]
    longitudes = [point["lng"] for point in coordinates]

    return {
        "north": max(latitudes),
        "south": min(latitudes),
        "east": max(longitudes),
        "west": min(longitudes),
        "center_lat": round((max(latitudes) + min(latitudes)) / 2, 6),
        "center_lng": round((max(longitudes) + min(longitudes)) / 2, 6),
    }


def _build_route_option(
    start: Dict[str, Any],
    end: Dict[str, Any],
    template: Dict[str, Any],
    index: int,
    base_distance_km: float,
) -> Dict[str, Any]:
    coordinates = _build_route_coordinates(start, end, index)

    distance_multiplier = [1.00, 1.08, 1.18, 1.13][index % 4]
    distance_km = round(max(base_distance_km * distance_multiplier, 2.0), 1)

    traffic_score = int(template["traffic"])
    average_speed = [58, 66, 72, 62][index % 4]
    estimated_time = max(
        6,
        int((distance_km / average_speed) * 60 + traffic_score * 1.8),
    )

    route_name = template["name"]
    primary_road = template["road"]

    turn_steps = _build_steps(
        start=start,
        end=end,
        coordinates=coordinates,
        route_name=route_name,
        primary_road=primary_road,
        estimated_time=estimated_time,
        distance_km=distance_km,
    )

    traffic_label = _traffic_label(traffic_score)
    traffic_display = _traffic_description(traffic_score)

    alerts = []
    incidents = []

    if traffic_score >= 8:
        alerts.append(
            {
                "type": "congestion",
                "title": "Heavy traffic ahead",
                "message": f"{primary_road} is currently busy. FlowSync will monitor alternatives.",
                "severity": "high",
            }
        )
        incidents.append(
            {
                "type": "slowdown",
                "message": f"Slow movement detected on {primary_road}.",
                "impact": "medium",
            }
        )
    elif traffic_score >= 6:
        alerts.append(
            {
                "type": "moderate_traffic",
                "title": "Moderate traffic",
                "message": f"{primary_road} has moderate traffic pressure.",
                "severity": "medium",
            }
        )
    else:
        alerts.append(
            {
                "type": "clear_route",
                "title": "Smooth traffic",
                "message": f"{primary_road} is currently a smoother option.",
                "severity": "low",
            }
        )

    return {
        "route_name": route_name,
        "name": route_name,
        "start_location": start["name"],
        "destination": end["name"],
        "start_coordinate": _coordinate(start["lat"], start["lng"]),
        "destination_coordinate": _coordinate(end["lat"], end["lng"]),
        "estimated_time": estimated_time,
        "duration_min": estimated_time,
        "duration_text": f"{estimated_time} min",
        "distance_km": distance_km,
        "distance_text": f"{distance_km} km",
        "congestion_score": traffic_score,
        "traffic_score": traffic_score,
        "traffic_label": traffic_label,
        "traffic_status": traffic_label.lower(),
        "traffic_display": traffic_display,
        "traffic_description": traffic_display,
        "road_capacity": int(template["capacity"]),
        "route_type": template["type"],
        "residential_impact": [1, 2, 3, 2][index % 4],
        "accident_risk": [4, 3, 2, 3][index % 4],
        "weather_risk": 2,
        "stop_frequency": [6, 4, 3, 5][index % 4],
        "fuel_estimate_liters": round(distance_km * 0.095, 2),
        "toll_cost": template["toll"],
        "eco_score": template["eco"],
        "provider": "flowsync_simulated",
        "provider_status": "in_app_navigation_ready_simulated_traffic",
        "coordinates": coordinates,
        "route_coordinates": coordinates,
        "polyline": coordinates,
        "turn_steps": turn_steps,
        "turn_by_turn_steps": turn_steps,
        "steps": turn_steps,
        "alerts": alerts,
        "incidents": incidents,
        "map_bounds": _map_bounds(coordinates),
        "in_app_navigation": True,
        "external_navigation_required": False,
        "navigation_mode": "in_app_map",
        "external_navigation_url": None,
        "message": "Route is ready for in-app map rendering and mobile navigation.",
    }


def get_mock_route_options(start_location: str, destination: str) -> List[Dict[str, Any]]:
    start = geocode_location(start_location)
    end = geocode_location(destination)

    base_distance_km = _haversine_km(start, end)
    templates = _route_names(start, end)

    routes = [
        _build_route_option(
            start=start,
            end=end,
            template=template,
            index=index,
            base_distance_km=base_distance_km,
        )
        for index, template in enumerate(templates)
    ]

    return routes


def _upgrade_real_routes(routes: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    upgraded = []

    for route in routes:
        next_route = deepcopy(route)
        coords = next_route.get("coordinates") or next_route.get("polyline") or []

        next_route["route_coordinates"] = coords
        next_route["polyline"] = coords
        next_route["in_app_navigation"] = True
        next_route["external_navigation_required"] = False
        next_route["navigation_mode"] = "in_app_map"
        next_route["traffic_score"] = next_route.get("traffic_score", next_route.get("congestion_score", 5))
        next_route["traffic_label"] = _traffic_label(int(next_route["traffic_score"]))
        next_route["traffic_display"] = _traffic_description(int(next_route["traffic_score"]))
        next_route["provider"] = "openrouteservice"
        next_route["provider_status"] = "real_routing_success"

        upgraded.append(next_route)

    return upgraded


def get_provider_route_options(start_location: str, destination: str) -> Dict[str, Any]:
    provider = (get_routing_provider_name() or "mock").lower()

    if provider in REAL_ROUTING_PROVIDERS:
        real_result = get_openrouteservice_route_options(
            start_location=start_location,
            destination=destination,
        )

        if real_result.get("success"):
            return {
                "provider": "openrouteservice",
                "provider_status": "real_routing_success",
                "routes": _upgrade_real_routes(real_result.get("routes", [])),
            }

        if not is_mock_fallback_enabled():
            return {
                "provider": "openrouteservice",
                "provider_status": real_result.get("provider_status", "real_provider_failed"),
                "routes": [],
                "error": real_result.get("provider_error") or real_result.get("message"),
            }

        routes = get_mock_route_options(start_location, destination)

        for route in routes:
            route["provider"] = "openrouteservice"
            route["provider_status"] = "simulated_fallback_after_real_provider_failure"
            route["real_provider_error"] = real_result.get("provider_error") or real_result.get("message")

        return {
            "provider": "openrouteservice",
            "provider_status": "simulated_fallback_after_real_provider_failure",
            "routes": routes,
            "real_provider_error": real_result.get("provider_error") or real_result.get("message"),
        }

    routes = get_mock_route_options(start_location, destination)

    return {
        "provider": "flowsync_simulated",
        "provider_status": "in_app_navigation_ready_simulated_traffic",
        "routes": routes,
    }


def get_route_catalog() -> List[Dict[str, Any]]:
    return get_mock_route_options(
        start_location="Dubai Mall",
        destination="Dubai Marina",
    )

# --- FlowSync final in-app dynamic routing override ---
# Overrides old static Dubai Marina mock routes.
# Keeps backend API contract stable while making map coordinates destination-aware.

from math import atan2, cos, radians, sin, sqrt

_FINAL_UAE_PLACES = {
    "dubai mall": {"name": "Dubai Mall", "lat": 25.1972, "lng": 55.2744, "city": "Dubai"},
    "the dubai mall": {"name": "Dubai Mall", "lat": 25.1972, "lng": 55.2744, "city": "Dubai"},
    "burj khalifa": {"name": "Burj Khalifa", "lat": 25.1975, "lng": 55.2743, "city": "Dubai"},
    "downtown": {"name": "Downtown Dubai", "lat": 25.1948, "lng": 55.2708, "city": "Dubai"},
    "downtown dubai": {"name": "Downtown Dubai", "lat": 25.1948, "lng": 55.2708, "city": "Dubai"},
    "business bay": {"name": "Business Bay", "lat": 25.1860, "lng": 55.2608, "city": "Dubai"},
    "dubai marina": {"name": "Dubai Marina", "lat": 25.0800, "lng": 55.1400, "city": "Dubai"},
    "marina": {"name": "Dubai Marina", "lat": 25.0800, "lng": 55.1400, "city": "Dubai"},
    "jbr": {"name": "JBR", "lat": 25.0793, "lng": 55.1338, "city": "Dubai"},
    "palm jumeirah": {"name": "Palm Jumeirah", "lat": 25.1124, "lng": 55.1390, "city": "Dubai"},
    "mall of the emirates": {"name": "Mall of the Emirates", "lat": 25.1181, "lng": 55.2006, "city": "Dubai"},
    "moe": {"name": "Mall of the Emirates", "lat": 25.1181, "lng": 55.2006, "city": "Dubai"},
    "dxb": {"name": "DXB Airport", "lat": 25.2532, "lng": 55.3657, "city": "Dubai"},
    "dxb airport": {"name": "DXB Airport", "lat": 25.2532, "lng": 55.3657, "city": "Dubai"},
    "dubai airport": {"name": "DXB Airport", "lat": 25.2532, "lng": 55.3657, "city": "Dubai"},
    "academic city": {"name": "Academic City", "lat": 25.1256, "lng": 55.4209, "city": "Dubai"},
    "dubai academic city": {"name": "Academic City", "lat": 25.1256, "lng": 55.4209, "city": "Dubai"},
    "silicon oasis": {"name": "Dubai Silicon Oasis", "lat": 25.1250, "lng": 55.3800, "city": "Dubai"},
    "dso": {"name": "Dubai Silicon Oasis", "lat": 25.1250, "lng": 55.3800, "city": "Dubai"},
    "sharjah": {"name": "Sharjah", "lat": 25.3463, "lng": 55.4209, "city": "Sharjah"},
    "shj": {"name": "Sharjah", "lat": 25.3463, "lng": 55.4209, "city": "Sharjah"},
    "sharjah city": {"name": "Sharjah", "lat": 25.3463, "lng": 55.4209, "city": "Sharjah"},
    "sharjah city centre": {"name": "Sharjah City Centre", "lat": 25.3315, "lng": 55.3955, "city": "Sharjah"},
    "university city sharjah": {"name": "University City Sharjah", "lat": 25.2867, "lng": 55.4636, "city": "Sharjah"},
    "sharjah airport": {"name": "Sharjah International Airport", "lat": 25.3286, "lng": 55.5172, "city": "Sharjah"},
}

def _final_clean(value):
    return (value or "").strip().lower().replace("-", " ")

def _final_geocode(value):
    clean = _final_clean(value)

    if clean in _FINAL_UAE_PLACES:
        return dict(_FINAL_UAE_PLACES[clean])

    for key, place in _FINAL_UAE_PLACES.items():
        if clean in key or key in clean:
            return dict(place)

    return {"name": value or "Dubai", "lat": 25.2048, "lng": 55.2708, "city": "Dubai"}

def _final_coord(lat, lng):
    return {
        "lat": round(float(lat), 6),
        "lng": round(float(lng), 6),
        "latitude": round(float(lat), 6),
        "longitude": round(float(lng), 6),
    }

def _final_distance_km(start, end):
    radius = 6371.0
    lat1 = radians(float(start["lat"]))
    lon1 = radians(float(start["lng"]))
    lat2 = radians(float(end["lat"]))
    lon2 = radians(float(end["lng"]))
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    return round(radius * 2 * atan2(sqrt(a), sqrt(1 - a)), 1)

def _final_traffic_label(score):
    if score >= 8:
        return "Heavy"
    if score >= 6:
        return "Moderate"
    if score >= 4:
        return "Light"
    return "Clear"

def _final_traffic_display(score):
    return f"{_final_traffic_label(score)} traffic • {score}/10"

def _final_coordinates(start, end, variant):
    start_lat = float(start["lat"])
    start_lng = float(start["lng"])
    end_lat = float(end["lat"])
    end_lng = float(end["lng"])

    offsets = [
        (0.000, 0.000),
        (-0.020, 0.030),
        (0.030, -0.020),
        (0.018, 0.045),
    ]

    off_lat, off_lng = offsets[variant % len(offsets)]
    coords = []

    for i in range(8):
        ratio = i / 7
        bend = sin(ratio * 3.14159)
        lat = start_lat + ((end_lat - start_lat) * ratio) + (off_lat * bend)
        lng = start_lng + ((end_lng - start_lng) * ratio) + (off_lng * bend)
        coords.append(_final_coord(lat, lng))

    return coords

def _final_bounds(coords):
    lats = [c["lat"] for c in coords]
    lngs = [c["lng"] for c in coords]
    return {
        "north": max(lats),
        "south": min(lats),
        "east": max(lngs),
        "west": min(lngs),
        "center_lat": round((max(lats) + min(lats)) / 2, 6),
        "center_lng": round((max(lngs) + min(lngs)) / 2, 6),
    }

def _final_templates(start, end):
    sharjah_trip = start["city"] == "Sharjah" or end["city"] == "Sharjah"

    if sharjah_trip:
        return [
            ("Route A - Al Ittihad Road", "Al Ittihad Road", 8, 18, 0, 4),
            ("Route B - Sheikh Mohammed Bin Zayed Road", "E311 / SMBZ Road", 6, 22, 0, 6),
            ("Route C - Emirates Road Alternative", "E611 / Emirates Road", 4, 25, 0, 8),
            ("Route D - Airport Tunnel Connector", "Airport Tunnel / D89", 7, 16, 0, 5),
        ]

    return [
        ("Route A - Sheikh Zayed Road", "Sheikh Zayed Road", 7, 18, 4, 5),
        ("Route B - Al Khail Road", "Al Khail Road", 5, 20, 0, 7),
        ("Route C - Business Bay Connector", "Business Bay Connector", 4, 12, 0, 6),
        ("Route D - Jumeirah Coastal Alternative", "Jumeirah Coastal Road", 3, 14, 0, 8),
    ]

def _final_steps(start, end, road, coords, distance_km, estimated_time):
    dist = max(500, int((distance_km * 1000) / 5))
    mins = max(1, int(estimated_time / 5))

    return [
        {
            "instruction": f"Start from {start['name']} and head toward {road}.",
            "distance_m": dist,
            "duration_min": mins,
            "maneuver": "depart",
            "road_name": start["name"],
            "coordinate": coords[0],
            "lat": coords[0]["lat"],
            "lng": coords[0]["lng"],
        },
        {
            "instruction": f"Merge onto {road}.",
            "distance_m": dist,
            "duration_min": mins,
            "maneuver": "merge",
            "road_name": road,
            "coordinate": coords[2],
            "lat": coords[2]["lat"],
            "lng": coords[2]["lng"],
        },
        {
            "instruction": f"Continue on {road}; FlowSync is monitoring traffic pressure.",
            "distance_m": dist,
            "duration_min": mins,
            "maneuver": "straight",
            "road_name": road,
            "coordinate": coords[4],
            "lat": coords[4]["lat"],
            "lng": coords[4]["lng"],
        },
        {
            "instruction": f"Take the connector toward {end['name']}.",
            "distance_m": dist,
            "duration_min": mins,
            "maneuver": "exit",
            "road_name": road,
            "coordinate": coords[6],
            "lat": coords[6]["lat"],
            "lng": coords[6]["lng"],
        },
        {
            "instruction": f"Arrive at {end['name']}.",
            "distance_m": 400,
            "duration_min": 1,
            "maneuver": "arrive",
            "road_name": end["name"],
            "coordinate": coords[-1],
            "lat": coords[-1]["lat"],
            "lng": coords[-1]["lng"],
        },
    ]

def _final_route(start, end, template, index, base_distance):
    route_name, road, traffic_score, capacity, toll, eco = template

    multipliers = [1.00, 1.08, 1.18, 1.13]
    speed = [58, 66, 72, 62][index % 4]

    distance_km = round(max(base_distance * multipliers[index % 4], 2.0), 1)
    estimated_time = max(6, int((distance_km / speed) * 60 + traffic_score * 1.8))
    coords = _final_coordinates(start, end, index)
    steps = _final_steps(start, end, road, coords, distance_km, estimated_time)

    traffic_label = _final_traffic_label(traffic_score)
    traffic_display = _final_traffic_display(traffic_score)

    alerts = [
        {
            "type": "congestion" if traffic_score >= 8 else "traffic_update",
            "title": traffic_display,
            "message": f"{road} is currently showing {traffic_display}.",
            "severity": "high" if traffic_score >= 8 else "medium" if traffic_score >= 6 else "low",
        }
    ]

    incidents = []
    if traffic_score >= 8:
        incidents.append(
            {
                "type": "slowdown",
                "message": f"Slow movement detected on {road}.",
                "impact": "medium",
            }
        )

    return {
        "route_name": route_name,
        "name": route_name,
        "start_location": start["name"],
        "destination": end["name"],
        "start_coordinate": _final_coord(start["lat"], start["lng"]),
        "destination_coordinate": _final_coord(end["lat"], end["lng"]),
        "estimated_time": estimated_time,
        "duration_min": estimated_time,
        "duration_text": f"{estimated_time} min",
        "distance_km": distance_km,
        "distance_text": f"{distance_km} km",
        "congestion_score": traffic_score,
        "traffic_score": traffic_score,
        "traffic_label": traffic_label,
        "traffic_status": traffic_label.lower(),
        "traffic_display": traffic_display,
        "traffic_description": traffic_display,
        "road_capacity": capacity,
        "route_type": "in_app_navigation_route",
        "residential_impact": [1, 2, 3, 2][index % 4],
        "accident_risk": [4, 3, 2, 3][index % 4],
        "weather_risk": 2,
        "stop_frequency": [6, 4, 3, 5][index % 4],
        "fuel_estimate_liters": round(distance_km * 0.095, 2),
        "toll_cost": toll,
        "eco_score": eco,
        "provider": "flowsync_simulated",
        "provider_status": "in_app_navigation_ready_simulated_traffic",
        "coordinates": coords,
        "route_coordinates": coords,
        "polyline": coords,
        "turn_steps": steps,
        "turn_by_turn_steps": steps,
        "steps": steps,
        "alerts": alerts,
        "incidents": incidents,
        "map_bounds": _final_bounds(coords),
        "in_app_navigation": True,
        "external_navigation_required": False,
        "navigation_mode": "in_app_map",
        "external_navigation_url": None,
        "message": "Route is ready for in-app map rendering and mobile navigation.",
    }

def get_mock_route_options(start_location: str, destination: str):
    start = _final_geocode(start_location)
    end = _final_geocode(destination)
    base_distance = _final_distance_km(start, end)

    return [
        _final_route(start, end, template, index, base_distance)
        for index, template in enumerate(_final_templates(start, end))
    ]

def get_provider_route_options(start_location: str, destination: str):
    routes = get_mock_route_options(start_location, destination)

    return {
        "provider": "flowsync_simulated",
        "provider_status": "in_app_navigation_ready_simulated_traffic",
        "routes": routes,
    }

def get_route_catalog():
    return get_mock_route_options("Dubai Mall", "Dubai Marina")
