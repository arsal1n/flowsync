import json
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict, List, Optional, Tuple

from config import get_env_value


DEFAULT_ORS_BASE_URL = "https://api.openrouteservice.org"


def get_ors_api_key() -> Optional[str]:
    return (
        get_env_value("FLOWSYNC_ROUTING_API_KEY")
        or get_env_value("FLOWSYNC_GEOCODING_API_KEY")
        or get_env_value("OPENROUTESERVICE_API_KEY")
        or get_env_value("ORS_API_KEY")
    )


def get_ors_base_url() -> str:
    return (
        get_env_value("FLOWSYNC_ROUTING_BASE_URL")
        or get_env_value("FLOWSYNC_GEOCODING_BASE_URL")
        or DEFAULT_ORS_BASE_URL
    ).rstrip("/")


def build_url(path: str, params: Optional[Dict[str, Any]] = None) -> str:
    base_url = get_ors_base_url()
    url = f"{base_url}{path}"

    if params:
        query = urllib.parse.urlencode(params)
        url = f"{url}?{query}"

    return url


def request_json(
    method: str,
    path: str,
    params: Optional[Dict[str, Any]] = None,
    body: Optional[Dict[str, Any]] = None,
    timeout_seconds: int = 12,
) -> Dict[str, Any]:
    api_key = get_ors_api_key()

    if not api_key:
        return {
            "success": False,
            "error": "OpenRouteService API key is not configured.",
            "status": "missing_api_key",
        }

    url = build_url(path, params=params)

    headers = {
        "Accept": "application/json",
        "Authorization": api_key,
        "User-Agent": "FlowSyncBackend/1.0",
    }

    data = None

    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"

    request = urllib.request.Request(
        url=url,
        data=data,
        headers=headers,
        method=method.upper(),
    )

    try:
        with urllib.request.urlopen(request, timeout=timeout_seconds) as response:
            response_body = response.read().decode("utf-8")

            return {
                "success": True,
                "status_code": response.status,
                "data": json.loads(response_body) if response_body else {},
            }

    except urllib.error.HTTPError as error:
        error_body = error.read().decode("utf-8")

        return {
            "success": False,
            "status": "http_error",
            "status_code": error.code,
            "error": error_body,
        }

    except urllib.error.URLError as error:
        return {
            "success": False,
            "status": "connection_error",
            "error": str(error),
        }

    except Exception as error:
        return {
            "success": False,
            "status": "unexpected_error",
            "error": str(error),
        }


def normalize_place_type(properties: Dict[str, Any]) -> str:
    layer = str(properties.get("layer") or "").lower()

    if layer:
        return layer

    category = str(properties.get("category") or "").lower()

    if category:
        return category

    return "place"


def extract_address(properties: Dict[str, Any]) -> str:
    parts = [
        properties.get("street"),
        properties.get("locality"),
        properties.get("region"),
        properties.get("country"),
    ]

    cleaned = [
        str(part)
        for part in parts
        if part not in {None, ""}
    ]

    if cleaned:
        return ", ".join(cleaned)

    return str(properties.get("label") or properties.get("name") or "Unknown address")


def convert_geocode_feature(feature: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    geometry = feature.get("geometry", {})
    coordinates = geometry.get("coordinates", [])

    if not isinstance(coordinates, list) or len(coordinates) < 2:
        return None

    lng = coordinates[0]
    lat = coordinates[1]

    properties = feature.get("properties", {})
    label = properties.get("label") or properties.get("name") or "Unnamed location"

    return {
        "name": str(label).split(",")[0],
        "address": extract_address(properties),
        "lat": lat,
        "lng": lng,
        "type": normalize_place_type(properties),
        "provider": "openrouteservice",
        "raw_label": label,
    }


def search_openrouteservice_locations(query: str, limit: int = 10) -> Dict[str, Any]:
    clean_query = (query or "").strip()

    if not clean_query:
        return {
            "success": False,
            "query": query,
            "results": [],
            "count": 0,
            "provider": "openrouteservice",
            "provider_status": "empty_query",
            "message": "Search query is empty.",
        }

    response = request_json(
        method="GET",
        path="/geocode/search",
        params={
            "text": clean_query,
            "size": limit,
        },
    )

    if not response["success"]:
        return {
            "success": False,
            "query": clean_query,
            "results": [],
            "count": 0,
            "provider": "openrouteservice",
            "provider_status": response.get("status", "provider_error"),
            "message": "OpenRouteService geocoding failed.",
            "provider_error": response.get("error"),
        }

    data = response.get("data", {})
    features = data.get("features", [])

    results = []

    for feature in features:
        converted = convert_geocode_feature(feature)

        if converted:
            results.append(converted)

    return {
        "success": True,
        "query": clean_query,
        "results": results,
        "count": len(results),
        "provider": "openrouteservice",
        "provider_status": "real_geocoding_success",
    }


def geocode_one_location(location_name: str) -> Optional[Tuple[float, float]]:
    result = search_openrouteservice_locations(location_name, limit=1)

    if not result.get("success"):
        return None

    results = result.get("results", [])

    if not results:
        return None

    location = results[0]

    return float(location["lng"]), float(location["lat"])


def convert_step(
    step: Dict[str, Any],
    coordinates: List[Dict[str, float]],
) -> Dict[str, Any]:
    way_points = step.get("way_points", [])
    coordinate_index = way_points[0] if way_points else 0

    if isinstance(coordinate_index, int) and 0 <= coordinate_index < len(coordinates):
        point = coordinates[coordinate_index]
    else:
        point = coordinates[0] if coordinates else {"lat": 0.0, "lng": 0.0}

    return {
        "instruction": step.get("instruction", "Continue."),
        "distance_m": round(float(step.get("distance", 0)), 1),
        "duration_min": round(float(step.get("duration", 0)) / 60, 1),
        "maneuver": str(step.get("type", "continue")),
        "road_name": step.get("name") or "Unnamed road",
        "lat": point["lat"],
        "lng": point["lng"],
    }


def calculate_basic_congestion_score(duration_seconds: float, distance_meters: float) -> int:
    if distance_meters <= 0:
        return 5

    speed_kmh = (distance_meters / 1000) / max(duration_seconds / 3600, 0.01)

    if speed_kmh >= 60:
        return 2

    if speed_kmh >= 40:
        return 4

    if speed_kmh >= 25:
        return 6

    return 8


def convert_directions_response(
    start_location: str,
    destination: str,
    data: Dict[str, Any],
) -> Optional[Dict[str, Any]]:
    features = data.get("features", [])

    if not features:
        return None

    feature = features[0]
    geometry = feature.get("geometry", {})
    raw_coordinates = geometry.get("coordinates", [])

    coordinates = [
        {
            "lat": float(point[1]),
            "lng": float(point[0]),
        }
        for point in raw_coordinates
        if isinstance(point, list) and len(point) >= 2
    ]

    properties = feature.get("properties", {})
    segments = properties.get("segments", [])

    distance_meters = 0.0
    duration_seconds = 0.0
    steps = []

    if segments:
        segment = segments[0]
        distance_meters = float(segment.get("distance", 0))
        duration_seconds = float(segment.get("duration", 0))
        raw_steps = segment.get("steps", [])

        steps = [
            convert_step(step, coordinates)
            for step in raw_steps
        ]

    if not steps and coordinates:
        steps = [
            {
                "instruction": f"Start from {start_location}.",
                "distance_m": 0,
                "duration_min": 0,
                "maneuver": "depart",
                "road_name": start_location,
                "lat": coordinates[0]["lat"],
                "lng": coordinates[0]["lng"],
            },
            {
                "instruction": f"Arrive at {destination}.",
                "distance_m": round(distance_meters, 1),
                "duration_min": round(duration_seconds / 60, 1),
                "maneuver": "arrive",
                "road_name": destination,
                "lat": coordinates[-1]["lat"],
                "lng": coordinates[-1]["lng"],
            },
        ]

    distance_km = round(distance_meters / 1000, 1)
    estimated_time = max(1, round(duration_seconds / 60))
    congestion_score = calculate_basic_congestion_score(duration_seconds, distance_meters)

    return {
        "route_name": "Real Route - OpenRouteService",
        "estimated_time": estimated_time,
        "distance_km": distance_km,
        "congestion_score": congestion_score,
        "road_capacity": 18,
        "route_type": "real_provider_route",
        "residential_impact": 2,
        "accident_risk": 3,
        "weather_risk": 2,
        "stop_frequency": len(steps),
        "fuel_estimate_liters": round(max(distance_km * 0.095, 0.2), 2),
        "toll_cost": 0,
        "eco_score": 7,
        "provider": "openrouteservice",
        "provider_status": "real_routing_success",
        "start_location": start_location,
        "destination": destination,
        "coordinates": coordinates,
        "polyline": coordinates,
        "turn_steps": steps,
        "turn_by_turn_steps": steps,
        "alerts": [
            {
                "type": "provider_route",
                "message": "Route generated from OpenRouteService provider.",
                "severity": "low",
            }
        ],
        "incidents": [],
    }


def get_openrouteservice_route_options(
    start_location: str,
    destination: str,
) -> Dict[str, Any]:
    start_point = geocode_one_location(start_location)
    destination_point = geocode_one_location(destination)

    if not start_point or not destination_point:
        return {
            "success": False,
            "provider": "openrouteservice",
            "provider_status": "geocoding_failed",
            "routes": [],
            "message": "Could not geocode start or destination using OpenRouteService.",
        }

    response = request_json(
        method="POST",
        path="/v2/directions/driving-car/geojson",
        body={
            "coordinates": [
                [start_point[0], start_point[1]],
                [destination_point[0], destination_point[1]],
            ],
            "instructions": True,
        },
    )

    if not response["success"]:
        return {
            "success": False,
            "provider": "openrouteservice",
            "provider_status": response.get("status", "routing_failed"),
            "routes": [],
            "message": "OpenRouteService routing failed.",
            "provider_error": response.get("error"),
        }

    route = convert_directions_response(
        start_location=start_location,
        destination=destination,
        data=response.get("data", {}),
    )

    if not route:
        return {
            "success": False,
            "provider": "openrouteservice",
            "provider_status": "empty_routing_response",
            "routes": [],
            "message": "OpenRouteService returned no route geometry.",
        }

    return {
        "success": True,
        "provider": "openrouteservice",
        "provider_status": "real_routing_success",
        "routes": [route],
        "message": "OpenRouteService route generated successfully.",
    }