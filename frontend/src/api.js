const API_BASE_URL = "http://127.0.0.1:8000";

const fallbackRoutes = [
  {
    name: "Route A",
    time: "22 min",
    distance: "18.4 km",
    congestion: "High",
    score: 56,
    load: "92%",
    className: "danger",
    note: "Fastest but overloaded",
  },
  {
    name: "Route B",
    time: "26 min",
    distance: "20.1 km",
    congestion: "Balanced",
    score: 41,
    load: "61%",
    className: "recommended",
    note: "FlowSync recommended",
  },
  {
    name: "Route C",
    time: "30 min",
    distance: "22.7 km",
    congestion: "Low",
    score: 37,
    load: "38%",
    className: "safe",
    note: "Less congested",
  },
];

function getCongestionLabel(value) {
  if (typeof value === "string") return value;
  if (value >= 7) return "High";
  if (value >= 4) return "Balanced";
  return "Low";
}

function normalizeRoutes(data) {
  const recommendedName =
    typeof data.recommended_route === "string"
      ? data.recommended_route
      : data.recommended_route?.name ||
        data.recommended_route?.route_name ||
        "Route B";

  const backendRoutes = data.routes || data.route_options || [];

  if (!Array.isArray(backendRoutes) || backendRoutes.length === 0) {
    return fallbackRoutes;
  }

  return backendRoutes.map((route, index) => {
    const name =
      route.name ||
      route.route_name ||
      `Route ${String.fromCharCode(65 + index)}`;

    const estimatedTime =
      route.estimated_time ||
      route.time ||
      route.travel_time ||
      fallbackRoutes[index]?.time ||
      "N/A";

    const distance =
      route.distance ||
      route.distance_km ||
      fallbackRoutes[index]?.distance ||
      "N/A";

    const congestionValue =
      route.congestion ||
      route.congestion_score ||
      route.congestion_level ||
      fallbackRoutes[index]?.congestion ||
      "N/A";

    const isRecommended = name === recommendedName;

    return {
      name,
      time:
        typeof estimatedTime === "number"
          ? `${estimatedTime} min`
          : String(estimatedTime),
      distance:
        typeof distance === "number"
          ? `${distance} km`
          : String(distance),
      congestion: getCongestionLabel(congestionValue),
      score: route.route_score || route.score || fallbackRoutes[index]?.score || "N/A",
      load:
        route.load ||
        (route.assigned_users ? `${route.assigned_users} users` : fallbackRoutes[index]?.load),
      className: isRecommended
        ? "recommended"
        : index === 0
        ? "danger"
        : "safe",
      note: isRecommended
        ? "FlowSync recommended by backend"
        : route.note || fallbackRoutes[index]?.note || "Alternative route",
    };
  });
}

export async function getRecommendedRoute(tripData) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/routes/recommend`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(tripData),
    });

    if (!response.ok) {
      throw new Error("Route recommendation request failed");
    }

    const data = await response.json();

    console.log("Backend route response:", data);

    return {
      source: "backend",
      recommended_route:
        typeof data.recommended_route === "string"
          ? data.recommended_route
          : data.recommended_route?.name ||
            data.recommended_route?.route_name ||
            "Route B",
      reason:
        data.reason ||
        "Route recommended by FlowSync backend using congestion and route-load scoring.",
      routes: normalizeRoutes(data),
    };
  } catch (error) {
    console.log("Backend not connected. Using mock route data.", error.message);

    return {
      source: "mock",
      recommended_route: "Route B",
      reason: "Balanced route with lower congestion and moderate travel time.",
      routes: fallbackRoutes,
    };
  }
}

export async function getDashboardData() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/dashboard`);

    if (!response.ok) {
      throw new Error("Dashboard request failed");
    }

    const data = await response.json();
    console.log("Backend dashboard response:", data);

    return {
      source: "backend",
      data,
    };
  } catch (error) {
    console.log("Dashboard backend not connected.", error.message);

    return {
      source: "mock",
      data: null,
    };
  }
}

export async function getTrips() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/trips`);

    if (!response.ok) {
      throw new Error("Trips request failed");
    }

    const data = await response.json();
    console.log("Backend trips response:", data);

    return {
      source: "backend",
      data,
    };
  } catch (error) {
    console.log("Trips backend not connected.", error.message);

    return {
      source: "mock",
      data: [],
    };
  }
}