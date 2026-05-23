// mobile/src/navigation/useTurnByTurnProgress.js

import { useEffect, useMemo, useState } from "react";

import {
  calculateDistanceKm,
  getCurrentStepIndexFromGps,
  getInstructionText,
  getStepCoordinate,
} from "./navigationMath";

export function useTurnByTurnProgress({
  steps = [],
  userLocation,
  initialStepIndex = 0,
  onStepChange,
} = {}) {
  const [currentStepIndex, setCurrentStepIndex] = useState(initialStepIndex || 0);

  const safeSteps = Array.isArray(steps) ? steps : [];

  const currentStep = safeSteps[currentStepIndex] || null;
  const nextStep = safeSteps[currentStepIndex + 1] || null;

  const distanceToNextStepKm = useMemo(() => {
    if (!userLocation || !nextStep) {
      return null;
    }

    const stepCoordinate = getStepCoordinate(nextStep);

    if (!stepCoordinate) {
      return null;
    }

    return calculateDistanceKm(userLocation, stepCoordinate);
  }, [userLocation, nextStep]);

  const currentInstruction = getInstructionText(currentStep);
  const nextInstruction = getInstructionText(nextStep);

  useEffect(() => {
    const nextIndex = getCurrentStepIndexFromGps({
      steps: safeSteps,
      userLocation,
      currentStepIndex,
    });

    if (nextIndex !== currentStepIndex) {
      setCurrentStepIndex(nextIndex);

      if (typeof onStepChange === "function") {
        onStepChange(nextIndex);
      }
    }
  }, [safeSteps, userLocation, currentStepIndex, onStepChange]);

  useEffect(() => {
    setCurrentStepIndex(initialStepIndex || 0);
  }, [initialStepIndex]);

  return {
    currentStepIndex,
    setCurrentStepIndex,
    currentStep,
    nextStep,
    currentInstruction,
    nextInstruction,
    distanceToNextStepKm,
    distanceToNextStepM:
      distanceToNextStepKm === null ? null : Math.round(distanceToNextStepKm * 1000),
    stepCount: safeSteps.length,
    isLastStep:
      safeSteps.length > 0 && currentStepIndex >= safeSteps.length - 1,
  };
}
