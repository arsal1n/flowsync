// frontend/src/utils/routeResponseAdapter.js

import {
  getRecommendedRoute,
  getRouteOptionsFromResponse,
  getRouteLineFromRoute,
} from "./routePolylineUtils";

import { toLeafletPosition } from "./mapUtils";

function normalizeNumber(value, fallback = 0) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return fallback;
  }

  return numberValue;
}

function getRouteSteps(route) {
  if (Array.isArray(route?.turn_by_turn_steps)) {
    return route.turn_by_turn_steps;
  }

  if (Array.isArray(route?.turn_steps)) {
    return route.turn_steps;
  }

  return [];
}

function normalizeRoute(route, fallbackName = "Recommended Route") {
  if (!route) {
    return null;
  }

  const coordinates = Array.isArray(route.coordinates)
    ? route.coordinates
    : Array.isArray(route.polyline)
    ? route.polyline
    : [];

  const polyline = route.polyline || coordinates;

  return {
    ...route,

    route_name: route.route_name || route.name || fallbackName,

    estimated_time: normalizeNumber(
      route.estimated_time ?? route.duration_min ?? route.time_minutes,
      0
    ),

    distance_km: normalizeNumber(route.distance_km ?? route.distance, 0),

    congestion_score: normalizeNumber(route.congestion_score, 0),

    assigned_users: normalizeNumber(route.assigned_users, 0),

    route_score: normalizeNumber(route.route_score ?? route.score, 0),

    road_capacity: normalizeNumber(route.road_capacity, 0),

    capacity_ratio: normalizeNumber(route.capacity_ratio, 0),

    fairness_penalty: normalizeNumber(route.fairness_penalty, 0),

    route_type: route.route_type || "standard",

    provider: route.provider || "",

    provider_status: route.provider_status || "",

    coordinates,

    polyline,

    turn_by_turn_steps: getRouteSteps(route),

    alerts: Array.isArray(route.alerts) ? route.alerts : [],

    incidents: Array.isArray(route.incidents) ? route.incidents : [],

    start_location: route.start_location || "",

    destination: route.destination || "",
  };
}

function normalizeRoutes(routes) {
  if (!Array.isArray(routes)) {
    return [];
  }

  return routes
    .map((route, index) => normalizeRoute(route, `Route ${index + 1}`))
    .filter(Boolean);
}

function findMatchingRoute(routeOptions, targetRoute) {
  if (!targetRoute || !Array.isArray(routeOptions)) {
    return null;
  }

  const targetName = targetRoute.route_name || targetRoute.name;

  if (!targetName) {
    return null;
  }

  return (
    routeOptions.find((route) => {
      const routeName = route.route_name || route.name;
      return routeName === targetName;
    }) || null
  );
}

export function getRequestId(routeResponse) {
  return (
    routeResponse?.database_record?.request_id ||
    routeResponse?.request_id ||
    routeResponse?.requestId ||
    null
  );
}

export function getAssignmentId(routeResponse) {
  return (
    routeResponse?.database_record?.assignment_id ||
    routeResponse?.assignment_id ||
    routeResponse?.assignmentId ||
    null
  );
}

export function getSessionId(tripStartResponse) {
  return (
    tripStartResponse?.session?.session_id ||
    tripStartResponse?.session_id ||
    tripStartResponse?.sessionId ||
    null
  );
}

export function getRoutingProvider(routeResponse) {
  return (
    routeResponse?.routing_provider ||
    routeResponse?.provider ||
    routeResponse?.recommended_route?.provider ||
    ""
  );
}

export function getProviderStatus(routeResponse) {
  return (
    routeResponse?.provider_status ||
    routeResponse?.status ||
    routeResponse?.recommended_route?.provider_status ||
    ""
  );
}

export function normalizeRouteResponse(routeResponse) {
  if (!routeResponse) {
    return {
      recommendedRoute: null,
      routeOptions: [],
      selectedRoute: null,
      routeLine: [],
      routingProvider: "",
      providerStatus: "",
      requestId: null,
      assignmentId: null,
      message: "",
      raw: null,
    };
  }

  const rawRecommendedRoute = getRecommendedRoute(routeResponse);
  const recommendedRoute = normalizeRoute(rawRecommendedRoute);

  const rawRouteOptions = getRouteOptionsFromResponse(routeResponse);

  const routeOptions =
    rawRouteOptions.length > 0
      ? normalizeRoutes(rawRouteOptions)
      : recommendedRoute
      ? [recommendedRoute]
      : [];

  const matchingRecommendedRoute = findMatchingRoute(
    routeOptions,
    recommendedRoute
  );

  const selectedRoute =
    matchingRecommendedRoute || recommendedRoute || routeOptions[0] || null;

  const routeLine = getRouteLineFromRoute(selectedRoute);

  return {
    recommendedRoute,
    routeOptions,
    selectedRoute,
    routeLine,
    routingProvider: getRoutingProvider(routeResponse),
    providerStatus: getProviderStatus(routeResponse),
    requestId: getRequestId(routeResponse),
    assignmentId: getAssignmentId(routeResponse),
    message: routeResponse.message || "",
    raw: routeResponse,
  };
}

export function normalizeLocationSelection(location) {
  if (!location) {
    return {
      name: "",
      address: "",
      position: null,
      raw: null,
    };
  }

  const name =
    location.name ||
    location.location_name ||
    location.display_name ||
    location.title ||
    "";

  const address =
    location.address ||
    location.full_address ||
    location.description ||
    location.display_name ||
    name;

  const position = toLeafletPosition({
    lat: location.lat ?? location.latitude,
    lng: location.lng ?? location.longitude ?? location.lon,
  });

  return {
    name,
    address,
    position,
    raw: location,
  };
}

export function buildRecommendRouteRequest({
  startLocation,
  destination,
  vehicleType = "car",
  routePreference = "balanced",
  userRole = "driver",
}) {
  const startName =
    typeof startLocation === "string"
      ? startLocation
      : startLocation?.name || startLocation?.location_name || "";

  const destinationName =
    typeof destination === "string"
      ? destination
      : destination?.name || destination?.location_name || "";

  return {
    start_location: startName,
    destination: destinationName,
    vehicle_type: vehicleType,
    route_preference: routePreference,
    user_role: userRole,
  };
}

export function buildTripStartPayload({
  selectedRoute,
  routeResponse,
  requestId,
  startLocation,
  destination,
}) {
  return {
    request_id: requestId || getRequestId(routeResponse),
    assignment_id: getAssignmentId(routeResponse),
    route: selectedRoute,
    route_name: selectedRoute?.route_name || "",
    start_location:
      typeof startLocation === "string"
        ? startLocation
        : startLocation?.name || selectedRoute?.start_location || "",
    destination:
      typeof destination === "string"
        ? destination
        : destination?.name || selectedRoute?.destination || "",
    routing_provider: getRoutingProvider(routeResponse),
    provider_status: getProviderStatus(routeResponse),
  };
}

export function getRouteSummary(route) {
  const normalizedRoute = normalizeRoute(route);

  if (!normalizedRoute) {
    return {
      routeName: "N/A",
      estimatedTime: "N/A",
      distanceKm: "N/A",
      congestionScore: "N/A",
      routeScore: "N/A",
      alertCount: 0,
    };
  }

  const alertCount =
    normalizedRoute.alerts.length + normalizedRoute.incidents.length;

  return {
    routeName: normalizedRoute.route_name,
    estimatedTime: normalizedRoute.estimated_time,
    distanceKm: normalizedRoute.distance_km,
    congestionScore: normalizedRoute.congestion_score,
    routeScore: normalizedRoute.route_score,
    alertCount,
  };
}
