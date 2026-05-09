// frontend/src/utils/navigationUtils.js

import { normalizeCoordinates, toLeafletPosition } from "./mapUtils";
import { getRouteLineFromRoute } from "./routePolylineUtils";

/**
 * Gets turn-by-turn steps from a backend route.
 *
 * Backend may return:
 * - turn_by_turn_steps
 * - turn_steps
 */
export function getTurnByTurnSteps(route) {
  if (Array.isArray(route?.turn_by_turn_steps)) {
    return route.turn_by_turn_steps;
  }

  if (Array.isArray(route?.turn_steps)) {
    return route.turn_steps;
  }

  return [];
}

/**
 * Gets the current navigation step safely.
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
 * Gets the next navigation step safely.
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
    lng: step.lng ?? step.longitude ?? step.lon,
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
 * Gets the live navigation object from the backend response.
 *
 * Backend can return it at:
 * - payload.live_navigation
 * - payload.session.live_navigation
 */
function getNestedLiveNavigation(payload) {
  return payload?.live_navigation || payload?.session?.live_navigation || {};
}

/**
 * Gets the backend session object if present.
 */
function getBackendSession(payload) {
  return payload?.session || {};
}

/**
 * Gets route coordinates from live backend payload.
 */
function getLiveRouteCoordinates(payload) {
  const liveNavigation = getNestedLiveNavigation(payload);

  if (Array.isArray(liveNavigation.route_coordinates)) {
    return liveNavigation.route_coordinates;
  }

  if (Array.isArray(liveNavigation.polyline)) {
    return liveNavigation.polyline;
  }

  if (Array.isArray(payload?.route_coordinates)) {
    return payload.route_coordinates;
  }

  if (Array.isArray(payload?.polyline)) {
    return payload.polyline;
  }

  if (Array.isArray(payload?.route_line)) {
    return payload.route_line;
  }

  if (Array.isArray(payload?.completed_route_segment)) {
    return payload.completed_route_segment;
  }

  return [];
}

/**
 * Normalizes possible live navigation payload shapes from backend.
 */
export function normalizeLiveNavigationPayload(payload) {
  if (!payload) {
    return null;
  }

  const session = getBackendSession(payload);
  const liveNavigation = getNestedLiveNavigation(payload);

  const rawCurrentStepIndex =
    liveNavigation.current_step_index ??
    payload.current_step_index ??
    session.current_step_index ??
    payload.currentStepIndex ??
    payload.step_index ??
    payload.stepIndex ??
    0;

  const currentLocation =
    liveNavigation.current_location ||
    payload.current_location ||
    payload.currentLocation ||
    payload.location ||
    null;

  const routeCoordinates = getLiveRouteCoordinates(payload);

  return {
    sessionId:
      session.session_id ||
      payload.session_id ||
      payload.sessionId ||
      null,

    requestId:
      payload.request_id ||
      payload.requestId ||
      payload.database_record?.request_id ||
      null,

    status: session.status || payload.status || payload.session_status || "active",

    currentStepIndex: Number(rawCurrentStepIndex) || 0,

    currentInstruction:
      liveNavigation.current_instruction ||
      payload.current_instruction ||
      payload.currentInstruction ||
      liveNavigation.current_step?.instruction ||
      payload.current_step?.instruction ||
      "",

    nextInstruction:
      liveNavigation.next_instruction ||
      payload.next_instruction ||
      payload.nextInstruction ||
      liveNavigation.next_step?.instruction ||
      payload.next_step?.instruction ||
      "",

    progressPercent:
      liveNavigation.progress_percent ??
      payload.progress_percent ??
      payload.progressPercent ??
      payload.progress ??
      null,

    alerts: Array.isArray(liveNavigation.alerts)
      ? liveNavigation.alerts
      : Array.isArray(payload.alerts)
      ? payload.alerts
      : [],

    incidents: Array.isArray(liveNavigation.incidents)
      ? liveNavigation.incidents
      : Array.isArray(payload.incidents)
      ? payload.incidents
      : [],

    currentLocation: currentLocation ? toLeafletPosition(currentLocation) : null,

    routeLine: Array.isArray(routeCoordinates)
      ? normalizeCoordinates(routeCoordinates)
      : [],

    remainingSteps: Array.isArray(liveNavigation.remaining_steps)
      ? liveNavigation.remaining_steps
      : [],

    raw: payload,
  };
}

/**
 * Builds a navigation state object for the UI.
 *
 * Combines:
 * - selected route steps
 * - local simulated progress
 * - optional backend live navigation payload
 */
export function buildNavigationState({
  selectedRoute,
  currentStepIndex = 0,
  sessionId = null,
  requestId = null,
  status = "idle",
  liveNavigationPayload = null,
}) {
  const normalizedLivePayload =
    normalizeLiveNavigationPayload(liveNavigationPayload);

  const steps = getTurnByTurnSteps(selectedRoute);

  const effectiveStepIndex =
    normalizedLivePayload?.currentStepIndex ?? currentStepIndex;

  const currentStep = getCurrentStep(steps, effectiveStepIndex);
  const nextStep = getNextStep(steps, effectiveStepIndex);

  const simulatedCurrentLocation = getSimulatedCurrentLocation(
    selectedRoute,
    effectiveStepIndex
  );

  const completedRouteSegment = getCompletedRouteSegment(
    selectedRoute,
    effectiveStepIndex
  );

  return {
    sessionId: normalizedLivePayload?.sessionId || sessionId,
    requestId: normalizedLivePayload?.requestId || requestId,
    status: normalizedLivePayload?.status || status,

    currentStepIndex: effectiveStepIndex,
    totalSteps: steps.length,

    progressPercent:
      normalizedLivePayload?.progressPercent ??
      getNavigationProgressPercent(effectiveStepIndex, steps.length),

    currentStep,
    nextStep,

    currentInstruction:
      normalizedLivePayload?.currentInstruction ||
      currentStep?.instruction ||
      "",

    nextInstruction:
      normalizedLivePayload?.nextInstruction || nextStep?.instruction || "",

    currentLocation:
      normalizedLivePayload?.currentLocation || simulatedCurrentLocation,

    completedRouteSegment:
      normalizedLivePayload?.routeLine?.length > 0
        ? normalizedLivePayload.routeLine.slice(0, effectiveStepIndex + 1)
        : completedRouteSegment,

    steps,

    remainingSteps: normalizedLivePayload?.remainingSteps || [],

    alerts: normalizedLivePayload?.alerts || [],
    incidents: normalizedLivePayload?.incidents || [],

    livePayload: normalizedLivePayload,
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
        lng: item.lng ?? item.longitude ?? item.lon,
      });

      return {
        id: item.id || `${item.type}-${index}`,
        item,
        position,
      };
    })
    .filter((marker) => marker.position !== null);
}
