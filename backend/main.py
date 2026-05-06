from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from route_engine import get_recommended_route
from database import (
    init_db,
    save_trip_and_route,
    get_dashboard_stats,
    get_recent_trips
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="FlowSync Backend API",
    version="0.2.0",
    lifespan=lifespan
)

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
        "message": "FlowSync backend is running",
        "version": "0.2.0",
        "database": "SQLite connected"
    }


@app.post("/api/routes/recommend")
def recommend_route(trip: TripRequest):
    result = get_recommended_route(
        trip.start_location,
        trip.destination
    )

    result["vehicle_type"] = trip.vehicle_type

    saved_record = save_trip_and_route(
        trip.start_location,
        trip.destination,
        trip.vehicle_type,
        result["recommended_route"]
    )

    result["database_record"] = saved_record

    return result


@app.get("/api/dashboard")
def dashboard():
    return get_dashboard_stats()


@app.get("/api/trips")
def trips():
    return {
        "recent_trips": get_recent_trips()
    }