// mobile/src/navigation/useMapRecenter.js

import { useCallback, useState } from "react";

export function useMapRecenter({ onRecenter } = {}) {
  const [isFollowingUser, setIsFollowingUser] = useState(true);
  const [hasUserPannedMap, setHasUserPannedMap] = useState(false);

  const pauseFollowMode = useCallback(() => {
    setIsFollowingUser(false);
    setHasUserPannedMap(true);
  }, []);

  const resumeFollowMode = useCallback(() => {
    setIsFollowingUser(true);
    setHasUserPannedMap(false);

    if (typeof onRecenter === "function") {
      onRecenter();
    }
  }, [onRecenter]);

  return {
    isFollowingUser,
    hasUserPannedMap,
    pauseFollowMode,
    resumeFollowMode,
    setIsFollowingUser,
    setHasUserPannedMap,
  };
}
