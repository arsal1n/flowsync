// frontend/src/utils/navigationUtils.js

import { normalizeCoordinates, toLeafletPosition } from "./mapUtils";
import { getRouteLineFromRoute } from "./routePolylineUtils";

/**
 * Gets turn-by-turn steps from a backend route.
 *
 * Backend expected:
 * recommended_route.turn_by_turn_steps
 */
export function getTurnByTurnSteps(route) {
  if (!route || !Array.isArray(route.turn_by_turn_steps)) {
    return [];
  }

  return route.turn_by_turn_steps;
}

/**
 * Gets the current navigation step.
 */
export function getCurrentStep(steps, currentStepIndex) {
  if (!Array.isArray(steps) || steps.length === 0) {
    return null;
  }

  const safeIndex = Math.min(
    Math.max(Number(currentStepIndex) || 0, 0),
    steps.length - 1
  );

  return steps[safeIndex];
}

/**
 * Gets the next navigation step.
 */
export function getNextStep(steps, currentStepIndex) {
  if (!Array.isArray(steps) || steps.length === 0) {
    return null;
  }

  const nextIndex = Number(currentStepIndex) + 1;

  if (nextIndex >= steps.length) {
    return null;
  }

  return steps[nextIndex];
}

/**
 * Gets a coordinate position for a turn-by-turn step.
 */
export function getStepPosition(step) {
  if (!step) {
    return null;
  }

  return toLeafletPosition({
    lat: step.lat ?? step.latitude,
    lng: step.lng ?? step.longitude,
  });
}

/**
 * Gets all step marker positions.
 */
export function getStepPositions(steps) {
  if (!Array.isArray(steps)) {
    return [];
  }

  return steps
    .map((step, index) => ({
      index,
      step,
      position: getStepPosition(step),
    }))
    .filter((item) => item.position !== null);
}

/**
 * Calculates navigation progress percentage.
 */
export function getNavigationProgressPercent(currentStepIndex, totalSteps) {
  if (!totalSteps || totalSteps <= 0) {
    return 0;
  }

  const progress = ((Number(currentStepIndex) + 1) / totalSteps) * 100;

  return Math.min(Math.max(Math.round(progress), 0), 100);
}

/**
 * Gets a simulated current location along a route line.
 *
 * This is useful before real GPS is available.
 */
export function getSimulatedCurrentLocation(route, currentStepIndex) {
  const routeLine = getRouteLineFromRoute(route);

  if (!Array.isArray(routeLine) || routeLine.length === 0) {
    return null;
  }

  const safeIndex = Math.min(
    Math.max(Number(currentStepIndex) || 0, 0),
    routeLine.length - 1
  );

  return routeLine[safeIndex];
}

/**
 * Gets a highlighted route segment up to the current step.
 */
export function getCompletedRouteSegment(route, currentStepIndex) {
  const routeLine = getRouteLineFromRoute(route);

  if (!Array.isArray(routeLine) || routeLine.length === 0) {
    return [];
  }

  const safeIndex = Math.min(
    Math.max(Number(currentStepIndex) || 0, 0),
    routeLine.length - 1
  );

  return routeLine.slice(0, safeIndex + 1);
}

/**
 * Builds a basic navigation state object for the UI.
 */
export function buildNavigationState({
  selectedRoute,
  currentStepIndex = 0,
  sessionId = null,
  requestId = null,
  status = "idle",
}) {
  const steps = getTurnByTurnSteps(selectedRoute);
  const currentStep = getCurrentStep(steps, currentStepIndex);
  const nextStep = getNextStep(steps, currentStepIndex);
  const currentLocation = getSimulatedCurrentLocation(
    selectedRoute,
    currentStepIndex
  );
  const completedRouteSegment = getCompletedRouteSegment(
    selectedRoute,
    currentStepIndex
  );

  return {
    sessionId,
    requestId,
    status,
    currentStepIndex,
    totalSteps: steps.length,
    progressPercent: getNavigationProgressPercent(
      currentStepIndex,
      steps.length
    ),
    currentStep,
    nextStep,
    currentLocation,
    completedRouteSegment,
    steps,
  };
}

/**
 * Normalizes alerts/incidents from backend route response.
 */
export function getRouteAlertsAndIncidents(route) {
  if (!route) {
    return [];
  }

  const alerts = Array.isArray(route.alerts) ? route.alerts : [];
  const incidents = Array.isArray(route.incidents) ? route.incidents : [];

  return [
    ...alerts.map((alert) => ({
      type: "alert",
      ...alert,
    })),
    ...incidents.map((incident) => ({
      type: "incident",
      ...incident,
    })),
  ];
}

/**
 * Gets map positions for alerts/incidents if coordinates are available.
 */
export function getAlertIncidentMarkers(route) {
  const items = getRouteAlertsAndIncidents(route);

  return items
    .map((item, index) => {
      const position = toLeafletPosition({
        lat: item.lat ?? item.latitude,
        lng: item.lng ?? item.longitude,
      });

      return {
        id: item.id || `${item.type}-${index}`,
        item,
        position,
      };
    })
    .filter((marker) => marker.position !== null);
}

/**
 * Safely normalizes a live navigation payload from backend polling.
 */
export function normalizeLiveNavigationPayload(payload) {
  if (!payload) {
    return null;
  }

  return {
    sessionId: payload.session_id || payload.sessionId || null,
    status: payload.status || "active",
    currentStepIndex:
      payload.current_step_index ?? payload.currentStepIndex ?? 0,
    currentInstruction:
      payload.current_instruction || payload.currentInstruction || "",
    nextInstruction: payload.next_instruction || payload.nextInstruction || "",
    progressPercent:
      payload.progress_percent ?? payload.progressPercent ?? null,
    alerts: Array.isArray(payload.alerts) ? payload.alerts : [],
    currentLocation: payload.current_location
      ? toLeafletPosition(payload.current_location)
      : null,
    routeLine: payload.route_line
      ? normalizeCoordinates(payload.route_line)
      : [],
  };
}
