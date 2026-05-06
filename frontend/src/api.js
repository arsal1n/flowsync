import axios from "axios";

const API_BASE_URL = "http://127.0.0.1:8000";

const mockResponse = {
  source: "mock",
  recommended_route: "Route B",
  reason: "Balanced route with lower congestion and moderate travel time",
  routes: [
    {
      name: "Route A",
      estimated_time: 22,
      congestion_score: 8,
      assigned_users: 45,
      route_score: 56,
    },
    {
      name: "Route B",
      estimated_time: 26,
      congestion_score: 4,
      assigned_users: 52,
      route_score: 41,
    },
    {
      name: "Route C",
      estimated_time: 30,
      congestion_score: 2,
      assigned_users: 27,
      route_score: 37,
    },
  ],
};

function normalizeBackendResponse(data) {
  // If backend already returns frontend-ready data
  if (data.routes && data.recommended_route) {
    return {
      ...data,
      source: "backend",
    };
  }

  // If backend returns recommended_route as an object
  const recommended = data.recommended_route;

  if (typeof recommended === "object" && recommended !== null) {
    return {
      source: "backend",
      recommended_route:
        recommended.route_name || recommended.name || "Recommended Route",
      reason:
        recommended.reason ||
        "Route recommended by FlowSync backend based on traffic balance.",
      routes: [
        {
          name: recommended.route_name || "Recommended Route",
          estimated_time: recommended.estimated_time || recommended.time || "N/A",
          congestion_score:
            recommended.congestion_score || recommended.congestion_level || "N/A",
          assigned_users: recommended.assigned_users || "N/A",
          route_score: recommended.route_score || recommended.score || "N/A",
        },
      ],
    };
  }

  return mockResponse;
}

export async function getRecommendedRoute(tripData) {
  const payload = {
    start_location: tripData.start_location,
    destination: tripData.destination,
    vehicle_type: tripData.vehicle_type,
  };

  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/routes/recommend`,
      payload
    );

    return normalizeBackendResponse(response.data);
  } catch (error) {
    console.log("Backend not connected. Using mock data.", error.message);
    return mockResponse;
  }
}