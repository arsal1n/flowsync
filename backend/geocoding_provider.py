from typing import Any, Dict, List

from config import get_geocoding_provider_name, is_mock_fallback_enabled
from navigation_persistence import search_locations_from_db
from real_map_provider import search_openrouteservice_locations

REAL_GEOCODING_PROVIDERS = {"openrouteservice", "ors"}

UAE_LOCATION_CATALOG = [
    {"name": "Dubai Mall", "address": "Downtown Dubai", "lat": 25.1972, "lng": 55.2744, "type": "mall", "city": "Dubai"},
    {"name": "Burj Khalifa", "address": "Downtown Dubai", "lat": 25.1975, "lng": 55.2743, "type": "landmark", "city": "Dubai"},
    {"name": "Downtown Dubai", "address": "Downtown Dubai", "lat": 25.1948, "lng": 55.2708, "type": "district", "city": "Dubai"},
    {"name": "Business Bay", "address": "Business Bay", "lat": 25.1860, "lng": 55.2608, "type": "business", "city": "Dubai"},
    {"name": "Dubai Marina", "address": "Dubai Marina", "lat": 25.0800, "lng": 55.1400, "type": "district", "city": "Dubai"},
    {"name": "JBR", "address": "Jumeirah Beach Residence", "lat": 25.0793, "lng": 55.1338, "type": "beach", "city": "Dubai"},
    {"name": "Palm Jumeirah", "address": "Palm Jumeirah", "lat": 25.1124, "lng": 55.1390, "type": "landmark", "city": "Dubai"},
    {"name": "Mall of the Emirates", "address": "Al Barsha", "lat": 25.1181, "lng": 55.2006, "type": "mall", "city": "Dubai"},
    {"name": "DXB Airport", "address": "Dubai International Airport", "lat": 25.2532, "lng": 55.3657, "type": "airport", "city": "Dubai"},
    {"name": "Dubai Festival City", "address": "Festival City", "lat": 25.2222, "lng": 55.3494, "type": "mall", "city": "Dubai"},
    {"name": "Deira City Centre", "address": "Deira", "lat": 25.2536, "lng": 55.3306, "type": "mall", "city": "Dubai"},
    {"name": "Dubai Silicon Oasis", "address": "DSO", "lat": 25.1250, "lng": 55.3800, "type": "technology", "city": "Dubai"},
    {"name": "Academic City", "address": "Dubai Academic City", "lat": 25.1256, "lng": 55.4209, "type": "education", "city": "Dubai"},
    {"name": "Dubai Internet City", "address": "Dubai Internet City", "lat": 25.0953, "lng": 55.1562, "type": "business", "city": "Dubai"},
    {"name": "Dubai Media City", "address": "Dubai Media City", "lat": 25.0923, "lng": 55.1525, "type": "business", "city": "Dubai"},
    {"name": "Jumeirah", "address": "Jumeirah Beach Road", "lat": 25.2048, "lng": 55.2553, "type": "district", "city": "Dubai"},
    {"name": "Rashid Hospital", "address": "Umm Hurair", "lat": 25.2371, "lng": 55.3136, "type": "hospital", "city": "Dubai"},
    {"name": "Sharjah", "address": "Sharjah City", "lat": 25.3463, "lng": 55.4209, "type": "city", "city": "Sharjah"},
    {"name": "Sharjah City Centre", "address": "Al Wahda Street, Sharjah", "lat": 25.3315, "lng": 55.3955, "type": "mall", "city": "Sharjah"},
    {"name": "University City Sharjah", "address": "University City, Sharjah", "lat": 25.2867, "lng": 55.4636, "type": "education", "city": "Sharjah"},
    {"name": "Sharjah International Airport", "address": "Sharjah Airport", "lat": 25.3286, "lng": 55.5172, "type": "airport", "city": "Sharjah"},
]


def _normalise(value: str) -> str:
    return (value or "").strip().lower().replace("-", " ")


def _location_payload(location: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "name": location["name"],
        "address": location["address"],
        "lat": location["lat"],
        "lng": location["lng"],
        "latitude": location["lat"],
        "longitude": location["lng"],
        "type": location["type"],
        "category": location["type"],
        "city": location["city"],
        "source": "flowsync_uae_catalog",
    }


def _catalog_search(query: str, limit: int = 12) -> List[Dict[str, Any]]:
    clean_query = _normalise(query)

    if clean_query in {"", "dubai", "uae", "all"}:
        return [_location_payload(item) for item in UAE_LOCATION_CATALOG[:limit]]

    aliases = {
        "shj": "sharjah",
        "dxb": "airport",
        "marina": "dubai marina",
        "moe": "mall of the emirates",
        "dso": "silicon oasis",
    }

    expanded_query = aliases.get(clean_query, clean_query)
    matches = []

    for item in UAE_LOCATION_CATALOG:
        haystack = _normalise(
            f"{item['name']} {item['address']} {item['type']} {item['city']}"
        )

        if expanded_query in haystack or clean_query in haystack:
            matches.append(_location_payload(item))

    return matches[:limit]


def _merge_locations(*groups: List[Dict[str, Any]], limit: int = 12) -> List[Dict[str, Any]]:
    seen = set()
    merged = []

    for group in groups:
        for item in group:
            key = _normalise(f"{item.get('name')} {item.get('address')}")
            if key in seen:
                continue

            seen.add(key)

            if "latitude" not in item and "lat" in item:
                item["latitude"] = item["lat"]

            if "longitude" not in item and "lng" in item:
                item["longitude"] = item["lng"]

            if "category" not in item and "type" in item:
                item["category"] = item["type"]

            merged.append(item)

            if len(merged) >= limit:
                return merged

    return merged


def search_locations_provider(query: str, limit: int = 12) -> Dict[str, Any]:
    provider = (get_geocoding_provider_name() or "sqlite").lower()
    clean_query = query or ""

    if provider in REAL_GEOCODING_PROVIDERS:
        real_result = search_openrouteservice_locations(clean_query, limit=limit)

        if real_result.get("success"):
            return real_result

        if not is_mock_fallback_enabled():
            return {
                "query": clean_query,
                "results": [],
                "locations": [],
                "count": 0,
                "provider": provider,
                "provider_status": real_result.get("provider_status", "real_provider_failed"),
                "message": real_result.get("message", "Real geocoding provider failed."),
                "real_provider_error": real_result.get("provider_error"),
            }

    db_results = []

    try:
        db_payload = search_locations_from_db(clean_query, limit=limit)
        db_results = db_payload.get("results", [])
    except Exception:
        db_results = []

    catalog_results = _catalog_search(clean_query, limit=limit)

    merged = _merge_locations(catalog_results, db_results, limit=limit)

    status = "uae_catalog_plus_sqlite_locations"

    if provider in REAL_GEOCODING_PROVIDERS:
        status = "mock_fallback_to_uae_catalog_after_real_provider_failure"

    return {
        "query": clean_query,
        "results": merged,
        "locations": merged,
        "count": len(merged),
        "provider": provider,
        "provider_status": status,
        "source": "flowsync_uae_catalog",
        "message": "Location search is using FlowSync UAE catalog with SQLite fallback.",
    }

# --- FlowSync final UAE location search override ---
# Gives mobile enough Dubai + Sharjah choices for commercial-style demo.

_FINAL_UAE_LOCATION_CATALOG = [
    {"name": "Dubai Mall", "address": "Downtown Dubai", "lat": 25.1972, "lng": 55.2744, "type": "mall", "city": "Dubai"},
    {"name": "Burj Khalifa", "address": "Downtown Dubai", "lat": 25.1975, "lng": 55.2743, "type": "landmark", "city": "Dubai"},
    {"name": "Downtown Dubai", "address": "Downtown Dubai", "lat": 25.1948, "lng": 55.2708, "type": "district", "city": "Dubai"},
    {"name": "Business Bay", "address": "Business Bay", "lat": 25.1860, "lng": 55.2608, "type": "business", "city": "Dubai"},
    {"name": "Dubai Marina", "address": "Dubai Marina", "lat": 25.0800, "lng": 55.1400, "type": "district", "city": "Dubai"},
    {"name": "JBR", "address": "Jumeirah Beach Residence", "lat": 25.0793, "lng": 55.1338, "type": "beach", "city": "Dubai"},
    {"name": "Palm Jumeirah", "address": "Palm Jumeirah", "lat": 25.1124, "lng": 55.1390, "type": "landmark", "city": "Dubai"},
    {"name": "Mall of the Emirates", "address": "Al Barsha", "lat": 25.1181, "lng": 55.2006, "type": "mall", "city": "Dubai"},
    {"name": "DXB Airport", "address": "Dubai International Airport", "lat": 25.2532, "lng": 55.3657, "type": "airport", "city": "Dubai"},
    {"name": "Dubai Festival City", "address": "Festival City", "lat": 25.2222, "lng": 55.3494, "type": "mall", "city": "Dubai"},
    {"name": "Deira City Centre", "address": "Deira", "lat": 25.2536, "lng": 55.3306, "type": "mall", "city": "Dubai"},
    {"name": "Dubai Silicon Oasis", "address": "DSO", "lat": 25.1250, "lng": 55.3800, "type": "technology", "city": "Dubai"},
    {"name": "Academic City", "address": "Dubai Academic City", "lat": 25.1256, "lng": 55.4209, "type": "education", "city": "Dubai"},
    {"name": "Dubai Internet City", "address": "Dubai Internet City", "lat": 25.0953, "lng": 55.1562, "type": "business", "city": "Dubai"},
    {"name": "Dubai Media City", "address": "Dubai Media City", "lat": 25.0923, "lng": 55.1525, "type": "business", "city": "Dubai"},
    {"name": "Jumeirah", "address": "Jumeirah Beach Road", "lat": 25.2048, "lng": 55.2553, "type": "district", "city": "Dubai"},
    {"name": "Rashid Hospital", "address": "Umm Hurair", "lat": 25.2371, "lng": 55.3136, "type": "hospital", "city": "Dubai"},
    {"name": "Sharjah", "address": "Sharjah City", "lat": 25.3463, "lng": 55.4209, "type": "city", "city": "Sharjah"},
    {"name": "Sharjah City Centre", "address": "Al Wahda Street, Sharjah", "lat": 25.3315, "lng": 55.3955, "type": "mall", "city": "Sharjah"},
    {"name": "University City Sharjah", "address": "University City, Sharjah", "lat": 25.2867, "lng": 55.4636, "type": "education", "city": "Sharjah"},
    {"name": "Sharjah International Airport", "address": "Sharjah Airport", "lat": 25.3286, "lng": 55.5172, "type": "airport", "city": "Sharjah"},
]

def _final_location_payload(item):
    return {
        "name": item["name"],
        "address": item["address"],
        "lat": item["lat"],
        "lng": item["lng"],
        "latitude": item["lat"],
        "longitude": item["lng"],
        "type": item["type"],
        "category": item["type"],
        "city": item["city"],
        "source": "flowsync_uae_catalog",
    }

def search_locations_provider(query: str, limit: int = 12):
    clean = (query or "").strip().lower().replace("-", " ")

    aliases = {
        "shj": "sharjah",
        "dxb": "airport",
        "marina": "dubai marina",
        "moe": "mall of the emirates",
        "dso": "silicon oasis",
    }

    expanded = aliases.get(clean, clean)

    if expanded in {"", "dubai", "uae", "all"}:
        results = [_final_location_payload(item) for item in _FINAL_UAE_LOCATION_CATALOG[:limit]]
    else:
        results = []

        for item in _FINAL_UAE_LOCATION_CATALOG:
            haystack = f"{item['name']} {item['address']} {item['type']} {item['city']}".lower()

            if expanded in haystack or clean in haystack:
                results.append(_final_location_payload(item))

        results = results[:limit]

    return {
        "query": query,
        "results": results,
        "locations": results,
        "count": len(results),
        "provider": "flowsync_uae_catalog",
        "provider_status": "uae_catalog_location_search",
        "message": "FlowSync UAE location catalog is active.",
    }
