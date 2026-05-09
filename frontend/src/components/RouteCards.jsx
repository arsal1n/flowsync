// frontend/src/components/RouteCards.jsx

import { getDisplayValue, getCongestionColor } from "../utils/mapUtils";
import { isSameRoute } from "../utils/routePolylineUtils";

function getCongestionLabel(score) {
  const value = Number(score);

  if (!Number.isFinite(value)) {
    return "Unknown";
  }

  if (value >= 70) {
    return "High";
  }

  if (value >= 40) {
    return "Medium";
  }

  return "Low";
}

function getAlertCount(route) {
  const alerts = Array.isArray(route?.alerts) ? route.alerts : [];
  const incidents = Array.isArray(route?.incidents) ? route.incidents : [];

  return alerts.length + incidents.length;
}

function RouteCards({
  routeOptions = [],
  selectedRoute = null,
  onRouteSelect = null,
  routingProvider = "",
  providerStatus = "",
}) {
  if (!Array.isArray(routeOptions) || routeOptions.length === 0) {
    return (
      <div className="route-cards">
        <h2>Route Options</h2>
        <p>No routes available yet. Search for a route to see options.</p>
      </div>
    );
  }

  return (
    <div className="route-cards">
      <div className="route-cards-header">
        <h2>Route Options</h2>

        {(routingProvider || providerStatus) && (
          <p className="provider-status">
            Provider: {getDisplayValue(routingProvider)} | Status:{" "}
            {getDisplayValue(providerStatus)}
          </p>
        )}
      </div>

      <div className="route-card-list">
        {routeOptions.map((route, index) => {
          const selected = isSameRoute(route, selectedRoute);
          const congestionColor = getCongestionColor(route.congestion_score);
          const alertCount = getAlertCount(route);

          return (
            <button
              key={`${route.route_name || "route"}-${index}`}
              type="button"
              className={`route-card ${selected ? "selected" : ""}`}
              onClick={() => {
                if (onRouteSelect) {
                  onRouteSelect(route);
                }
              }}
            >
              <div className="route-card-top">
                <h3>{getDisplayValue(route.route_name, `Route ${index + 1}`)}</h3>

                {selected && <span className="selected-badge">Selected</span>}
              </div>

              <div className="route-card-grid">
                <div>
                  <span className="route-card-label">Time</span>
                  <strong>
                    {getDisplayValue(route.estimated_time)} min
                  </strong>
                </div>

                <div>
                  <span className="route-card-label">Distance</span>
                  <strong>{getDisplayValue(route.distance_km)} km</strong>
                </div>

                <div>
                  <span className="route-card-label">Congestion</span>
                  <strong style={{ color: congestionColor }}>
                    {getCongestionLabel(route.congestion_score)}
                  </strong>
                </div>

                <div>
                  <span className="route-card-label">Score</span>
                  <strong>{getDisplayValue(route.route_score)}</strong>
                </div>
              </div>

              <div className="route-card-footer">
                <span>
                  Congestion Score:{" "}
                  {getDisplayValue(route.congestion_score)}
                </span>

                <span>
                  Alerts/Incidents: {alertCount}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default RouteCards;
