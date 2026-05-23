// mobile/src/components/IncidentMarkers.js

import React, { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Marker } from "react-native-maps";

import {
  getSafeRouteAlerts,
  normalizeCoordinate,
} from "../utils/mapUtils";

function getMarkerEmoji(item) {
  const type = String(
    item?.markerType || item?.type || item?.incident_type || item?.alert_type || ""
  ).toLowerCase();

  const message = String(item?.message || item?.title || "").toLowerCase();

  if (type.includes("accident") || message.includes("accident")) {
    return "⚠️";
  }

  if (type.includes("closure") || message.includes("closure")) {
    return "⛔";
  }

  if (type.includes("traffic") || message.includes("traffic")) {
    return "🚦";
  }

  if (type.includes("congestion") || message.includes("congestion")) {
    return "🚗";
  }

  if (type.includes("eco") || message.includes("eco")) {
    return "🌱";
  }

  return "!";
}

function getMarkerTitle(item) {
  return (
    item?.title ||
    item?.message ||
    item?.description ||
    item?.incident_type ||
    item?.alert_type ||
    "Route alert"
  );
}

function getMarkerDescription(item) {
  return (
    item?.description ||
    item?.details ||
    item?.message ||
    item?.severity ||
    "Traffic or route warning"
  );
}

function IncidentMarkers({ selectedRoute }) {
  const routeAlerts = getSafeRouteAlerts(selectedRoute);

  if (routeAlerts.length === 0) {
    return null;
  }

  return (
    <>
      {routeAlerts.map((item, index) => {
        const coordinate = normalizeCoordinate({
          latitude: item.latitude ?? item.lat,
          longitude: item.longitude ?? item.lng ?? item.lon,
        });

        if (!coordinate) {
          return null;
        }

        return (
          <Marker
            key={`${item.markerType || "alert"}-${item.id || index}`}
            coordinate={coordinate}
            title={getMarkerTitle(item)}
            description={getMarkerDescription(item)}
            zIndex={15}
          >
            <View style={styles.markerContainer}>
              <Text style={styles.markerText}>{getMarkerEmoji(item)}</Text>
            </View>
          </Marker>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  markerContainer: {
    minWidth: 30,
    height: 30,
    paddingHorizontal: 6,
    borderRadius: 15,
    backgroundColor: "#f97316",
    borderWidth: 2,
    borderColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  markerText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },
});

export default memo(IncidentMarkers);
