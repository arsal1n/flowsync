// mobile/src/navigation/navigationMath.js

export const ARRIVAL_DISTANCE_KM = 0.08;
export const STEP_REACHED_DISTANCE_KM = 0.08;
export const OFF_ROUTE_DISTANCE_KM = 0.18;

export function toNumber(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
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

    // ORS usually returns [longitude, latitude].
    // UAE longitude is usually around 55 and latitude around 25.
    if (Math.abs(first) > 40 && Math.abs(second) <= 40) {
      return {
        latitude: second,
        longitude: first,
      };
    }

    return {
      latitude: first,
      longitude: second,
    };
  }

  const latitude = toNumber(
    point.latitude ?? point.lat ?? point.current_latitude ?? point.y
  );

  const longitude = toNumber(
    point.longitude ?? point.lng ?? point.lon ?? point.current_longitude ?? point.x
  );

  if (latitude === null || longitude === null) {
    return null;
  }

  if (!isValidCoordinate(latitude, longitude)) {
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

export function isValidCoordinate(latitude, longitude) {
  const lat = toNumber(latitude);
  const lng = toNumber(longitude);

  if (lat === null || lng === null) {
    return false;
  }

  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export function calculateDistanceKm(startPoint, endPoint) {
  const start = normalizeCoordinate(startPoint);
  const end = normalizeCoordinate(endPoint);

  if (!start || !end) {
    return 0;
  }

  const earthRadiusKm = 6371;
  const latitudeDifference = ((end.latitude - start.latitude) * Math.PI) / 180;
  const longitudeDifference = ((end.longitude - start.longitude) * Math.PI) / 180;

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

export function calculateBearing(startPoint, endPoint) {
  const start = normalizeCoordinate(startPoint);
  const end = normalizeCoordinate(endPoint);

  if (!start || !end) {
    return 0;
  }

  const startLat = (start.latitude * Math.PI) / 180;
  const endLat = (end.latitude * Math.PI) / 180;
  const deltaLng = ((end.longitude - start.longitude) * Math.PI) / 180;

  const y = Math.sin(deltaLng) * Math.cos(endLat);
  const x =
    Math.cos(startLat) * Math.sin(endLat) -
    Math.sin(startLat) * Math.cos(endLat) * Math.cos(deltaLng);

  const bearing = (Math.atan2(y, x) * 180) / Math.PI;

  return (bearing + 360) % 360;
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

  return totalDistance;
}

export function findNearestCoordinateIndex(coordinates, userLocation) {
  const normalizedCoordinates = normalizeCoordinates(coordinates);
  const currentLocation = normalizeCoordinate(userLocation);

  if (!currentLocation || normalizedCoordinates.length === 0) {
    return 0;
  }

  let nearestIndex = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;

  normalizedCoordinates.forEach((coordinate, index) => {
    const distance = calculateDistanceKm(currentLocation, coordinate);

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  });

  return nearestIndex;
}

export function findNearestCoordinateInfo(coordinates, userLocation) {
  const normalizedCoordinates = normalizeCoordinates(coordinates);
  const currentLocation = normalizeCoordinate(userLocation);
  const nearestIndex = findNearestCoordinateIndex(normalizedCoordinates, currentLocation);
  const nearestCoordinate = normalizedCoordinates[nearestIndex] || null;
  const distanceKm =
    currentLocation && nearestCoordinate
      ? calculateDistanceKm(currentLocation, nearestCoordinate)
      : Number.POSITIVE_INFINITY;

  return {
    nearestIndex,
    nearestCoordinate,
    distanceKm,
    distanceM: Math.round(distanceKm * 1000),
    isOffRoute: distanceKm > OFF_ROUTE_DISTANCE_KM,
  };
}

export function getRemainingCoordinates(coordinates, nearestIndex) {
  const normalizedCoordinates = normalizeCoordinates(coordinates);

  if (normalizedCoordinates.length === 0) {
    return [];
  }

  return normalizedCoordinates.slice(Math.max(nearestIndex, 0));
}

export function getPassedCoordinates(coordinates, nearestIndex) {
  const normalizedCoordinates = normalizeCoordinates(coordinates);

  if (normalizedCoordinates.length === 0) {
    return [];
  }

  return normalizedCoordinates.slice(
    0,
    Math.min(nearestIndex + 1, normalizedCoordinates.length)
  );
}

export function calculateRemainingDistanceKm(coordinates, userLocation) {
  const normalizedCoordinates = normalizeCoordinates(coordinates);

  if (normalizedCoordinates.length < 2) {
    return 0;
  }

  const nearestIndex = findNearestCoordinateIndex(normalizedCoordinates, userLocation);
  const remainingCoordinates = getRemainingCoordinates(
    normalizedCoordinates,
    nearestIndex
  );

  return calculateRouteDistanceKm(remainingCoordinates);
}

export function calculateProgressPercent(coordinates, userLocation, fallbackProgress) {
  const fallbackNumber = Number(fallbackProgress);

  if (Number.isFinite(fallbackNumber) && fallbackNumber > 0) {
    return Math.min(Math.max(fallbackNumber, 0), 100);
  }

  const normalizedCoordinates = normalizeCoordinates(coordinates);

  if (normalizedCoordinates.length <= 1) {
    return 0;
  }

  const nearestIndex = findNearestCoordinateIndex(normalizedCoordinates, userLocation);

  return Math.round((nearestIndex / (normalizedCoordinates.length - 1)) * 100);
}

export function getDestinationCoordinate(coordinates) {
  const normalizedCoordinates = normalizeCoordinates(coordinates);

  if (normalizedCoordinates.length === 0) {
    return null;
  }

  return normalizedCoordinates[normalizedCoordinates.length - 1];
}

export function getStartCoordinate(coordinates) {
  const normalizedCoordinates = normalizeCoordinates(coordinates);

  if (normalizedCoordinates.length === 0) {
    return null;
  }

  return normalizedCoordinates[0];
}

export function getStepCoordinate(step) {
  return normalizeCoordinate(step);
}

export function getInstructionText(step) {
  if (!step) {
    return "Continue on the selected route";
  }

  return (
    step.instruction ||
    step.text ||
    step.description ||
    step.maneuver?.instruction ||
    "Continue on the selected route"
  );
}

export function getCurrentStepIndexFromGps({
  steps,
  userLocation,
  currentStepIndex = 0,
}) {
  if (!Array.isArray(steps) || steps.length === 0) {
    return 0;
  }

  const safeCurrentIndex = Math.min(
    Math.max(Number(currentStepIndex) || 0, 0),
    steps.length - 1
  );

  const nextStep = steps[safeCurrentIndex + 1];

  if (!userLocation || !nextStep) {
    return safeCurrentIndex;
  }

  const nextStepCoordinate = getStepCoordinate(nextStep);

  if (!nextStepCoordinate) {
    return safeCurrentIndex;
  }

  const distanceToNextStepKm = calculateDistanceKm(userLocation, nextStepCoordinate);

  if (distanceToNextStepKm <= STEP_REACHED_DISTANCE_KM) {
    return Math.min(safeCurrentIndex + 1, steps.length - 1);
  }

  return safeCurrentIndex;
}

export function isArrivalReached({
  userLocation,
  routeCoordinates,
  progressPercent,
}) {
  const destinationCoordinate = getDestinationCoordinate(routeCoordinates);

  if (!userLocation || !destinationCoordinate) {
    return false;
  }

  const distanceToDestinationKm = calculateDistanceKm(
    userLocation,
    destinationCoordinate
  );

  return (
    distanceToDestinationKm <= ARRIVAL_DISTANCE_KM ||
    Number(progressPercent || 0) >= 99
  );
}

export function getRouteBearingFromUser({
  routeCoordinates,
  userLocation,
}) {
  const normalizedCoordinates = normalizeCoordinates(routeCoordinates);
  const currentLocation = normalizeCoordinate(userLocation);

  if (!currentLocation || normalizedCoordinates.length < 2) {
    return 0;
  }

  const nearestIndex = findNearestCoordinateIndex(
    normalizedCoordinates,
    currentLocation
  );

  const nextIndex = Math.min(nearestIndex + 1, normalizedCoordinates.length - 1);
  const nextPoint = normalizedCoordinates[nextIndex];

  return calculateBearing(currentLocation, nextPoint);
}

export function formatDistance(distanceKm) {
  const numberValue = Number(distanceKm);

  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    return "0 m";
  }

  if (numberValue < 1) {
    return `${Math.round(numberValue * 1000)} m`;
  }

  return `${numberValue.toFixed(1)} km`;
}

export function formatTime(minutes) {
  const numberValue = Number(minutes);

  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    return "0 min";
  }

  if (numberValue < 60) {
    return `${Math.ceil(numberValue)} min`;
  }

  const hours = Math.floor(numberValue / 60);
  const remainingMinutes = Math.ceil(numberValue % 60);

  if (remainingMinutes === 0) {
    return `${hours} hr`;
  }

  return `${hours} hr ${remainingMinutes} min`;
}

export function getArrivalTimeText(minutes) {
  const numberValue = Number(minutes);

  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    return "--:--";
  }

  const arrivalDate = new Date(Date.now() + numberValue * 60 * 1000);

  return arrivalDate.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}
