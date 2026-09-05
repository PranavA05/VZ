import { useEffect, useRef, useState } from "react";

const TRACK_TRANSITION_DURATION_MS = 650;

export function useTrackTransition(trackId) {
  const previousTrackIdRef = useRef(trackId);
  const [isTrackChanging, setIsTrackChanging] = useState(false);

  useEffect(() => {
    const previousTrackId = previousTrackIdRef.current;
    previousTrackIdRef.current = trackId;

    if (!previousTrackId || !trackId || previousTrackId === trackId) {
      const resetTimer = window.setTimeout(() => {
        setIsTrackChanging(false);
      }, 0);

      return () => {
        window.clearTimeout(resetTimer);
      };
    }

    const startTimer = window.setTimeout(() => {
      setIsTrackChanging(true);
    }, 0);
    const endTimer = window.setTimeout(() => {
      setIsTrackChanging(false);
    }, TRACK_TRANSITION_DURATION_MS);

    return () => {
      window.clearTimeout(startTimer);
      window.clearTimeout(endTimer);
    };
  }, [trackId]);

  return isTrackChanging;
}
