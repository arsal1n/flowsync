// mobile/src/utils/mapUtils.js

export const DEFAULT_DUBAI_REGION = {
  latitude: 25.2048,
  longitude: 55.2708,
  latitudeDelta: 0.12,
  longitudeDelta: 0.12,
};

export function toNumber(value) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return null;
  }

  return numberValue;
}

export function normalizeCoordinate(point) {
  if (!point) {
    return null;
  }

  if (Array.isArray(point)) {
    const first = toNumber(point[0]);
    const second = toNumber(point[1]);

    if (first === null || second === null) {
      return null;
    }

    return {
      latitude: first,
      longitude: second,
    };
  }

  const latitude = toNumber(
    point.latitude ?? point.lat ?? point.y ?? point[0]
  );

  const longitude = toNumber(
    point.longitude ?? point.lng ?? point.lon ?? point.x ?? point[1]
  );

  if (latitude === null || longitude === null) {
    return null;
  }

  return {
    latitude,
    longitude,
  };
}

export function normalizeCoordinates(points) {
  if (!Array.isArray(points)) {
    return [];
  }

  return points
    .map((point) => normalizeCoordinate(point))
    .filter((point) => point !== null);
}

export function getSelectedRouteCoordinates(selectedRoute) {
  if (!selectedRoute) {
    return [];
  }

  if (Array.isArray(selectedRoute.route_coordinates)) {
    return normalizeCoordinates(selectedRoute.route_coordinates);
  }

  if (Array.isArray(selectedRoute.coordinates)) {
    return normalizeCoordinates(selectedRoute.coordinates);
  }

  if (Array.isArray(selectedRoute.polyline)) {
    return normalizeCoordinates(selectedRoute.polyline);
  }

  if (Array.isArray(selectedRoute.polyline_coordinates)) {
    return normalizeCoordinates(selectedRoute.polyline_coordinates);
  }

  return [];
}

export function getStartCoordinate(selectedRoute) {
  const coordinates = getSelectedRouteCoordinates(selectedRoute);

  if (coordinates.length === 0) {
    return null;
  }

  return coordinates[0];
}

export function getDestinationCoordinate(selectedRoute) {
  const coordinates = getSelectedRouteCoordinates(selectedRoute);

  if (coordinates.length === 0) {
    return null;
  }

  return coordinates[coordinates.length - 1];
}

export function getCoordinateRegion(coordinate, delta = 0.04) {
  const normalizedCoordinate = normalizeCoordinate(coordinate);

  if (!normalizedCoordinate) {
    return DEFAULT_DUBAI_REGION;
  }

  return {
    latitude: normalizedCoordinate.latitude,
    longitude: normalizedCoordinate.longitude,
    latitudeDelta: delta,
    longitudeDelta: delta,
  };
}

export function getRouteRegion(coordinates) {
  const normalizedCoordinates = normalizeCoordinates(coordinates);

  if (normalizedCoordinates.length === 0) {
    return DEFAULT_DUBAI_REGION;
  }

  const latitudes = normalizedCoordinates.map((point) => point.latitude);
  const longitudes = normalizedCoordinates.map((point) => point.longitude);

  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);
  const minLongitude = Math.min(...longitudes);
  const maxLongitude = Math.max(...longitudes);

  const centerLatitude = (minLatitude + maxLatitude) / 2;
  const centerLongitude = (minLongitude + maxLongitude) / 2;

  const latitudeDelta = Math.max((maxLatitude - minLatitude) * 1.8, 0.03);
  const longitudeDelta = Math.max((maxLongitude - minLongitude) * 1.8, 0.03);

  return {
    latitude: centerLatitude,
    longitude: centerLongitude,
    latitudeDelta,
    longitudeDelta,
  };
}

export function calculateDistanceKm(startPoint, endPoint) {
  const start = normalizeCoordinate(startPoint);
  const end = normalizeCoordinate(endPoint);

  if (!start || !end) {
    return 0;
  }

  const earthRadiusKm = 6371;

  const latitudeDifference =
    ((end.latitude - start.latitude) * Math.PI) / 180;

  const longitudeDifference =
    ((end.longitude - start.longitude) * Math.PI) / 180;

  const startLatitudeRadians = (start.latitude * Math.PI) / 180;
  const endLatitudeRadians = (end.latitude * Math.PI) / 180;

  const haversineValue =
    Math.sin(latitudeDifference / 2) * Math.sin(latitudeDifference / 2) +
    Math.cos(startLatitudeRadians) *
      Math.cos(endLatitudeRadians) *
      Math.sin(longitudeDifference / 2) *
      Math.sin(longitudeDifference / 2);

  const centralAngle =
    2 * Math.atan2(Math.sqrt(haversineValue), Math.sqrt(1 - haversineValue));

  return earthRadiusKm * centralAngle;
}

export function calculateRouteDistanceKm(coordinates) {
  const normalizedCoordinates = normalizeCoordinates(coordinates);

  if (normalizedCoordinates.length < 2) {
    return 0;
  }

  let totalDistance = 0;

  for (let index = 1; index < normalizedCoordinates.length; index += 1) {
    totalDistance += calculateDistanceKm(
      normalizedCoordinates[index - 1],
      normalizedCoordinates[index]
    );
  }

  return Number(totalDistance.toFixed(2));
}

export function getSafeRouteName(selectedRoute) {
  return (
    selectedRoute?.route_name ||
    selectedRoute?.name ||
    selectedRoute?.route_id ||
    "Selected Route"
  );
}

export function getSafeRouteId(selectedRoute) {
  return (
    selectedRoute?.route_id ||
    selectedRoute?.id ||
    selectedRoute?.route_name ||
    null
  );
}

export function getSafeRouteSteps(selectedRoute) {
  if (Array.isArray(selectedRoute?.steps)) {
    return selectedRoute.steps;
  }

  if (Array.isArray(selectedRoute?.turn_by_turn_steps)) {
    return selectedRoute.turn_by_turn_steps;
  }

  if (Array.isArray(selectedRoute?.turn_steps)) {
    return selectedRoute.turn_steps;
  }

  return [];
}

export function getSafeRouteAlerts(selectedRoute) {
  const alerts = Array.isArray(selectedRoute?.alerts)
    ? selectedRoute.alerts
    : [];

  const incidents = Array.isArray(selectedRoute?.incidents)
    ? selectedRoute.incidents
    : [];

  const warnings = Array.isArray(selectedRoute?.warnings)
    ? selectedRoute.warnings
    : [];

  return [
    ...alerts.map((item) => ({
      markerType: "alert",
      ...item,
    })),
    ...incidents.map((item) => ({
      markerType: "incident",
      ...item,
    })),
    ...warnings.map((item) => ({
      markerType: "warning",
      ...item,
    })),
  ];
}

export function isSameRoute(routeA, routeB) {
  if (!routeA || !routeB) {
    return false;
  }

  const routeAId = getSafeRouteId(routeA);
  const routeBId = getSafeRouteId(routeB);

  if (routeAId && routeBId) {
    return routeAId === routeBId;
  }

  return getSafeRouteName(routeA) === getSafeRouteName(routeB);
}
