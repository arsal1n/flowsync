import json
import os
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict, List, Optional, Tuple

from fastapi import Request
from starlette.responses import JSONResponse


GOOGLE_TEXT_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText"
GEOAPIFY_AUTOCOMPLETE_URL = "https://api.geoapify.com/v1/geocode/autocomplete"
GEOAPIFY_SEARCH_URL = "https://api.geoapify.com/v1/geocode/search"

DUBAI_BIAS_LON = 55.2708
DUBAI_BIAS_LAT = 25.2048
GOOGLE_BIAS_RADIUS_M = 50000.0


PINNED_UAE_REAL_PLACES = [
    {
        "place_id": "flowsync-pinned-manipal-university-dubai",
        "name": "Manipal University Dubai",
        "display_name": "Manipal University Dubai, Dubai International Academic City, Dubai, UAE",
        "address": "Dubai International Academic City",
        "city": "Dubai",
        "area": "Academic City",
        "category": "University",
        "type": "University",
        "provider_name": "flowsync_verified_place",
        "provider": "flowsync_verified_place",
        "provider_status": "verified_location_match",
        "latitude": 25.1256,
        "longitude": 55.4209,
        "lat": 25.1256,
        "lng": 55.4209,
    },
    {
        "place_id": "flowsync-pinned-dubai-mall",
        "name": "Dubai Mall",
        "display_name": "Dubai Mall, Downtown Dubai, Dubai, UAE",
        "address": "Downtown Dubai",
        "city": "Dubai",
        "area": "Downtown Dubai",
        "category": "Mall",
        "type": "Mall",
        "provider_name": "flowsync_verified_place",
        "provider": "flowsync_verified_place",
        "provider_status": "verified_location_match",
        "latitude": 25.1972,
        "longitude": 55.2744,
        "lat": 25.1972,
        "lng": 55.2744,
    },
    {
        "place_id": "flowsync-pinned-dubai-marina",
        "name": "Dubai Marina",
        "display_name": "Dubai Marina, Dubai, UAE",
        "address": "Dubai Marina",
        "city": "Dubai",
        "area": "Dubai Marina",
        "category": "District",
        "type": "District",
        "provider_name": "flowsync_verified_place",
        "provider": "flowsync_verified_place",
        "provider_status": "verified_location_match",
        "latitude": 25.0800,
        "longitude": 55.1400,
        "lat": 25.0800,
        "lng": 55.1400,
    },
]


def _clean(value: Any) -> str:
    return str(value or "").strip()


def _number(value: Any, fallback: float = 0.0) -> float:
    try:
        if value is None:
            return fallback
        return float(value)
    except Exception:
        return fallback


def _coordinate_payload(latitude: float, longitude: float) -> Dict[str, float]:
    return {
        "latitude": latitude,
        "longitude": longitude,
        "lat": latitude,
        "lng": longitude,
    }


def _google_key() -> str:
    return (
        os.getenv("FLOWSYNC_GOOGLE_PLACES_API_KEY")
        or os.getenv("GOOGLE_PLACES_API_KEY")
        or os.getenv("GOOGLE_MAPS_API_KEY")
        or ""
    ).strip()


def _geoapify_key() -> str:
    return (
        os.getenv("FLOWSYNC_GEOAPIFY_API_KEY")
        or os.getenv("GEOAPIFY_API_KEY")
        or ""
    ).strip()


def _provider_mode() -> str:
    return (
        os.getenv("FLOWSYNC_PLACE_SEARCH_PROVIDER")
        or os.getenv("FLOWSYNC_GEOCODING_PROVIDER")
        or ""
    ).lower().strip()


def _fallback_mode() -> str:
    return (os.getenv("FLOWSYNC_PLACE_SEARCH_FALLBACK") or "").lower().strip()


def _enabled() -> bool:
    provider = _provider_mode()

    if provider in {"google", "google_places", "hybrid"}:
        return bool(_google_key() or _geoapify_key())

    if provider in {"geoapify", "geoapify_places"}:
        return bool(_geoapify_key())

    return False


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


def _http_post_json(url: str, payload: Dict[str, Any], headers: Dict[str, str]) -> Dict[str, Any]:
    body = json.dumps(payload).encode("utf-8")

    request = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={
            "Accept": "application/json",
            "Content-Type": "application/json",
            "User-Agent": "FlowSync/1.0",
            **headers,
        },
    )

    with urllib.request.urlopen(request, timeout=12) as response:
        return json.loads(response.read().decode("utf-8"))


def _tokens(value: Any) -> List[str]:
    return [token for token in _clean(value).lower().split() if len(token) >= 2]


def _search_text(query: str) -> str:
    query = _clean(query)

    if not query:
        return ""

    lowered = query.lower()

    if "dubai" in lowered or "uae" in lowered or "united arab emirates" in lowered:
        return query

    return f"{query}, Dubai, United Arab Emirates"


def _score_location(query: str, location: Dict[str, Any]) -> int:
    query_clean = _clean(query).lower()
    query_tokens = _tokens(query)

    haystack = " ".join(
        [
            _clean(location.get("name")),
            _clean(location.get("display_name")),
            _clean(location.get("address")),
            _clean(location.get("city")),
            _clean(location.get("area")),
            _clean(location.get("category")),
        ]
    ).lower()

    score = 0

    if query_clean and query_clean in haystack:
        score += 80

    for token in query_tokens:
        if token in haystack:
            score += 15

    provider_name = location.get("provider_name")

    if provider_name == "flowsync_verified_place":
        score += 120
    elif provider_name == "google_places":
        score += 80
    elif provider_name == "geoapify":
        score += 60

    return score


def _dedupe_rank_locations(query: str, locations: List[Dict[str, Any]], limit: int = 10) -> List[Dict[str, Any]]:
    seen = set()
    ranked = []

    for item in locations:
        latitude = _number(item.get("latitude", item.get("lat")))
        longitude = _number(item.get("longitude", item.get("lng")))

        if not latitude or not longitude:
            continue

        key = (
            _clean(item.get("name")).lower(),
            round(latitude, 5),
            round(longitude, 5),
        )

        if key in seen:
            continue

        seen.add(key)
        copy = dict(item)
        copy["_score"] = _score_location(query, copy)
        ranked.append(copy)

    ranked.sort(key=lambda value: value.get("_score", 0), reverse=True)

    output = []

    for item in ranked[:limit]:
        item.pop("_score", None)
        output.append(item)

    return output


def _pinned_place_matches(query: str, limit: int = 10) -> List[Dict[str, Any]]:
    query_clean = _clean(query).lower()
    query_tokens = _tokens(query)

    if not query_tokens:
        return []

    matches = []

    for item in PINNED_UAE_REAL_PLACES:
        haystack = " ".join(
            [
                _clean(item.get("name")),
                _clean(item.get("display_name")),
                _clean(item.get("address")),
                _clean(item.get("city")),
                _clean(item.get("area")),
                _clean(item.get("category")),
            ]
        ).lower()

        score = 0

        if query_clean and query_clean in haystack:
            score += 80

        for token in query_tokens:
            if token in haystack:
                score += 15

        if score > 0:
            copy = dict(item)
            copy["_score"] = score
            matches.append(copy)

    matches.sort(key=lambda value: value.get("_score", 0), reverse=True)

    output = []

    for item in matches[:limit]:
        item.pop("_score", None)
        output.append(item)

    return output


def _address_part(place: Dict[str, Any], wanted: List[str]) -> str:
    for component in place.get("addressComponents") or []:
        types = component.get("types") or []

        if any(item in types for item in wanted):
            return _clean(component.get("longText") or component.get("shortText") or "")

    return ""


def _google_place_to_location(place: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    location = place.get("location") or {}
    latitude = _number(location.get("latitude"))
    longitude = _number(location.get("longitude"))

    if not latitude or not longitude:
        return None

    display_name_obj = place.get("displayName") or {}

    name = _clean(
        display_name_obj.get("text")
        or place.get("shortFormattedAddress")
        or place.get("formattedAddress")
        or "Google place"
    )

    display_name = _clean(
        place.get("formattedAddress")
        or place.get("shortFormattedAddress")
        or name
    )

    city = (
        _address_part(place, ["locality", "administrative_area_level_2"])
        or _address_part(place, ["administrative_area_level_1"])
        or "Dubai"
    )

    area = (
        _address_part(place, ["sublocality", "sublocality_level_1", "neighborhood"])
        or _address_part(place, ["route"])
        or ""
    )

    category = _clean(place.get("primaryType") or (place.get("types") or ["place"])[0])
    place_id = _clean(place.get("id") or place.get("name") or f"google:{latitude},{longitude}")

    return {
        "place_id": place_id,
        "name": name,
        "display_name": display_name,
        "address": display_name,
        "city": city,
        "area": area,
        "category": category,
        "type": category,
        "provider_name": "google_places",
        "provider": "google_places",
        "provider_status": "real_geocoding_success",
        "external_place_id": place_id,
        "google_maps_uri": place.get("googleMapsUri"),
        **_coordinate_payload(latitude, longitude),
    }


def google_places_search(query: str, limit: int = 10) -> List[Dict[str, Any]]:
    key = _google_key()
    query = _clean(query)

    if not key or not query:
        return []

    payload = {
        "textQuery": _search_text(query),
        "pageSize": max(1, min(limit, 10)),
        "regionCode": "AE",
        "locationBias": {
            "circle": {
                "center": {
                    "latitude": DUBAI_BIAS_LAT,
                    "longitude": DUBAI_BIAS_LON,
                },
                "radius": GOOGLE_BIAS_RADIUS_M,
            }
        },
    }

    headers = {
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": (
            "places.id,"
            "places.name,"
            "places.displayName,"
            "places.formattedAddress,"
            "places.shortFormattedAddress,"
            "places.location,"
            "places.types,"
            "places.primaryType,"
            "places.addressComponents,"
            "places.googleMapsUri"
        ),
    }

    try:
        response = _http_post_json(GOOGLE_TEXT_SEARCH_URL, payload, headers)
        places = response.get("places") or []
        results = []

        for place in places:
            location = _google_place_to_location(place)

            if location:
                results.append(location)

        return _dedupe_rank_locations(query, results, limit=limit)

    except urllib.error.HTTPError as exc:
        try:
            error_body = exc.read().decode("utf-8")
        except Exception:
            error_body = str(exc)

        print(f"[google_places] search failed: HTTP {exc.code}: {error_body}")
        return []

    except Exception as exc:
        print(f"[google_places] search failed: {exc}")
        return []


def _geoapify_feature_to_location(feature: Dict[str, Any]) -> Optional[Dict[str, Any]]:
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

    city = properties.get("city") or properties.get("county") or properties.get("state") or "Dubai"

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

    search_params = urllib.parse.urlencode(
        {
            "text": _search_text(query),
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
                location = _geoapify_feature_to_location(feature)

                if location:
                    results.append(location)

        except urllib.error.HTTPError as exc:
            try:
                error_body = exc.read().decode("utf-8")
            except Exception:
                error_body = str(exc)

            print(f"[geoapify] search failed: HTTP {exc.code}: {error_body}")

        except Exception as exc:
            print(f"[geoapify] search failed: {exc}")

    return _dedupe_rank_locations(query, results, limit=limit)


def search_places(query: str, limit: int = 10) -> Tuple[str, List[Dict[str, Any]], List[str]]:
    provider = _provider_mode()
    fallback = _fallback_mode()
    attempted = []

    pinned_results = _pinned_place_matches(query, limit=limit)
    google_results = []
    geoapify_results = []

    if provider in {"google", "google_places", "hybrid"}:
        attempted.append("google_places")
        google_results = google_places_search(query, limit=limit)

        if not google_results and (fallback in {"geoapify", "geoapify_places"} or provider == "hybrid"):
            attempted.append("geoapify")
            geoapify_results = geoapify_search_places(query, limit=limit)

        combined = _dedupe_rank_locations(
            query,
            pinned_results + google_results + geoapify_results,
            limit=limit,
        )

        if combined:
            return combined[0].get("provider_name", "google_places"), combined, attempted

        return "google_places", [], attempted

    if provider in {"geoapify", "geoapify_places"}:
        attempted.append("geoapify")
        geoapify_results = geoapify_search_places(query, limit=limit)

        combined = _dedupe_rank_locations(
            query,
            pinned_results + geoapify_results,
            limit=limit,
        )

        if combined:
            return combined[0].get("provider_name", "geoapify"), combined, attempted

        return "geoapify", [], attempted

    attempted.append("geoapify")
    geoapify_results = geoapify_search_places(query, limit=limit)

    combined = _dedupe_rank_locations(
        query,
        pinned_results + geoapify_results,
        limit=limit,
    )

    if combined:
        return combined[0].get("provider_name", "geoapify"), combined, attempted

    return "none", [], attempted


async def handle_place_location_search(request: Request) -> JSONResponse:
    query = _clean(request.query_params.get("q") or request.query_params.get("query") or "")
    limit = int(_number(request.query_params.get("limit"), 10))

    if not query:
        provider = _provider_mode() or "none"
        results = []
        attempted = []
    else:
        provider, results, attempted = search_places(query, limit=limit)

    return JSONResponse(
        {
            "query": query,
            "count": len(results),
            "results": results,
            "locations": results,
            "no_exact_match": len(results) == 0,
            "provider": provider,
            "provider_status": "real_geocoding_success" if results else "provider_no_places_found",
            "providers_attempted": list(dict.fromkeys(attempted)),
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
        payload["start_provider"] = location.get("provider_name")

    if prefix == "destination":
        payload["destination"] = location.get("name") or payload.get("destination")
        payload["destination_display_name"] = location.get("display_name")
        payload["destination_provider"] = location.get("provider_name")


def register_geoapify_places_middleware(app):
    @app.middleware("http")
    async def place_search_middleware(request: Request, call_next):
        method = request.method.upper()
        path = request.url.path

        if not _enabled():
            return await call_next(request)

        if method == "GET" and path == "/api/locations/search":
            return await handle_place_location_search(request)

        if method == "POST" and path == "/api/routes/recommend":
            body_bytes = await request.body()

            try:
                payload = json.loads(body_bytes.decode("utf-8")) if body_bytes else {}

                if not isinstance(payload, dict):
                    payload = {}

            except Exception:
                payload = {}

            missing = []
            providers_attempted = []

            if not _has_coordinates(payload, "start"):
                start_query = _clean(payload.get("start_location"))
                start_provider, start_results, attempted = search_places(start_query, limit=1)
                providers_attempted.extend(attempted)

                if start_results:
                    _inject_coordinates(payload, "start", start_results[0])
                    payload["start_search_provider"] = start_provider
                else:
                    missing.append("start_location")

            if not _has_coordinates(payload, "destination"):
                destination_query = _clean(payload.get("destination"))
                destination_provider, destination_results, attempted = search_places(destination_query, limit=1)
                providers_attempted.extend(attempted)

                if destination_results:
                    _inject_coordinates(payload, "destination", destination_results[0])
                    payload["destination_search_provider"] = destination_provider
                else:
                    missing.append("destination")

            if missing:
                return JSONResponse(
                    status_code=404,
                    content={
                        "success": False,
                        "provider": _provider_mode() or "place_search",
                        "provider_status": "provider_no_places_found",
                        "providers_attempted": list(dict.fromkeys(providers_attempted)),
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
