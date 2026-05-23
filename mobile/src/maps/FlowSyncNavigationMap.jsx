import React, { useMemo } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import {
  getRouteCoordinates,
  getRouteName,
  getRouteRegion,
  getTrafficDisplay,
} from "../navigation/routeUtils";

export default function FlowSyncNavigationMap({
  selectedRoute,
  vehicleCoordinate,
  startLabel = "Start",
  destinationLabel = "Destination",
  mapHeight = 360,
}) {
  const coordinates = useMemo(
    () => getRouteCoordinates(selectedRoute),
    [selectedRoute]
  );

  const region = useMemo(() => getRouteRegion(selectedRoute), [selectedRoute]);

  const startCoordinate = coordinates[0] || null;
  const destinationCoordinate = coordinates[coordinates.length - 1] || null;

  return (
    <View style={[styles.container, { height: mapHeight }]}>
      <MapView
        style={styles.map}
        provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
        initialRegion={region}
        region={region}
        showsUserLocation
        showsMyLocationButton
      >
        {startCoordinate && (
          <Marker
            coordinate={startCoordinate}
            title="Start"
            description={startLabel}
          />
        )}

        {destinationCoordinate && (
          <Marker
            coordinate={destinationCoordinate}
            title="Destination"
            description={destinationLabel}
          />
        )}

        {vehicleCoordinate && (
          <Marker
            coordinate={vehicleCoordinate}
            title="FlowSync Vehicle"
            description="Current simulated position"
            pinColor="green"
          />
        )}

        {coordinates.length > 1 && (
          <Polyline
            coordinates={coordinates}
            strokeWidth={6}
            strokeColor="#22c55e"
          />
        )}
      </MapView>

      <View style={styles.overlay}>
        <Text style={styles.title}>
          {selectedRoute ? getRouteName(selectedRoute) : "No route selected"}
        </Text>
        <Text style={styles.text}>
          {selectedRoute
            ? getTrafficDisplay(selectedRoute)
            : "Generate and select a route"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#1f334f",
    backgroundColor: "#07111f",
  },
  map: {
    flex: 1,
  },
  overlay: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    backgroundColor: "rgba(6, 17, 31, 0.92)",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#1f334f",
  },
  title: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: 15,
  },
  text: {
    color: "#fbbf24",
    fontWeight: "800",
    marginTop: 4,
  },
});
