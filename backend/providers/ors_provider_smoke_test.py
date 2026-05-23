# backend/providers/ors_provider_smoke_test.py

"""
Manual smoke test for FlowSync OpenRouteService provider helper.

Run from backend folder:

python -B providers/ors_provider_smoke_test.py

Before running with real ORS key, set:

PowerShell:
$env:OPENROUTESERVICE_API_KEY="YOUR_KEY_HERE"

This script does not print the API key.
It only prints provider status, sample places, coordinate count, and step count.
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional


CURRENT_FILE = Path(__file__).resolve()
BACKEND_DIR = CURRENT_FILE.parents[1]

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from providers.openrouteservice_provider import get_routes, search_places  # noqa: E402


def print_heading(title: str) -> None:
    print("\n" + "=" * 80)
    print(title)
    print("=" * 80)


def print_json_preview(label: str, data: Any) -> None:
    print(f"\n{label}:")
    print(json.dumps(data, indent=2, ensure_ascii=False)[:2500])


def get_first_result(response: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    results = response.get("results")

    if not isinstance(results, list) or not results:
        return None

    return results[0]


def simplify_places(response: Dict[str, Any], limit: int = 3) -> Dict[str, Any]:
    results = response.get("results") or []

    return {
        "provider": response.get("provider"),
        "provider_status": response.get("provider_status"),
        "success": response.get("success"),
        "result_count": len(results),
        "first_results": [
            {
                "place_id": item.get("place_id"),
                "name": item.get("name"),
                "display_name": item.get("display_name"),
                "latitude": item.get("latitude"),
                "longitude": item.get("longitude"),
                "city": item.get("city"),
                "area": item.get("area"),
                "category": item.get("category"),
                "provider_name": item.get("provider_name"),
            }
            for item in results[:limit]
        ],
        "message": response.get("message") or response.get("error"),
    }


def simplify_route(response: Dict[str, Any]) -> Dict[str, Any]:
    routes: List[Dict[str, Any]] = response.get("routes") or []

    first_route = routes[0] if routes else {}
    coordinates = first_route.get("route_coordinates") or []
    steps = first_route.get("turn_by_turn_steps") or []

    return {
        "provider": response.get("provider"),
        "provider_status": response.get("provider_status"),
        "success": response.get("success"),
        "real_geometry": response.get("real_geometry"),
        "mock_fallback": response.get("mock_fallback"),
        "route_count": len(routes),
        "recommended_route_id": response.get("recommended_route_id"),
        "route_id": first_route.get("route_id"),
        "route_name": first_route.get("route_name"),
        "distance_km": first_route.get("distance_km"),
        "estimated_time_min": first_route.get("estimated_time_min"),
        "coordinate_count": len(coordinates),
        "turn_by_turn_steps_count": len(steps),
        "first_3_coordinates": coordinates[:3],
        "first_3_steps": [
            {
                "step_index": step.get("step_index"),
                "instruction": step.get("instruction"),
                "distance_m": step.get("distance_m"),
                "duration_min": step.get("duration_min"),
                "maneuver": step.get("maneuver"),
                "latitude": step.get("latitude"),
                "longitude": step.get("longitude"),
            }
            for step in steps[:3]
        ],
        "message": response.get("message") or response.get("error"),
    }


def main() -> None:
    has_key = bool(
        os.getenv("FLOWSYNC_ORS_API_KEY")
        or os.getenv("OPENROUTESERVICE_API_KEY")
        or os.getenv("ORS_API_KEY")
        or os.getenv("VITE_OPENROUTE_API_KEY")
    )

    print_heading("FlowSync ORS Helper Smoke Test")
    print(f"ORS key detected: {has_key}")

    print_heading('Test 1: search_places("Manipal", 10)')
    manipal_response = search_places("Manipal", 10)
    manipal_summary = simplify_places(manipal_response)
    print_json_preview("Manipal search summary", manipal_summary)

    print_heading('Test 2: search_places("Dubai Marina", 10)')
    marina_response = search_places("Dubai Marina", 10)
    marina_summary = simplify_places(marina_response)
    print_json_preview("Dubai Marina search summary", marina_summary)

    manipal_place = get_first_result(manipal_response)
    marina_place = get_first_result(marina_response)

    if not manipal_place or not marina_place:
        print_heading("Route test skipped")
        print("Could not run get_routes because one or both searches returned no results.")
        return

    print_heading("Selected route test coordinates")
    print_json_preview(
        "Selected places",
        {
            "start": {
                "name": manipal_place.get("name"),
                "display_name": manipal_place.get("display_name"),
                "latitude": manipal_place.get("latitude"),
                "longitude": manipal_place.get("longitude"),
            },
            "destination": {
                "name": marina_place.get("name"),
                "display_name": marina_place.get("display_name"),
                "latitude": marina_place.get("latitude"),
                "longitude": marina_place.get("longitude"),
            },
        },
    )

    print_heading("Test 3: get_routes(Manipal coords → Dubai Marina coords)")
    route_response = get_routes(
        start_latitude=manipal_place["latitude"],
        start_longitude=manipal_place["longitude"],
        destination_latitude=marina_place["latitude"],
        destination_longitude=marina_place["longitude"],
        preference="balanced",
        user_role="driver",
    )

    route_summary = simplify_route(route_response)
    print_json_preview("Route summary", route_summary)

    print_heading("Acceptance check")
    print(f"provider_status = {route_summary.get('provider_status')}")
    print(f"real_geometry = {route_summary.get('real_geometry')}")
    print(f"mock_fallback = {route_summary.get('mock_fallback')}")
    print(f"coordinate_count = {route_summary.get('coordinate_count')}")
    print(f"turn_by_turn_steps_count = {route_summary.get('turn_by_turn_steps_count')}")


if __name__ == "__main__":
    main()
    