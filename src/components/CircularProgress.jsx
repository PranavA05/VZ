import { useEffect, useState } from "react";
import { calculateProgressMs } from "../utils/playbackProgress";

const DISPLAY_UPDATE_INTERVAL_MS = 250;

function CircularProgress({ playback, receivedAt }) {
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    if (!playback.isPlaying) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, DISPLAY_UPDATE_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [playback.isPlaying]);

  const progressMs = calculateProgressMs(playback, receivedAt, currentTime);
  const durationMs = playback.track?.durationMs ?? 0;
  const progressRatio = durationMs > 0 ? progressMs / durationMs : 0;

  return (
    <svg
      className="circular-progress"
      viewBox="0 0 400 400"
      role="img"
      aria-label={`Track progress ${Math.round(progressRatio * 100)} percent`}
    >
      <circle className="circular-progress__track" cx="200" cy="200" r="168" />
      <circle
        className="circular-progress__value"
        cx="200"
        cy="200"
        r="168"
        pathLength="1"
        style={{ strokeDashoffset: 1 - progressRatio }}
      />
    </svg>
  );
}

export default CircularProgress;
