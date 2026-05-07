import os
from typing import Dict, Optional


def get_env_value(name: str, default: Optional[str] = None) -> Optional[str]:
    value = os.getenv(name)

    if value is None:
        return default

    value = value.strip()

    if value == "":
        return default

    return value


def get_backend_config() -> Dict:
    routing_provider = get_env_value("FLOWSYNC_ROUTING_PROVIDER", "mock").lower()
    geocoding_provider = get_env_value("FLOWSYNC_GEOCODING_PROVIDER", "sqlite").lower()

    return {
        "environment": get_env_value("FLOWSYNC_ENV", "local"),
        "routing_provider": routing_provider,
        "geocoding_provider": geocoding_provider,
        "routing_api_key_configured": bool(get_env_value("FLOWSYNC_ROUTING_API_KEY")),
        "geocoding_api_key_configured": bool(get_env_value("FLOWSYNC_GEOCODING_API_KEY")),
        "mock_fallback_enabled": get_env_value("FLOWSYNC_MOCK_FALLBACK", "true").lower() == "true",
        "routing_base_url": get_env_value("FLOWSYNC_ROUTING_BASE_URL", ""),
        "geocoding_base_url": get_env_value("FLOWSYNC_GEOCODING_BASE_URL", ""),
    }


def get_routing_provider_name() -> str:
    return get_backend_config()["routing_provider"]


def get_geocoding_provider_name() -> str:
    return get_backend_config()["geocoding_provider"]


def is_mock_fallback_enabled() -> bool:
    return get_backend_config()["mock_fallback_enabled"]


def get_provider_status() -> Dict:
    config = get_backend_config()

    return {
        "provider_foundation_enabled": True,
        "routing": {
            "provider": config["routing_provider"],
            "api_key_configured": config["routing_api_key_configured"],
            "base_url": config["routing_base_url"],
            "mock_fallback_enabled": config["mock_fallback_enabled"],
            "current_mode": "mock_fallback" if config["routing_provider"] == "mock" else "provider_ready",
        },
        "geocoding": {
            "provider": config["geocoding_provider"],
            "api_key_configured": config["geocoding_api_key_configured"],
            "base_url": config["geocoding_base_url"],
            "mock_fallback_enabled": config["mock_fallback_enabled"],
            "current_mode": "sqlite_locations" if config["geocoding_provider"] == "sqlite" else "provider_ready",
        },
        "supported_future_providers": [
            "google_maps",
            "mapbox",
            "openrouteservice",
            "osrm",
            "tomtom",
            "here_maps",
        ],
    }