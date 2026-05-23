// mobile/src/utils/routeProgressUtils.js

import {
  calculateDistanceKm,
  calculateRouteDistanceKm,
  getSafeRouteSteps,
  getSelectedRouteCoordinates,
  normalizeCoordinate,
  normalizeCoordinates,
} from "./mapUtils";

export function clampNumber(value, min = 0, max = 100) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return min;
  }

  return Math.min(Math.max(numberValue, min), max);
}

export function parseMinutes(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const matchedNumber = value.match(/\d+(\.\d+)?/);

    if (matchedNumber) {
      return Number(matchedNumber[0]);
    }
  }

  return 0;
}

export function getRouteEstimatedTimeMin(selectedRoute) {
  return parseMinutes(
    selectedRoute?.estimated_time_min ??
      selectedRoute?.estimated_time ??
      selectedRoute?.duration_min ??
      selectedRoute?.duration ??
      selectedRoute?.eta_min ??
      selectedRoute?.eta
  );
}

export function getRouteDistanceKm(selectedRoute) {
  const directDistance = Number(
    selectedRoute?.distance_km ??
      selectedRoute?.distance ??
      selectedRoute?.total_distance_km
  );

  if (Number.isFinite(directDistance) && directDistance > 0) {
    return directDistance;
  }

  const coordinates = getSelectedRouteCoordinates(selectedRoute);
  return calculateRouteDistanceKm(coordinates);
}

export function getNearestRoutePointIndex(coordinates, userLocation) {
  const normalizedCoordinates = normalizeCoordinates(coordinates);
  const normalizedUserLocation = normalizeCoordinate(userLocation);

  if (!normalizedUserLocation || normalizedCoordinates.length === 0) {
    return 0;
  }

  let nearestIndex = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;

  normalizedCoordinates.forEach((coordinate, index) => {
    const distance = calculateDistanceKm(normalizedUserLocation, coordinate);

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  });

  return nearestIndex;
}

export function getRouteProgressPercentage(coordinates, coordinateIndex) {
  const normalizedCoordinates = normalizeCoordinates(coordinates);

  if (normalizedCoordinates.length <= 1) {
    return 0;
  }

  const safeIndex = clampNumber(
    coordinateIndex,
    0,
    normalizedCoordinates.length - 1
  );

  return Math.round((safeIndex / (normalizedCoordinates.length - 1)) * 100);
}

export function getRemainingRouteDistanceKm(coordinates, coordinateIndex) {
  const normalizedCoordinates = normalizeCoordinates(coordinates);

  if (normalizedCoordinates.length <= 1) {
    return 0;
  }

  const safeIndex = clampNumber(
    coordinateIndex,
    0,
    normalizedCoordinates.length - 1
  );

  const remainingCoordinates = normalizedCoordinates.slice(safeIndex);

  if (remainingCoordinates.length <= 1) {
    return 0;
  }

  return calculateRouteDistanceKm(remainingCoordinates);
}

export function getRemainingTimeMin(selectedRoute, progressPercentage) {
  const totalEta = getRouteEstimatedTimeMin(selectedRoute);

  if (!totalEta) {
    return 0;
  }

  const safeProgress = clampNumber(progressPercentage, 0, 100);
  const remainingRatio = (100 - safeProgress) / 100;

  return Math.max(0, Math.ceil(totalEta * remainingRatio));
}

export function getStepIndexFromProgress(selectedRoute, progressPercentage) {
  const steps = getSafeRouteSteps(selectedRoute);

  if (steps.length === 0) {
    return 0;
  }

  if (steps.length === 1) {
    return 0;
  }

  const safeProgress = clampNumber(progressPercentage, 0, 100);
  const stepSize = 100 / steps.length;

  const calculatedIndex = Math.floor(safeProgress / stepSize);

  return clampNumber(calculatedIndex, 0, steps.length - 1);
}

export function getCurrentAndNextSteps(selectedRoute, currentStepIndex = 0) {
  const steps = getSafeRouteSteps(selectedRoute);

  if (steps.length === 0) {
    return {
      currentStep: null,
      nextStep: null,
      currentStepIndex: 0,
      totalSteps: 0,
    };
  }

  const safeStepIndex = clampNumber(currentStepIndex, 0, steps.length - 1);

  return {
    currentStep: steps[safeStepIndex] ?? null,
    nextStep: steps[safeStepIndex + 1] ?? null,
    currentStepIndex: safeStepIndex,
    totalSteps: steps.length,
  };
}

export function isArrivalReached(progressPercentage, remainingDistanceKm) {
  const safeProgress = clampNumber(progressPercentage, 0, 100);
  const safeRemainingDistance = Number(remainingDistanceKm);

  if (safeProgress >= 99) {
    return true;
  }

  if (Number.isFinite(safeRemainingDistance) && safeRemainingDistance <= 0.05) {
    return true;
  }

  return false;
}

export function getProgressStateFromUserLocation({
  selectedRoute,
  userLocation,
  fallbackStepIndex = 0,
}) {
  const routeCoordinates = getSelectedRouteCoordinates(selectedRoute);

  if (routeCoordinates.length === 0) {
    return {
      currentCoordinate: normalizeCoordinate(userLocation),
      currentCoordinateIndex: 0,
      currentStepIndex: fallbackStepIndex,
      progressPercentage: 0,
      remainingDistanceKm: getRouteDistanceKm(selectedRoute),
      remainingTimeMin: getRouteEstimatedTimeMin(selectedRoute),
      hasArrived: false,
    };
  }

  const nearestIndex = getNearestRoutePointIndex(routeCoordinates, userLocation);
  const progressPercentage = getRouteProgressPercentage(
    routeCoordinates,
    nearestIndex
  );

  const remainingDistanceKm = getRemainingRouteDistanceKm(
    routeCoordinates,
    nearestIndex
  );

  const remainingTimeMin = getRemainingTimeMin(
    selectedRoute,
    progressPercentage
  );

  const currentStepIndex = getStepIndexFromProgress(
    selectedRoute,
    progressPercentage
  );

  return {
    currentCoordinate:
      normalizeCoordinate(userLocation) ?? routeCoordinates[nearestIndex],
    currentCoordinateIndex: nearestIndex,
    currentStepIndex,
    progressPercentage,
    remainingDistanceKm,
    remainingTimeMin,
    hasArrived: isArrivalReached(progressPercentage, remainingDistanceKm),
  };
}

export function getProgressStateFromManualStep({
  selectedRoute,
  currentStepIndex = 0,
}) {
  const steps = getSafeRouteSteps(selectedRoute);
  const routeCoordinates = getSelectedRouteCoordinates(selectedRoute);

  const safeStepIndex = clampNumber(
    currentStepIndex,
    0,
    Math.max(steps.length - 1, 0)
  );

  const progressPercentage =
    steps.length > 1
      ? Math.round((safeStepIndex / (steps.length - 1)) * 100)
      : 0;

  const coordinateIndex =
    routeCoordinates.length > 1
      ? Math.round((progressPercentage / 100) * (routeCoordinates.length - 1))
      : 0;

  const remainingDistanceKm = getRemainingRouteDistanceKm(
    routeCoordinates,
    coordinateIndex
  );

  return {
    currentCoordinate: routeCoordinates[coordinateIndex] ?? null,
    currentCoordinateIndex: coordinateIndex,
    currentStepIndex: safeStepIndex,
    progressPercentage,
    remainingDistanceKm,
    remainingTimeMin: getRemainingTimeMin(selectedRoute, progressPercentage),
    hasArrived: isArrivalReached(progressPercentage, remainingDistanceKm),
  };
}

export function formatDistanceKm(distanceKm) {
  const numberValue = Number(distanceKm);

  if (!Number.isFinite(numberValue)) {
    return "0 km";
  }

  if (numberValue < 1) {
    return `${Math.round(numberValue * 1000)} m`;
  }

  return `${numberValue.toFixed(1)} km`;
}

export function formatTimeMin(minutes) {
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
