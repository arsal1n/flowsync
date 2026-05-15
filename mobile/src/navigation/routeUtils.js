export function normalizeCoordinate(point) {
  if (!point) return null;

  const latitude = Number(point.latitude ?? point.lat);
  const longitude = Number(point.longitude ?? point.lng ?? point.lon);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return {
    latitude,
    longitude,
    lat: latitude,
    lng: longitude,
  };
}

export function getRouteId(route, fallbackIndex = 0) {
  return (
    route?.route_id ||
    route?.id ||
    route?.routeId ||
    `ROUTE-${String.fromCharCode(65 + fallbackIndex)}`
  );
}

export function getRouteName(route) {
  return route?.route_name || route?.name || "FlowSync Route";
}

export function getRouteCoordinates(route) {
  const raw =
    route?.route_coordinates ||
    route?.coordinates ||
    route?.polyline ||
    route?.polyline_points ||
    [];

  if (!Array.isArray(raw)) return [];

  return raw.map(normalizeCoordinate).filter(Boolean);
}

export function getRouteSteps(route) {
  const raw =
    route?.turn_by_turn_steps ||
    route?.turn_steps ||
    route?.steps ||
    [];

  return Array.isArray(raw) ? raw : [];
}

export function getTrafficDisplay(route) {
  if (route?.traffic_display) return route.traffic_display;
  if (route?.traffic_description) return route.traffic_description;

  const score = Number(route?.traffic_score ?? route?.congestion_score);

  if (!Number.isFinite(score)) return "Traffic data pending";
  if (score >= 8) return `Heavy traffic • ${score}/10`;
  if (score >= 6) return `Moderate traffic • ${score}/10`;
  if (score >= 4) return `Light traffic • ${score}/10`;

  return `Clear traffic • ${score}/10`;
}

export function getEtaMinutes(route) {
  return Number(
    route?.estimated_time_min ||
      route?.estimated_time ||
      route?.duration_min ||
      0
  );
}

export function getDistanceKm(route) {
  return Number(route?.distance_km || 0);
}

export function normalizeRoutes(routeResponse) {
  const routes =
    routeResponse?.all_routes ||
    routeResponse?.routes ||
    routeResponse?.route_options ||
    [];

  if (!Array.isArray(routes)) return [];

  return routes.map((route, index) => ({
    ...route,
    route_id: getRouteId(route, index),
  }));
}

export function getRecommendedRouteId(routeResponse) {
  return (
    routeResponse?.recommended_route_id ||
    routeResponse?.recommended_route?.route_id ||
    routeResponse?.recommendedRoute?.route_id ||
    null
  );
}

export function findSelectedRoute(routes, selectedRouteId, recommendedRouteId) {
  if (!Array.isArray(routes) || routes.length === 0) return null;

  const targetId = selectedRouteId || recommendedRouteId;

  if (targetId) {
    const selected = routes.find(
      (route) => String(route.route_id).toUpperCase() === String(targetId).toUpperCase()
    );

    if (selected) return selected;
  }

  const recommended = routes.find((route) => route.is_recommended === true);

  return recommended || routes[0];
}

export function getRouteRegion(route) {
  const coords = getRouteCoordinates(route);

  if (coords.length === 0) {
    return {
      latitude: 25.2048,
      longitude: 55.2708,
      latitudeDelta: 0.35,
      longitudeDelta: 0.35,
    };
  }

  const latitudes = coords.map((point) => point.latitude);
  const longitudes = coords.map((point) => point.longitude);

  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max(maxLat - minLat + 0.08, 0.08),
    longitudeDelta: Math.max(maxLng - minLng + 0.08, 0.08),
  };
}
