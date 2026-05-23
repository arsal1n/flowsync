// mobile/src/maps/FlowSyncMapOverlays.jsx

import React, { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

import MapFloatingControls from "../components/navigation/MapFloatingControls";
import NavigationEtaPanel from "../components/navigation/NavigationEtaPanel";
import NavigationInstructionBanner from "../components/navigation/NavigationInstructionBanner";

function FlowSyncMapOverlays({
  routeLabel,
  instruction,
  stepIndex,
  stepCount,
  hasArrived,
  etaText,
  distanceText,
  arrivalTimeText,
  followMode,
  isMuted,
  showDebug = false,
  debugText,
  onRecenter,
  onReportAlert,
  onCompassPress,
  onMutePress,
  onEndPress,
}) {
  return (
    <>
      <NavigationInstructionBanner
        routeLabel={routeLabel}
        instruction={instruction}
        stepIndex={stepIndex}
        stepCount={stepCount}
        hasArrived={hasArrived}
      />

      <MapFloatingControls
        followMode={followMode}
        isMuted={isMuted}
        onRecenter={onRecenter}
        onReportAlert={onReportAlert}
        onCompassPress={onCompassPress}
        onMutePress={onMutePress}
      />

      <NavigationEtaPanel
        etaText={etaText}
        distanceText={distanceText}
        arrivalTimeText={arrivalTimeText}
        hasArrived={hasArrived}
        onEndPress={onEndPress}
      />

      {showDebug ? (
        <View style={styles.debugPill}>
          <Text style={styles.debugText}>{debugText}</Text>
        </View>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
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

export default memo(FlowSyncMapOverlays);
