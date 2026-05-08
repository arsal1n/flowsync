import json
import time
from datetime import datetime
from typing import Any, Callable, Dict, Generator

from live_updates import (
    get_live_admin_control_room,
    get_live_dashboard,
    get_live_emergency_status,
    get_live_feed,
    get_live_heartbeat,
    get_live_navigation_overview,
    get_live_navigation_session,
    get_live_system_status,
)


def now() -> str:
    return datetime.now().isoformat(timespec="seconds")


def sse_format(
    event_name: str,
    payload: Dict[str, Any],
    event_id: str | None = None,
) -> str:
    lines = []

    if event_id:
        lines.append(f"id: {event_id}")

    lines.append(f"event: {event_name}")
    lines.append(f"data: {json.dumps(payload, default=str)}")
    lines.append("")

    return "\n".join(lines) + "\n"


def build_stream_payload(
    event_name: str,
    sequence: int,
    payload: Dict[str, Any],
) -> Dict[str, Any]:
    return {
        "stream": {
            "event_name": event_name,
            "sequence": sequence,
            "server_time": now(),
            "transport": "server_sent_events",
        },
        "payload": payload,
    }


def create_sse_stream(
    event_name: str,
    payload_builder: Callable[[], Dict[str, Any]],
    interval_seconds: int = 5,
    max_events: int = 10,
) -> Generator[str, None, None]:
    yield "retry: 5000\n\n"

    sequence = 1

    while max_events == 0 or sequence <= max_events:
        try:
            payload = payload_builder()
            stream_payload = build_stream_payload(
                event_name=event_name,
                sequence=sequence,
                payload=payload,
            )

            yield sse_format(
                event_name=event_name,
                payload=stream_payload,
                event_id=f"{event_name}-{sequence}",
            )

        except Exception as error:
            error_payload = build_stream_payload(
                event_name="stream_error",
                sequence=sequence,
                payload={
                    "error": str(error),
                    "message": "Realtime stream payload generation failed.",
                },
            )

            yield sse_format(
                event_name="stream_error",
                payload=error_payload,
                event_id=f"{event_name}-error-{sequence}",
            )

        sequence += 1

        if max_events != 0 and sequence > max_events:
            break

        time.sleep(interval_seconds)

    yield ": stream-complete\n\n"


def get_realtime_stream_status() -> Dict[str, Any]:
    return {
        "realtime_streaming_enabled": True,
        "transport": "server_sent_events",
        "generated_at": now(),
        "default_polling_alternative": {
            "system": "/api/live/system",
            "dashboard": "/api/live/dashboard",
            "navigation": "/api/live/navigation",
            "admin": "/api/live/admin",
            "emergency": "/api/live/emergency",
            "feed": "/api/live/feed",
        },
        "streams": [
            {
                "name": "system",
                "endpoint": "/api/stream/system",
                "event_name": "system",
                "protected": False,
            },
            {
                "name": "dashboard",
                "endpoint": "/api/stream/dashboard",
                "event_name": "dashboard",
                "protected": False,
            },
            {
                "name": "navigation",
                "endpoint": "/api/stream/navigation",
                "event_name": "navigation",
                "protected": False,
            },
            {
                "name": "navigation_session",
                "endpoint": "/api/stream/navigation/{session_id}",
                "event_name": "navigation_session",
                "protected": False,
            },
            {
                "name": "admin",
                "endpoint": "/api/stream/admin",
                "event_name": "admin",
                "protected": True,
                "roles": ["admin", "rta_operator"],
            },
            {
                "name": "emergency",
                "endpoint": "/api/stream/emergency",
                "event_name": "emergency",
                "protected": True,
                "roles": ["admin", "rta_operator", "ambulance", "police", "fire_truck"],
            },
            {
                "name": "feed",
                "endpoint": "/api/stream/feed",
                "event_name": "feed",
                "protected": False,
            },
        ],
        "query_parameters": {
            "interval_seconds": "1 to 30 seconds",
            "max_events": "1 to 100 for finite demo streams, 0 for continuous stream",
        },
        "message": "Realtime streaming endpoints are available using Server-Sent Events.",
    }


def get_stream_payload_builder(stream_name: str, session_id: str | None = None):
    if stream_name == "system":
        return get_live_system_status

    if stream_name == "dashboard":
        return get_live_dashboard

    if stream_name == "navigation":
        return get_live_navigation_overview

    if stream_name == "navigation_session":
        return lambda: get_live_navigation_session(session_id or "")

    if stream_name == "admin":
        return get_live_admin_control_room

    if stream_name == "emergency":
        return get_live_emergency_status

    if stream_name == "feed":
        return get_live_feed

    if stream_name == "heartbeat":
        return lambda: get_live_heartbeat("stream-client")

    return get_live_system_status