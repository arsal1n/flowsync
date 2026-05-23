// mobile/src/screens/DriverNavigationMode.js

import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";

const DEFAULT_REGION = {
  latitude: 25.2048,
  longitude: 55.2708,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

const ARRIVAL_DISTANCE_KM = 0.08;
const STEP_REACHED_DISTANCE_KM = 0.08;

function toNumber(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function normalizeCoordinate(point) {
  if (!point) {
    return null;
  }

  if (Array.isArray(point)) {
    const first = toNumber(point[0]);
    const second = toNumber(point[1]);

    if (first === null || second === null) {
      return null;
    }

    // ORS usually gives [longitude, latitude].
    // UAE longitude is usually around 55, latitude around 25.
    if (Math.abs(first) > 40 && Math.abs(second) <= 40) {
      return {
        latitude: second,
        longitude: first,
      };
    }

    return {
      latitude: first,
      longitude: second,
    };
  }

  const latitude = toNumber(
    point.latitude ?? point.lat ?? point.current_latitude ?? point.y
  );

  const longitude = toNumber(
    point.longitude ?? point.lng ?? point.lon ?? point.current_longitude ?? point.x
  );

  if (latitude === null || longitude === null) {
    return null;
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return null;
  }

  return {
    latitude,
    longitude,
  };
}

function normalizeCoordinates(points) {
  if (!Array.isArray(points)) {
    return [];
  }

  return points
    .map((point) => normalizeCoordinate(point))
    .filter((point) => point !== null);
}

function getSelectedRouteCoordinates(selectedRoute, routeCoordinates) {
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

function getTurnByTurnSteps(selectedRoute, turnByTurnSteps) {
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

function getInstruction(step) {
  if (!step) {
    return "Continue on the selected route";
  }

  return (
    step.instruction ||
    step.text ||
    step.description ||
    step.maneuver?.instruction ||
    "Continue on the selected route"
  );
}

function getStepCoordinate(step) {
  return normalizeCoordinate(step);
}

function calculateDistanceKm(startPoint, endPoint) {
  const start = normalizeCoordinate(startPoint);
  const end = normalizeCoordinate(endPoint);

  if (!start || !end) {
    return 0;
  }

  const earthRadiusKm = 6371;
  const latitudeDifference = ((end.latitude - start.latitude) * Math.PI) / 180;
  const longitudeDifference = ((end.longitude - start.longitude) * Math.PI) / 180;

  const startLatitudeRadians = (start.latitude * Math.PI) / 180;
  const endLatitudeRadians = (end.latitude * Math.PI) / 180;

  const haversineValue =
    Math.sin(latitudeDifference / 2) * Math.sin(latitudeDifference / 2) +
    Math.cos(startLatitudeRadians) *
      Math.cos(endLatitudeRadians) *
      Math.sin(longitudeDifference / 2) *
      Math.sin(longitudeDifference / 2);

  const centralAngle =
    2 * Math.atan2(Math.sqrt(haversineValue), Math.sqrt(1 - haversineValue));

  return earthRadiusKm * centralAngle;
}

function calculateRouteDistanceKm(coordinates) {
  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return 0;
  }

  let totalDistance = 0;

  for (let index = 1; index < coordinates.length; index += 1) {
    totalDistance += calculateDistanceKm(coordinates[index - 1], coordinates[index]);
  }

  return totalDistance;
}

function findNearestCoordinateIndex(coordinates, userLocation) {
  const currentLocation = normalizeCoordinate(userLocation);

  if (!currentLocation || coordinates.length === 0) {
    return 0;
  }

  let nearestIndex = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;

  coordinates.forEach((coordinate, index) => {
    const distance = calculateDistanceKm(currentLocation, coordinate);

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  });

  return nearestIndex;
}

function getRouteRegion(coordinates, userLocation) {
  const currentLocation = normalizeCoordinate(userLocation);

  if (currentLocation) {
    return {
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
  }

  if (!Array.isArray(coordinates) || coordinates.length === 0) {
    return DEFAULT_REGION;
  }

  const latitudes = coordinates.map((coordinate) => coordinate.latitude);
  const longitudes = coordinates.map((coordinate) => coordinate.longitude);

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

function formatDistance(distanceKm) {
  const numberValue = Number(distanceKm);

  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    return "0 m";
  }

  if (numberValue < 1) {
    return `${Math.round(numberValue * 1000)} m`;
  }

  return `${numberValue.toFixed(1)} km`;
}

function formatTime(minutes) {
  const numberValue = Number(minutes);

  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    return "0 min";
  }

  if (numberValue < 60) {
    return `${Math.ceil(numberValue)} min`;
  }

  const hours = Math.floor(numberValue / 60);
  const remainingMinutes = Math.ceil(numberValue % 60);

  if (remainingMinutes === 0) {
    return `${hours} hr`;
  }

  return `${hours} hr ${remainingMinutes} min`;
}

function getArrivalTimeText(minutes) {
  const numberValue = Number(minutes);

  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    return "--:--";
  }

  const arrivalDate = new Date(Date.now() + numberValue * 60 * 1000);

  return arrivalDate.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getRouteProgressPercent(coordinates, nearestIndex, fallbackProgress) {
  const fallbackNumber = Number(fallbackProgress);

  if (Number.isFinite(fallbackNumber) && fallbackNumber > 0) {
    return Math.min(Math.max(fallbackNumber, 0), 100);
  }

  if (!Array.isArray(coordinates) || coordinates.length <= 1) {
    return 0;
  }

  return Math.round((nearestIndex / (coordinates.length - 1)) * 100);
}

function getRemainingCoordinates(coordinates, nearestIndex) {
  if (!Array.isArray(coordinates) || coordinates.length === 0) {
    return [];
  }

  return coordinates.slice(Math.max(nearestIndex, 0));
}

function getPassedCoordinates(coordinates, nearestIndex) {
  if (!Array.isArray(coordinates) || coordinates.length === 0) {
    return [];
  }

  return coordinates.slice(0, Math.min(nearestIndex + 1, coordinates.length));
}

function getDisplayStepIndex({
  steps,
  userLocation,
  currentStepIndex,
  liveStepIndex,
}) {
  if (!Array.isArray(steps) || steps.length === 0) {
    return 0;
  }

  const currentIndex = Math.min(
    Math.max(Number.isFinite(liveStepIndex) ? liveStepIndex : currentStepIndex || 0, 0),
    steps.length - 1
  );

  const nextStep = steps[currentIndex + 1];

  if (!userLocation || !nextStep) {
    return currentIndex;
  }

  const nextStepCoordinate = getStepCoordinate(nextStep);

  if (!nextStepCoordinate) {
    return currentIndex;
  }

  const distanceToNextStep = calculateDistanceKm(userLocation, nextStepCoordinate);

  if (distanceToNextStep <= STEP_REACHED_DISTANCE_KM) {
    return Math.min(currentIndex + 1, steps.length - 1);
  }

  return currentIndex;
}

function DriverNavigationMode({
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
  onRecenter,
  onReportAlert,
  onEndTrip,
  onArrive,
  onCancelTrip,
  onStepChange,
  style,
}) {
  const mapRef = useRef(null);
  const arrivedNotifiedRef = useRef(false);
  const [liveStepIndex, setLiveStepIndex] = useState(currentStepIndex || 0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCompassLocked, setIsCompassLocked] = useState(true);

  const selectedRouteCoordinates = useMemo(
    () => getSelectedRouteCoordinates(selectedRoute, routeCoordinates),
    [selectedRoute, routeCoordinates]
  );

  const steps = useMemo(
    () => getTurnByTurnSteps(selectedRoute, turnByTurnSteps),
    [selectedRoute, turnByTurnSteps]
  );

  const currentGpsLocation = normalizeCoordinate(userLocation);

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

  const routeTotalDistanceKm = useMemo(
    () => calculateRouteDistanceKm(selectedRouteCoordinates),
    [selectedRouteCoordinates]
  );

  const calculatedRemainingDistanceKm = useMemo(
    () => calculateRouteDistanceKm(remainingCoordinates),
    [remainingCoordinates]
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

  const calculatedProgressPercent = getRouteProgressPercent(
    selectedRouteCoordinates,
    nearestRouteIndex,
    progressPercent
  );

  const displayRemainingTimeMin =
    Number.isFinite(Number(remainingTimeMin)) && Number(remainingTimeMin) > 0
      ? Number(remainingTimeMin)
      : routeEtaMin > 0 && routeTotalDistanceKm > 0
      ? Math.ceil((displayRemainingDistanceKm / routeTotalDistanceKm) * routeEtaMin)
      : 0;

  const destinationCoordinate =
    selectedRouteCoordinates.length > 0
      ? selectedRouteCoordinates[selectedRouteCoordinates.length - 1]
      : null;

  const distanceToDestinationKm =
    currentGpsLocation && destinationCoordinate
      ? calculateDistanceKm(currentGpsLocation, destinationCoordinate)
      : Number.POSITIVE_INFINITY;

  const hasArrived =
    distanceToDestinationKm <= ARRIVAL_DISTANCE_KM ||
    calculatedProgressPercent >= 99 ||
    (steps.length > 0 && liveStepIndex >= steps.length - 1 && distanceToDestinationKm <= 0.15);

  const activeStepIndex = Math.min(Math.max(liveStepIndex, 0), Math.max(steps.length - 1, 0));
  const activeStep = steps[activeStepIndex] || null;
  const nextStep = steps[activeStepIndex + 1] || null;
  const bannerStep = nextStep || activeStep;

  const bannerStepCoordinate = getStepCoordinate(bannerStep);
  const distanceToBannerStepKm =
    currentGpsLocation && bannerStepCoordinate
      ? calculateDistanceKm(currentGpsLocation, bannerStepCoordinate)
      : null;

  const bannerDistanceText =
    distanceToBannerStepKm !== null && Number.isFinite(distanceToBannerStepKm)
      ? formatDistance(distanceToBannerStepKm)
      : formatDistance(displayRemainingDistanceKm);

  const activeInstruction = hasArrived
    ? "You have arrived"
    : bannerStep
    ? getInstruction(bannerStep)
    : "Continue on the selected route";

  const currentRouteId =
    selected_route_id ||
    selectedRouteId ||
    selectedRoute?.route_id ||
    selectedRoute?.id ||
    selectedRoute?.route_name ||
    "selected-route";

  const initialRegion = useMemo(
    () => getRouteRegion(selectedRouteCoordinates, currentGpsLocation),
    [selectedRouteCoordinates, currentGpsLocation]
  );

  function animateToDriverCamera() {
    if (!mapRef.current || !currentGpsLocation) {
      return;
    }

    mapRef.current.animateCamera(
      {
        center: currentGpsLocation,
        heading: isCompassLocked ? Number(gpsHeading || userLocation?.heading || 0) : 0,
        pitch: 55,
        zoom: 17.5,
      },
      {
        duration: 650,
      }
    );
  }

  function fitRouteOnMap() {
    if (!mapRef.current || selectedRouteCoordinates.length < 2) {
      return;
    }

    mapRef.current.fitToCoordinates(selectedRouteCoordinates, {
      edgePadding: {
        top: 120,
        right: 70,
        bottom: 160,
        left: 70,
      },
      animated: true,
    });
  }

  function handleRecenterPress() {
    animateToDriverCamera();

    if (typeof onRecenter === "function") {
      onRecenter();
    }
  }

  function handleEndTripPress() {
    if (hasArrived) {
      if (typeof onArrive === "function") {
        onArrive({
          selectedRoute,
          selectedRouteId: currentRouteId,
          tripSession,
          status: "completed",
        });
        return;
      }

      if (typeof onEndTrip === "function") {
        onEndTrip({
          selectedRoute,
          selectedRouteId: currentRouteId,
          tripSession,
          status: "completed",
        });
      }

      return;
    }

    Alert.alert(
      "Cancel trip?",
      "You have not arrived yet. Ending now should cancel this trip instead of marking it completed.",
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
                selectedRouteId: currentRouteId,
                tripSession,
                status: "cancelled",
              });
              return;
            }

            if (typeof onEndTrip === "function") {
              onEndTrip({
                selectedRoute,
                selectedRouteId: currentRouteId,
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
    const nextDisplayStepIndex = getDisplayStepIndex({
      steps,
      userLocation: currentGpsLocation,
      currentStepIndex,
      liveStepIndex,
    });

    if (nextDisplayStepIndex !== liveStepIndex) {
      setLiveStepIndex(nextDisplayStepIndex);

      if (typeof onStepChange === "function") {
        onStepChange(nextDisplayStepIndex);
      }
    }
  }, [steps, currentGpsLocation, currentStepIndex, liveStepIndex, onStepChange]);

  useEffect(() => {
    if (!isTracking || !currentGpsLocation) {
      return;
    }

    animateToDriverCamera();
  }, [currentGpsLocation, gpsHeading, isTracking, isCompassLocked]);

  useEffect(() => {
    if (!hasArrived || arrivedNotifiedRef.current) {
      return;
    }

    arrivedNotifiedRef.current = true;

    if (typeof onArrive === "function") {
      onArrive({
        selectedRoute,
        selectedRouteId: currentRouteId,
        tripSession,
        status: "arrived",
      });
    }
  }, [hasArrived, onArrive, selectedRoute, currentRouteId, tripSession]);

  if (!selectedRoute) {
    return (
      <View style={[styles.emptyContainer, style]}>
        <Text style={styles.emptyTitle}>No selected route</Text>
        <Text style={styles.emptyText}>
          Select a route before opening driver navigation mode.
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation={false}
        showsCompass={false}
        showsMyLocationButton={false}
        rotateEnabled
        pitchEnabled
        onMapReady={() => {
          if (currentGpsLocation) {
            animateToDriverCamera();
          } else {
            fitRouteOnMap();
          }
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
            zIndex={8}
          />
        ) : selectedRouteCoordinates.length > 1 ? (
          <Polyline
            coordinates={selectedRouteCoordinates}
            strokeColor="#2563eb"
            strokeWidth={9}
            lineCap="round"
            lineJoin="round"
            zIndex={8}
          />
        ) : null}

        {selectedRouteCoordinates[0] ? (
          <Marker
            coordinate={selectedRouteCoordinates[0]}
            title="Start"
            description="Route start"
            pinColor="#22c55e"
            zIndex={12}
          />
        ) : null}

        {destinationCoordinate ? (
          <Marker
            coordinate={destinationCoordinate}
            title="Destination"
            description="Route destination"
            pinColor="#ef4444"
            zIndex={12}
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
            <View
              style={[
                styles.vehicleMarker,
                {
                  transform: [
                    {
                      rotate: `${Number(gpsHeading || userLocation?.heading || 0)}deg`,
                    },
                  ],
                },
              ]}
            >
              <View style={styles.vehicleArrow} />
            </View>
          </Marker>
        ) : null}
      </MapView>

      <View style={styles.topInstructionBanner}>
        <Text style={styles.miniLabel}>
          {hasArrived ? "Arrival" : `Route ${currentRouteId}`}
        </Text>
        <Text style={styles.instructionText}>
          {hasArrived ? "Arrived at destination" : `In ${bannerDistanceText}, ${activeInstruction}`}
        </Text>
        <Text style={styles.stepText}>
          Step {steps.length === 0 ? 0 : activeStepIndex + 1} of {steps.length}
        </Text>
      </View>

      <View style={styles.rightControls}>
        <Pressable style={styles.floatingButton} onPress={handleRecenterPress}>
          <Text style={styles.floatingButtonText}>⌖</Text>
        </Pressable>

        <Pressable
          style={styles.floatingButton}
          onPress={() => {
            setIsCompassLocked((value) => !value);
            animateToDriverCamera();
          }}
        >
          <Text style={styles.floatingButtonText}>🧭</Text>
        </Pressable>

        <Pressable
          style={styles.floatingButton}
          onPress={() => {
            if (typeof onReportAlert === "function") {
              onReportAlert({
                selectedRoute,
                selectedRouteId: currentRouteId,
                tripSession,
                userLocation: currentGpsLocation,
              });
            }
          }}
        >
          <Text style={styles.floatingButtonText}>!</Text>
        </Pressable>

        <Pressable
          style={styles.floatingButton}
          onPress={() => setIsMuted((value) => !value)}
        >
          <Text style={styles.floatingButtonText}>{isMuted ? "🔇" : "🔊"}</Text>
        </Pressable>
      </View>

      <View style={styles.bottomEtaStrip}>
        <View style={styles.etaItem}>
          <Text style={styles.etaValue}>{formatTime(displayRemainingTimeMin)}</Text>
          <Text style={styles.etaLabel}>ETA</Text>
        </View>

        <View style={styles.etaItem}>
          <Text style={styles.etaValue}>{formatDistance(displayRemainingDistanceKm)}</Text>
          <Text style={styles.etaLabel}>Remaining</Text>
        </View>

        <View style={styles.etaItem}>
          <Text style={styles.etaValue}>{getArrivalTimeText(displayRemainingTimeMin)}</Text>
          <Text style={styles.etaLabel}>Arrival</Text>
        </View>

        <Pressable
          style={[styles.endButton, hasArrived && styles.finishButton]}
          onPress={handleEndTripPress}
        >
          <Text style={styles.endButtonText}>{hasArrived ? "Finish" : "End"}</Text>
        </Pressable>
      </View>

      <View style={styles.debugPill}>
        <Text style={styles.debugText}>
          {selectedRoute?.provider || "provider"} •{" "}
          {selectedRoute?.provider_status || "status"} •{" "}
          {selectedRouteCoordinates.length} pts • {Math.round(calculatedProgressPercent)}%
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 620,
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
  topInstructionBanner: {
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
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
  miniLabel: {
    color: "#60a5fa",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    marginBottom: 5,
  },
  instructionText: {
    color: "#f8fafc",
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "900",
  },
  stepText: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 6,
  },
  rightControls: {
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
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
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
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
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
    transform: [{ rotate: "0deg" }],
  },
  debugPill: {
    position: "absolute",
    left: 16,
    bottom: 118,
    maxWidth: "84%",
    backgroundColor: "rgba(2, 6, 23, 0.72)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  debugText: {
    color: "#cbd5e1",
    fontSize: 10,
    fontWeight: "700",
  },
});

export default memo(DriverNavigationMode);
