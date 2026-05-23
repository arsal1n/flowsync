// mobile/src/navigation/useRealGpsNavigation.js

import { useEffect, useRef, useState } from "react";
import * as Location from "expo-location";

import { normalizeCoordinate } from "./navigationMath";

export function useRealGpsNavigation({
  enabled = true,
  accuracy = Location.Accuracy.High,
  distanceInterval = 5,
  timeInterval = 1500,
  onLocationUpdate,
  onPermissionDenied,
} = {}) {
  const watcherRef = useRef(null);

  const [permissionStatus, setPermissionStatus] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [gpsHeading, setGpsHeading] = useState(0);
  const [gpsError, setGpsError] = useState(null);
  const [isWatching, setIsWatching] = useState(false);

  async function stopWatching() {
    if (watcherRef.current) {
      watcherRef.current.remove();
      watcherRef.current = null;
    }

    setIsWatching(false);
  }

  async function startWatching() {
    try {
      setGpsError(null);

      const permission = await Location.requestForegroundPermissionsAsync();
      setPermissionStatus(permission.status);

      if (permission.status !== "granted") {
        const message = "Location permission was denied.";
        setGpsError(message);

        if (typeof onPermissionDenied === "function") {
          onPermissionDenied(message);
        }

        return;
      }

      const initialLocation = await Location.getCurrentPositionAsync({
        accuracy,
      });

      const initialCoordinate = normalizeCoordinate({
        latitude: initialLocation.coords.latitude,
        longitude: initialLocation.coords.longitude,
      });

      const initialHeading = Number(initialLocation.coords.heading || 0);

      setCurrentLocation(initialCoordinate);
      setGpsHeading(Number.isFinite(initialHeading) ? initialHeading : 0);

      if (typeof onLocationUpdate === "function") {
        onLocationUpdate({
          coordinate: initialCoordinate,
          heading: initialHeading,
          raw: initialLocation,
        });
      }

      await stopWatching();

      watcherRef.current = await Location.watchPositionAsync(
        {
          accuracy,
          distanceInterval,
          timeInterval,
        },
        (location) => {
          const coordinate = normalizeCoordinate({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });

          const heading = Number(location.coords.heading || 0);

          setCurrentLocation(coordinate);
          setGpsHeading(Number.isFinite(heading) ? heading : 0);

          if (typeof onLocationUpdate === "function") {
            onLocationUpdate({
              coordinate,
              heading,
              raw: location,
            });
          }
        }
      );

      setIsWatching(true);
    } catch (error) {
      setGpsError(error?.message || "Unable to start GPS tracking.");
      setIsWatching(false);
    }
  }

  useEffect(() => {
    if (!enabled) {
      stopWatching();
      return undefined;
    }

    startWatching();

    return () => {
      stopWatching();
    };
  }, [enabled]);

  return {
    currentLocation,
    gpsHeading,
    gpsError,
    permissionStatus,
    isWatching,
    startWatching,
    stopWatching,
  };
}
