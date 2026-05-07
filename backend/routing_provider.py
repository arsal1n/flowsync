from copy import deepcopy
from typing import Dict, List

from config import get_routing_provider_name, is_mock_fallback_enabled


def step(instruction, distance_m, duration_min, maneuver, road_name, lat, lng):
    return {
        "instruction": instruction,
        "distance_m": distance_m,
        "duration_min": duration_min,
        "maneuver": maneuver,
        "road_name": road_name,
        "lat": lat,
        "lng": lng,
    }


MOCK_ROUTE_CATALOG = [
    {
        "route_name": "Route A - Sheikh Zayed Road",
        "estimated_time": 22,
        "distance_km": 14.5,
        "congestion_score": 8,
        "road_capacity": 18,
        "route_type": "main_road",
        "residential_impact": 1,
        "accident_risk": 4,
        "weather_risk": 2,
        "stop_frequency": 7,
        "fuel_estimate_liters": 1.8,
        "toll_cost": 4,
        "eco_score": 5,
        "provider": "mock",
        "coordinates": [
            {"lat": 25.1972, "lng": 55.2744},
            {"lat": 25.1915, "lng": 55.2620},
            {"lat": 25.1667, "lng": 55.2405},
            {"lat": 25.1212, "lng": 55.2017},
            {"lat": 25.0800, "lng": 55.1400},
        ],
        "turn_steps": [
            step("Start from Dubai Mall and head toward Financial Centre Road.", 900, 3, "depart", "Financial Centre Road", 25.1972, 55.2744),
            step("Merge onto Sheikh Zayed Road southbound.", 5200, 7, "merge", "Sheikh Zayed Road", 25.1915, 55.2620),
            step("Continue straight past Business Bay and Al Safa.", 5200, 7, "straight", "Sheikh Zayed Road", 25.1667, 55.2405),
            step("Take the Dubai Marina exit.", 2300, 4, "exit", "Dubai Marina Exit", 25.1212, 55.2017),
            step("Arrive near Dubai Marina.", 900, 1, "arrive", "Dubai Marina", 25.0800, 55.1400),
        ],
        "alerts": [
            {"type": "congestion", "message": "Heavy traffic expected on Sheikh Zayed Road.", "severity": "high"},
            {"type": "camera", "message": "Speed camera zone ahead.", "severity": "medium"},
        ],
        "incidents": [
            {"type": "slowdown", "message": "Slow movement near Business Bay exit.", "impact": "medium"}
        ],
    },
    {
        "route_name": "Route B - Al Khail Road",
        "estimated_time": 26,
        "distance_km": 16.2,
        "congestion_score": 4,
        "road_capacity": 15,
        "route_type": "arterial_road",
        "residential_impact": 2,
        "accident_risk": 3,
        "weather_risk": 2,
        "stop_frequency": 5,
        "fuel_estimate_liters": 1.6,
        "toll_cost": 0,
        "eco_score": 7,
        "provider": "mock",
        "coordinates": [
            {"lat": 25.1972, "lng": 55.2744},
            {"lat": 25.1850, "lng": 55.2910},
            {"lat": 25.1560, "lng": 55.2850},
            {"lat": 25.1155, "lng": 55.2350},
            {"lat": 25.0800, "lng": 55.1400},
        ],
        "turn_steps": [
            step("Start from Dubai Mall and head toward Business Bay crossing.", 1200, 4, "depart", "Downtown Boulevard", 25.1972, 55.2744),
            step("Turn toward Al Khail Road access.", 2500, 5, "turn_right", "Business Bay Crossing", 25.1850, 55.2910),
            step("Continue on Al Khail Road.", 6500, 9, "straight", "Al Khail Road", 25.1560, 55.2850),
            step("Take the exit toward Dubai Marina/JLT.", 4300, 6, "exit", "JLT Exit", 25.1155, 55.2350),
            step("Arrive near Dubai Marina.", 1700, 2, "arrive", "Dubai Marina", 25.0800, 55.1400),
        ],
        "alerts": [
            {"type": "balanced_route", "message": "Balanced route with lower congestion than Sheikh Zayed Road.", "severity": "low"}
        ],
        "incidents": [],
    },
    {
        "route_name": "Route C - Business Bay Side Streets",
        "estimated_time": 30,
        "distance_km": 18.1,
        "congestion_score": 2,
        "road_capacity": 10,
        "route_type": "hyperlocal_route",
        "residential_impact": 5,
        "accident_risk": 2,
        "weather_risk": 3,
        "stop_frequency": 9,
        "fuel_estimate_liters": 1.7,
        "toll_cost": 0,
        "eco_score": 6,
        "provider": "mock",
        "coordinates": [
            {"lat": 25.1972, "lng": 55.2744},
            {"lat": 25.1900, "lng": 55.2808},
            {"lat": 25.1788, "lng": 55.2690},
            {"lat": 25.1400, "lng": 55.2222},
            {"lat": 25.0800, "lng": 55.1400},
        ],
        "turn_steps": [
            step("Start from Dubai Mall and enter Downtown side road.", 800, 3, "depart", "Downtown Side Road", 25.1972, 55.2744),
            step("Turn through Business Bay local connector.", 3400, 8, "turn_left", "Business Bay Connector", 25.1900, 55.2808),
            step("Continue through lower-density side streets.", 5200, 9, "straight", "Local Side Streets", 25.1788, 55.2690),
            step("Join the Marina approach road.", 6900, 8, "merge", "Marina Approach Road", 25.1400, 55.2222),
            step("Arrive near Dubai Marina.", 1800, 2, "arrive", "Dubai Marina", 25.0800, 55.1400),
        ],
        "alerts": [
            {"type": "fairness_notice", "message": "Hyperlocal route used carefully to avoid overloading residential streets.", "severity": "medium"}
        ],
        "incidents": [],
    },
    {
        "route_name": "Route D - Jumeirah Coastal Alternative",
        "estimated_time": 28,
        "distance_km": 17.4,
        "congestion_score": 3,
        "road_capacity": 12,
        "route_type": "alternative_road",
        "residential_impact": 3,
        "accident_risk": 2,
        "weather_risk": 4,
        "stop_frequency": 6,
        "fuel_estimate_liters": 1.5,
        "toll_cost": 0,
        "eco_score": 8,
        "provider": "mock",
        "coordinates": [
            {"lat": 25.1972, "lng": 55.2744},
            {"lat": 25.2048, "lng": 55.2500},
            {"lat": 25.1900, "lng": 55.2250},
            {"lat": 25.1350, "lng": 55.1850},
            {"lat": 25.0800, "lng": 55.1400},
        ],
        "turn_steps": [
            step("Start from Dubai Mall and move toward Jumeirah corridor.", 1600, 5, "depart", "Downtown Exit Road", 25.1972, 55.2744),
            step("Continue toward Jumeirah coastal alternative.", 4200, 7, "straight", "Jumeirah Road", 25.2048, 55.2500),
            step("Follow coastal connector with smoother traffic.", 5400, 8, "straight", "Coastal Connector", 25.1900, 55.2250),
            step("Merge toward Dubai Marina approach.", 4800, 6, "merge", "Marina Approach", 25.1350, 55.1850),
            step("Arrive near Dubai Marina.", 1400, 2, "arrive", "Dubai Marina", 25.0800, 55.1400),
        ],
        "alerts": [
            {"type": "eco_route", "message": "Smoother route with lower stop-and-go driving.", "severity": "low"}
        ],
        "incidents": [],
    },
]


def get_mock_route_options(start_location: str, destination: str) -> List[Dict]:
    routes = deepcopy(MOCK_ROUTE_CATALOG)

    for route in routes:
        route["start_location"] = start_location
        route["destination"] = destination
        route["provider"] = "mock"
        route["provider_status"] = "mock_fallback"
        route["polyline"] = route["coordinates"]
        route["turn_by_turn_steps"] = route["turn_steps"]

    return routes


def get_provider_route_options(start_location: str, destination: str) -> Dict:
    provider = get_routing_provider_name()

    if provider == "mock":
        return {
            "provider": "mock",
            "provider_status": "mock_fallback",
            "routes": get_mock_route_options(start_location, destination),
        }

    if is_mock_fallback_enabled():
        routes = get_mock_route_options(start_location, destination)

        for route in routes:
            route["provider"] = provider
            route["provider_status"] = "mock_fallback_until_real_api_configured"

        return {
            "provider": provider,
            "provider_status": "mock_fallback_until_real_api_configured",
            "routes": routes,
        }

    return {
        "provider": provider,
        "provider_status": "not_configured",
        "routes": [],
        "error": "Routing provider is selected but no real API integration is configured yet.",
    }


def get_route_catalog() -> List[Dict]:
    return get_mock_route_options(
        start_location="Dubai Mall",
        destination="Dubai Marina",
    )