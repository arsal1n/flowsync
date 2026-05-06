def calculate_route_score(estimated_time, congestion_score, assigned_users):
    return estimated_time + (congestion_score * 2) + (assigned_users * 1.5)


def get_recommended_route(start_location, destination):
    routes = [
        {
            "route_name": "Route A - Sheikh Zayed Road",
            "estimated_time": 22,
            "distance_km": 14.5,
            "congestion_score": 8,
            "assigned_users": 12
        },
        {
            "route_name": "Route B - Al Khail Road",
            "estimated_time": 26,
            "distance_km": 16.2,
            "congestion_score": 4,
            "assigned_users": 5
        },
        {
            "route_name": "Route C - Business Bay Route",
            "estimated_time": 30,
            "distance_km": 18.1,
            "congestion_score": 2,
            "assigned_users": 2
        }
    ]

    for route in routes:
        route["route_score"] = calculate_route_score(
            route["estimated_time"],
            route["congestion_score"],
            route["assigned_users"]
        )

    recommended_route = min(routes, key=lambda route: route["route_score"])

    return {
        "start_location": start_location,
        "destination": destination,
        "recommended_route": recommended_route,
        "all_routes": routes,
        "message": "FlowSync selected the most balanced route based on time, congestion, and current route load."
    }