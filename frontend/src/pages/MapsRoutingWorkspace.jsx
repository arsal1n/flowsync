// frontend/src/pages/MapsRoutingWorkspace.jsx

import { useEffect, useMemo, useState } from "react";

import LocationSearch from "../components/LocationSearch";
import InteractiveMap from "../components/InteractiveMap";
import RouteCards from "../components/RouteCards";
import NavigationPanel from "../components/NavigationPanel";
import AlertsPanel from "../components/AlertsPanel";

import {
  recommendRoute,
  startTrip,
  updateTripProgress,
  endTrip,
  getLiveNavigation,
} from "../services/backendRouteService";

import {
  buildNavigationState,
  getTurnByTurnSteps,
} from "../utils/navigationUtils";

import { getRouteLineFromRoute } from "../utils/routePolylineUtils";

import {
  buildRecommendRouteRequest,
  buildTripStartPayload,
  normalizeLocationSelection,
  normalizeRouteResponse,
} from "../utils/routeResponseAdapter";

import "../styles/mapsRoutingWorkspace.css";

function getRouteEndpointPosition(route, type) {
  const routeLine = getRouteLineFromRoute(route);

  if (!Array.isArray(routeLine) || routeLine.length === 0) {
    return null;
  }

  if (type === "start") {
    return routeLine[0];
  }

  if (type === "destination") {
    return routeLine[routeLine.length - 1];
  }

  return null;
}

function MapsRoutingWorkspace() {
  const [startLocation, setStartLocation] = useState(null);
  const [destinationLocation, setDestinationLocation] = useState(null);

  const [routeResponse, setRouteResponse] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);

  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [isNavigationActive, setIsNavigationActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [sessionId, setSessionId] = useState(null);
  const [requestId, setRequestId] = useState(null);
  const [liveNavigationPayload, setLiveNavigationPayload] = useState(null);

  const normalizedRouteData = useMemo(
    () => normalizeRouteResponse(routeResponse),
    [routeResponse]
  );

  const routeOptions = normalizedRouteData.routeOptions;
  const routingProvider = normalizedRouteData.routingProvider;
  const providerStatus = normalizedRouteData.providerStatus;

  const activeSelectedRoute =
    selectedRoute || normalizedRouteData.selectedRoute || null;

  const startSelection = normalizeLocationSelection(startLocation);
  const destinationSelection = normalizeLocationSelection(destinationLocation);

  const startMapPoint =
    startSelection.position ||
    getRouteEndpointPosition(activeSelectedRoute, "start");

  const destinationMapPoint =
    destinationSelection.position ||
    getRouteEndpointPosition(activeSelectedRoute, "destination");

  const navigationState = useMemo(() => {
    return buildNavigationState({
      selectedRoute: activeSelectedRoute,
      currentStepIndex,
      sessionId,
      requestId,
      status: isNavigationActive ? "active" : "idle",
      liveNavigationPayload,
    });
  }, [
    activeSelectedRoute,
    currentStepIndex,
    sessionId,
    requestId,
    isNavigationActive,
    liveNavigationPayload,
  ]);

  useEffect(() => {
    if (!isNavigationActive || !sessionId) {
      return undefined;
    }

    let cancelled = false;

    async function pollLiveNavigation() {
      try {
        const payload = await getLiveNavigation(sessionId);

        if (cancelled) {
          return;
        }

        setLiveNavigationPayload(payload);
      } catch (error) {
        console.error(error);

        if (cancelled) {
          return;
        }

        setLiveNavigationPayload(null);
        setErrorMessage(
          error.message || "Live navigation polling failed."
        );
      }
    }

    pollLiveNavigation();

    const intervalId = setInterval(pollLiveNavigation, 3000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [isNavigationActive, sessionId]);

  async function handleFindRoute(searchPayload) {
    setIsLoadingRoute(true);
    setErrorMessage("");
    setStatusMessage("Requesting route recommendation from backend...");
    setIsNavigationActive(false);
    setCurrentStepIndex(0);
    setSessionId(null);
    setLiveNavigationPayload(null);

    const routeRequest = buildRecommendRouteRequest({
      startLocation: searchPayload.start_location,
      destination: searchPayload.destination,
      vehicleType: searchPayload.vehicle_type,
      routePreference: searchPayload.route_preference,
      userRole: searchPayload.user_role,
    });

    try {
      const backendResponse = await recommendRoute({
        startLocation: routeRequest.start_location,
        destination: routeRequest.destination,
        vehicleType: routeRequest.vehicle_type,
        routePreference: routeRequest.route_preference,
        userRole: routeRequest.user_role,
      });

      const normalized = normalizeRouteResponse(backendResponse);

      setRouteResponse(backendResponse);
      setSelectedRoute(normalized.selectedRoute);
      setRequestId(normalized.requestId);

      setStatusMessage(
        normalized.message ||
          "Backend route recommendation loaded successfully."
      );
    } catch (error) {
      console.error(error);

      setRouteResponse(null);
      setSelectedRoute(null);
      setRequestId(null);

      setStatusMessage("");
      setErrorMessage(
        error.message ||
          "Backend route request failed. Make sure the backend is running."
      );
    } finally {
      setIsLoadingRoute(false);
    }
  }

  async function handleStartNavigation() {
    if (!activeSelectedRoute) {
      setErrorMessage("Select a route before starting navigation.");
      return;
    }

    setErrorMessage("");
    setStatusMessage("Starting navigation session...");
    setLiveNavigationPayload(null);

    const tripPayload = buildTripStartPayload({
      selectedRoute: activeSelectedRoute,
      routeResponse,
      requestId,
      startLocation,
      destination: destinationLocation,
    });

    try {
      const response = await startTrip(tripPayload);

      const backendSessionId =
        response?.session?.session_id ||
        response?.session_id ||
        response?.sessionId ||
        null;

      if (!backendSessionId) {
        throw new Error("Backend did not return a session_id.");
      }

      setSessionId(backendSessionId);
      setIsNavigationActive(true);
      setCurrentStepIndex(0);
      setStatusMessage("Navigation started. Live updates polling every 3 seconds.");
    } catch (error) {
      console.error(error);

      setIsNavigationActive(false);
      setSessionId(null);
      setLiveNavigationPayload(null);
      setStatusMessage("");
      setErrorMessage(
        error.message ||
          "Failed to start navigation. Check the backend trip endpoint."
      );
    }
  }

  async function handleNextStep() {
    if (!activeSelectedRoute || !isNavigationActive) {
      return;
    }

    const steps = getTurnByTurnSteps(activeSelectedRoute);
    const maxIndex = Math.max(steps.length - 1, 0);
    const nextIndex = Math.min(currentStepIndex + 1, maxIndex);

    setCurrentStepIndex(nextIndex);

    if (sessionId) {
      try {
        const response = await updateTripProgress(sessionId, nextIndex);
        setLiveNavigationPayload(response);
      } catch (error) {
        console.error(error);
        setErrorMessage(error.message || "Failed to update trip progress.");
      }
    }
  }

  async function handleEndNavigation() {
    if (!sessionId) {
      setIsNavigationActive(false);
      setLiveNavigationPayload(null);
      setStatusMessage("Navigation ended.");
      return;
    }

    setStatusMessage("Ending navigation...");

    try {
      await endTrip(sessionId, "completed");
      setStatusMessage("Navigation ended.");
    } catch (error) {
      console.error(error);
      setErrorMessage(error.message || "Failed to end trip.");
    } finally {
      setIsNavigationActive(false);
      setSessionId(null);
      setLiveNavigationPayload(null);
    }
  }

  function handleRouteSelect(route) {
    setSelectedRoute(route);
    setCurrentStepIndex(0);
    setLiveNavigationPayload(null);
  }

  return (
    <div className="maps-routing-workspace">
      <header className="workspace-header">
        <h1>Maps Routing Integration Workspace</h1>
        <p>
          Backend-connected workspace for route recommendations, route
          alternatives, turn-by-turn navigation, and map alerts.
        </p>
      </header>

      <LocationSearch
        startLocation={startLocation}
        destinationLocation={destinationLocation}
        onStartLocationSelect={setStartLocation}
        onDestinationLocationSelect={setDestinationLocation}
        onFindRoute={handleFindRoute}
      />

      {isLoadingRoute && (
        <p className="search-status-message">Loading route recommendation...</p>
      )}

      {statusMessage && <p className="status-message">{statusMessage}</p>}

      {errorMessage && <p className="error-message">{errorMessage}</p>}

      <div className="maps-routing-grid">
        <div className="maps-routing-main">
          <InteractiveMap
            startPoint={startMapPoint}
            destPoint={destinationMapPoint}
            routeOptions={routeOptions}
            selectedRoute={activeSelectedRoute}
            onRouteSelect={handleRouteSelect}
            navigationState={navigationState}
            showTurnMarkers={isNavigationActive}
            showAlerts
            height="520px"
          />

          <RouteCards
            routeOptions={routeOptions}
            selectedRoute={activeSelectedRoute}
            onRouteSelect={handleRouteSelect}
            routingProvider={routingProvider}
            providerStatus={providerStatus}
          />
        </div>

        <aside className="maps-routing-sidebar">
          <NavigationPanel
            selectedRoute={activeSelectedRoute}
            navigationState={navigationState}
            isNavigationActive={isNavigationActive}
            onStartNavigation={handleStartNavigation}
            onNextStep={handleNextStep}
            onEndNavigation={handleEndNavigation}
          />

          <AlertsPanel
            selectedRoute={activeSelectedRoute}
            liveAlerts={navigationState.alerts}
          />
        </aside>
      </div>
    </div>
  );
}

export default MapsRoutingWorkspace;
