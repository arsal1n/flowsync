// mobile/src/components/VehicleMarker.js

import React, { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Marker } from "react-native-maps";

import {
  getStartCoordinate,
  normalizeCoordinate,
} from "../utils/mapUtils";

function VehicleMarker({
  selectedRoute,
  userLocation,
  coordinate,
  title = "Current location",
  description = "Your live GPS position",
}) {
  const markerCoordinate =
    normalizeCoordinate(userLocation) ||
    normalizeCoordinate(coordinate) ||
    getStartCoordinate(selectedRoute);

  if (!markerCoordinate) {
    return null;
  }

  return (
    <Marker
      coordinate={markerCoordinate}
      title={title}
      description={description}
      anchor={{ x: 0.5, y: 0.5 }}
      zIndex={20}
    >
      <View style={styles.markerOuter}>
        <View style={styles.markerInner}>
          <Text style={styles.markerText}>●</Text>
        </View>
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  markerOuter: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(37, 99, 235, 0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  markerInner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#2563eb",
    borderWidth: 3,
    borderColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  markerText: {
    color: "#ffffff",
    fontSize: 8,
    lineHeight: 8,
  },
});

export default memo(VehicleMarker);
