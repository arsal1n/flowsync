import { useMemo, useState } from "react";
import {
  endTrip,
  getTripSummary,
  startTrip,
  updateTripProgress,
} from "../api/flowsyncApi";
import {
  getDistanceKm,
  getEtaMinutes,
  getRouteCoordinates,
  getRouteSteps,
} from "./routeUtils";

function getVehicleCoordinateFromProgress(coords, progressPercentage) {
  if (!coords || coords.length === 0) return null;

  const safeProgress = Math.max(0, Math.min(100, progressPercentage || 0));
  const index = Math.min(
    coords.length - 1,
    Math.floor((safeProgress / 100) * (coords.length - 1))
  );

  return coords[index];
}

function calculateProgressFromStep(stepIndex, totalSteps) {
  if (!totalSteps || totalSteps <= 0) return 0;

  return Math.min(100, Math.round(((stepIndex + 1) / totalSteps) * 100));
}

function calculateRemaining(route, progressPercentage) {
  const totalMinutes = getEtaMinutes(route);
  const totalDistance = getDistanceKm(route);
  const ratio = Math.max(0, 1 - (progressPercentage || 0) / 100);

  const remainingTimeMin = Math.max(0, Math.ceil(totalMinutes * ratio));
  const remainingDistanceKm = Math.max(
    0,
    Number((totalDistance * ratio).toFixed(1))
  );

  return {
    remainingTimeMin,
    remainingDistanceKm,
    etaText:
      remainingTimeMin <= 0
        ? "Arriving now"
        : `${remainingTimeMin} min remaining`,
    distanceText:
      remainingDistanceKm <= 0
        ? "0 km remaining"
        : `${remainingDistanceKm} km remaining`,
  };
}

export function useSelectedRouteNavigation({ tripId, selectedRoute }) {
  const [sessionId, setSessionId] = useState("");
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [status, setStatus] = useState("idle");
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");

  const coordinates = useMemo(
    () => getRouteCoordinates(selectedRoute),
    [selectedRoute]
  );

  const steps = useMemo(() => getRouteSteps(selectedRoute), [selectedRoute]);

  const remaining = useMemo(
    () => calculateRemaining(selectedRoute, progressPercentage),
    [selectedRoute, progressPercentage]
  );

  const vehicleCoordinate = useMemo(
    () => getVehicleCoordinateFromProgress(coordinates, progressPercentage),
    [coordinates, progressPercentage]
  );

  const currentStep = steps[currentStepIndex] || null;

  async function startNavigation() {
    setError("");

    if (!tripId) {
      setError("Missing trip_id. Generate route first.");
      return null;
    }

    if (!selectedRoute?.route_id) {
      setError("Missing selected_route_id. Select a route first.");
      return null;
    }

    try {
      const payload = await startTrip({
        tripId,
        selectedRouteId: selectedRoute.route_id,
        selectedRoute,
      });

      setSessionId(payload.session_id || payload.session?.session_id || "");
      setCurrentStepIndex(0);
      setProgressPercentage(0);
      setStatus("active");

      return payload;
    } catch (err) {
      setError(String(err.message || err));
      return null;
    }
  }

  async function goToNextStep() {
    setError("");

    if (!sessionId) {
      setError("Start navigation first.");
      return null;
    }

    const nextIndex = Math.min(
      currentStepIndex + 1,
      Math.max(steps.length - 1, 0)
    );

    const nextProgress = calculateProgressFromStep(
      nextIndex,
      Math.max(steps.length, 1)
    );

    const nextRemaining = calculateRemaining(selectedRoute, nextProgress);

    setCurrentStepIndex(nextIndex);
    setProgressPercentage(nextProgress);

    try {
      const payload = await updateTripProgress({
        sessionId,
        currentStepIndex: nextIndex,
        progressPercentage: nextProgress,
        remainingDistanceKm: nextRemaining.remainingDistanceKm,
        remainingTimeMin: nextRemaining.remainingTimeMin,
      });

      setStatus(payload.status || "in_progress");

      return payload;
    } catch (err) {
      setError(String(err.message || err));
      return null;
    }
  }

  async function finishNavigation() {
    setError("");

    if (!sessionId) {
      setError("No active session.");
      return null;
    }

    try {
      const endPayload = await endTrip({ sessionId });

      let summaryPayload = endPayload;

      if (tripId) {
        try {
          summaryPayload = await getTripSummary(tripId);
        } catch {
          summaryPayload = endPayload;
        }
      }

      setProgressPercentage(100);
      setStatus("completed");
      setSummary(summaryPayload);

      return summaryPayload;
    } catch (err) {
      setError(String(err.message || err));
      return null;
    }
  }

  function resetNavigation() {
    setSessionId("");
    setCurrentStepIndex(0);
    setProgressPercentage(0);
    setStatus("idle");
    setSummary(null);
    setError("");
  }

  return {
    sessionId,
    status,
    currentStepIndex,
    progressPercentage,
    currentStep,
    steps,
    coordinates,
    vehicleCoordinate,
    remaining,
    summary,
    error,
    startNavigation,
    goToNextStep,
    finishNavigation,
    resetNavigation,
  };
}
