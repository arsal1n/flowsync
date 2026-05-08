from contextlib import asynccontextmanager
from typing import Any, Dict

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from config import get_cors_origins
from security import role_access_middleware
from pydantic import BaseModel

from database import (
    get_dashboard_stats,
    get_driver_alerts,
    get_emergency_vehicles,
    get_events,
    get_latest_reports,
    get_latest_sensor_readings,
    get_recent_trips,
    get_route_loads,
    init_db,
    save_driver_alert,
    save_sensor_reading,
    save_trip_and_route,
)

from demo_engine import (
    get_demo_status,
    reset_demo_data,
    seed_demo_data,
)

from platform_engine import (
    clear_emergency_corridor,
    create_admin_road_action,
    create_crowd_report,
    create_emergency_route,
    create_event_simulation,
    get_accident_risk,
    get_admin_dashboard_payload,
    get_ai_congestion_prediction,
    get_departure_suggestion,
    get_mobile_home,
    get_parking_balance,
    get_parking_prediction,
    get_personalized_profile,
    get_safety_overview,
    get_sustainability_metrics,
    get_weather_risk,
    match_rideshare,
    simulate_digital_twin,
    update_personalized_profile,
)

from route_engine import (
    get_recommended_route,
    simulate_adaptive_distribution,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="FlowSync Smart Mobility Backend API",
    version="1.0.1",
    description=(
        "Full backend platform for adaptive routing, smart city mobility, "
        "emergency routing, parking, IoT, events, sustainability, demo tools, "
        "and frontend navigation support."
    ),
    lifespan=lifespan,
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.middleware("http")(role_access_middleware)

class TripRequest(BaseModel):
    start_location: str
    destination: str
    vehicle_type: str = "car"
    route_preference: str = "balanced"
    user_role: str = "driver"


class RouteSimulationRequest(BaseModel):
    total_drivers: int = 100
    start_location: str = "Concert Venue"
    destination: str = "City Exit Routes"
    route_preference: str = "balanced"


class SensorReadingRequest(BaseModel):
    sensor_type: str = "traffic"
    zone_name: str
    vehicle_count: int = 0
    average_speed: float = 0
    congestion_level: float = 0
    parking_occupancy: float = 0
    road_capacity_score: float = 0


class DriverAlertRequest(BaseModel):
    alert_type: str
    message: str
    zone_name: str
    severity: str = "medium"


class AdminActionRequest(BaseModel):
    target_area: str
    description: str


class EmergencyRouteRequest(BaseModel):
    start_location: str
    destination: str
    emergency_type: str = "ambulance"


class EmergencyCorridorRequest(BaseModel):
    area: str
    emergency_type: str = "ambulance"


class EventSimulationRequest(BaseModel):
    event_name: str = "Concert Exit Simulation"
    location: str = "Dubai Arena"
    total_drivers: int = 100
    event_time: str = "17:00"


class CrowdReportRequest(BaseModel):
    report_type: str
    location: str
    description: str


class DigitalTwinRequest(BaseModel):
    scenario_type: str = "event_traffic"
    area: str = "Downtown Dubai"
    total_vehicles: int = 500


class RideShareRequest(BaseModel):
    start_location: str
    destination: str
    passengers: int = 1


class UserPreferencesRequest(BaseModel):
    user_id: str = "demo-driver"
    preferences: Dict[str, Any]


FEATURE_CATALOG = [
    "Adaptive Route Distribution",
    "Hyperlocal Smart Routing",
    "AI-Driven Decision Making",
    "Historical Traffic Prediction",
    "IoT Sensor Integration",
    "Smart Mobility Mobile App",
    "Police / Government Control Dashboard",
    "Emergency Priority Routing",
    "Cooperative Driver Alert System",
    "Intelligent Parking Prediction",
    "Smart Parking Flow Balancing",
    "Smart Event Traffic Management",
    "AI Incident Detection",
    "AI Weather-Aware Routing",
    "Green Mobility Optimization",
    "Dynamic Fuel Optimization Engine",
    "Driver Behavior Intelligence",
    "AI Route Fairness Engine",
    "Real-Time Road Capacity Monitoring",
    "AI Accident Probability Prediction",
    "Emergency Crowd Clearing System",
    "AI Convoy Mode",
    "VIP / Critical Personnel Routing",
    "Crowd-Sourced Road Intelligence",
    "Digital Twin City Simulation",
    "Smart School Zone Protection",
    "Smart Construction Zone Management",
    "Urban Stress Index",
    "Smart Ride-Sharing Fusion",
    "Smart Commute Scheduling",
]


@app.get("/", tags=["System"])
def home():
    return {
        "message": "FlowSync smart mobility backend is running",
        "version": "1.0.1",
        "database": "SQLite connected",
        "platform": "Smart-city traffic intelligence system",
        "navigation_support": "enabled",
    }


@app.get("/api/features", tags=["System"])
def features():
    return {
        "total_features": len(FEATURE_CATALOG),
        "features": FEATURE_CATALOG,
        "message": "All 30 FlowSync smart mobility features are represented in the backend platform.",
    }


@app.get("/api/demo/status", tags=["Demo Tools"])
def demo_status():
    return get_demo_status()


@app.post("/api/demo/reset", tags=["Demo Tools"])
def demo_reset():
    return reset_demo_data()


@app.post("/api/demo/seed", tags=["Demo Tools"])
def demo_seed():
    return seed_demo_data()


@app.post("/api/routes/recommend", tags=["Adaptive Routing"])
def recommend_route(trip: TripRequest):
    result = get_recommended_route(
        start_location=trip.start_location,
        destination=trip.destination,
        route_preference=trip.route_preference,
        user_role=trip.user_role,
    )

    saved_record = save_trip_and_route(
        start_location=trip.start_location,
        destination=trip.destination,
        vehicle_type=trip.vehicle_type,
        recommended_route=result["recommended_route"],
        route_preference=trip.route_preference,
        user_role=trip.user_role,
    )

    result["vehicle_type"] = trip.vehicle_type
    result["database_record"] = saved_record

    return result


@app.get("/api/routes/load", tags=["Adaptive Routing"])
def route_loads():
    return {
        "route_loads": get_route_loads(),
        "message": "Live route assignment counts and capacity ratios.",
    }


@app.get("/api/routes/options", tags=["Adaptive Routing"])
def route_options(
    start_location: str = "Dubai Mall",
    destination: str = "Dubai Marina",
    route_preference: str = "balanced",
):
    result = get_recommended_route(
        start_location=start_location,
        destination=destination,
        route_preference=route_preference,
        user_role="driver",
    )

    return {
        "all_routes": result["all_routes"],
        "recommended_route": result["recommended_route"],
    }


@app.get("/api/routes/fairness", tags=["Adaptive Routing"])
def route_fairness():
    return {
        "route_loads": get_route_loads(),
        "fairness_rule": "FlowSync avoids overloading the same residential or hyperlocal roads repeatedly.",
        "message": "Route fairness engine active.",
    }


@app.post("/api/routes/simulate", tags=["Adaptive Routing"])
def simulate_routes(request: RouteSimulationRequest):
    return simulate_adaptive_distribution(
        total_drivers=request.total_drivers,
        start_location=request.start_location,
        destination=request.destination,
        route_preference=request.route_preference,
    )


@app.get("/api/routes/{route_mode}", tags=["Adaptive Routing"])
def route_by_mode(
    route_mode: str,
    start_location: str = "Dubai Mall",
    destination: str = "Dubai Marina",
):
    allowed_modes = ["fastest", "balanced", "eco", "cheapest", "low_stress"]

    if route_mode not in allowed_modes:
        raise HTTPException(
            status_code=400,
            detail=f"route_mode must be one of: {allowed_modes}",
        )

    return get_recommended_route(
        start_location=start_location,
        destination=destination,
        route_preference=route_mode,
        user_role="driver",
    )


@app.get("/api/dashboard", tags=["Dashboard"])
def dashboard():
    return get_dashboard_stats()


@app.get("/api/trips", tags=["Dashboard"])
def trips():
    return {
        "recent_trips": get_recent_trips(),
    }


@app.get("/api/mobile/home", tags=["Mobile App"])
def mobile_home(user_id: str = "demo-driver"):
    return get_mobile_home(user_id)


@app.get("/api/alerts/driver", tags=["Mobile App"])
def driver_alerts():
    return {
        "driver_alerts": get_driver_alerts(),
    }


@app.post("/api/alerts/create", tags=["Mobile App"])
def create_alert(alert: DriverAlertRequest):
    record = save_driver_alert(
        alert_type=alert.alert_type,
        message=alert.message,
        zone_name=alert.zone_name,
        severity=alert.severity,
    )

    return {
        **record,
        "alert": alert,
    }


@app.get("/api/ai/congestion-prediction", tags=["AI Prediction"])
def congestion_prediction(
    start_location: str = "Dubai",
    destination: str = "Sharjah",
    time_of_day: str = "17:00",
):
    return get_ai_congestion_prediction(
        start_location=start_location,
        destination=destination,
        time_of_day=time_of_day,
    )


@app.get("/api/ai/departure-suggestion", tags=["AI Prediction"])
def departure_suggestion(route_name: str = "Dubai to Sharjah"):
    return get_departure_suggestion(route_name)


@app.get("/api/ai/weather-risk", tags=["AI Prediction"])
def weather_risk(area: str = "Dubai"):
    return get_weather_risk(area)


@app.get("/api/ai/accident-risk", tags=["AI Prediction"])
def accident_risk(area: str = "Dubai"):
    return get_accident_risk(area)


@app.post("/api/sensors/traffic", tags=["IoT Sensors"])
def add_traffic_sensor_reading(reading: SensorReadingRequest):
    record = save_sensor_reading(
        sensor_type="traffic",
        zone_name=reading.zone_name,
        vehicle_count=reading.vehicle_count,
        average_speed=reading.average_speed,
        congestion_level=reading.congestion_level,
        parking_occupancy=reading.parking_occupancy,
        road_capacity_score=reading.road_capacity_score,
    )

    return {
        **record,
        "message": "Traffic sensor reading saved.",
    }


@app.post("/api/sensors/parking", tags=["IoT Sensors"])
def add_parking_sensor_reading(reading: SensorReadingRequest):
    record = save_sensor_reading(
        sensor_type="parking",
        zone_name=reading.zone_name,
        vehicle_count=reading.vehicle_count,
        average_speed=reading.average_speed,
        congestion_level=reading.congestion_level,
        parking_occupancy=reading.parking_occupancy,
        road_capacity_score=reading.road_capacity_score,
    )

    return {
        **record,
        "message": "Parking sensor reading saved.",
    }


@app.get("/api/sensors/latest", tags=["IoT Sensors"])
def latest_sensors():
    return {
        "latest_sensor_readings": get_latest_sensor_readings(),
    }


@app.get("/api/zones/density", tags=["IoT Sensors"])
def zone_density():
    return {
        "zone_density": get_latest_sensor_readings(),
        "message": "Zone density is estimated from latest IoT traffic sensor readings.",
    }


@app.get("/api/parking/predict", tags=["Parking"])
def parking_predict(destination: str = "Dubai Mall"):
    return get_parking_prediction(destination)


@app.get("/api/parking/zones", tags=["Parking"])
def parking_zones():
    return get_parking_balance()


@app.get("/api/parking/balance", tags=["Parking"])
def parking_balance():
    return get_parking_balance()


@app.get("/api/admin/dashboard", tags=["Admin Control Room"])
def admin_dashboard():
    return get_admin_dashboard_payload()


@app.post("/api/admin/road-closure", tags=["Admin Control Room"])
def admin_road_closure(action: AdminActionRequest):
    return create_admin_road_action(
        action_type="road_closure",
        target_area=action.target_area,
        description=action.description,
    )


@app.post("/api/admin/reroute-zone", tags=["Admin Control Room"])
def admin_reroute_zone(action: AdminActionRequest):
    return create_admin_road_action(
        action_type="reroute_zone",
        target_area=action.target_area,
        description=action.description,
    )


@app.post("/api/admin/no-entry-zone", tags=["Admin Control Room"])
def admin_no_entry_zone(action: AdminActionRequest):
    return create_admin_road_action(
        action_type="no_entry_zone",
        target_area=action.target_area,
        description=action.description,
    )


@app.get("/api/admin/urban-stress", tags=["Admin Control Room"])
def urban_stress():
    return {
        "urban_stress_index": {
            "city_score": 62,
            "level": "moderate",
            "main_causes": [
                "congestion",
                "stop_frequency",
                "commute_delay",
                "route_overload",
            ],
        }
    }


@app.post("/api/emergency/route", tags=["Emergency Routing"])
def emergency_route(request: EmergencyRouteRequest):
    return create_emergency_route(
        start_location=request.start_location,
        destination=request.destination,
        emergency_type=request.emergency_type,
    )


@app.get("/api/emergency/vehicles", tags=["Emergency Routing"])
def emergency_vehicles():
    return {
        "emergency_vehicles": get_emergency_vehicles(),
    }


@app.post("/api/emergency/clear-corridor", tags=["Emergency Routing"])
def emergency_corridor(request: EmergencyCorridorRequest):
    return clear_emergency_corridor(
        area=request.area,
        emergency_type=request.emergency_type,
    )


@app.post("/api/emergency/convoy", tags=["Emergency Routing"])
def emergency_convoy(request: EmergencyRouteRequest):
    result = create_emergency_route(
        start_location=request.start_location,
        destination=request.destination,
        emergency_type=request.emergency_type,
    )

    result["convoy_mode"] = {
        "status": "active",
        "synchronization": "enabled",
        "separation_prevention": "enabled",
    }

    return result


@app.post("/api/priority/vip-route", tags=["Emergency Routing"])
def vip_route(request: EmergencyRouteRequest):
    return create_emergency_route(
        start_location=request.start_location,
        destination=request.destination,
        emergency_type="vip",
    )


@app.post("/api/events/simulate", tags=["Events"])
def event_simulation(request: EventSimulationRequest):
    return create_event_simulation(
        event_name=request.event_name,
        location=request.location,
        total_drivers=request.total_drivers,
        event_time=request.event_time,
    )


@app.get("/api/events/list", tags=["Events"])
def events_list():
    return {
        "events": get_events(),
    }


@app.get("/api/safety/overview", tags=["Safety"])
def safety_overview():
    return get_safety_overview()


@app.get("/api/safety/accident-risk", tags=["Safety"])
def safety_accident_risk(area: str = "Dubai"):
    return get_accident_risk(area)


@app.get("/api/sustainability/metrics", tags=["Sustainability"])
def sustainability_metrics():
    return get_sustainability_metrics()


@app.get("/api/sustainability/eco-route", tags=["Sustainability"])
def eco_route(
    start_location: str = "Dubai Mall",
    destination: str = "Dubai Marina",
):
    return get_recommended_route(
        start_location=start_location,
        destination=destination,
        route_preference="eco",
        user_role="driver",
    )


@app.post("/api/reports/create", tags=["Crowd Reports"])
def create_report(report: CrowdReportRequest):
    return create_crowd_report(
        report_type=report.report_type,
        location=report.location,
        description=report.description,
    )


@app.get("/api/reports/latest", tags=["Crowd Reports"])
def latest_reports():
    return {
        "latest_reports": get_latest_reports(),
    }


@app.post("/api/digital-twin/simulate", tags=["Digital Twin"])
def digital_twin_simulation(request: DigitalTwinRequest):
    return simulate_digital_twin(
        scenario_type=request.scenario_type,
        area=request.area,
        total_vehicles=request.total_vehicles,
    )


@app.post("/api/rideshare/match", tags=["Ride Sharing"])
def rideshare_match(request: RideShareRequest):
    return match_rideshare(
        start_location=request.start_location,
        destination=request.destination,
        passengers=request.passengers,
    )


@app.get("/api/users/preferences", tags=["User Personalization"])
def user_preferences(user_id: str = "demo-driver"):
    return get_personalized_profile(user_id)


@app.post("/api/users/preferences", tags=["User Personalization"])
def update_user_preferences(request: UserPreferencesRequest):
    return update_personalized_profile(
        user_id=request.user_id,
        preferences=request.preferences,
    )


from navigation_routes import register_navigation_routes

register_navigation_routes(app)

from trip_lifecycle_routes import register_trip_lifecycle_routes

register_trip_lifecycle_routes(app)

from auth_routes import register_auth_routes

register_auth_routes(app)

from live_update_routes import register_live_update_routes

register_live_update_routes(app)

from background_job_routes import register_background_job_routes

register_background_job_routes(app)

from deployment_routes import register_deployment_routes

register_deployment_routes(app)

from database_routes import register_database_routes

register_database_routes(app)