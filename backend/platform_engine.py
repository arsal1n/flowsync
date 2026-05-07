from typing import Any, Dict

from database import (
    get_dashboard_stats,
    get_driver_alerts,
    get_events,
    get_latest_incidents,
    get_latest_reports,
    get_latest_sensor_readings,
    get_parking_zones,
    get_route_loads,
    save_admin_action,
    save_driver_alert,
    save_event,
    save_user_report,
)
from route_engine import (
    get_emergency_route,
    simulate_adaptive_distribution,
)


def get_mobile_home(user_id: str = "demo-driver") -> Dict[str, Any]:
    return {
        "user_id": user_id,
        "app_mode": "driver",
        "features": [
            "dynamic_route_guidance",
            "live_traffic_alerts",
            "parking_predictions",
            "emergency_vehicle_alerts",
            "eco_route_option",
            "low_stress_route_option"
        ],
        "quick_actions": [
            "Find FlowSync Route",
            "Check Parking",
            "Report Road Issue",
            "View Alerts"
        ]
    }


def get_ai_congestion_prediction(
    start_location: str,
    destination: str,
    time_of_day: str = "17:00"
) -> Dict[str, Any]:
    rush_hour = time_of_day.startswith("17") or time_of_day.startswith("18")
    risk_score = 82 if rush_hour else 46

    return {
        "start_location": start_location,
        "destination": destination,
        "time_of_day": time_of_day,
        "predicted_congestion_risk": risk_score,
        "prediction_level": "high" if risk_score >= 70 else "medium",
        "reason": "Historical rush-hour pattern detected." if rush_hour else "Normal traffic pattern expected.",
        "recommended_action": "Start distributing vehicles across alternate routes before congestion builds."
    }


def get_departure_suggestion(route_name: str = "Dubai to Sharjah") -> Dict[str, Any]:
    return {
        "route_name": route_name,
        "best_departure_window": "Leave 12 minutes later",
        "estimated_travel_time_reduction": "18%",
        "reason": "Predicted congestion peak reduces after the current departure window."
    }


def get_weather_risk(area: str = "Dubai") -> Dict[str, Any]:
    return {
        "area": area,
        "weather_risk_level": "low",
        "active_weather_factors": [],
        "routing_action": "No weather rerouting needed."
    }


def get_accident_risk(area: str = "Dubai") -> Dict[str, Any]:
    return {
        "area": area,
        "accident_probability_score": 31,
        "risk_level": "medium",
        "driver_warning": "Maintain safe distance near high-density merging areas."
    }


def get_parking_prediction(destination: str) -> Dict[str, Any]:
    zones = get_parking_zones()
    predictions = []

    for zone in zones:
        occupancy_rate = zone["occupied_spaces"] / max(zone["total_spaces"], 1)
        availability_probability = round((1 - occupancy_rate) * 100, 2)

        predictions.append({
            "zone_name": zone["zone_name"],
            "availability_probability": availability_probability,
            "estimated_wait_time_minutes": round(occupancy_rate * 12, 1),
            "walking_distance_m": zone["walking_distance_m"],
            "safety_score": zone["safety_score"],
            "difficulty_score": round(occupancy_rate * 10, 1)
        })

    best_zone = max(predictions, key=lambda zone: zone["availability_probability"]) if predictions else None

    return {
        "destination": destination,
        "best_parking_zone": best_zone,
        "parking_predictions": predictions,
        "message": "FlowSync predicts parking availability and can redirect drivers if a zone fills up."
    }


def get_parking_balance() -> Dict[str, Any]:
    zones = get_parking_zones()

    return {
        "strategy": "smart_parking_flow_balancing",
        "parking_zones": zones,
        "message": "Drivers should be distributed across parking zones to reduce circling traffic."
    }


def get_admin_dashboard_payload() -> Dict[str, Any]:
    return {
        "dashboard_type": "smart_city_control_room",
        "stats": get_dashboard_stats(),
        "route_loads": get_route_loads(),
        "latest_sensors": get_latest_sensor_readings(),
        "latest_incidents": get_latest_incidents(),
        "latest_reports": get_latest_reports(),
        "urban_stress_index": {
            "city_score": 62,
            "level": "moderate",
            "main_causes": ["congestion", "stop_frequency", "commute_delay"]
        },
        "control_actions_available": [
            "road_closure",
            "reroute_zone",
            "no_entry_zone",
            "emergency_priority"
        ]
    }


def create_admin_road_action(action_type: str, target_area: str, description: str) -> Dict[str, Any]:
    record = save_admin_action(action_type, target_area, description)

    return {
        **record,
        "action_type": action_type,
        "target_area": target_area,
        "description": description,
        "status": "admin_action_logged"
    }


def create_emergency_route(
    start_location: str,
    destination: str,
    emergency_type: str
) -> Dict[str, Any]:
    result = get_emergency_route(start_location, destination, emergency_type)

    save_driver_alert(
        alert_type="emergency_vehicle",
        message=f"{emergency_type.title()} approaching. Give way if you are on the emergency path.",
        zone_name=start_location,
        severity="high"
    )

    return {
        **result,
        "emergency_features": [
            "absolute_fastest_route",
            "driver_path_alerts",
            "control_room_tracking",
            "clear_corridor_recommendation"
        ]
    }


def clear_emergency_corridor(area: str, emergency_type: str = "ambulance") -> Dict[str, Any]:
    alert = save_driver_alert(
        alert_type="emergency_corridor",
        message=f"Emergency corridor active in {area}. Follow rerouting instructions.",
        zone_name=area,
        severity="critical"
    )

    return {
        "area": area,
        "emergency_type": emergency_type,
        "corridor_status": "active",
        "alert_record": alert,
        "message": "Normal traffic should be redirected away from the emergency path."
    }


def create_event_simulation(
    event_name: str,
    location: str,
    total_drivers: int,
    event_time: str = "17:00"
) -> Dict[str, Any]:
    event_record = save_event(event_name, location, total_drivers, event_time, "simulation")
    simulation = simulate_adaptive_distribution(
        total_drivers=total_drivers,
        start_location=location,
        destination="Multiple city exit routes",
        route_preference="balanced"
    )

    return {
        "event_record": event_record,
        "event_name": event_name,
        "location": location,
        "event_time": event_time,
        "simulation": simulation
    }


def get_safety_overview() -> Dict[str, Any]:
    return {
        "system": "safety_intelligence",
        "latest_incidents": get_latest_incidents(),
        "school_zones": [
            {
                "zone_name": "Jumeirah School Zone",
                "status": "active during school hours",
                "recommended_speed": "30 km/h"
            }
        ],
        "construction_zones": [
            {
                "zone_name": "Business Bay Roadwork",
                "impact": "medium",
                "suggested_action": "Use alternate route during evening peak."
            }
        ],
        "accident_risk": get_accident_risk("Dubai")
    }


def get_sustainability_metrics() -> Dict[str, Any]:
    stats = get_dashboard_stats()
    total_trips = stats["total_trip_requests"]

    return {
        "green_mobility_status": "active",
        "total_trip_requests": total_trips,
        "estimated_fuel_saved_liters": round(total_trips * 0.18 + 2.4, 2),
        "estimated_co2_saved_kg": round(total_trips * 0.42 + 5.5, 2),
        "idle_time_reduced_minutes": round(total_trips * 3.2 + 12, 2),
        "eco_route_supported": True,
        "available_route_modes": ["fastest", "balanced", "eco", "cheapest", "low_stress"]
    }


def create_crowd_report(report_type: str, location: str, description: str) -> Dict[str, Any]:
    report = save_user_report(report_type, location, description)

    return {
        **report,
        "report_type": report_type,
        "location": location,
        "description": description,
        "ai_validation_method": [
            "multiple_user_confirmations",
            "sensor_consistency_check",
            "traffic_anomaly_detection"
        ]
    }


def simulate_digital_twin(scenario_type: str, area: str, total_vehicles: int) -> Dict[str, Any]:
    return {
        "scenario_type": scenario_type,
        "area": area,
        "total_vehicles": total_vehicles,
        "simulation_status": "completed",
        "predicted_congestion_change": "-21%" if scenario_type != "road_closure" else "+34%",
        "recommended_action": "Redistribute vehicles using adaptive routing and monitor road capacity.",
        "digital_twin_outputs": [
            "route_load_projection",
            "incident_impact_estimate",
            "parking_demand_projection",
            "emergency_access_check"
        ]
    }


def match_rideshare(start_location: str, destination: str, passengers: int = 1) -> Dict[str, Any]:
    return {
        "start_location": start_location,
        "destination": destination,
        "requested_passengers": passengers,
        "match_status": "suggestions_found",
        "suggested_matches": [
            {
                "match_id": "RS-101",
                "pickup_point": "Nearest metro-side pickup zone",
                "destination_similarity": "92%",
                "estimated_vehicle_reduction": 1
            },
            {
                "match_id": "RS-102",
                "pickup_point": "Mall entrance B pickup zone",
                "destination_similarity": "84%",
                "estimated_vehicle_reduction": 1
            }
        ]
    }


def get_personalized_profile(user_id: str = "demo-driver") -> Dict[str, Any]:
    return {
        "user_id": user_id,
        "preferred_route_mode": "balanced",
        "avoid_tolls": False,
        "eco_priority": True,
        "parking_preference": "safe_and_close",
        "driver_profile": "low_stress_traveler"
    }


def update_personalized_profile(user_id: str, preferences: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "user_id": user_id,
        "status": "preferences_updated",
        "preferences": preferences
    }