// mobile/src/components/navigation/IncidentMarkerLayer.jsx

import React, { memo } from "react";
import { Callout, Marker } from "react-native-maps";
import { StyleSheet, Text, View } from "react-native";

import { normalizeCoordinate } from "../../navigation/navigationMath";

function getIncidentCoordinate(incident) {
  return normalizeCoordinate(
    incident?.coordinate ||
      incident?.location ||
      {
        latitude: incident?.latitude ?? incident?.lat,
        longitude: incident?.longitude ?? incident?.lng ?? incident?.lon,
      }
  );
}

function getIncidentIcon(type = "") {
  const normalizedType = String(type).toLowerCase();

  if (normalizedType.includes("accident")) return "⚠️";
  if (normalizedType.includes("congestion")) return "🚗";
  if (normalizedType.includes("closure")) return "⛔";
  if (normalizedType.includes("construction")) return "🚧";
  if (normalizedType.includes("emergency")) return "🚑";
  if (normalizedType.includes("hazard")) return "!";
  return "!";
}

function IncidentMarkerLayer({ incidents = [], alerts = [], onIncidentPress }) {
  const items = [...(Array.isArray(incidents) ? incidents : []), ...(Array.isArray(alerts) ? alerts : [])];

  return (
    <>
      {items.map((item, index) => {
        const coordinate = getIncidentCoordinate(item);

        if (!coordinate) {
          return null;
        }

        const id = item.id || item.alert_id || item.incident_id || `incident-${index}`;
        const title = item.title || item.type || item.alert_type || "Road alert";
        const severity = item.severity || item.priority || "info";
        const description = item.description || item.message || item.summary || "No details available";

        return (
          <Marker
            key={id}
            coordinate={coordinate}
            zIndex={20}
            onPress={() => {
              if (typeof onIncidentPress === "function") {
                onIncidentPress(item);
              }
            }}
          >
            <View style={styles.marker}>
              <Text style={styles.markerText}>{getIncidentIcon(title)}</Text>
            </View>

            <Callout>
              <View style={styles.callout}>
                <Text style={styles.calloutTitle}>{title}</Text>
                <Text style={styles.calloutSeverity}>Severity: {severity}</Text>
                <Text style={styles.calloutDescription}>{description}</Text>
              </View>
            </Callout>
          </Marker>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  marker: {
    minWidth: 34,
    minHeight: 34,
    borderRadius: 17,
    backgroundColor: "#dc2626",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  markerText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900",
  },
  callout: {
    width: 210,
    padding: 8,
  },
  calloutTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0f172a",
    marginBottom: 4,
  },
  calloutSeverity: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 4,
  },
  calloutDescription: {
    fontSize: 12,
    color: "#475569",
  },
});

export default memo(IncidentMarkerLayer);
