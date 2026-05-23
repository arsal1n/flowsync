// mobile/src/navigation/navigationTypes.js

export const NAVIGATION_STATUS = {
  IDLE: "idle",
  LOADING: "loading",
  READY: "ready",
  ACTIVE: "active",
  PAUSED: "paused",
  ARRIVED: "arrived",
  CANCELLED: "cancelled",
  COMPLETED: "completed",
  ERROR: "error",
};

export const TRIP_END_STATUS = {
  CANCELLED: "cancelled",
  COMPLETED: "completed",
};

export const START_TYPE = {
  CURRENT_LOCATION: "currentLocation",
  SEARCHED_PLACE: "searchedPlace",
};

export const MAP_FOLLOW_MODE = {
  FOLLOWING: "following",
  FREE: "free",
};

export const DRIVER_CAMERA = {
  PITCH: 55,
  ZOOM: 17.5,
  MIN_ZOOM: 17,
  MAX_ZOOM: 18,
};

export const GPS_TRACKING = {
  DISTANCE_INTERVAL_M: 5,
  TIME_INTERVAL_MS: 1500,
};

export const ROUTE_DEBUG_FIELDS = [
  "selected_route_id",
  "route_coordinates.length",
  "turn_by_turn_steps.length",
  "START_DISTANCE_KM",
  "DEST_DISTANCE_KM",
  "session_id",
];

export function getRouteIdentity(selectedRoute, selectedRouteId) {
  return (
    selectedRouteId ||
    selectedRoute?.route_id ||
    selectedRoute?.id ||
    selectedRoute?.route_name ||
    null
  );
}

export function isCurrentLocationStart(startType, startLocation) {
  return (
    startType === START_TYPE.CURRENT_LOCATION ||
    String(startLocation || "").toLowerCase() === "current location"
  );
}
