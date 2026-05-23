// mobile/src/components/navigation/MapFloatingControls.jsx

import React, { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

function MapFloatingControls({
  followMode = true,
  onRecenter,
  onReportAlert,
  onCompassPress,
  onMutePress,
  isMuted = false,
}) {
  return (
    <View style={styles.container}>
      <Pressable style={styles.button} onPress={onRecenter}>
        <Text style={styles.buttonText}>{followMode ? "⌖" : "◎"}</Text>
      </Pressable>

      <Pressable style={styles.button} onPress={onCompassPress}>
        <Text style={styles.buttonText}>🧭</Text>
      </Pressable>

      <Pressable style={styles.button} onPress={onReportAlert}>
        <Text style={styles.buttonText}>!</Text>
      </Pressable>

      <Pressable style={styles.button} onPress={onMutePress}>
        <Text style={styles.buttonText}>{isMuted ? "🔇" : "🔊"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    right: 16,
    top: 190,
    gap: 12,
  },
  button: {
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
  buttonText: {
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: "900",
  },
});

export default memo(MapFloatingControls);
