// frontend/src/services/backendRouteService.js

const BACKEND_BASE_URL = "http://127.0.0.1:8000";

/**
 * Shared helper for backend API calls.
 * This file is prepared for backend integration, but the app will not use it
 * until we connect it in later steps.
 */
async function apiRequest(endpoint, options = {}) {
  const response = await fetch(`${BACKEND_BASE_URL}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message =
      data?.detail ||
      data?.message ||
      `Backend request failed: ${response.status}`;

    throw new Error(message);
  }

  return data;
}

/**
 * Reads the backend route contract.
 * Endpoint:
 * GET /api/client/route-contract
 */
export async function getRouteContract() {
  return apiRequest("/api/client/route-contract");
}

/**
 * Searches backend-supported Dubai locations.
 * Endpoint:
 * GET /api/locations/search?q=dubai
 */
export async function searchLocations(query) {
  if (!query || query.trim() === "") {
    return [];
  }

  const encodedQuery = encodeURIComponent(query.trim());

  return apiRequest(`/api/locations/search?q=${encodedQuery}`);
}

/**
 * Requests a backend route recommendation.
 * Endpoint:
 * POST /api/routes/recommend
 */
export async function recommendRoute({
  startLocation,
  destination,
  vehicleType = "car",
  routePreference = "balanced",
  userRole = "driver",
}) {
  if (!startLocation || !destination) {
    throw new Error("Start location and destination are required.");
  }

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

/**
 * Starts a trip/navigation session.
 * Endpoint:
 * POST /api/trips/start
 */
export async function startTrip(routePayload) {
  return apiRequest("/api/trips/start", {
    method: "POST",
    body: JSON.stringify(routePayload),
  });
}

/**
 * Gets live navigation state by session id.
 * Endpoint:
 * GET /api/live/navigation/{session_id}
 */
export async function getLiveNavigation(sessionId) {
  if (!sessionId) {
    throw new Error("Session id is required.");
  }

  return apiRequest(`/api/live/navigation/${sessionId}`);
}

/**
 * Sends simulated navigation progress.
 * Endpoint:
 * POST /api/trips/progress
 */
export async function updateTripProgress(sessionId, currentStepIndex) {
  if (!sessionId) {
    throw new Error("Session id is required.");
  }

  return apiRequest("/api/trips/progress", {
    method: "POST",
    body: JSON.stringify({
      session_id: sessionId,
      current_step_index: currentStepIndex,
    }),
  });
}

/**
 * Ends a trip/navigation session.
 * Endpoint:
 * POST /api/trips/end
 */
export async function endTrip(sessionId, status = "completed") {
  if (!sessionId) {
    throw new Error("Session id is required.");
  }

  return apiRequest("/api/trips/end", {
    method: "POST",
    body: JSON.stringify({
      session_id: sessionId,
      status,
    }),
  });
}

/**
 * Gets a trip summary after ending a trip.
 * Endpoint:
 * GET /api/trips/{request_id}/summary
 */
export async function getTripSummary(requestId) {
  if (!requestId) {
    throw new Error("Request id is required.");
  }

  return apiRequest(`/api/trips/${requestId}/summary`);
}

/**
 * Gets driver alerts.
 * Endpoint:
 * GET /api/alerts/driver
 */
export async function getDriverAlerts() {
  return apiRequest("/api/alerts/driver");
}

/**
 * Gets the live feed.
 * Endpoint:
 * GET /api/live/feed
 */
export async function getLiveFeed() {
  return apiRequest("/api/live/feed");
}
