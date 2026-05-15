const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || "https://flowsync-ox5z.onrender.com";

async function parseResponse(response) {
  const text = await response.text();

  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    const message =
      data?.detail ||
      data?.message ||
      data?.error ||
      `HTTP ${response.status}`;

    throw new Error(
      typeof message === "string" ? message : JSON.stringify(message)
    );
  }

  return data;
}

export async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  return parseResponse(response);
}

export async function recommendRoutes({
  startLocation,
  destination,
  vehicleType = "car",
  routePreference = "balanced",
  userRole = "driver",
}) {
  return apiRequest("/api/routes/recommend", {
    method: "POST",
    body: JSON.stringify({
      start_location: startLocation,
      destination,
      vehicle_type: vehicleType,
      route_preference: routePreference,
      user_role: userRole,
    }),
  });
}

export async function startTrip({ tripId, selectedRouteId, selectedRoute }) {
  return apiRequest("/api/trips/start", {
    method: "POST",
    body: JSON.stringify({
      trip_id: tripId,
      selected_route_id: selectedRouteId,
      selected_route: selectedRoute,
    }),
  });
}

export async function updateTripProgress({
  sessionId,
  currentStepIndex,
  progressPercentage,
  remainingDistanceKm,
  remainingTimeMin,
}) {
  return apiRequest("/api/trips/progress", {
    method: "POST",
    body: JSON.stringify({
      session_id: sessionId,
      current_step_index: currentStepIndex,
      progress_percentage: progressPercentage,
      remaining_distance_km: remainingDistanceKm,
      remaining_time_min: remainingTimeMin,
    }),
  });
}

export async function getLiveNavigation(sessionId) {
  return apiRequest(`/api/live/navigation/${sessionId}`);
}

export async function endTrip({ sessionId }) {
  return apiRequest("/api/trips/end", {
    method: "POST",
    body: JSON.stringify({
      session_id: sessionId,
      status: "completed",
    }),
  });
}

export async function getTripSummary(tripId) {
  return apiRequest(`/api/trips/${tripId}/summary`);
}

export { API_BASE_URL };
