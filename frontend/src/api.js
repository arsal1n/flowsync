const API_BASE_URL = "http://127.0.0.1:8000";

const fallbackRoutes = [
  {
    name: "Route A - Sheikh Zayed Road",
    time: "22 min",
    distance: "18.4 km",
    congestion: "High",
    score: 56,
    load: "92%",
    className: "danger",
    note: "Fastest but overloaded",
  },
  {
    name: "Route B - Al Khail Road",
    time: "26 min",
    distance: "20.1 km",
    congestion: "Balanced",
    score: 41,
    load: "61%",
    className: "recommended",
    note: "FlowSync recommended",
  },
  {
    name: "Route C - Business Bay Side Streets",
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
      : data.recommended_route?.route_name ||
        data.recommended_route?.name ||
        "Route B - Al Khail Road";

  const backendRoutes =
    data.all_routes || data.routes || data.route_options || [];

  if (!Array.isArray(backendRoutes) || backendRoutes.length === 0) {
    return fallbackRoutes;
  }

  return backendRoutes.map((route, index) => {
    const name =
      route.route_name ||
      route.name ||
      `Route ${String.fromCharCode(65 + index)}`;

    const estimatedTime =
      route.estimated_time ||
      route.time ||
      route.travel_time ||
      fallbackRoutes[index]?.time ||
      "N/A";

    const distance =
      route.distance_km ||
      route.distance ||
      fallbackRoutes[index]?.distance ||
      "N/A";

    const congestionValue =
      route.congestion_score ||
      route.congestion_level ||
      route.congestion ||
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
      score:
        route.route_score ||
        route.score ||
        fallbackRoutes[index]?.score ||
        "N/A",
      load:
        route.capacity_ratio !== undefined
          ? `${route.capacity_ratio}% capacity`
          : route.assigned_users !== undefined
          ? `${route.assigned_users} users`
          : fallbackRoutes[index]?.load,
      className: isRecommended
        ? "recommended"
        : index === 0
        ? "danger"
        : "safe",
      note: isRecommended
        ? "FlowSync recommended by backend"
        : route.route_type
        ? `Alternative ${route.route_type}`
        : fallbackRoutes[index]?.note || "Alternative route",
      road_capacity: route.road_capacity,
      assigned_users: route.assigned_users,
      capacity_ratio: route.capacity_ratio,
    };
  });
}

export async function getBackendStatus() {
  try {
    const response = await fetch(`${API_BASE_URL}/`);

    if (!response.ok) {
      throw new Error("Backend status request failed");
    }

    const data = await response.json();

    return {
      source: "backend",
      data,
    };
  } catch (error) {
    console.log("Backend status unavailable.", error.message);

    return {
      source: "mock",
      data: {
        message: "Backend not connected",
        version: "mock",
        database: "Not connected",
      },
    };
  }
}

export async function getFeatures() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/features`);

    if (!response.ok) {
      throw new Error("Features request failed");
    }

    const data = await response.json();

    return {
      source: "backend",
      data,
    };
  } catch (error) {
    console.log("Features backend not connected.", error.message);

    return {
      source: "mock",
      data: {
        total_features: 5,
        features: [
          "Adaptive Route Distribution",
          "AI Parking Prediction",
          "Real-Time Analytics Dashboard",
          "Balanced Traffic Flow",
          "Green Mobility Optimization",
        ],
      },
    };
  }
}

export async function getRecommendedRoute(tripData = {}) {
  const payload = {
    start_location: tripData.start_location || "Dubai Mall",
    destination: tripData.destination || "Dubai Marina",
    vehicle_type: tripData.vehicle_type || "car",
    route_preference: tripData.route_preference || "balanced",
    user_role: tripData.user_role || "driver",
  };

  try {
    const response = await fetch(`${API_BASE_URL}/api/routes/recommend`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error("Route recommendation request failed");
    }

    const data = await response.json();

    console.log("Backend route response:", data);

    const recommendedRoute =
      typeof data.recommended_route === "string"
        ? data.recommended_route
        : data.recommended_route?.route_name ||
          data.recommended_route?.name ||
          "Route B - Al Khail Road";

    return {
      source: "backend",
      routing_mode: data.routing_mode || "adaptive_distribution",
      recommended_route: recommendedRoute,
      reason:
        data.reason ||
        "Route recommended by FlowSync backend using congestion, road capacity, assigned users, and fairness scoring.",
      database_record: data.database_record || null,
      routes: normalizeRoutes(data),
    };
  } catch (error) {
    console.log("Backend not connected. Using mock route data.", error.message);

    return {
      source: "mock",
      routing_mode: "mock_adaptive_distribution",
      recommended_route: "Route B - Al Khail Road",
      reason: "Balanced route with lower congestion and moderate travel time.",
      database_record: null,
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

export async function getParkingPrediction(destination = "Dubai Mall") {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/parking/predict?destination=${encodeURIComponent(
        destination
      )}`
    );

    if (!response.ok) {
      throw new Error("Parking prediction request failed");
    }

    const data = await response.json();

    return {
      source: "backend",
      data,
    };
  } catch (error) {
    console.log("Parking backend not connected.", error.message);

    return {
      source: "mock",
      data: {
        best_parking_zone: "Parking Zone A",
        availability_probability: "82%",
        estimated_wait_time: "3 min",
        walking_distance: "3 min walk",
        safety_score: "High",
        difficulty_score: "Low",
      },
    };
  }
}

export async function getDriverAlerts() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/alerts/driver`);

    if (!response.ok) {
      throw new Error("Driver alerts request failed");
    }

    const data = await response.json();

    return {
      source: "backend",
      data,
    };
  } catch (error) {
    console.log("Driver alerts backend not connected.", error.message);

    return {
      source: "mock",
      data: [
        {
          alert_type: "congestion",
          message: "Heavy congestion ahead near Business Bay.",
          zone: "Business Bay",
          severity: "medium",
          time: "Now",
        },
      ],
    };
  }
}

export async function getMobileHome(userId = "demo-driver") {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/mobile/home?user_id=${encodeURIComponent(userId)}`
    );

    if (!response.ok) {
      throw new Error("Mobile home request failed");
    }

    const data = await response.json();

    return {
      source: "backend",
      data,
    };
  } catch (error) {
    console.log("Mobile home backend not connected.", error.message);

    return {
      source: "mock",
      data: {
        quick_actions: [
          "Find FlowSync Route",
          "Check Parking",
          "Report Road Issue",
          "View Alerts",
        ],
      },
    };
  }
}