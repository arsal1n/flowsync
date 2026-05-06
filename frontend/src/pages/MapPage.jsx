// frontend/src/pages/MapPage.jsx

import { useState } from "react";
import MapView from "../components/MapView";
import RouteInfo from "../components/RouteInfo";
import RouteControls from "../components/RouteControls";

function MapPage() {
  const [startPoint, setStartPoint] = useState(null);
  const [destPoint, setDestPoint] = useState(null);
  const [routeLine, setRouteLine] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [backendError, setBackendError] = useState("");

  async function handleRouteFound(routeData) {
    const { startPoint, destPoint, routeLine, route } = routeData;

    setStartPoint(startPoint);
    setDestPoint(destPoint);
    setRouteLine(routeLine);
    setSelectedRoute(route);
    setBackendError("");

    try {
      const response = await fetch(
        "http://localhost:8000/api/routes/recommend",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(route),
        }
      );

      if (!response.ok) {
        throw new Error("Backend route recommendation failed");
      }

      const recommendedRoute = await response.json();

      setSelectedRoute(recommendedRoute);
    } catch (error) {
      console.error(error);
      setBackendError(
        "Backend recommendation is not available, showing OSRM route instead."
      );
    }
  }

  return (
    <div className="map-page">
      <h1>FlowSync Maps & Routing</h1>

      <p>
        Enter a start location and destination in Dubai to find a recommended
        route.
      </p>

      <RouteControls onRouteFound={handleRouteFound} />

      {backendError && <p className="error-message">{backendError}</p>}

      <MapView
        startPoint={startPoint}
        destPoint={destPoint}
        routeLine={routeLine}
      />

      <RouteInfo route={selectedRoute} />
    </div>
  );
}

export default MapPage;