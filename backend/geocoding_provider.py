from typing import Any, Dict

from config import get_geocoding_provider_name, is_mock_fallback_enabled
from navigation_persistence import search_locations_from_db


def search_locations_provider(query: str, limit: int = 10) -> Dict[str, Any]:
    provider = get_geocoding_provider_name()

    if provider in {"sqlite", "mock"}:
        result = search_locations_from_db(query, limit=limit)
        result["provider"] = provider
        result["provider_status"] = "sqlite_locations_table"
        return result

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