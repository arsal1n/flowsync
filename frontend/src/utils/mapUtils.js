// frontend/src/utils/mapUtils.js

export const DUBAI_CENTER = [25.2048, 55.2708];

export const DEFAULT_MAP_ZOOM = 12;

export const SELECTED_ROUTE_COLOR = "#2563eb";
export const ALTERNATIVE_ROUTE_COLOR = "#94a3b8";
export const HIGH_CONGESTION_COLOR = "#ef4444";
export const MEDIUM_CONGESTION_COLOR = "#f59e0b";
export const LOW_CONGESTION_COLOR = "#22c55e";

/**
 * Converts different coordinate shapes into Leaflet format:
 * Leaflet expects: [lat, lng]
 *
 * Supported inputs:
 * { lat: 25.1, lng: 55.2 }
 * { latitude: 25.1, longitude: 55.2 }
 * [25.1, 55.2]
 */
export function toLeafletPosition(point) {
  if (!point) {
    return null;
  }

  if (Array.isArray(point) && point.length >= 2) {
    const lat = Number(point[0]);
    const lng = Number(point[1]);

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return [lat, lng];
    }

    return null;
  }

  const lat = Number(point.lat ?? point.latitude);
  const lng = Number(point.lng ?? point.longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return [lat, lng];
}

/**
 * Converts a backend coordinate list into Leaflet polyline format.
 *
 * Backend expected:
 * [
 *   { lat: 25.1972, lng: 55.2744 },
 *   { lat: 25.0800, lng: 55.1400 }
 * ]
 *
 * Leaflet expected:
 * [
 *   [25.1972, 55.2744],
 *   [25.0800, 55.1400]
 * ]
 */
export function normalizeCoordinates(coordinates) {
  if (!Array.isArray(coordinates)) {
    return [];
  }

  return coordinates
    .map((point) => toLeafletPosition(point))
    .filter((point) => point !== null);
}

/**
 * Gets the best center for the map.
 */
export function getMapCenter(startPoint, destPoint, routeLine) {
  if (startPoint) {
    return toLeafletPosition(startPoint) || DUBAI_CENTER;
  }

  if (destPoint) {
    return toLeafletPosition(destPoint) || DUBAI_CENTER;
  }

  if (Array.isArray(routeLine) && routeLine.length > 0) {
    return toLeafletPosition(routeLine[0]) || DUBAI_CENTER;
  }

  return DUBAI_CENTER;
}

/**
 * Gets marker position from a backend location result.
 */
export function getLocationPosition(location) {
  if (!location) {
    return null;
  }

  return toLeafletPosition({
    lat: location.lat ?? location.latitude,
    lng: location.lng ?? location.longitude,
  });
}

/**
 * Returns route color based on congestion score.
 */
export function getCongestionColor(congestionScore) {
  const score = Number(congestionScore);

  if (!Number.isFinite(score)) {
    return SELECTED_ROUTE_COLOR;
  }

  if (score >= 70) {
    return HIGH_CONGESTION_COLOR;
  }

  if (score >= 40) {
    return MEDIUM_CONGESTION_COLOR;
  }

  return LOW_CONGESTION_COLOR;
}

/**
 * Returns route color based on selected status.
 */
export function getRouteColor(route, selectedRoute) {
  if (!route || !selectedRoute) {
    return ALTERNATIVE_ROUTE_COLOR;
  }

  const routeName = route.route_name || route.name;
  const selectedName = selectedRoute.route_name || selectedRoute.name;

  if (routeName && selectedName && routeName === selectedName) {
    return getCongestionColor(route.congestion_score);
  }

  return ALTERNATIVE_ROUTE_COLOR;
}

/**
 * Gets a safe display value.
 */
export function getDisplayValue(value, fallback = "N/A") {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  return value;
}
