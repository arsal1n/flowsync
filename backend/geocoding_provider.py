from typing import Any, Dict

from config import get_geocoding_provider_name, is_mock_fallback_enabled
from navigation_persistence import search_locations_from_db
from real_map_provider import search_openrouteservice_locations


REAL_GEOCODING_PROVIDERS = {
    "openrouteservice",
    "ors",
}


def search_locations_provider(query: str, limit: int = 10) -> Dict[str, Any]:
    provider = get_geocoding_provider_name()

    if provider in {"sqlite", "mock"}:
        result = search_locations_from_db(query, limit=limit)
        result["provider"] = provider
        result["provider_status"] = "sqlite_locations_table"
        return result

    if provider in REAL_GEOCODING_PROVIDERS:
        real_result = search_openrouteservice_locations(query, limit=limit)

        if real_result.get("success"):
            return real_result

        if is_mock_fallback_enabled():
            fallback = search_locations_from_db(query, limit=limit)
            fallback["provider"] = provider
            fallback["provider_status"] = "mock_fallback_to_sqlite_locations"
            fallback["real_provider_error"] = real_result.get("provider_error") or real_result.get("message")
            return fallback

        return {
            "query": query,
            "results": [],
            "count": 0,
            "provider": provider,
            "provider_status": real_result.get("provider_status", "real_provider_failed"),
            "message": real_result.get("message", "Real geocoding provider failed."),
            "real_provider_error": real_result.get("provider_error"),
        }

    if is_mock_fallback_enabled():
        result = search_locations_from_db(query, limit=limit)
        result["provider"] = provider
        result["provider_status"] = "mock_fallback_to_sqlite_locations"
        return result

    return {
        "query": query,
        "results": [],
        "count": 0,
        "provider": provider,
        "provider_status": "not_configured",
        "message": "Geocoding provider is selected but no real API integration is configured yet.",
    }