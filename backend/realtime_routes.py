from fastapi import FastAPI
from fastapi.responses import StreamingResponse

from api_utils import validate_session_id
from realtime_streaming import (
    create_sse_stream,
    get_realtime_stream_status,
    get_stream_payload_builder,
)


def clamp_int(value: int, minimum: int, maximum: int, default: int) -> int:
    try:
        clean_value = int(value)
    except Exception:
        return default

    if clean_value < minimum:
        return minimum

    if clean_value > maximum:
        return maximum

    return clean_value


def stream_response(
    stream_name: str,
    event_name: str,
    interval_seconds: int = 5,
    max_events: int = 10,
    session_id: str | None = None,
):
    clean_interval = clamp_int(interval_seconds, 1, 30, 5)
    clean_max_events = clamp_int(max_events, 0, 100, 10)

    payload_builder = get_stream_payload_builder(
        stream_name=stream_name,
        session_id=session_id,
    )

    return StreamingResponse(
        create_sse_stream(
            event_name=event_name,
            payload_builder=payload_builder,
            interval_seconds=clean_interval,
            max_events=clean_max_events,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


def register_realtime_stream_routes(app: FastAPI):
    @app.get("/api/stream/status", tags=["Realtime Streaming"])
    def realtime_stream_status():
        return get_realtime_stream_status()

    @app.get("/api/stream/system", tags=["Realtime Streaming"])
    def stream_system(interval_seconds: int = 5, max_events: int = 10):
        return stream_response(
            stream_name="system",
            event_name="system",
            interval_seconds=interval_seconds,
            max_events=max_events,
        )

    @app.get("/api/stream/dashboard", tags=["Realtime Streaming"])
    def stream_dashboard(interval_seconds: int = 5, max_events: int = 10):
        return stream_response(
            stream_name="dashboard",
            event_name="dashboard",
            interval_seconds=interval_seconds,
            max_events=max_events,
        )

    @app.get("/api/stream/navigation", tags=["Realtime Streaming"])
    def stream_navigation(interval_seconds: int = 3, max_events: int = 10):
        return stream_response(
            stream_name="navigation",
            event_name="navigation",
            interval_seconds=interval_seconds,
            max_events=max_events,
        )

    @app.get("/api/stream/navigation/{session_id}", tags=["Realtime Streaming"])
    def stream_navigation_session(
        session_id: str,
        interval_seconds: int = 3,
        max_events: int = 10,
    ):
        clean_session_id = validate_session_id(session_id)

        return stream_response(
            stream_name="navigation_session",
            event_name="navigation_session",
            interval_seconds=interval_seconds,
            max_events=max_events,
            session_id=clean_session_id,
        )

    @app.get("/api/stream/admin", tags=["Realtime Streaming"])
    def stream_admin(interval_seconds: int = 5, max_events: int = 10):
        return stream_response(
            stream_name="admin",
            event_name="admin",
            interval_seconds=interval_seconds,
            max_events=max_events,
        )

    @app.get("/api/stream/emergency", tags=["Realtime Streaming"])
    def stream_emergency(interval_seconds: int = 3, max_events: int = 10):
        return stream_response(
            stream_name="emergency",
            event_name="emergency",
            interval_seconds=interval_seconds,
            max_events=max_events,
        )

    @app.get("/api/stream/feed", tags=["Realtime Streaming"])
    def stream_feed(interval_seconds: int = 5, max_events: int = 10):
        return stream_response(
            stream_name="feed",
            event_name="feed",
            interval_seconds=interval_seconds,
            max_events=max_events,
        )