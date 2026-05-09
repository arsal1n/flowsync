// frontend/src/components/AlertsPanel.jsx

import { getRouteAlertsAndIncidents } from "../utils/navigationUtils";

function getAlertTitle(item) {
  return (
    item.title ||
    item.message ||
    item.description ||
    item.alert_type ||
    item.incident_type ||
    "Route warning"
  );
}

function getAlertDescription(item) {
  return (
    item.description ||
    item.details ||
    item.message ||
    "No additional details available."
  );
}

function getSeverityLabel(item) {
  return item.severity || item.level || item.priority || "info";
}

function getAlertTypeLabel(item) {
  if (item.type === "incident") {
    return "Incident";
  }

  if (item.type === "alert") {
    return "Alert";
  }

  return item.alert_type || item.incident_type || "Notice";
}

function AlertsPanel({
  selectedRoute = null,
  liveAlerts = [],
  liveFeedItems = [],
}) {
  const routeItems = getRouteAlertsAndIncidents(selectedRoute);

  const normalizedLiveAlerts = Array.isArray(liveAlerts)
    ? liveAlerts.map((alert, index) => ({
        id: alert.id || `live-alert-${index}`,
        type: "alert",
        source: "Live Alert",
        ...alert,
      }))
    : [];

  const normalizedLiveFeed = Array.isArray(liveFeedItems)
    ? liveFeedItems.map((item, index) => ({
        id: item.id || `live-feed-${index}`,
        type: item.type || "feed",
        source: "Live Feed",
        ...item,
      }))
    : [];

  const allItems = [
    ...routeItems.map((item, index) => ({
      id: item.id || `route-item-${index}`,
      source: "Selected Route",
      ...item,
    })),
    ...normalizedLiveAlerts,
    ...normalizedLiveFeed,
  ];

  if (allItems.length === 0) {
    return (
      <div className="alerts-panel">
        <h2>Alerts & Incidents</h2>
        <p>No alerts or incidents for this route yet.</p>
      </div>
    );
  }

  return (
    <div className="alerts-panel">
      <div className="alerts-panel-header">
        <h2>Alerts & Incidents</h2>
        <span>{allItems.length} active</span>
      </div>

      <div className="alerts-list">
        {allItems.map((item, index) => {
          const severity = getSeverityLabel(item);
          const typeLabel = getAlertTypeLabel(item);

          return (
            <div
              key={`${item.id}-${index}`}
              className={`alert-item severity-${String(severity).toLowerCase()}`}
            >
              <div className="alert-item-top">
                <span className="alert-type-badge">{typeLabel}</span>
                <span className="alert-source">{item.source}</span>
              </div>

              <h3>{getAlertTitle(item)}</h3>

              <p>{getAlertDescription(item)}</p>

              <div className="alert-item-meta">
                <span>Severity: {severity}</span>

                {item.road_name && <span>Road: {item.road_name}</span>}

                {item.location && <span>Location: {item.location}</span>}

                {(item.lat || item.latitude) && (item.lng || item.longitude) && (
                  <span>
                    Coordinates: {item.lat || item.latitude},{" "}
                    {item.lng || item.longitude}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default AlertsPanel;
