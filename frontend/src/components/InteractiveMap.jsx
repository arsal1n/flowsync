// frontend/src/components/InteractiveMap.jsx

import { useEffect, useMemo } from "react";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

import {
  DUBAI_CENTER,
  DEFAULT_MAP_ZOOM,
  getMapCenter,
  toLeafletPosition,
} from "../utils/mapUtils";

import {
  buildMapRouteLines,
  getRouteLineFromRoute,
} from "../utils/routePolylineUtils";

import {
  getAlertIncidentMarkers,
  getStepPositions,
} from "../utils/navigationUtils";

function createPinIcon({ label, backgroundColor }) {
  return L.divIcon({
    className: "custom-map-marker",
    html: `
      <div style="
        background-color: ${backgroundColor};
        color: white;
        width: 32px;
        height: 32px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.4);
        font-weight: bold;
      ">
        <span style="transform: rotate(45deg);">${label}</span>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
  });
}

function createCircleIcon({ label, backgroundColor }) {
  return L.divIcon({
    className: "custom-circle-marker",
    html: `
      <div style="
        background-color: ${backgroundColor};
        color: white;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.4);
        font-weight: bold;
        font-size: 13px;
      ">
        ${label}
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

const startIcon = createPinIcon({
  label: "S",
  backgroundColor: "#22c55e",
});

const destinationIcon = createPinIcon({
  label: "D",
  backgroundColor: "#ef4444",
});

const currentLocationIcon = createCircleIcon({
  label: "●",
  backgroundColor: "#2563eb",
});

const turnStepIcon = createCircleIcon({
  label: "↱",
  backgroundColor: "#7c3aed",
});

const alertIcon = createCircleIcon({
  label: "!",
  backgroundColor: "#f59e0b",
});

const incidentIcon = createCircleIcon({
  label: "!",
  backgroundColor: "#dc2626",
});

function MapAutoFocus({ startPoint, destPoint, selectedRoute }) {
  const map = useMap();

  useEffect(() => {
    const selectedRouteLine = getRouteLineFromRoute(selectedRoute);

    const center = getMapCenter(startPoint, destPoint, selectedRouteLine);

    map.setView(center, selectedRouteLine.length > 0 ? 12 : DEFAULT_MAP_ZOOM);
  }, [map, startPoint, destPoint, selectedRoute]);

  return null;
}

function InteractiveMap({
  startPoint = null,
  destPoint = null,
  routeOptions = [],
  selectedRoute = null,
  onRouteSelect = null,
  navigationState = null,
  showTurnMarkers = true,
  showAlerts = true,
  height = "450px",
}) {
  const startPosition = useMemo(
    () => toLeafletPosition(startPoint),
    [startPoint]
  );

  const destinationPosition = useMemo(
    () => toLeafletPosition(destPoint),
    [destPoint]
  );

  const selectedRouteLine = useMemo(
    () => getRouteLineFromRoute(selectedRoute),
    [selectedRoute]
  );

  const mapRouteLines = useMemo(
    () => buildMapRouteLines(routeOptions, selectedRoute),
    [routeOptions, selectedRoute]
  );

  const turnMarkers = useMemo(() => {
    if (!showTurnMarkers || !navigationState?.steps) {
      return [];
    }

    return getStepPositions(navigationState.steps);
  }, [showTurnMarkers, navigationState]);

  const alertMarkers = useMemo(() => {
    if (!showAlerts || !selectedRoute) {
      return [];
    }

    return getAlertIncidentMarkers(selectedRoute);
  }, [showAlerts, selectedRoute]);

  const currentLocationPosition = useMemo(() => {
    if (!navigationState?.currentLocation) {
      return null;
    }

    return toLeafletPosition(navigationState.currentLocation);
  }, [navigationState]);

  const completedRouteSegment = useMemo(() => {
    if (!navigationState?.completedRouteSegment) {
      return [];
    }

    return navigationState.completedRouteSegment;
  }, [navigationState]);

  const initialCenter = getMapCenter(
    startPosition,
    destinationPosition,
    selectedRouteLine
  );

  return (
    <div className="interactive-map-wrapper">
      <MapContainer
        center={initialCenter || DUBAI_CENTER}
        zoom={DEFAULT_MAP_ZOOM}
        style={{ height, width: "100%" }}
      >
        <MapAutoFocus
          startPoint={startPosition}
          destPoint={destinationPosition}
          selectedRoute={selectedRoute}
        />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        {mapRouteLines.map((routeLine, index) => (
          <Polyline
            key={`${routeLine.route?.route_name || "route"}-${index}`}
            positions={routeLine.positions}
            pathOptions={routeLine.style}
            eventHandlers={{
              click: () => {
                if (onRouteSelect) {
                  onRouteSelect(routeLine.route);
                }
              },
            }}
          />
        ))}

        {completedRouteSegment.length > 0 && (
          <Polyline
            positions={completedRouteSegment}
            pathOptions={{
              color: "#22c55e",
              weight: 7,
              opacity: 0.9,
            }}
          />
        )}

        {startPosition && (
          <Marker position={startPosition} icon={startIcon}>
            <Popup>Start Location</Popup>
          </Marker>
        )}

        {destinationPosition && (
          <Marker position={destinationPosition} icon={destinationIcon}>
            <Popup>Destination</Popup>
          </Marker>
        )}

        {currentLocationPosition && (
          <Marker position={currentLocationPosition} icon={currentLocationIcon}>
            <Popup>Current Location</Popup>
          </Marker>
        )}

        {turnMarkers.map((marker) => (
          <Marker
            key={`turn-step-${marker.index}`}
            position={marker.position}
            icon={turnStepIcon}
          >
            <Popup>
              <strong>Step {marker.index + 1}</strong>
              <br />
              {marker.step?.instruction || "Turn instruction"}
            </Popup>
          </Marker>
        ))}

        {alertMarkers.map((marker) => (
          <Marker
            key={marker.id}
            position={marker.position}
            icon={marker.item.type === "incident" ? incidentIcon : alertIcon}
          >
            <Popup>
              <strong>
                {marker.item.type === "incident" ? "Incident" : "Alert"}
              </strong>
              <br />
              {marker.item.message ||
                marker.item.title ||
                marker.item.description ||
                "Route warning"}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

export default InteractiveMap;
