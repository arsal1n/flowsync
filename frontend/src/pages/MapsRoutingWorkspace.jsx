// frontend/src/pages/MapsRoutingWorkspace.jsx

import { useMemo, useState } from "react";

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
} from "../services/backendRouteService";

import {
  buildNavigationState,
  getTurnByTurnSteps,
} from "../utils/navigationUtils";

import {
  buildRecommendRouteRequest,
  buildTripStartPayload,
  normalizeLocationSelection,
  normalizeRouteResponse,
} from "../utils/routeResponseAdapter";

import "../styles/mapsRoutingWorkspace.css";

function buildFallbackRoute(startLocation, destinationLocation) {
  const start = normalizeLocationSelection(startLocation);
  const destination = normalizeLocationSelection(destinationLocation);

  const startPosition = start.position || [25.1972, 55.2744];
  const destinationPosition = destination.position || [25.08, 55.14];

  const route = {
    route_name: "Mock Backend Fallback Route",
    estimated_time: 22,
    distance_km: 22.1,
    congestion_score: 35,
    assigned_users: 0,
    route_score: 82,
    coordinates: [
      {
        lat: startPosition[0],
        lng: startPosition[1],
      },
      {
        lat: 25.185,
        lng: 55.2636,
      },
      {
        lat: destinationPosition[0],
        lng: destinationPosition[1],
      },
    ],
    polyline: "",
    turn_by_turn_steps: [
      {
        instruction: `Start from ${start.name || "start location"}`,
        distance_m: 400,
        duration_min: 2,
        maneuver: "depart",
        road_name: "Local Road",
        lat: startPosition[0],
        lng: startPosition[1],
      },
      {
        instruction: "Continue toward Sheikh Zayed Road",
        distance_m: 8500,
        duration_min: 9,
        maneuver: "straight",
        road_name: "Sheikh Zayed Road",
        lat: 25.185,
        lng: 55.2636,
      },
      {
        instruction: `Arrive at ${destination.name || "destination"}`,
        distance_m: 500,
        duration_min: 2,
        maneuver: "arrive",
        road_name: "Destination Road",
        lat: destinationPosition[0],
        lng: destinationPosition[1],
      },
    ],
    alerts: [
      {
        id: "mock-alert-1",
        title: "Moderate congestion",
        message: "Traffic may be slower near central Dubai.",
        severity: "medium",
        road_name: "Sheikh Zayed Road",
        lat: 25.185,
        lng: 55.2636,
      },
    ],
    incidents: [],
  };

  const alternativeRoute = {
    ...route,
    route_name: "Alternative Route",
    estimated_time: 27,
    distance_km: 24.3,
    congestion_score: 55,
    route_score: 74,
    coordinates: [
      {
        lat: startPosition[0],
        lng: startPosition[1],
      },
      {
        lat: 25.2048,
        lng: 55.2708,
      },
      {
        lat: destinationPosition[0],
        lng: destinationPosition[1],
      },
    ],
    alerts: [],
  };

  return {
    recommended_route: route,
    all_routes: [route, alternativeRoute],
    routing_provider: "mock_frontend_fallback",
    provider_status: "backend_not_available",
    database_record: {
      request_id: "mock-request-id",
    },
  };
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

  const navigationState = useMemo(() => {
    return buildNavigationState({
      selectedRoute: activeSelectedRoute,
      currentStepIndex,
      sessionId,
      requestId,
      status: isNavigationActive ? "active" : "idle",
    });
  }, [
    activeSelectedRoute,
    currentStepIndex,
    sessionId,
    requestId,
    isNavigationActive,
  ]);

  async function handleFindRoute(searchPayload) {
    setIsLoadingRoute(true);
    setErrorMessage("");
    setStatusMessage("Requesting route recommendation...");
    setIsNavigationActive(false);
    setCurrentStepIndex(0);
    setSessionId(null);

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
      setStatusMessage("Backend route recommendation loaded.");
    } catch (error) {
      console.error(error);

      const fallbackResponse = buildFallbackRoute(
        startLocation,
        destinationLocation
      );

      const normalized = normalizeRouteResponse(fallbackResponse);

      setRouteResponse(fallbackResponse);
      setSelectedRoute(normalized.selectedRoute);
      setRequestId(normalized.requestId);
      setStatusMessage(
        "Backend is not available yet. Showing frontend fallback route."
      );
      setErrorMessage(error.message || "Backend route request failed.");
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

      setSessionId(backendSessionId || "mock-session-id");
      setIsNavigationActive(true);
      setCurrentStepIndex(0);
      setStatusMessage("Navigation started.");
    } catch (error) {
      console.error(error);

      setSessionId("mock-session-id");
      setIsNavigationActive(true);
      setCurrentStepIndex(0);
      setStatusMessage(
        "Backend trip start is not available yet. Running simulated navigation."
      );
      setErrorMessage(error.message || "Backend trip start failed.");
    }
  }

  async function handleNextStep() {
    if (!activeSelectedRoute) {
      return;
    }

    const steps = getTurnByTurnSteps(activeSelectedRoute);
    const maxIndex = Math.max(steps.length - 1, 0);
    const nextIndex = Math.min(currentStepIndex + 1, maxIndex);

    setCurrentStepIndex(nextIndex);

    if (sessionId && sessionId !== "mock-session-id") {
      try {
        await updateTripProgress(sessionId, nextIndex);
      } catch (error) {
        console.error(error);
        setErrorMessage(error.message || "Failed to update trip progress.");
      }
    }
  }

  async function handleEndNavigation() {
    setStatusMessage("Ending navigation...");

    if (sessionId && sessionId !== "mock-session-id") {
      try {
        await endTrip(sessionId, "completed");
      } catch (error) {
        console.error(error);
        setErrorMessage(error.message || "Failed to end trip.");
      }
    }

    setIsNavigationActive(false);
    setSessionId(null);
    setStatusMessage("Navigation ended.");
  }

  function handleRouteSelect(route) {
    setSelectedRoute(route);
    setCurrentStepIndex(0);
  }

  return (
    <div className="maps-routing-workspace">
      <header className="workspace-header">
        <h1>Maps Routing Integration Workspace</h1>
        <p>
          Temporary workspace for backend route integration, route alternatives,
          navigation mode, and map alerts.
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
            startPoint={startSelection.position}
            destPoint={destinationSelection.position}
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

          <AlertsPanel selectedRoute={activeSelectedRoute} />
        </aside>
      </div>
    </div>
  );
}

export default MapsRoutingWorkspace;
