// mobile/src/components/NavigationSteps.js

import React, { memo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import {
  getCurrentStepInfo,
  getNavigationStatusLabel,
} from "../utils/navigationUtils";

import {
  formatDistanceKm,
  formatTimeMin,
} from "../utils/routeProgressUtils";

import { getSafeRouteName } from "../utils/mapUtils";

function NavigationSteps({
  selectedRoute,
  currentStepIndex = 0,
  progressPercentage = 0,
  remainingDistanceKm = 0,
  remainingTimeMin = 0,
  navigationStatus = "not_started",
}) {
  const stepInfo = getCurrentStepInfo(selectedRoute, currentStepIndex);
  const routeName = getSafeRouteName(selectedRoute);

  if (!selectedRoute) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Navigation Steps</Text>
        <Text style={styles.emptyText}>Select a route to view navigation steps.</Text>
      </View>
    );
  }

  const currentStep = stepInfo.currentStep;
  const nextStep = stepInfo.nextStep;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Navigation</Text>
          <Text style={styles.routeName}>{routeName}</Text>
        </View>

        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>
            {getNavigationStatusLabel(navigationStatus)}
          </Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>ETA</Text>
          <Text style={styles.statValue}>{formatTimeMin(remainingTimeMin)}</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Distance</Text>
          <Text style={styles.statValue}>
            {formatDistanceKm(remainingDistanceKm)}
          </Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Progress</Text>
          <Text style={styles.statValue}>{Math.round(progressPercentage)}%</Text>
        </View>
      </View>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${Math.min(Math.max(progressPercentage, 0), 100)}%`,
            },
          ]}
        />
      </View>

      <View style={styles.currentInstructionCard}>
        <Text style={styles.sectionLabel}>Current instruction</Text>

        <Text style={styles.currentInstruction}>
          {currentStep?.instruction || "Navigation has not started yet."}
        </Text>

        <View style={styles.stepMetaRow}>
          {currentStep?.road_name ? (
            <Text style={styles.stepMeta}>{currentStep.road_name}</Text>
          ) : null}

          {currentStep?.distance_label ? (
            <Text style={styles.stepMeta}>{currentStep.distance_label}</Text>
          ) : null}

          {currentStep?.duration_label ? (
            <Text style={styles.stepMeta}>{currentStep.duration_label}</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.nextInstructionCard}>
        <Text style={styles.sectionLabel}>Next</Text>

        <Text style={styles.nextInstruction}>
          {nextStep?.instruction || "No next step available."}
        </Text>
      </View>

      <Text style={styles.stepsTitle}>Turn-by-turn steps</Text>

      <ScrollView style={styles.stepsList} nestedScrollEnabled>
        {stepInfo.totalSteps === 0 ? (
          <Text style={styles.emptyText}>No turn-by-turn steps available.</Text>
        ) : (
          stepInfo.totalSteps > 0 &&
          Array.from({ length: stepInfo.totalSteps }).map((_, index) => {
            const step = getCurrentStepInfo(selectedRoute, index).currentStep;
            const isCurrent = index === stepInfo.currentStepIndex;

            return (
              <View
                key={`navigation-step-${index}`}
                style={[styles.stepItem, isCurrent && styles.activeStepItem]}
              >
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>

                <View style={styles.stepContent}>
                  <Text
                    style={[
                      styles.stepInstruction,
                      isCurrent && styles.activeStepInstruction,
                    ]}
                  >
                    {step?.instruction || "Continue on route."}
                  </Text>

                  <View style={styles.stepMetaRow}>
                    {step?.road_name ? (
                      <Text style={styles.stepMeta}>{step.road_name}</Text>
                    ) : null}

                    {step?.distance_label ? (
                      <Text style={styles.stepMeta}>{step.distance_label}</Text>
                    ) : null}

                    {step?.duration_label ? (
                      <Text style={styles.stepMeta}>{step.duration_label}</Text>
                    ) : null}
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#0f172a",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 14,
  },
  title: {
    color: "#f8fafc",
    fontSize: 20,
    fontWeight: "800",
  },
  routeName: {
    color: "#94a3b8",
    fontSize: 13,
    marginTop: 3,
  },
  statusBadge: {
    backgroundColor: "#1e40af",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusText: {
    color: "#dbeafe",
    fontSize: 11,
    fontWeight: "700",
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#111827",
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: "#1f2937",
  },
  statLabel: {
    color: "#94a3b8",
    fontSize: 11,
    marginBottom: 4,
  },
  statValue: {
    color: "#f8fafc",
    fontSize: 15,
    fontWeight: "800",
  },
  progressTrack: {
    height: 9,
    borderRadius: 999,
    backgroundColor: "#1f2937",
    overflow: "hidden",
    marginBottom: 14,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#22c55e",
    borderRadius: 999,
  },
  currentInstructionCard: {
    backgroundColor: "#111827",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#2563eb",
    marginBottom: 10,
  },
  nextInstructionCard: {
    backgroundColor: "#111827",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1f2937",
    marginBottom: 14,
  },
  sectionLabel: {
    color: "#60a5fa",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  currentInstruction: {
    color: "#f8fafc",
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 24,
  },
  nextInstruction: {
    color: "#cbd5e1",
    fontSize: 14,
    lineHeight: 20,
  },
  stepsTitle: {
    color: "#f8fafc",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 10,
  },
  stepsList: {
    maxHeight: 240,
  },
  stepItem: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#111827",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#1f2937",
    marginBottom: 8,
  },
  activeStepItem: {
    borderColor: "#22c55e",
    backgroundColor: "#052e16",
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#1e293b",
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumberText: {
    color: "#f8fafc",
    fontSize: 12,
    fontWeight: "800",
  },
  stepContent: {
    flex: 1,
  },
  stepInstruction: {
    color: "#cbd5e1",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  activeStepInstruction: {
    color: "#f8fafc",
  },
  stepMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 7,
  },
  stepMeta: {
    color: "#94a3b8",
    fontSize: 11,
  },
  emptyText: {
    color: "#94a3b8",
    fontSize: 13,
    lineHeight: 20,
  },
});

export default memo(NavigationSteps);
