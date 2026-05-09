const API_BASE_URL = "http://127.0.0.1:8000";

const TOKEN_KEY = "flowsync_token";
const USER_KEY = "flowsync_user";

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

function setUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getStoredUser() {
  const user = localStorage.getItem(USER_KEY);
  return user ? JSON.parse(user) : null;
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function apiRequest(path, options = {}) {
  const token = getToken();

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;

    try {
      const errorData = await response.json();
      message =
        errorData.detail ||
        errorData.message ||
        errorData.error ||
        message;
    } catch {
      // keep default message
    }

    throw new Error(message);
  }

  return response.json();
}

function extractToken(data) {
  return (
    data.access_token ||
    data.token ||
    data.bearer_token ||
    data.auth_token ||
    data.jwt ||
    data?.auth?.access_token ||
    data?.auth?.token ||
    data?.session?.access_token ||
    data?.session?.token ||
    data?.data?.access_token ||
    data?.data?.token ||
    null
  );
}

export async function loginUser(email, password) {
  const data = await apiRequest("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  console.log("Login response from backend:", data);

  const token = extractToken(data);

  const user =
    data.user ||
    data.driver ||
    data.account ||
    data?.data?.user ||
    {
      email,
      user_id: data.user_id || data?.data?.user_id || "demo-driver",
      role: data.role || data?.data?.role || "driver",
      name: data.name || data?.data?.name || "FlowSync Driver",
    };

  // Backend login succeeded but returned no visible token.
  // Use demo token so frontend can continue unless backend protects endpoints strictly.
  const finalToken = token || "demo-local-token";

  setToken(finalToken);
  setUser(user);

  return {
    token: finalToken,
    user,
    raw: data,
    tokenSource: token ? "backend" : "frontend-demo-fallback",
  };
}

export async function getHealth() {
  return apiRequest("/api/health");
}

export async function getRootStatus() {
  return apiRequest("/");
}

export async function getFinalStatus() {
  return apiRequest("/api/final/status");
}

export async function getClientBootstrap() {
  return apiRequest("/api/client/bootstrap");
}

export async function getClientEndpoints() {
  return apiRequest("/api/client/endpoints");
}

export async function getRouteContract() {
  return apiRequest("/api/client/route-contract");
}

export async function searchLocations(query) {
  if (!query || query.trim().length < 2) {
    return { results: [] };
  }

  return apiRequest(
    `/api/locations/search?q=${encodeURIComponent(query.trim())}`
  );
}

export async function getRecommendedRoute(routeRequest) {
  return apiRequest("/api/routes/recommend", {
    method: "POST",
    body: JSON.stringify({
      start_location: routeRequest.start_location || "Dubai Mall",
      destination: routeRequest.destination || "Dubai Marina",
      vehicle_type: routeRequest.vehicle_type || "car",
      route_preference: routeRequest.route_preference || "balanced",
      user_role: routeRequest.user_role || "driver",
    }),
  });
}

export async function startTrip({
  start_location,
  destination,
  vehicle_type = "car",
  route_preference = "balanced",
  user_role = "driver",
  user_id = "demo-driver",
  request_id,
}) {
  return apiRequest("/api/trips/start", {
    method: "POST",
    body: JSON.stringify({
      start_location,
      destination,
      vehicle_type,
      route_preference,
      user_role,
      user_id,
      request_id,
    }),
  });
}

export async function getLiveNavigation(sessionId) {
  return apiRequest(`/api/live/navigation/${sessionId}`);
}

export async function updateTripProgress(sessionId, currentStepIndex) {
  return apiRequest("/api/trips/progress", {
    method: "POST",
    body: JSON.stringify({
      session_id: sessionId,
      current_step_index: currentStepIndex,
    }),
  });
}

export async function endTrip(sessionId, status = "completed") {
  return apiRequest("/api/trips/end", {
    method: "POST",
    body: JSON.stringify({
      session_id: sessionId,
      status,
    }),
  });
}

export async function getTripSummary(requestId) {
  return apiRequest(`/api/trips/${requestId}/summary`);
}

export async function getDashboardData() {
  return apiRequest("/api/dashboard");
}

export async function getLiveDashboard() {
  return apiRequest("/api/live/dashboard");
}

export async function getParkingPrediction(destination = "Dubai Mall") {
  return apiRequest(
    `/api/parking/predict?destination=${encodeURIComponent(destination)}`
  );
}

export async function getDriverAlerts() {
  return apiRequest("/api/alerts/driver");
}

export async function getLiveFeed() {
  return apiRequest("/api/live/feed");
}