// frontend/src/services/backendRouteService.js

const BACKEND_BASE_URL = "http://127.0.0.1:8000";

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
      `Backend request failed with status ${response.status}`;

    throw new Error(message);
  }

  return data;
}

/**
 * Backend contract/status endpoints
 */
export async function getRouteContract() {
  return apiRequest("/api/client/route-contract");
}

export async function getClientBootstrap() {
  return apiRequest("/api/client/bootstrap");
}

export async function getClientEndpoints() {
  return apiRequest("/api/client/endpoints");
}

/**
 * Location search
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
 * Route recommendation
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
 * Start navigation session
 * POST /api/trips/start
 */
export async function startTrip(routePayload) {
  return apiRequest("/api/trips/start", {
    method: "POST",
    body: JSON.stringify(routePayload),
  });
}

/**
 * Get active navigation sessions
 * GET /api/trips/active
 */
export async function getActiveTrips() {
  return apiRequest("/api/trips/active");
}

/**
 * Get navigation session detail
 * GET /api/trips/session/{session_id}
 */
export async function getTripSession(sessionId) {
  if (!sessionId) {
    throw new Error("Session id is required.");
  }

  return apiRequest(`/api/trips/session/${sessionId}`);
}

/**
 * Live navigation polling
 * GET /api/live/navigation/{session_id}
 */
export async function getLiveNavigation(sessionId) {
  if (!sessionId) {
    throw new Error("Session id is required.");
  }

  return apiRequest(`/api/live/navigation/${sessionId}`);
}

/**
 * Live navigation overview
 * GET /api/live/navigation
 */
export async function getLiveNavigationOverview() {
  return apiRequest("/api/live/navigation");
}

/**
 * Sends simulated navigation progress.
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
 * Gets navigation session events.
 * GET /api/trips/session/{session_id}/events
 */
export async function getTripSessionEvents(sessionId) {
  if (!sessionId) {
    throw new Error("Session id is required.");
  }

  return apiRequest(`/api/trips/session/${sessionId}/events`);
}

/**
 * Ends navigation session.
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
 * Gets trip summary after trip lifecycle is saved.
 * GET /api/trips/{request_id}/summary
 */
export async function getTripSummary(requestId) {
  if (!requestId) {
    throw new Error("Request id is required.");
  }

  return apiRequest(`/api/trips/${requestId}/summary`);
}

/**
 * Driver alerts
 * GET /api/alerts/driver
 */
export async function getDriverAlerts() {
  return apiRequest("/api/alerts/driver");
}

/**
 * Live feed
 * GET /api/live/feed
 */
export async function getLiveFeed() {
  return apiRequest("/api/live/feed");
}

/**
 * Stream navigation endpoint URL.
 * This returns the URL only because EventSource needs a direct URL.
 * GET /api/stream/navigation/{session_id}
 */
export function getNavigationStreamUrl(sessionId) {
  if (!sessionId) {
    throw new Error("Session id is required.");
  }

  return `${BACKEND_BASE_URL}/api/stream/navigation/${sessionId}`;
}

/**
 * Stream feed endpoint URL.
 * GET /api/stream/feed
 */
export function getStreamFeedUrl() {
  return `${BACKEND_BASE_URL}/api/stream/feed`;
}
