// mobile/src/navigation/useTripLifecycle.js

import { useCallback, useState } from "react";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || "https://flowsync-ox5z.onrender.com";

async function postJson(path, body) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body || {}),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.detail || data?.message || `HTTP ${response.status}`);
  }

  return data;
}

export function useTripLifecycle({
  selectedRoute,
  selectedRouteId,
  userRole = "driver",
  vehicleType = "car",
  onTripStarted,
  onTripProgress,
  onTripEnded,
  onError,
} = {}) {
  const [sessionId, setSessionId] = useState(null);
  const [tripStatus, setTripStatus] = useState("not_started");
  const [isTripLoading, setIsTripLoading] = useState(false);
  const [tripError, setTripError] = useState(null);

  const routeId =
    selectedRouteId ||
    selectedRoute?.route_id ||
    selectedRoute?.id ||
    selectedRoute?.route_name;

  const startTrip = useCallback(
    async (extraPayload = {}) => {
      if (!selectedRoute || !routeId) {
        const message = "No selected route available to start trip.";
        setTripError(message);

        if (typeof onError === "function") {
          onError(message);
        }

        return null;
      }

      try {
        setIsTripLoading(true);
        setTripError(null);

        const payload = {
          selected_route_id: routeId,
          route_id: routeId,
          route_name: selectedRoute.route_name,
          user_role: userRole,
          vehicle_type: vehicleType,
          ...extraPayload,
        };

        const data = await postJson("/api/trips/start", payload);

        const nextSessionId = data.session_id || data.trip_session_id || data.id;

        setSessionId(nextSessionId);
        setTripStatus(data.status || "in_progress");

        if (typeof onTripStarted === "function") {
          onTripStarted(data);
        }

        return data;
      } catch (error) {
        const message = error?.message || "Unable to start trip.";
        setTripError(message);

        if (typeof onError === "function") {
          onError(message);
        }

        return null;
      } finally {
        setIsTripLoading(false);
      }
    },
    [selectedRoute, routeId, userRole, vehicleType, onTripStarted, onError]
  );

  const updateProgress = useCallback(
    async (extraPayload = {}) => {
      const activeSessionId = extraPayload.session_id || sessionId;

      if (!activeSessionId) {
        return null;
      }

      try {
        const payload = {
          session_id: activeSessionId,
          selected_route_id: routeId,
          ...extraPayload,
        };

        const data = await postJson("/api/trips/progress", payload);

        if (data.status) {
          setTripStatus(data.status);
        }

        if (typeof onTripProgress === "function") {
          onTripProgress(data);
        }

        return data;
      } catch (error) {
        const message = error?.message || "Unable to update trip progress.";
        setTripError(message);

        if (typeof onError === "function") {
          onError(message);
        }

        return null;
      }
    },
    [sessionId, routeId, onTripProgress, onError]
  );

  const endTrip = useCallback(
    async ({ status = "completed", ...extraPayload } = {}) => {
      const activeSessionId = extraPayload.session_id || sessionId;

      if (!activeSessionId) {
        const message = "No active trip session available.";
        setTripError(message);

        if (typeof onError === "function") {
          onError(message);
        }

        return null;
      }

      try {
        setIsTripLoading(true);
        setTripError(null);

        const payload = {
          session_id: activeSessionId,
          selected_route_id: routeId,
          status,
          ...extraPayload,
        };

        const data = await postJson("/api/trips/end", payload);

        setTripStatus(data.status || status);

        if (typeof onTripEnded === "function") {
          onTripEnded(data);
        }

        return data;
      } catch (error) {
        const message = error?.message || "Unable to end trip.";
        setTripError(message);

        if (typeof onError === "function") {
          onError(message);
        }

        return null;
      } finally {
        setIsTripLoading(false);
      }
    },
    [sessionId, routeId, onTripEnded, onError]
  );

  return {
    sessionId,
    setSessionId,
    tripStatus,
    setTripStatus,
    isTripLoading,
    tripError,
    startTrip,
    updateProgress,
    endTrip,
    cancelTrip: (payload = {}) => endTrip({ ...payload, status: "cancelled" }),
    completeTrip: (payload = {}) => endTrip({ ...payload, status: "completed" }),
  };
}
