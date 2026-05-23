// mobile/src/utils/navigationUtils.js

import { getSafeRouteSteps } from "./mapUtils";
import { clampNumber, formatDistanceKm, formatTimeMin } from "./routeProgressUtils";

export const NAVIGATION_STATUS = {
  NOT_STARTED: "not_started",
  ROUTE_SELECTED: "route_selected",
  NAVIGATION_STARTED: "navigation_started",
  IN_PROGRESS: "in_progress",
  ARRIVED: "arrived",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  ERROR: "error",
};

export function getStepInstruction(step) {
  if (!step) {
    return "No instruction available.";
  }

  return (
    step.instruction ||
    step.text ||
    step.description ||
    step.maneuver?.instruction ||
    "Continue on the selected route."
  );
}

export function getStepRoadName(step) {
  if (!step) {
    return "";
  }

  return (
    step.road_name ||
    step.road ||
    step.street_name ||
    step.name ||
    step.maneuver?.road_name ||
    ""
  );
}

export function getStepDistanceLabel(step) {
  if (!step) {
    return "";
  }

  const distanceMeters =
    step.distance_m ??
    step.distanceMeters ??
    step.distance_meters ??
    step.distance;

  const numberValue = Number(distanceMeters);

  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    return "";
  }

  if (numberValue >= 1000) {
    return formatDistanceKm(numberValue / 1000);
  }

  return `${Math.round(numberValue)} m`;
}

export function getStepDurationLabel(step) {
  if (!step) {
    return "";
  }

  const durationMinutes =
    step.duration_min ??
    step.durationMinutes ??
    step.duration_mins ??
    step.duration;

  const numberValue = Number(durationMinutes);

  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    return "";
  }

  return formatTimeMin(numberValue);
}

export function getStepTurnType(step) {
  if (!step) {
    return "straight";
  }

  return (
    step.turn_direction ||
    step.turn_type ||
    step.maneuver_type ||
    step.type ||
    step.direction ||
    "straight"
  );
}

export function getNavigationSteps(selectedRoute) {
  return getSafeRouteSteps(selectedRoute).map((step, index) => ({
    step_number: step.step_number ?? step.number ?? index + 1,
    instruction: getStepInstruction(step),
    road_name: getStepRoadName(step),
    distance_label: getStepDistanceLabel(step),
    duration_label: getStepDurationLabel(step),
    turn_type: getStepTurnType(step),
    raw: step,
  }));
}

export function getCurrentStepInfo(selectedRoute, currentStepIndex = 0) {
  const steps = getNavigationSteps(selectedRoute);

  if (steps.length === 0) {
    return {
      currentStep: null,
      nextStep: null,
      currentStepIndex: 0,
      totalSteps: 0,
      isLastStep: false,
    };
  }

  const safeIndex = clampNumber(currentStepIndex, 0, steps.length - 1);

  return {
    currentStep: steps[safeIndex] ?? null,
    nextStep: steps[safeIndex + 1] ?? null,
    currentStepIndex: safeIndex,
    totalSteps: steps.length,
    isLastStep: safeIndex >= steps.length - 1,
  };
}

export function getNextStepIndex(selectedRoute, currentStepIndex = 0) {
  const steps = getNavigationSteps(selectedRoute);

  if (steps.length === 0) {
    return 0;
  }

  return clampNumber(currentStepIndex + 1, 0, steps.length - 1);
}

export function getPreviousStepIndex(selectedRoute, currentStepIndex = 0) {
  const steps = getNavigationSteps(selectedRoute);

  if (steps.length === 0) {
    return 0;
  }

  return clampNumber(currentStepIndex - 1, 0, steps.length - 1);
}

export function shouldShowArrivedState({
  hasArrived,
  currentStepIndex,
  selectedRoute,
}) {
  if (hasArrived) {
    return true;
  }

  const stepInfo = getCurrentStepInfo(selectedRoute, currentStepIndex);

  return stepInfo.isLastStep && stepInfo.totalSteps > 0;
}

export function getNavigationStatusLabel(status) {
  switch (status) {
    case NAVIGATION_STATUS.NOT_STARTED:
      return "Not started";
    case NAVIGATION_STATUS.ROUTE_SELECTED:
      return "Route selected";
    case NAVIGATION_STATUS.NAVIGATION_STARTED:
      return "Navigation started";
    case NAVIGATION_STATUS.IN_PROGRESS:
      return "In progress";
    case NAVIGATION_STATUS.ARRIVED:
      return "Arrived";
    case NAVIGATION_STATUS.COMPLETED:
      return "Completed";
    case NAVIGATION_STATUS.CANCELLED:
      return "Cancelled";
    case NAVIGATION_STATUS.ERROR:
      return "Navigation error";
    default:
      return "Ready";
  }
}

export function getNavigationPrimaryAction(status) {
  switch (status) {
    case NAVIGATION_STATUS.NOT_STARTED:
    case NAVIGATION_STATUS.ROUTE_SELECTED:
      return "Start In-App Navigation";
    case NAVIGATION_STATUS.NAVIGATION_STARTED:
    case NAVIGATION_STATUS.IN_PROGRESS:
      return "Next Step";
    case NAVIGATION_STATUS.ARRIVED:
      return "Finish Trip";
    case NAVIGATION_STATUS.COMPLETED:
      return "Back to Dashboard";
    case NAVIGATION_STATUS.CANCELLED:
      return "Plan Another Route";
    default:
      return "Start";
  }
}

export function buildTripStartPayload({ tripId, selectedRoute }) {
  return {
    trip_id: tripId ?? selectedRoute?.trip_id ?? selectedRoute?.request_id ?? null,
    selected_route_id:
      selectedRoute?.route_id ??
      selectedRoute?.id ??
      selectedRoute?.route_name ??
      null,
    route_name: selectedRoute?.route_name ?? selectedRoute?.name ?? null,
  };
}

export function buildNavigationProgressPayload({
  sessionId,
  selectedRoute,
  currentStepIndex,
  progressPercentage,
  remainingDistanceKm,
  remainingTimeMin,
  userLocation,
}) {
  return {
    session_id: sessionId,
    selected_route_id:
      selectedRoute?.route_id ??
      selectedRoute?.id ??
      selectedRoute?.route_name ??
      null,
    current_step_index: currentStepIndex,
    progress_percentage: progressPercentage,
    remaining_distance_km: remainingDistanceKm,
    remaining_time_min: remainingTimeMin,
    current_latitude: userLocation?.latitude ?? null,
    current_longitude: userLocation?.longitude ?? null,
  };
}

export function buildTripEndPayload({
  sessionId,
  selectedRoute,
  status,
  progressPercentage,
  remainingDistanceKm,
  remainingTimeMin,
}) {
  return {
    session_id: sessionId,
    selected_route_id:
      selectedRoute?.route_id ??
      selectedRoute?.id ??
      selectedRoute?.route_name ??
      null,
    route_name: selectedRoute?.route_name ?? selectedRoute?.name ?? null,
    status,
    progress_percentage: progressPercentage,
    remaining_distance_km: remainingDistanceKm,
    remaining_time_min: remainingTimeMin,
  };
}
