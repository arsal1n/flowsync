import json
import os
import urllib.parse
import urllib.request
from typing import Any, Dict, List, Optional

from fastapi import Request
from starlette.responses import JSONResponse


GEOAPIFY_AUTOCOMPLETE_URL = "https://api.geoapify.com/v1/geocode/autocomplete"
GEOAPIFY_SEARCH_URL = "https://api.geoapify.com/v1/geocode/search"

DUBAI_BIAS_LON = 55.2708
DUBAI_BIAS_LAT = 25.2048


def _geoapify_key() -> str:
    return (
        os.getenv("FLOWSYNC_GEOAPIFY_API_KEY")
        or os.getenv("GEOAPIFY_API_KEY")
        or ""
    ).strip()


def _enabled() -> bool:
    provider = (
        os.getenv("FLOWSYNC_PLACE_SEARCH_PROVIDER")
        or os.getenv("FLOWSYNC_GEOCODING_PROVIDER")
        or ""
    ).lower().strip()

    return bool(_geoapify_key()) and provider in {
        "geoapify",
        "geoapify_places",
        "hybrid",
    }


def _number(value: Any, fallback: float = 0.0) -> float:
    try:
        if value is None:
            return fallback
        return float(value)
    except Exception:
        return fallback


def _clean(value: Any) -> str:
    return str(value or "").strip()


def _http_get_json(url: str) -> Dict[str, Any]:
    request = urllib.request.Request(
        url,
        headers={
            "Accept": "application/json",
            "User-Agent": "FlowSync/1.0",
        },
    )

    with urllib.request.urlopen(request, timeout=12) as response:
        return json.loads(response.read().decode("utf-8"))


def _coordinate_payload(latitude: float, longitude: float) -> Dict[str, float]:
    return {
        "latitude": latitude,
        "longitude": longitude,
        "lat": latitude,
        "lng": longitude,
    }


def _feature_to_location(feature: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    properties = feature.get("properties") or {}
    geometry = feature.get("geometry") or {}
    coordinates = geometry.get("coordinates") or []

    if len(coordinates) < 2:
        return None

    longitude = _number(coordinates[0])
    latitude = _number(coordinates[1])

    if not latitude or not longitude:
        return None

    name = (
        properties.get("name")
        or properties.get("address_line1")
        or properties.get("formatted")
        or "UAE location"
    )

    display_name = (
        properties.get("formatted")
        or properties.get("address_line2")
        or properties.get("address_line1")
        or name
    )

    city = (
        properties.get("city")
        or properties.get("county")
        or properties.get("state")
        or "Dubai"
    )

    area = (
        properties.get("district")
        or properties.get("suburb")
        or properties.get("neighbourhood")
        or properties.get("street")
        or ""
    )

    category = (
        properties.get("category")
        or properties.get("result_type")
        or properties.get("datasource", {}).get("sourcename")
        or "place"
    )

    place_id = (
        properties.get("place_id")
        or properties.get("osm_id")
        or properties.get("plus_code")
        or f"geoapify:{latitude},{longitude}"
    )

    return {
        "place_id": str(place_id),
        "name": _clean(name),
        "display_name": _clean(display_name),
        "address": _clean(display_name),
        "city": _clean(city),
        "area": _clean(area),
        "category": _clean(category),
        "type": _clean(category),
        "provider_name": "geoapify",
        "provider": "geoapify",
        "provider_status": "real_geocoding_success",
        "external_place_id": str(place_id),
        **_coordinate_payload(latitude, longitude),
    }


def _dedupe_locations(locations: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    seen = set()
    output = []

    for item in locations:
        key = (
            str(item.get("name", "")).lower(),
            round(_number(item.get("latitude")), 5),
            round(_number(item.get("longitude")), 5),
        )

        if key in seen:
            continue

        seen.add(key)
        output.append(item)

    return output


def geoapify_search_places(query: str, limit: int = 10) -> List[Dict[str, Any]]:
    key = _geoapify_key()
    query = _clean(query)

    if not key or not query:
        return []

    urls = []

    autocomplete_params = urllib.parse.urlencode(
        {
            "text": query,
            "filter": "countrycode:ae",
            "bias": f"proximity:{DUBAI_BIAS_LON},{DUBAI_BIAS_LAT}",
            "limit": str(max(1, min(limit, 20))),
            "apiKey": key,
        }
    )
    urls.append(f"{GEOAPIFY_AUTOCOMPLETE_URL}?{autocomplete_params}")

    search_text = query

    if (
        "dubai" not in query.lower()
        and "uae" not in query.lower()
        and "united arab emirates" not in query.lower()
    ):
        search_text = f"{query}, Dubai, United Arab Emirates"

    search_params = urllib.parse.urlencode(
        {
            "text": search_text,
            "filter": "countrycode:ae",
            "bias": f"proximity:{DUBAI_BIAS_LON},{DUBAI_BIAS_LAT}",
            "limit": str(max(1, min(limit, 20))),
            "apiKey": key,
        }
    )
    urls.append(f"{GEOAPIFY_SEARCH_URL}?{search_params}")

    results = []

    for url in urls:
        try:
            payload = _http_get_json(url)
            features = payload.get("features") or []

            for feature in features:
                location = _feature_to_location(feature)

                if location:
                    results.append(location)

        except Exception as exc:
            print(f"[geoapify] search failed: {exc}")

    return _dedupe_locations(results)[:limit]


async def handle_geoapify_location_search(request: Request) -> JSONResponse:
    query = _clean(
        request.query_params.get("q")
        or request.query_params.get("query")
        or ""
    )

    limit = int(_number(request.query_params.get("limit"), 10))

    if not query:
        results = []
    else:
        results = geoapify_search_places(query, limit=limit)

    return JSONResponse(
        {
            "query": query,
            "count": len(results),
            "results": results,
            "locations": results,
            "no_exact_match": len(results) == 0,
            "provider": "geoapify",
            "provider_status": "real_geocoding_success" if results else "provider_no_places_found",
            "mock_fallback": False,
            "message": "Results found" if results else "No matching location found.",
        }
    )


def _has_coordinates(payload: Dict[str, Any], prefix: str) -> bool:
    return (
        payload.get(f"{prefix}_latitude") is not None
        and payload.get(f"{prefix}_longitude") is not None
    )


def _inject_coordinates(payload: Dict[str, Any], prefix: str, location: Dict[str, Any]) -> None:
    payload[f"{prefix}_latitude"] = location.get("latitude")
    payload[f"{prefix}_longitude"] = location.get("longitude")

    if prefix == "start":
        payload["start_location"] = location.get("name") or payload.get("start_location")
        payload["start_display_name"] = location.get("display_name")

    if prefix == "destination":
        payload["destination"] = location.get("name") or payload.get("destination")
        payload["destination_display_name"] = location.get("display_name")


def register_geoapify_places_middleware(app):
    @app.middleware("http")
    async def geoapify_places_middleware(request: Request, call_next):
        method = request.method.upper()
        path = request.url.path

        if not _enabled():
            return await call_next(request)

        if method == "GET" and path == "/api/locations/search":
            return await handle_geoapify_location_search(request)

        if method == "POST" and path == "/api/routes/recommend":
            body_bytes = await request.body()

            try:
                payload = json.loads(body_bytes.decode("utf-8")) if body_bytes else {}

                if not isinstance(payload, dict):
                    payload = {}

            except Exception:
                payload = {}

            missing = []

            if not _has_coordinates(payload, "start"):
                start_query = _clean(payload.get("start_location"))
                start_results = geoapify_search_places(start_query, limit=1)

                if start_results:
                    _inject_coordinates(payload, "start", start_results[0])
                else:
                    missing.append("start_location")

            if not _has_coordinates(payload, "destination"):
                destination_query = _clean(payload.get("destination"))
                destination_results = geoapify_search_places(destination_query, limit=1)

                if destination_results:
                    _inject_coordinates(payload, "destination", destination_results[0])
                else:
                    missing.append("destination")

            if missing:
                return JSONResponse(
                    status_code=404,
                    content={
                        "success": False,
                        "provider": "geoapify",
                        "provider_status": "provider_no_places_found",
                        "routing_provider": "openrouteservice",
                        "routing_provider_status": "not_called",
                        "error": "location_not_found",
                        "missing_fields": missing,
                        "message": "Start or destination could not be found. Please select a valid location suggestion.",
                        "same_location": False,
                        "no_route_needed": False,
                        "recommended_route": None,
                        "recommended_route_id": None,
                        "routes": [],
                        "all_routes": [],
                        "route_options": [],
                        "real_geometry": False,
                        "mock_fallback": False,
                        "in_app_navigation": False,
                        "external_navigation_required": False,
                    },
                )

            new_body = json.dumps(payload).encode("utf-8")

            async def receive():
                return {
                    "type": "http.request",
                    "body": new_body,
                    "more_body": False,
                }

            request._receive = receive

            return await call_next(request)

        return await call_next(request)
