// mobile/src/components/FlowSyncMap.js

import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import MapView, { Marker } from "react-native-maps";

import IncidentMarkers from "./IncidentMarkers";
import MapControls from "./MapControls";
import RoutePolyline from "./RoutePolyline";
import VehicleMarker from "./VehicleMarker";

import {
  DEFAULT_DUBAI_REGION,
  getDestinationCoordinate,
  getRouteRegion,
  getSelectedRouteCoordinates,
  getStartCoordinate,
  normalizeCoordinate,
  normalizeCoordinates,
} from "../utils/mapUtils";

function FlowSyncMap({
  selectedRoute,
  routeCoordinates,
  userLocation,
  startLocation,
  destination,
  navigation,
  mapRef,
  getMyLocation,
  height = 360,
  showControls = true,
  showIncidents = true,
  autoFitRoute = true,
  onStartNavigation,
  onPauseNavigation,
  onResumeNavigation,
  onNextStep,
  onEndTrip,
  onReportAlert,
  onToggleLayers,
}) {
  const internalMapRef = useRef(null);
  const activeMapRef = mapRef || internalMapRef;

  const [mapReady, setMapReady] = useState(false);

  const selectedRouteCoordinates = useMemo(() => {
    const routePoints = getSelectedRouteCoordinates(selectedRoute);

    if (routePoints.length > 0) {
      return routePoints;
    }

    return normalizeCoordinates(routeCoordinates);
  }, [selectedRoute, routeCoordinates]);

  const startCoordinate =
    normalizeCoordinate(startLocation) ||
    getStartCoordinate(selectedRoute) ||
    selectedRouteCoordinates[0] ||
    null;

  const destinationCoordinate =
    normalizeCoordinate(destination) ||
    getDestinationCoordinate(selectedRoute) ||
    selectedRouteCoordinates[selectedRouteCoordinates.length - 1] ||
    null;

  const liveUserCoordinate = normalizeCoordinate(userLocation);

  const initialRegion = useMemo(() => {
    if (selectedRouteCoordinates.length > 1) {
      return getRouteRegion(selectedRouteCoordinates);
    }

    if (liveUserCoordinate) {
      return {
        latitude: liveUserCoordinate.latitude,
        longitude: liveUserCoordinate.longitude,
        latitudeDelta: 0.04,
        longitudeDelta: 0.04,
      };
    }

    if (startCoordinate) {
      return {
        latitude: startCoordinate.latitude,
        longitude: startCoordinate.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }

    return DEFAULT_DUBAI_REGION;
  }, [selectedRouteCoordinates, liveUserCoordinate, startCoordinate]);

  function fitSelectedRouteToScreen() {
    if (!activeMapRef?.current || selectedRouteCoordinates.length < 2) {
      return;
    }

    activeMapRef.current.fitToCoordinates(selectedRouteCoordinates, {
      edgePadding: {
        top: 80,
        right: 60,
        bottom: 110,
        left: 60,
      },
      animated: true,
    });
  }

  function recenterMap() {
    if (!activeMapRef?.current) {
      return;
    }

    if (liveUserCoordinate) {
      activeMapRef.current.animateToRegion(
        {
          latitude: liveUserCoordinate.latitude,
          longitude: liveUserCoordinate.longitude,
          latitudeDelta: 0.025,
          longitudeDelta: 0.025,
        },
        600
      );
      return;
    }

    if (selectedRouteCoordinates.length > 1) {
      fitSelectedRouteToScreen();
    }
  }

  async function handleRecenter() {
    if (typeof getMyLocation === "function") {
      await getMyLocation();
    }

    recenterMap();
  }

  useEffect(() => {
    if (!mapReady || !autoFitRoute) {
      return;
    }

    const timeoutId = setTimeout(() => {
      if (selectedRouteCoordinates.length > 1) {
        fitSelectedRouteToScreen();
      }
    }, 350);

    return () => clearTimeout(timeoutId);
  }, [mapReady, autoFitRoute, selectedRouteCoordinates]);

  return (
    <View style={[styles.container, { height }]}>
      <MapView
        ref={activeMapRef}
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass
        showsScale
        onMapReady={() => setMapReady(true)}
      >
        <RoutePolyline
          selectedRoute={selectedRoute}
          routeCoordinates={selectedRouteCoordinates}
        />

        {startCoordinate ? (
          <Marker
            coordinate={startCoordinate}
            title="Start"
            description="Trip start location"
            pinColor="#22c55e"
            zIndex={10}
          />
        ) : null}

        {destinationCoordinate ? (
          <Marker
            coordinate={destinationCoordinate}
            title="Destination"
            description="Trip destination"
            pinColor="#ef4444"
            zIndex={10}
          />
        ) : null}

        <VehicleMarker
          selectedRoute={selectedRoute}
          userLocation={liveUserCoordinate}
        />

        {showIncidents ? <IncidentMarkers selectedRoute={selectedRoute} /> : null}
      </MapView>

      {!selectedRoute ? (
        <View style={styles.emptyOverlay}>
          <Text style={styles.emptyTitle}>No route selected</Text>
          <Text style={styles.emptyText}>
            Select a route to display it on the mobile map.
          </Text>
        </View>
      ) : null}

      {showControls ? (
        <View style={styles.controlsOverlay}>
          <MapControls
            navigationStatus={navigation?.status}
            isNavigationActive={navigation?.isActive}
            hasArrived={navigation?.hasArrived}
            onStartNavigation={onStartNavigation}
            onPauseNavigation={onPauseNavigation}
            onResumeNavigation={onResumeNavigation}
            onNextStep={onNextStep}
            onRecenter={handleRecenter}
            onEndTrip={onEndTrip}
            onReportAlert={onReportAlert}
            onToggleLayers={onToggleLayers}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#1e293b",
    backgroundColor: "#020617",
  },
  map: {
    flex: 1,
  },
  emptyOverlay: {
    position: "absolute",
    top: 14,
    left: 14,
    right: 14,
    backgroundColor: "rgba(15, 23, 42, 0.92)",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#334155",
  },
  emptyTitle: {
    color: "#f8fafc",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 3,
  },
  emptyText: {
    color: "#cbd5e1",
    fontSize: 12,
    lineHeight: 18,
  },
  controlsOverlay: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    backgroundColor: "rgba(15, 23, 42, 0.82)",
    borderRadius: 18,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.25)",
  },
});

export default memo(FlowSyncMap);
