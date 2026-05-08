import os
from typing import Dict, List, Optional


def get_env_value(name: str, default: Optional[str] = None) -> Optional[str]:
    value = os.getenv(name)

    if value is None:
        return default

    value = value.strip()

    if value == "":
        return default

    return value


def get_cors_origins() -> List[str]:
    raw_value = get_env_value("FLOWSYNC_CORS_ORIGINS", "*")

    if raw_value == "*":
        return ["*"]

    origins = [
        origin.strip()
        for origin in raw_value.split(",")
        if origin.strip()
    ]

    return origins or ["*"]


def get_backend_config() -> Dict:
    routing_provider = get_env_value("FLOWSYNC_ROUTING_PROVIDER", "mock").lower()
    geocoding_provider = get_env_value("FLOWSYNC_GEOCODING_PROVIDER", "sqlite").lower()

    return {
        "environment": get_env_value("FLOWSYNC_ENV", "local"),
        "app_name": get_env_value("FLOWSYNC_APP_NAME", "FlowSync Smart Mobility Backend"),
        "api_version": get_env_value("FLOWSYNC_API_VERSION", "1.0.1"),
        "host": get_env_value("FLOWSYNC_HOST", "127.0.0.1"),
        "port": int(get_env_value("FLOWSYNC_PORT", "8000")),
        "cors_origins": get_cors_origins(),
        "routing_provider": routing_provider,
        "geocoding_provider": geocoding_provider,
        "routing_api_key_configured": bool(get_env_value("FLOWSYNC_ROUTING_API_KEY")),
        "geocoding_api_key_configured": bool(get_env_value("FLOWSYNC_GEOCODING_API_KEY")),
        "mock_fallback_enabled": get_env_value("FLOWSYNC_MOCK_FALLBACK", "true").lower() == "true",
        "routing_base_url": get_env_value("FLOWSYNC_ROUTING_BASE_URL", ""),
        "geocoding_base_url": get_env_value("FLOWSYNC_GEOCODING_BASE_URL", ""),
        "database_url_configured": bool(get_env_value("DATABASE_URL")),
        "database_mode": "sqlite_local_default" if not get_env_value("DATABASE_URL") else "external_database_ready",
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
        "database": {
            "database_url_configured": config["database_url_configured"],
            "database_mode": config["database_mode"],
        },
        "deployment": {
            "environment": config["environment"],
            "host": config["host"],
            "port": config["port"],
            "cors_origins": config["cors_origins"],
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