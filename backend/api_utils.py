from typing import Any, Iterable, Optional

from fastapi import HTTPException


ALLOWED_ROUTE_PREFERENCES = {
    "balanced",
    "fastest",
    "eco",
    "cheapest",
    "low_stress",
}

ALLOWED_USER_ROLES = {
    "driver",
    "ambulance",
    "police",
    "fire_truck",
    "rta_operator",
    "vip",
}

ALLOWED_VEHICLE_TYPES = {
    "car",
    "taxi",
    "bus",
    "motorbike",
    "ambulance",
    "police",
    "fire_truck",
    "vip",
}

ALLOWED_TRIP_END_STATUSES = {
    "completed",
    "cancelled",
    "interrupted",
}


def api_error(
    message: str,
    field: Optional[str] = None,
    status_code: int = 422,
    allowed_values: Optional[Iterable[str]] = None,
):
    detail = {
        "error": {
            "message": message,
        }
    }

    if field:
        detail["error"]["field"] = field

    if allowed_values:
        detail["error"]["allowed_values"] = sorted(list(allowed_values))

    raise HTTPException(status_code=status_code, detail=detail)


def clean_text(
    value: Any,
    field: str,
    max_length: int = 160,
    allow_empty: bool = False,
) -> str:
    if value is None:
        if allow_empty:
            return ""
        api_error(f"{field} is required.", field)

    if not isinstance(value, str):
        api_error(f"{field} must be a string.", field)

    cleaned = value.strip()

    if not cleaned and not allow_empty:
        api_error(f"{field} cannot be empty.", field)

    if len(cleaned) > max_length:
        api_error(
            f"{field} is too long. Maximum length is {max_length} characters.",
            field,
        )

    return cleaned


def validate_choice(
    value: Any,
    field: str,
    allowed_values: set[str],
) -> str:
    cleaned = clean_text(value, field, max_length=80).lower()

    if cleaned not in allowed_values:
        api_error(
            f"Invalid {field}.",
            field=field,
            allowed_values=allowed_values,
        )

    return cleaned


def validate_route_preference(value: Any) -> str:
    return validate_choice(
        value=value,
        field="route_preference",
        allowed_values=ALLOWED_ROUTE_PREFERENCES,
    )


def validate_user_role(value: Any) -> str:
    return validate_choice(
        value=value,
        field="user_role",
        allowed_values=ALLOWED_USER_ROLES,
    )


def validate_vehicle_type(value: Any) -> str:
    return validate_choice(
        value=value,
        field="vehicle_type",
        allowed_values=ALLOWED_VEHICLE_TYPES,
    )


def validate_trip_end_status(value: Any) -> str:
    return validate_choice(
        value=value,
        field="status",
        allowed_values=ALLOWED_TRIP_END_STATUSES,
    )


def validate_positive_integer(value: Any, field: str) -> int:
    if value is None:
        api_error(f"{field} is required.", field)

    if isinstance(value, bool):
        api_error(f"{field} must be a positive integer.", field)

    try:
        number = int(value)
    except (TypeError, ValueError):
        api_error(f"{field} must be a positive integer.", field)

    if number <= 0:
        api_error(f"{field} must be greater than zero.", field)

    return number


def validate_non_negative_integer(value: Any, field: str) -> int:
    if value is None:
        api_error(f"{field} is required.", field)

    if isinstance(value, bool):
        api_error(f"{field} must be a non-negative integer.", field)

    try:
        number = int(value)
    except (TypeError, ValueError):
        api_error(f"{field} must be a non-negative integer.", field)

    if number < 0:
        api_error(f"{field} cannot be negative.", field)

    return number


def validate_optional_route_name(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None

    cleaned = clean_text(
        value=value,
        field="route_name",
        max_length=160,
        allow_empty=True,
    )

    return cleaned or None


def validate_session_id(value: Any) -> str:
    cleaned = clean_text(value, "session_id", max_length=80)

    if not cleaned.startswith("NAV-"):
        api_error(
            "Invalid session_id format. Navigation session IDs must start with NAV-.",
            field="session_id",
        )

    return cleaned


def validate_location_query(value: Any) -> str:
    return clean_text(
        value=value,
        field="q",
        max_length=120,
        allow_empty=True,
    )