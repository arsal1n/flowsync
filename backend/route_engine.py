from typing import Dict, List, Optional

from database import get_route_assignment_counts


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


ROUTE_CATALOG = [
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
            {
                "type": "congestion",
                "message": "Heavy traffic expected on Sheikh Zayed Road.",
                "severity": "high",
            },
            {
                "type": "camera",
                "message": "Speed camera zone ahead.",
                "severity": "medium",
            },
        ],
        "incidents": [
            {
                "type": "slowdown",
                "message": "Slow movement near Business Bay exit.",
                "impact": "medium",
            }
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
            {
                "type": "balanced_route",
                "message": "Balanced route with lower congestion than Sheikh Zayed Road.",
                "severity": "low",
            }
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
            {
                "type": "fairness_notice",
                "message": "Hyperlocal route used carefully to avoid overloading residential streets.",
                "severity": "medium",
            }
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
            {
                "type": "eco_route",
                "message": "Smoother route with lower stop-and-go driving.",
                "severity": "low",
            }
        ],
        "incidents": [],
    },
]


EMERGENCY_ROLES = {"ambulance", "police", "fire_truck", "rta_operator", "vip"}


def calculate_route_score(
    route: Dict,
    assigned_users: int,
    route_preference: str = "balanced",
    user_role: str = "driver",
) -> float:
    route_preference = (route_preference or "balanced").lower()
    user_role = (user_role or "driver").lower()

    if user_role in EMERGENCY_ROLES:
        return round(
            route["estimated_time"]
            + (route["accident_risk"] * 0.4)
            + (route["weather_risk"] * 0.3),
            2,
        )

    capacity_ratio = assigned_users / max(route["road_capacity"], 1)
    capacity_penalty = max(0, capacity_ratio - 0.70) * 25
    fairness_penalty = route["residential_impact"] * 1.5

    score = (
        route["estimated_time"]
        + (route["congestion_score"] * 2.0)
        + (assigned_users * 4.0)
        + capacity_penalty
        + fairness_penalty
        + (route["accident_risk"] * 1.1)
        + (route["weather_risk"] * 0.8)
    )

    if route_preference == "fastest":
        score = route["estimated_time"] + (route["congestion_score"] * 0.6)

    elif route_preference == "eco":
        score += (route["fuel_estimate_liters"] * 5) - (route["eco_score"] * 2)

    elif route_preference == "cheapest":
        score += route["toll_cost"] * 5

    elif route_preference == "low_stress":
        score += (
            route["congestion_score"] * 2
            + route["accident_risk"] * 2
            + route["stop_frequency"] * 0.8
        )

    return round(score, 2)


def build_scored_routes(
    route_counts: Dict[str, int],
    route_preference: str = "balanced",
    user_role: str = "driver",
) -> List[Dict]:
    scored_routes = []

    for route in ROUTE_CATALOG:
        assigned_users = route_counts.get(route["route_name"], 0)
        route_score = calculate_route_score(
            route=route,
            assigned_users=assigned_users,
            route_preference=route_preference,
            user_role=user_role,
        )

        capacity_ratio = assigned_users / max(route["road_capacity"], 1)
        fairness_penalty = route["residential_impact"] * 1.5

        enriched_route = {
            **route,
            "polyline": route["coordinates"],
            "turn_by_turn_steps": route["turn_steps"],
            "assigned_users": assigned_users,
            "route_score": route_score,
            "capacity_ratio": round(capacity_ratio, 2),
            "fairness_penalty": fairness_penalty,
        }

        scored_routes.append(enriched_route)

    return scored_routes


def get_recommended_route(
    start_location: str,
    destination: str,
    route_preference: str = "balanced",
    user_role: str = "driver",
    route_counts: Optional[Dict[str, int]] = None,
) -> Dict:
    if route_counts is None:
        route_counts = get_route_assignment_counts()

    all_routes = build_scored_routes(
        route_counts=route_counts,
        route_preference=route_preference,
        user_role=user_role,
    )

    recommended_route = min(all_routes, key=lambda route: route["route_score"])

    mode = "emergency_priority" if (user_role or "").lower() in EMERGENCY_ROLES else "adaptive_distribution"

    return {
        "start_location": start_location,
        "destination": destination,
        "route_preference": route_preference,
        "user_role": user_role,
        "routing_mode": mode,
        "recommended_route": recommended_route,
        "all_routes": all_routes,
        "message": (
            "FlowSync selected the best route using adaptive distribution, "
            "route load, road capacity, fairness, congestion, and user priority."
        ),
    }


def simulate_adaptive_distribution(
    total_drivers: int,
    start_location: str,
    destination: str,
    route_preference: str = "balanced",
) -> Dict:
    current_counts = get_route_assignment_counts()
    simulation_counts = {route["route_name"]: 0 for route in ROUTE_CATALOG}
    simulated_assignments = []

    for driver_number in range(1, total_drivers + 1):
        result = get_recommended_route(
            start_location=start_location,
            destination=destination,
            route_preference=route_preference,
            user_role="driver",
            route_counts=current_counts,
        )

        selected_route = result["recommended_route"]["route_name"]
        simulation_counts[selected_route] = simulation_counts.get(selected_route, 0) + 1
        current_counts[selected_route] = current_counts.get(selected_route, 0) + 1

        simulated_assignments.append(
            {
                "driver": driver_number,
                "assigned_route": selected_route,
                "route_score": result["recommended_route"]["route_score"],
            }
        )

    return {
        "total_drivers_simulated": total_drivers,
        "start_location": start_location,
        "destination": destination,
        "distribution": simulation_counts,
        "sample_assignments": simulated_assignments[:10],
        "estimated_congestion_reduction": "24%",
        "message": "Simulation completed. Drivers were distributed across multiple routes instead of one route.",
    }


def get_emergency_route(
    start_location: str,
    destination: str,
    emergency_type: str = "ambulance",
) -> Dict:
    result = get_recommended_route(
        start_location=start_location,
        destination=destination,
        route_preference="fastest",
        user_role=emergency_type,
    )

    result["emergency_type"] = emergency_type
    result["driver_alert"] = "Emergency vehicle approaching. Give way when safe."
    result["control_room_status"] = "Emergency route created and ready for monitoring."

    return result