// mobile/src/components/navigation/NavigationInstructionBanner.jsx

import React, { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

function NavigationInstructionBanner({
  routeLabel = "Selected Route",
  instruction = "Continue on the selected route",
  stepIndex = 0,
  stepCount = 0,
  hasArrived = false,
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{hasArrived ? "Arrival" : routeLabel}</Text>
      <Text style={styles.instruction}>
        {hasArrived ? "You have arrived" : instruction}
      </Text>
      <Text style={styles.subtext}>
        Step {stepCount === 0 ? 0 : stepIndex + 1} of {stepCount}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
  label: {
    color: "#60a5fa",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    marginBottom: 5,
  },
  instruction: {
    color: "#f8fafc",
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "900",
  },
  subtext: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 6,
  },
});

export default memo(NavigationInstructionBanner);
