from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from route_engine import get_recommended_route

app = FastAPI(title="FlowSync Backend API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TripRequest(BaseModel):
    start_location: str
    destination: str
    vehicle_type: str = "car"


@app.get("/")
def home():
    return {
        "message": "FlowSync backend is running"
    }


@app.post("/api/routes/recommend")
def recommend_route(trip: TripRequest):
    result = get_recommended_route(
        trip.start_location,
        trip.destination
    )
    result["vehicle_type"] = trip.vehicle_type
    return result


@app.get("/api/dashboard")
def dashboard():
    return {
        "total_trip_requests": 24,
        "route_a_users": 12,
        "route_b_users": 8,
        "route_c_users": 4,
        "estimated_congestion_reduction": "18%",
        "average_time_saved": "7 minutes",
        "fuel_saved_estimate": "2.4 liters"
    }