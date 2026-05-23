// mobile/src/components/MapControls.js

import React, { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { NAVIGATION_STATUS } from "../utils/navigationUtils";

function ControlButton({
  label,
  onPress,
  variant = "secondary",
  disabled = false,
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        styles[`${variant}Button`],
        disabled && styles.disabledButton,
        pressed && !disabled && styles.pressedButton,
      ]}
    >
      <Text style={[styles.buttonText, styles[`${variant}ButtonText`]]}>
        {label}
      </Text>
    </Pressable>
  );
}

function MapControls({
  navigationStatus = NAVIGATION_STATUS.NOT_STARTED,
  isNavigationActive = false,
  hasArrived = false,
  onStartNavigation,
  onPauseNavigation,
  onResumeNavigation,
  onNextStep,
  onRecenter,
  onEndTrip,
  onReportAlert,
  onToggleLayers,
}) {
  const canStart =
    navigationStatus === NAVIGATION_STATUS.NOT_STARTED ||
    navigationStatus === NAVIGATION_STATUS.ROUTE_SELECTED;

  const canNavigate =
    navigationStatus === NAVIGATION_STATUS.NAVIGATION_STARTED ||
    navigationStatus === NAVIGATION_STATUS.IN_PROGRESS;

  const canFinish = hasArrived || navigationStatus === NAVIGATION_STATUS.ARRIVED;

  return (
    <View style={styles.container}>
      <View style={styles.primaryRow}>
        {canStart ? (
          <ControlButton
            label="Start In-App Navigation"
            variant="primary"
            onPress={onStartNavigation}
          />
        ) : null}

        {canNavigate ? (
          <>
            <ControlButton
              label={isNavigationActive ? "Pause" : "Resume"}
              variant="secondary"
              onPress={isNavigationActive ? onPauseNavigation : onResumeNavigation}
            />

            <ControlButton
              label="Next Step"
              variant="primary"
              onPress={onNextStep}
            />
          </>
        ) : null}

        {canFinish ? (
          <ControlButton
            label="Finish Trip"
            variant="primary"
            onPress={onEndTrip}
          />
        ) : null}
      </View>

      <View style={styles.secondaryRow}>
        <ControlButton
          label="Recenter"
          variant="secondary"
          onPress={onRecenter}
        />

        <ControlButton
          label="Report Alert"
          variant="warning"
          onPress={onReportAlert}
        />

        <ControlButton
          label="Layers"
          variant="secondary"
          onPress={onToggleLayers}
        />

        {!canStart && !canFinish ? (
          <ControlButton
            label="End Trip"
            variant="danger"
            onPress={onEndTrip}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  primaryRow: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  secondaryRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  button: {
    minHeight: 42,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButton: {
    backgroundColor: "#2563eb",
  },
  secondaryButton: {
    backgroundColor: "#1f2937",
    borderWidth: 1,
    borderColor: "#334155",
  },
  warningButton: {
    backgroundColor: "#f97316",
  },
  dangerButton: {
    backgroundColor: "#dc2626",
  },
  disabledButton: {
    opacity: 0.5,
  },
  pressedButton: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  buttonText: {
    fontSize: 13,
    fontWeight: "800",
  },
  primaryButtonText: {
    color: "#ffffff",
  },
  secondaryButtonText: {
    color: "#f8fafc",
  },
  warningButtonText: {
    color: "#ffffff",
  },
  dangerButtonText: {
    color: "#ffffff",
  },
});

export default memo(MapControls);
