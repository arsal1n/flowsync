// frontend/src/components/NavigationPanel.jsx

import {
  getTurnByTurnSteps,
  getCurrentStep,
  getNextStep,
  getNavigationProgressPercent,
} from "../utils/navigationUtils";

function formatDistance(distanceM) {
  const value = Number(distanceM);

  if (!Number.isFinite(value)) {
    return "N/A";
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)} km`;
  }

  return `${Math.round(value)} m`;
}

function formatDuration(durationMin) {
  const value = Number(durationMin);

  if (!Number.isFinite(value)) {
    return "N/A";
  }

  return `${Math.round(value)} min`;
}

function NavigationPanel({
  selectedRoute = null,
  navigationState = null,
  isNavigationActive = false,
  onStartNavigation = null,
  onNextStep = null,
  onEndNavigation = null,
}) {
  const steps = getTurnByTurnSteps(selectedRoute);

  const currentStepIndex = navigationState?.currentStepIndex || 0;
  const currentStep =
    navigationState?.currentStep || getCurrentStep(steps, currentStepIndex);
  const nextStep =
    navigationState?.nextStep || getNextStep(steps, currentStepIndex);

  const progressPercent =
    navigationState?.progressPercent ??
    getNavigationProgressPercent(currentStepIndex, steps.length);

  if (!selectedRoute) {
    return (
      <div className="navigation-panel">
        <h2>Navigation</h2>
        <p>Select a route to start navigation.</p>
      </div>
    );
  }

  return (
    <div className="navigation-panel">
      <div className="navigation-header">
        <h2>Navigation</h2>

        <span
          className={`navigation-status ${
            isNavigationActive ? "active" : "idle"
          }`}
        >
          {isNavigationActive ? "Active" : "Ready"}
        </span>
      </div>

      <div className="navigation-progress">
        <div className="navigation-progress-top">
          <span>Progress</span>
          <strong>{progressPercent}%</strong>
        </div>

        <div className="progress-bar">
          <div
            className="progress-bar-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="current-instruction-card">
        <span className="instruction-label">Current instruction</span>

        <h3>
          {currentStep?.instruction ||
            navigationState?.currentInstruction ||
            "Start navigation to see the current instruction."}
        </h3>

        <div className="instruction-meta">
          <span>Road: {currentStep?.road_name || "N/A"}</span>
          <span>Distance: {formatDistance(currentStep?.distance_m)}</span>
          <span>Duration: {formatDuration(currentStep?.duration_min)}</span>
        </div>
      </div>

      <div className="next-instruction-card">
        <span className="instruction-label">Next instruction</span>

        <p>
          {nextStep?.instruction ||
            navigationState?.nextInstruction ||
            "No next instruction available."}
        </p>
      </div>

      <div className="navigation-actions">
        {!isNavigationActive && (
          <button
            type="button"
            className="primary-action-button"
            onClick={onStartNavigation}
          >
            Start Navigation
          </button>
        )}

        {isNavigationActive && (
          <>
            <button
              type="button"
              className="secondary-action-button"
              onClick={onNextStep}
              disabled={steps.length === 0}
            >
              Next Step
            </button>

            <button
              type="button"
              className="danger-action-button"
              onClick={onEndNavigation}
            >
              End Navigation
            </button>
          </>
        )}
      </div>

      <div className="turn-step-list">
        <h3>Turn-by-Turn Steps</h3>

        {steps.length === 0 ? (
          <p>No turn-by-turn steps available for this route yet.</p>
        ) : (
          <ol>
            {steps.map((step, index) => (
              <li
                key={`${step.instruction || "step"}-${index}`}
                className={index === currentStepIndex ? "current-step" : ""}
              >
                <strong>{step.instruction || `Step ${index + 1}`}</strong>

                <div className="step-meta">
                  <span>{step.maneuver || "maneuver"}</span>
                  <span>{step.road_name || "unknown road"}</span>
                  <span>{formatDistance(step.distance_m)}</span>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

export default NavigationPanel;
