// mobile/src/components/RoutePolyline.js

import React, { memo } from "react";
import { Polyline } from "react-native-maps";
import {
  getSelectedRouteCoordinates,
  normalizeCoordinates,
} from "../utils/mapUtils";

function RoutePolyline({
  selectedRoute,
  routeCoordinates,
  strokeColor = "#22c55e",
  strokeWidth = 6,
  fallbackStrokeColor = "#38bdf8",
}) {
  const selectedRouteCoordinates = getSelectedRouteCoordinates(selectedRoute);

  const fallbackCoordinates = normalizeCoordinates(routeCoordinates);

  const coordinates =
    selectedRouteCoordinates.length > 0
      ? selectedRouteCoordinates
      : fallbackCoordinates;

  if (coordinates.length < 2) {
    return null;
  }

  return (
    <Polyline
      coordinates={coordinates}
      strokeColor={selectedRoute ? strokeColor : fallbackStrokeColor}
      strokeWidth={strokeWidth}
      lineCap="round"
      lineJoin="round"
      zIndex={5}
    />
  );
}

export default memo(RoutePolyline);
