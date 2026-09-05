import { useEffect, useRef } from "react";
import { getTargetEnergy } from "../visualizer/energy.js";

function randomDelay(min, max) {
  return min + Math.random() * (max - min);
}

export function useFaceAnimation({ isPlaying, hasTrack, isTrackChanging, motionSpeed = 1 }) {
  const faceRef = useRef(null);
  const playbackRef = useRef({ isPlaying, hasTrack, isTrackChanging, motionSpeed });

  useEffect(() => {
    playbackRef.current = { isPlaying, hasTrack, isTrackChanging, motionSpeed };
  }, [isPlaying, hasTrack, isTrackChanging, motionSpeed]);

  useEffect(() => {
    const face = faceRef.current;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame;
    let previousTime = null;
    let phase = 0;
    let energy = getTargetEnergy(playbackRef.current);
    let motion = reducedMotion.matches ? 0.1 : 1;
    let speed = playbackRef.current.motionSpeed;
    let blinkAt = 0;
    let winkAt = 0;
    let openAt = 0;
    let expression = "open";
    let wasWinkAllowed = false;

    function setExpression(next) {
      if (expression === next) return;
      expression = next;
      face.dataset.expression = next;
    }

    function animate(now) {
      const elapsed = previousTime === null ? 0 : Math.min((now - previousTime) / 1_000, 0.05);
      previousTime = now;
      const playback = playbackRef.current;
      const reduced = reducedMotion.matches;
      const canWink = !reduced && playback.isPlaying;
      const smoothing = 1 - Math.exp(-3 * elapsed);
      energy += (getTargetEnergy(playback) - energy) * smoothing;
      motion += ((reduced ? 0.1 : 1) - motion) * smoothing;
      speed += (playback.motionSpeed - speed) * smoothing;
      phase += elapsed * (0.22 + energy * 0.32) * (reduced ? 0.5 : 1) * speed;

      // Shared playback energy controls the movement; this is not audio/beat analysis.
      const pulse = (Math.sin(phase * 2.1) + 1) / 2;
      const rotation = Math.sin(phase) * (0.2 + energy * 0.9) * motion;
      const lift = -2 * energy * pulse * motion;
      const scale = 1 + (0.001 + energy * 0.014) * pulse * motion;
      face.style.transform = `translateY(${lift}px) rotate(${rotation}deg) scale(${scale})`;

      if (expression !== "open" && (
        now >= openAt ||
        (expression.startsWith("wink") && !canWink)
      )) {
        setExpression("open");
      }

      if (canWink && !wasWinkAllowed) {
        // Start a fresh long interval when normal playback resumes.
        winkAt = now + randomDelay(15_000, 40_000);
      }
      wasWinkAllowed = canWink;

      if (canWink && expression === "open" && now >= winkAt && now < blinkAt) {
        setExpression(Math.random() < 0.5 ? "wink-left" : "wink-right");
        openAt = now + 230;
        winkAt = now + randomDelay(15_000, 40_000);
        blinkAt = Math.max(blinkAt, now + 2_000);
      } else if (expression === "open" && now >= blinkAt) {
        setExpression("blink");
        openAt = now + (reduced ? 180 : 140);
        blinkAt = now + (reduced
          ? randomDelay(6_000, 12_000)
          : playback.hasTrack ? randomDelay(2_000, 7_000) : randomDelay(4_000, 9_000));
        winkAt = Math.max(winkAt, now + 2_000);
      }

      frame = requestAnimationFrame(animate);
    }

    function handleVisibility() {
      cancelAnimationFrame(frame);
      previousTime = null;
      setExpression("open");
      if (!document.hidden) {
        blinkAt = performance.now() + (reducedMotion.matches
          ? randomDelay(6_000, 12_000) : randomDelay(2_000, 7_000));
        winkAt = performance.now() + randomDelay(15_000, 40_000);
        frame = requestAnimationFrame(animate);
      }
    }

    handleVisibility();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", handleVisibility);
      face.style.removeProperty("transform");
      delete face.dataset.expression;
    };
  }, []);

  return faceRef;
}
