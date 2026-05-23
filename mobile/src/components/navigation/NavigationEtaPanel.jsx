// mobile/src/components/navigation/NavigationEtaPanel.jsx

import React, { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

function NavigationEtaPanel({
  etaText = "0 min",
  distanceText = "0 m",
  arrivalTimeText = "--:--",
  hasArrived = false,
  onEndPress,
}) {
  return (
    <View style={styles.container}>
      <View style={styles.item}>
        <Text style={styles.value}>{etaText}</Text>
        <Text style={styles.label}>ETA</Text>
      </View>

      <View style={styles.item}>
        <Text style={styles.value}>{distanceText}</Text>
        <Text style={styles.label}>Remaining</Text>
      </View>

      <View style={styles.item}>
        <Text style={styles.value}>{arrivalTimeText}</Text>
        <Text style={styles.label}>Arrival</Text>
      </View>

      <Pressable
        style={[styles.endButton, hasArrived && styles.finishButton]}
        onPress={onEndPress}
      >
        <Text style={styles.endButtonText}>{hasArrived ? "Finish" : "End"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
  item: {
    flex: 1,
  },
  value: {
    color: "#f8fafc",
    fontSize: 17,
    fontWeight: "900",
  },
  label: {
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
});

export default memo(NavigationEtaPanel);
