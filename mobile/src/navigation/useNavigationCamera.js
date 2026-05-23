// mobile/src/navigation/useNavigationCamera.js

import { useCallback, useEffect, useRef, useState } from "react";

import {
  getRouteBearingFromUser,
  normalizeCoordinate,
} from "./navigationMath";

export function useNavigationCamera({
  mapRef,
  userLocation,
  gpsHeading,
  routeCoordinates,
  enabled = true,
  defaultZoom = 17.5,
  defaultPitch = 55,
} = {}) {
  const [followMode, setFollowMode] = useState(true);
  const lastCameraUpdateRef = useRef(0);

  const currentLocation = normalizeCoordinate(userLocation);

  const animateToUser = useCallback(
    ({ force = false } = {}) => {
      if (!mapRef?.current || !currentLocation) {
        return;
      }

      const now = Date.now();

      if (!force && now - lastCameraUpdateRef.current < 900) {
        return;
      }

      lastCameraUpdateRef.current = now;

      const routeBearing = getRouteBearingFromUser({
        routeCoordinates,
        userLocation: currentLocation,
      });

      const headingNumber = Number(gpsHeading);
      const finalHeading =
        Number.isFinite(headingNumber) && headingNumber > 0
          ? headingNumber
          : routeBearing;

      mapRef.current.animateCamera(
        {
          center: currentLocation,
          heading: finalHeading || 0,
          pitch: defaultPitch,
          zoom: defaultZoom,
        },
        {
          duration: force ? 450 : 700,
        }
      );
    },
    [
      mapRef,
      currentLocation,
      gpsHeading,
      routeCoordinates,
      defaultPitch,
      defaultZoom,
    ]
  );

  const recenter = useCallback(() => {
    setFollowMode(true);
    animateToUser({ force: true });
  }, [animateToUser]);

  const pauseFollowMode = useCallback(() => {
    setFollowMode(false);
  }, []);

  useEffect(() => {
    if (!enabled || !followMode) {
      return;
    }

    animateToUser();
  }, [enabled, followMode, currentLocation, gpsHeading, animateToUser]);

  return {
    followMode,
    setFollowMode,
    pauseFollowMode,
    recenter,
    animateToUser,
  };
}
