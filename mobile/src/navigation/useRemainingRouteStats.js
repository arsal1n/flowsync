// mobile/src/navigation/useRemainingRouteStats.js

import { useMemo } from "react";

import {
  calculateProgressPercent,
  calculateRemainingDistanceKm,
  calculateRouteDistanceKm,
  formatDistance,
  formatTime,
  getArrivalTimeText,
  normalizeCoordinates,
} from "./navigationMath";

export function useRemainingRouteStats({
  routeCoordinates = [],
  userLocation,
  routeEtaMin = 0,
  remainingDistanceKm,
  remainingTimeMin,
  progressPercent,
} = {}) {
  const coordinates = useMemo(
    () => normalizeCoordinates(routeCoordinates),
    [routeCoordinates]
  );

  const totalDistanceKm = useMemo(
    () => calculateRouteDistanceKm(coordinates),
    [coordinates]
  );

  const calculatedRemainingDistanceKm = useMemo(
    () => calculateRemainingDistanceKm(coordinates, userLocation),
    [coordinates, userLocation]
  );

  const displayRemainingDistanceKm =
    Number.isFinite(Number(remainingDistanceKm)) && Number(remainingDistanceKm) > 0
      ? Number(remainingDistanceKm)
      : calculatedRemainingDistanceKm;

  const displayProgressPercent = calculateProgressPercent(
    coordinates,
    userLocation,
    progressPercent
  );

  const numericRouteEta = Number(routeEtaMin || 0);

  const calculatedRemainingTimeMin =
    numericRouteEta > 0 && totalDistanceKm > 0
      ? Math.ceil((displayRemainingDistanceKm / totalDistanceKm) * numericRouteEta)
      : 0;

  const displayRemainingTimeMin =
    Number.isFinite(Number(remainingTimeMin)) && Number(remainingTimeMin) > 0
      ? Number(remainingTimeMin)
      : calculatedRemainingTimeMin;

  return {
    totalDistanceKm,
    remainingDistanceKm: displayRemainingDistanceKm,
    remainingTimeMin: displayRemainingTimeMin,
    progressPercent: displayProgressPercent,
    distanceText: formatDistance(displayRemainingDistanceKm),
    etaText: formatTime(displayRemainingTimeMin),
    arrivalTimeText: getArrivalTimeText(displayRemainingTimeMin),
  };
}
