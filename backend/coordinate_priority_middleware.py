import json
from typing import Any, Dict

from fastapi import Request


def _has_number(value: Any) -> bool:
    try:
        if value is None or value == "":
            return False
        float(value)
        return True
    except Exception:
        return False


def _coordinate_string(latitude: Any, longitude: Any) -> str:
    return f"{float(latitude):.7f},{float(longitude):.7f}"


def _apply_coordinate_priority(payload: Dict[str, Any]) -> Dict[str, Any]:
    updated = dict(payload)

    start_lat = updated.get("start_latitude")
    start_lng = updated.get("start_longitude")
    dest_lat = updated.get("destination_latitude")
    dest_lng = updated.get("destination_longitude")

    if _has_number(start_lat) and _has_number(start_lng):
        updated["original_start_location"] = updated.get("start_location")
        updated["start_location"] = _coordinate_string(start_lat, start_lng)
        updated["start_coordinates_source"] = "request_coordinates"

    if _has_number(dest_lat) and _has_number(dest_lng):
        updated["original_destination"] = updated.get("destination")
        updated["destination"] = _coordinate_string(dest_lat, dest_lng)
        updated["destination_coordinates_source"] = "request_coordinates"

    return updated


def register_coordinate_priority_middleware(app):
    @app.middleware("http")
    async def coordinate_priority_middleware(request: Request, call_next):
        method = request.method.upper()
        path = request.url.path

        if method != "POST" or path != "/api/routes/recommend":
            return await call_next(request)

        body_bytes = await request.body()

        try:
            payload = json.loads(body_bytes.decode("utf-8")) if body_bytes else {}

            if isinstance(payload, dict):
                payload = _apply_coordinate_priority(payload)
                body_bytes = json.dumps(payload).encode("utf-8")

        except Exception:
            pass

        async def receive():
            return {
                "type": "http.request",
                "body": body_bytes,
                "more_body": False,
            }

        request._receive = receive

        return await call_next(request)
