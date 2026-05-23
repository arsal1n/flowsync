// mobile/src/navigation/routeValidation.js

import {
  calculateDistanceKm,
  getDestinationCoordinate,
  getStartCoordinate,
  normalizeCoordinate,
  normalizeCoordinates,
} from "./navigationMath";

export const ROUTE_VALIDATION_LIMIT_KM = 0.25;

export function getRequestStartCoordinate(routeRequest = {}) {
  return normalizeCoordinate({
    latitude: routeRequest.start_latitude,
    longitude: routeRequest.start_longitude,
  });
}

export function getRequestDestinationCoordinate(routeRequest = {}) {
  return normalizeCoordinate({
    latitude: routeRequest.destination_latitude,
    longitude: routeRequest.destination_longitude,
  });
}

export function validateRouteGeometry({
  route,
  routeCoordinates,
  requestStart,
  requestDestination,
  maxDistanceKm = ROUTE_VALIDATION_LIMIT_KM,
}) {
  const coordinates = normalizeCoordinates(
    routeCoordinates ||
      route?.route_coordinates ||
      route?.coordinates ||
      route?.polyline ||
      []
  );

  const routeFirstPoint = getStartCoordinate(coordinates);
  const routeLastPoint = getDestinationCoordinate(coordinates);

  const startCoordinate = normalizeCoordinate(requestStart);
  const destinationCoordinate = normalizeCoordinate(requestDestination);

  const startDistanceKm =
    startCoordinate && routeFirstPoint
      ? calculateDistanceKm(startCoordinate, routeFirstPoint)
      : null;

  const destinationDistanceKm =
    destinationCoordinate && routeLastPoint
      ? calculateDistanceKm(destinationCoordinate, routeLastPoint)
      : null;

  const startIsValid =
    startDistanceKm === null ? false : startDistanceKm <= maxDistanceKm;

  const destinationIsValid =
    destinationDistanceKm === null
      ? false
      : destinationDistanceKm <= maxDistanceKm;

  const isValid =
    coordinates.length > 1 && startIsValid && destinationIsValid;

  return {
    isValid,
    startIsValid,
    destinationIsValid,
    coordinateCount: coordinates.length,
    requestStart: startCoordinate,
    requestDestination: destinationCoordinate,
    routeFirstPoint,
    routeLastPoint,
    startDistanceKm,
    destinationDistanceKm,
    startDistanceM:
      startDistanceKm === null ? null : Math.round(startDistanceKm * 1000),
    destinationDistanceM:
      destinationDistanceKm === null
        ? null
        : Math.round(destinationDistanceKm * 1000),
    maxDistanceKm,
    debugMessage: isValid
      ? "Route geometry matches request start/destination."
      : "Route geometry does not match request start/destination.",
  };
}

export function buildRouteValidationDebugText(validation) {
  if (!validation) {
    return "No route validation available.";
  }

  return [
    `valid=${validation.isValid}`,
    `coordinate_count=${validation.coordinateCount}`,
    `start_distance_m=${validation.startDistanceM}`,
    `destination_distance_m=${validation.destinationDistanceM}`,
  ].join(" • ");
}

export function shouldBlockRouteBecauseSameLocation({
  startCoordinate,
  destinationCoordinate,
  thresholdKm = 0.05,
}) {
  const start = normalizeCoordinate(startCoordinate);
  const destination = normalizeCoordinate(destinationCoordinate);

  if (!start || !destination) {
    return false;
  }

  return calculateDistanceKm(start, destination) <= thresholdKm;
}
