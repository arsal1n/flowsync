// mobile/src/maps/FlowSyncDriverNavigationMap.jsx

import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";

import {
  calculateProgressPercent,
  calculateRemainingDistanceKm,
  calculateRouteDistanceKm,
  findNearestCoordinateIndex,
  formatDistance,
  formatTime,
  getArrivalTimeText,
  getCurrentStepIndexFromGps,
  getDestinationCoordinate,
  getInstructionText,
  getPassedCoordinates,
  getRemainingCoordinates,
  isArrivalReached,
  normalizeCoordinate,
  normalizeCoordinates,
} from "../navigation/navigationMath";

import { useNavigationCamera } from "../navigation/useNavigationCamera";
import { validateRouteGeometry, buildRouteValidationDebugText } from "../navigation/routeValidation";

const DEFAULT_REGION = {
  latitude: 25.2048,
  longitude: 55.2708,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

function getRouteCoordinates(selectedRoute, routeCoordinates) {
  const candidates = [
    selectedRoute?.route_coordinates,
    selectedRoute?.coordinates,
    selectedRoute?.polyline,
    routeCoordinates,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeCoordinates(candidate);

    if (normalized.length > 0) {
      return normalized;
    }
  }

  return [];
}

function getSteps(selectedRoute, turnByTurnSteps) {
  if (Array.isArray(turnByTurnSteps) && turnByTurnSteps.length > 0) {
    return turnByTurnSteps;
  }

  if (
    Array.isArray(selectedRoute?.turn_by_turn_steps) &&
    selectedRoute.turn_by_turn_steps.length > 0
  ) {
    return selectedRoute.turn_by_turn_steps;
  }

  if (Array.isArray(selectedRoute?.steps) && selectedRoute.steps.length > 0) {
    return selectedRoute.steps;
  }

  return [];
}

function getInitialRegion(routeCoordinates, userLocation) {
  const currentLocation = normalizeCoordinate(userLocation);

  if (currentLocation) {
    return {
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
  }

  if (!Array.isArray(routeCoordinates) || routeCoordinates.length === 0) {
    return DEFAULT_REGION;
  }

  const latitudes = routeCoordinates.map((coordinate) => coordinate.latitude);
  const longitudes = routeCoordinates.map((coordinate) => coordinate.longitude);

  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);
  const minLongitude = Math.min(...longitudes);
  const maxLongitude = Math.max(...longitudes);

  return {
    latitude: (minLatitude + maxLatitude) / 2,
    longitude: (minLongitude + maxLongitude) / 2,
    latitudeDelta: Math.max((maxLatitude - minLatitude) * 1.7, 0.025),
    longitudeDelta: Math.max((maxLongitude - minLongitude) * 1.7, 0.025),
  };
}

function VehicleArrow({ heading = 0 }) {
  return (
    <View
      style={[
        styles.vehicleMarker,
        {
          transform: [{ rotate: `${Number(heading || 0)}deg` }],
        },
      ]}
    >
      <View style={styles.vehicleArrow} />
    </View>
  );
}

function FlowSyncDriverNavigationMap({
  selectedRoute,
  selectedRouteId,
  selected_route_id,
  routeCoordinates,
  turnByTurnSteps,
  userLocation,
  gpsHeading,
  currentStepIndex = 0,
  remainingDistanceKm,
  remainingTimeMin,
  progressPercent,
  tripSession,
  isTracking = true,
  requestStartCoordinate,
  requestDestinationCoordinate,
  showDebug = true,
  onRecenter,
  onReportAlert,
  onEndTrip,
  onArrive,
  onCancelTrip,
  onStepChange,
  onMapReady,
  style,
}) {
  const mapRef = useRef(null);
  const arrivalSentRef = useRef(false);

  const [liveStepIndex, setLiveStepIndex] = useState(currentStepIndex || 0);

  const selectedRouteCoordinates = useMemo(
    () => getRouteCoordinates(selectedRoute, routeCoordinates),
    [selectedRoute, routeCoordinates]
  );

  const steps = useMemo(
    () => getSteps(selectedRoute, turnByTurnSteps),
    [selectedRoute, turnByTurnSteps]
  );

  const currentGpsLocation = normalizeCoordinate(userLocation);
  const selectedRouteIdentity =
    selected_route_id ||
    selectedRouteId ||
    selectedRoute?.route_id ||
    selectedRoute?.id ||
    "selected-route";

  const nearestRouteIndex = useMemo(
    () => findNearestCoordinateIndex(selectedRouteCoordinates, currentGpsLocation),
    [selectedRouteCoordinates, currentGpsLocation]
  );

  const passedCoordinates = useMemo(
    () => getPassedCoordinates(selectedRouteCoordinates, nearestRouteIndex),
    [selectedRouteCoordinates, nearestRouteIndex]
  );

  const remainingCoordinates = useMemo(
    () => getRemainingCoordinates(selectedRouteCoordinates, nearestRouteIndex),
    [selectedRouteCoordinates, nearestRouteIndex]
  );

  const totalRouteDistanceKm = useMemo(
    () => calculateRouteDistanceKm(selectedRouteCoordinates),
    [selectedRouteCoordinates]
  );

  const calculatedRemainingDistanceKm = useMemo(
    () => calculateRemainingDistanceKm(selectedRouteCoordinates, currentGpsLocation),
    [selectedRouteCoordinates, currentGpsLocation]
  );

  const displayRemainingDistanceKm =
    Number.isFinite(Number(remainingDistanceKm)) && Number(remainingDistanceKm) > 0
      ? Number(remainingDistanceKm)
      : calculatedRemainingDistanceKm;

  const routeEtaMin = Number(
    selectedRoute?.estimated_time_min ??
      selectedRoute?.estimated_time ??
      selectedRoute?.duration_min ??
      0
  );

  const displayProgressPercent = calculateProgressPercent(
    selectedRouteCoordinates,
    currentGpsLocation,
    progressPercent
  );

  const displayRemainingTimeMin =
    Number.isFinite(Number(remainingTimeMin)) && Number(remainingTimeMin) > 0
      ? Number(remainingTimeMin)
      : routeEtaMin > 0 && totalRouteDistanceKm > 0
      ? Math.ceil((displayRemainingDistanceKm / totalRouteDistanceKm) * routeEtaMin)
      : 0;

  const destinationCoordinate = getDestinationCoordinate(selectedRouteCoordinates);

  const routeValidation = useMemo(
    () =>
      validateRouteGeometry({
        route: selectedRoute,
        routeCoordinates: selectedRouteCoordinates,
        requestStart: requestStartCoordinate || selectedRouteCoordinates[0],
        requestDestination:
          requestDestinationCoordinate || destinationCoordinate,
      }),
    [
      selectedRoute,
      selectedRouteCoordinates,
      requestStartCoordinate,
      requestDestinationCoordinate,
      destinationCoordinate,
    ]
  );

  const hasArrived = isArrivalReached({
    userLocation: currentGpsLocation,
    routeCoordinates: selectedRouteCoordinates,
    progressPercent: displayProgressPercent,
  });

  const {
    followMode,
    pauseFollowMode,
    recenter,
  } = useNavigationCamera({
    mapRef,
    userLocation: currentGpsLocation,
    gpsHeading,
    routeCoordinates: selectedRouteCoordinates,
    enabled: isTracking,
  });

  const activeStepIndex = Math.min(
    Math.max(liveStepIndex, 0),
    Math.max(steps.length - 1, 0)
  );

  const activeStep = steps[activeStepIndex] || null;
  const nextStep = steps[activeStepIndex + 1] || null;
  const bannerStep = hasArrived ? null : nextStep || activeStep;

  const bannerInstruction = hasArrived
    ? "Arrived at destination"
    : getInstructionText(bannerStep);

  function handleRecenterPress() {
    recenter();

    if (typeof onRecenter === "function") {
      onRecenter();
    }
  }

  function handleEndPress() {
    if (hasArrived) {
      if (typeof onArrive === "function") {
        onArrive({
          selectedRoute,
          selectedRouteId: selectedRouteIdentity,
          tripSession,
          status: "completed",
        });
        return;
      }

      if (typeof onEndTrip === "function") {
        onEndTrip({
          selectedRoute,
          selectedRouteId: selectedRouteIdentity,
          tripSession,
          status: "completed",
        });
      }

      return;
    }

    Alert.alert(
      "Cancel trip?",
      "You have not arrived yet. Ending now should cancel this trip.",
      [
        {
          text: "Keep navigating",
          style: "cancel",
        },
        {
          text: "Cancel trip",
          style: "destructive",
          onPress: () => {
            if (typeof onCancelTrip === "function") {
              onCancelTrip({
                selectedRoute,
                selectedRouteId: selectedRouteIdentity,
                tripSession,
                status: "cancelled",
              });
              return;
            }

            if (typeof onEndTrip === "function") {
              onEndTrip({
                selectedRoute,
                selectedRouteId: selectedRouteIdentity,
                tripSession,
                status: "cancelled",
              });
            }
          },
        },
      ]
    );
  }

  useEffect(() => {
    const nextStepIndex = getCurrentStepIndexFromGps({
      steps,
      userLocation: currentGpsLocation,
      currentStepIndex: liveStepIndex,
    });

    if (nextStepIndex !== liveStepIndex) {
      setLiveStepIndex(nextStepIndex);

      if (typeof onStepChange === "function") {
        onStepChange(nextStepIndex);
      }
    }
  }, [steps, currentGpsLocation, liveStepIndex, onStepChange]);

  useEffect(() => {
    setLiveStepIndex(currentStepIndex || 0);
  }, [currentStepIndex, selectedRouteIdentity]);

  useEffect(() => {
    if (!hasArrived || arrivalSentRef.current) {
      return;
    }

    arrivalSentRef.current = true;

    if (typeof onArrive === "function") {
      onArrive({
        selectedRoute,
        selectedRouteId: selectedRouteIdentity,
        tripSession,
        status: "arrived",
      });
    }
  }, [hasArrived, onArrive, selectedRoute, selectedRouteIdentity, tripSession]);

  if (!selectedRoute) {
    return (
      <View style={[styles.emptyContainer, style]}>
        <Text style={styles.emptyTitle}>No route selected</Text>
        <Text style={styles.emptyText}>
          Select a route before starting driver navigation.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={getInitialRegion(selectedRouteCoordinates, currentGpsLocation)}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        rotateEnabled
        pitchEnabled
        onPanDrag={pauseFollowMode}
        onMapReady={() => {
          if (typeof onMapReady === "function") {
            onMapReady();
          }

          recenter();
        }}
      >
        {passedCoordinates.length > 1 ? (
          <Polyline
            coordinates={passedCoordinates}
            strokeColor="#94a3b8"
            strokeWidth={7}
            lineCap="round"
            lineJoin="round"
            zIndex={4}
          />
        ) : null}

        {remainingCoordinates.length > 1 ? (
          <Polyline
            coordinates={remainingCoordinates}
            strokeColor="#2563eb"
            strokeWidth={9}
            lineCap="round"
            lineJoin="round"
            zIndex={9}
          />
        ) : selectedRouteCoordinates.length > 1 ? (
          <Polyline
            coordinates={selectedRouteCoordinates}
            strokeColor="#2563eb"
            strokeWidth={9}
            lineCap="round"
            lineJoin="round"
            zIndex={9}
          />
        ) : null}

        {selectedRouteCoordinates[0] ? (
          <Marker
            coordinate={selectedRouteCoordinates[0]}
            title="Start"
            description="Route start"
            pinColor="#22c55e"
            zIndex={11}
          />
        ) : null}

        {destinationCoordinate ? (
          <Marker
            coordinate={destinationCoordinate}
            title="Destination"
            description="Route destination"
            pinColor="#ef4444"
            zIndex={11}
          />
        ) : null}

        {currentGpsLocation ? (
          <Marker
            coordinate={currentGpsLocation}
            anchor={{ x: 0.5, y: 0.5 }}
            title="Your vehicle"
            description="Real GPS location"
            zIndex={30}
          >
            <VehicleArrow heading={gpsHeading} />
          </Marker>
        ) : null}
      </MapView>

      <View style={styles.topBanner}>
        <Text style={styles.bannerLabel}>
          {hasArrived ? "Arrival" : `Route ${selectedRouteIdentity}`}
        </Text>
        <Text style={styles.bannerInstruction}>
          {hasArrived ? "You have arrived" : bannerInstruction}
        </Text>
        <Text style={styles.bannerSubtext}>
          Step {steps.length === 0 ? 0 : activeStepIndex + 1} of {steps.length}
        </Text>
      </View>

      <View style={styles.rightButtons}>
        <Pressable style={styles.floatingButton} onPress={handleRecenterPress}>
          <Text style={styles.floatingButtonText}>⌖</Text>
        </Pressable>

        <Pressable
          style={styles.floatingButton}
          onPress={() => {
            if (typeof onReportAlert === "function") {
              onReportAlert({
                selectedRoute,
                selectedRouteId: selectedRouteIdentity,
                tripSession,
                userLocation: currentGpsLocation,
              });
            }
          }}
        >
          <Text style={styles.floatingButtonText}>!</Text>
        </Pressable>
      </View>

      <View style={styles.bottomEtaStrip}>
        <View style={styles.etaItem}>
          <Text style={styles.etaValue}>{formatTime(displayRemainingTimeMin)}</Text>
          <Text style={styles.etaLabel}>ETA</Text>
        </View>

        <View style={styles.etaItem}>
          <Text style={styles.etaValue}>
            {formatDistance(displayRemainingDistanceKm)}
          </Text>
          <Text style={styles.etaLabel}>Remaining</Text>
        </View>

        <View style={styles.etaItem}>
          <Text style={styles.etaValue}>
            {getArrivalTimeText(displayRemainingTimeMin)}
          </Text>
          <Text style={styles.etaLabel}>Arrival</Text>
        </View>

        <Pressable
          style={[styles.endButton, hasArrived && styles.finishButton]}
          onPress={handleEndPress}
        >
          <Text style={styles.endButtonText}>{hasArrived ? "Finish" : "End"}</Text>
        </Pressable>
      </View>

      {showDebug ? (
        <View style={styles.debugPill}>
          <Text style={styles.debugText}>
            {selectedRoute?.provider || "provider"} •{" "}
            {selectedRoute?.provider_status || "status"} •{" "}
            {selectedRouteCoordinates.length} pts •{" "}
            {Math.round(displayProgressPercent)}% •{" "}
            {followMode ? "follow" : "free"}
          </Text>
          <Text style={styles.debugText}>
            {buildRouteValidationDebugText(routeValidation)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 640,
    backgroundColor: "#020617",
    overflow: "hidden",
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  emptyContainer: {
    minHeight: 360,
    borderRadius: 24,
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "#1e293b",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  emptyTitle: {
    color: "#f8fafc",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 8,
  },
  emptyText: {
    color: "#94a3b8",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  topBanner: {
    position: "absolute",
    top: 52,
    left: 16,
    right: 16,
    backgroundColor: "rgba(15, 23, 42, 0.96)",
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.35)",
    elevation: 8,
  },
  bannerLabel: {
    color: "#60a5fa",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    marginBottom: 5,
  },
  bannerInstruction: {
    color: "#f8fafc",
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "900",
  },
  bannerSubtext: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 6,
  },
  rightButtons: {
    position: "absolute",
    right: 16,
    top: 190,
    gap: 12,
  },
  floatingButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(15, 23, 42, 0.94)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.35)",
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
  },
  floatingButtonText: {
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: "900",
  },
  bottomEtaStrip: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 26,
    minHeight: 82,
    borderRadius: 24,
    backgroundColor: "rgba(15, 23, 42, 0.96)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.35)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    elevation: 8,
  },
  etaItem: {
    flex: 1,
  },
  etaValue: {
    color: "#f8fafc",
    fontSize: 17,
    fontWeight: "900",
  },
  etaLabel: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 3,
  },
  endButton: {
    minWidth: 62,
    height: 44,
    borderRadius: 999,
    backgroundColor: "#dc2626",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  finishButton: {
    backgroundColor: "#16a34a",
  },
  endButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "900",
  },
  vehicleMarker: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(37, 99, 235, 0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  vehicleArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 25,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "#2563eb",
  },
  debugPill: {
    position: "absolute",
    left: 16,
    bottom: 118,
    maxWidth: "88%",
    backgroundColor: "rgba(2, 6, 23, 0.75)",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  debugText: {
    color: "#cbd5e1",
    fontSize: 10,
    fontWeight: "700",
  },
});

export default memo(FlowSyncDriverNavigationMap);
