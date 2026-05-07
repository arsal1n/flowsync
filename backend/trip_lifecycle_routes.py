from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from api_utils import (
    clean_text,
    validate_positive_integer,
)
from trip_lifecycle import (
    cancel_trip,
    get_recent_lifecycle_trips,
    get_trip_detail,
    get_trip_lifecycle,
    get_trip_lifecycle_dashboard,
    get_trip_summary,
    init_trip_lifecycle,
)


class CancelTripRequest(BaseModel):
    reason: str = "Cancelled by user."


def register_trip_lifecycle_routes(app: FastAPI):
    @app.get("/api/trips/lifecycle/dashboard", tags=["Trip Lifecycle"])
    def trip_lifecycle_dashboard():
        return get_trip_lifecycle_dashboard()

    @app.get("/api/trips/lifecycle/recent", tags=["Trip Lifecycle"])
    def recent_lifecycle_trips(limit: int = 10):
        clean_limit = validate_positive_integer(limit, "limit")
        clean_limit = min(clean_limit, 100)

        return get_recent_lifecycle_trips(clean_limit)

    @app.get("/api/trips/{request_id}", tags=["Trip Lifecycle"])
    def trip_detail(request_id: int):
        clean_request_id = validate_positive_integer(request_id, "request_id")
        result = get_trip_detail(clean_request_id)

        if not result["found"]:
            raise HTTPException(status_code=404, detail=result["message"])

        return result

    @app.get("/api/trips/{request_id}/lifecycle", tags=["Trip Lifecycle"])
    def trip_lifecycle(request_id: int):
        clean_request_id = validate_positive_integer(request_id, "request_id")
        result = get_trip_lifecycle(clean_request_id)

        if not result["found"]:
            raise HTTPException(status_code=404, detail=result["message"])

        return result

    @app.get("/api/trips/{request_id}/summary", tags=["Trip Lifecycle"])
    def trip_summary(request_id: int):
        clean_request_id = validate_positive_integer(request_id, "request_id")
        result = get_trip_summary(clean_request_id)

        if not result["found"]:
            raise HTTPException(status_code=404, detail=result["message"])

        return result

    @app.post("/api/trips/{request_id}/cancel", tags=["Trip Lifecycle"])
    def trip_cancel(request_id: int, request: CancelTripRequest):
        clean_request_id = validate_positive_integer(request_id, "request_id")
        reason = clean_text(
            request.reason,
            "reason",
            max_length=300,
        )

        result = cancel_trip(
            request_id=clean_request_id,
            reason=reason,
        )

        if not result["found"]:
            raise HTTPException(status_code=404, detail=result["message"])

        return result

    init_trip_lifecycle()