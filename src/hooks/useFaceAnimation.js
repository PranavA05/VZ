import { useEffect, useRef } from "react";
import { getTargetEnergy } from "../visualizer/energy.js";

function randomDelay(min, max) {
  return min + Math.random() * (max - min);
}

const MAX_GAZE_X = 3;
const MAX_GAZE_Y = 1.5;
const MIN_GAZE_INTERVAL = 1_000;
const MAX_GAZE_INTERVAL = 4_000;
const GAZE_SMOOTHING_SPEED = 8;
const BLINK_GAZE_PROBABILITY = 0.3;
const MIN_BLINK_GAZE_INTERVAL = 2_000;
const OBJECT_ATTENTION_MIN = 1_000;
const OBJECT_ATTENTION_MAX = 3_000;
const MIN_GAZE_ACTIVITY = 0.5;
const MAX_GAZE_ACTIVITY = 1.5;

function chooseNextGaze(previousGaze) {
  const roll = Math.random();
  let type = roll < 0.5 ? "center"
    : roll < 0.675 ? "left"
      : roll < 0.85 ? "right"
        : roll < 0.925 ? "up" : "down";

  if (type === previousGaze && type !== "center") {
    type = "center";
  }

  if (type === "center") {
    return { type, x: 0, y: 0 };
  }

  if (type === "left" || type === "right") {
    return {
      type,
      x: (type === "left" ? -1 : 1) * randomDelay(MAX_GAZE_X * 0.6, MAX_GAZE_X),
      y: randomDelay(-0.35, 0.35),
    };
  }

  return {
    type,
    x: randomDelay(-0.7, 0.7),
    y: (type === "up" ? -1 : 1) * randomDelay(MAX_GAZE_Y * 0.55, MAX_GAZE_Y),
  };
}

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function mapObjectToGaze(object) {
  return {
    x: clamp((object.x - 0.5) * MAX_GAZE_X * 2, -MAX_GAZE_X, MAX_GAZE_X),
    y: clamp((object.y - 0.6) * MAX_GAZE_Y * 2, -MAX_GAZE_Y, MAX_GAZE_Y),
  };
}

export function useFaceAnimation({
  isPlaying,
  hasTrack,
  isTrackChanging,
  motionSpeed = 1,
  animationTheme = {},
  leftIrisRef,
  rightIrisRef,
  sceneRef,
}) {
  const faceRef = useRef(null);
  const playbackRef = useRef({
    isPlaying,
    hasTrack,
    isTrackChanging,
    motionSpeed,
    faceMovement: animationTheme.movement ?? 1,
    gazeActivity: animationTheme.gazeActivity ?? 1,
  });

  useEffect(() => {
    playbackRef.current = {
      isPlaying,
      hasTrack,
      isTrackChanging,
      motionSpeed,
      faceMovement: animationTheme.movement ?? 1,
      gazeActivity: animationTheme.gazeActivity ?? 1,
    };
  }, [animationTheme, hasTrack, isPlaying, isTrackChanging, motionSpeed]);

  useEffect(() => {
    const face = faceRef.current;
    const leftIris = leftIrisRef?.current;
    const rightIris = rightIrisRef?.current;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame;
    let previousTime = null;
    let phase = 0;
    let energy = getTargetEnergy(playbackRef.current);
    let motion = reducedMotion.matches ? 0.1 : 1;
    let speed = playbackRef.current.motionSpeed;
    let faceMovement = playbackRef.current.faceMovement;
    let gazeActivity = playbackRef.current.gazeActivity;
    let blinkAt = 0;
    let winkAt = 0;
    let openAt = 0;
    let expression = "open";
    let wasWinkAllowed = false;
    let gazeX = 0;
    let gazeY = 0;
    let targetGazeX = 0;
    let targetGazeY = 0;
    let nextGazeAt = 0;
    let previousGaze = "center";
    let pendingGaze = null;
    let lastBlinkAt = -Infinity;
    let objectAttentionUntil = 0;
    let objectWasVisible = false;

    function getGazeInterval() {
      const normalInterval = randomDelay(MIN_GAZE_INTERVAL, MAX_GAZE_INTERVAL);
      const safeActivity = clamp(
        gazeActivity,
        MIN_GAZE_ACTIVITY,
        MAX_GAZE_ACTIVITY,
      );
      return normalInterval / safeActivity;
    }

    function setExpression(next) {
      if (expression === next) return;
      expression = next;
      face.dataset.expression = next;
    }

    function setGazeTarget(gaze, now, allowBlink = true) {
      const canCoordinateBlink = allowBlink && expression === "open"
        && now - lastBlinkAt >= MIN_BLINK_GAZE_INTERVAL
        && now < blinkAt
        && Math.random() < BLINK_GAZE_PROBABILITY;

      if (canCoordinateBlink) {
        pendingGaze = { ...gaze, promoteAt: now + 70 };
        setExpression("blink");
        openAt = now + 140;
        lastBlinkAt = now;
        blinkAt = now + 2_000;
        return;
      }

      targetGazeX = gaze.x;
      targetGazeY = gaze.y;
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
      faceMovement += (playback.faceMovement - faceMovement) * smoothing;
      gazeActivity += (playback.gazeActivity - gazeActivity) * smoothing;
      phase += elapsed * (0.22 + energy * 0.32) * (reduced ? 0.5 : 1) * speed;

      if (pendingGaze && now >= pendingGaze.promoteAt) {
        targetGazeX = pendingGaze.x;
        targetGazeY = pendingGaze.y;
        gazeX = targetGazeX;
        gazeY = targetGazeY;
        pendingGaze = null;
      }

      const specialObject = sceneRef?.current?.specialObject;
      if (specialObject?.visible && !objectWasVisible) {
        objectWasVisible = true;
        objectAttentionUntil = now + randomDelay(OBJECT_ATTENTION_MIN, OBJECT_ATTENTION_MAX);
        setGazeTarget(mapObjectToGaze(specialObject), now);
      } else if (!specialObject?.visible) {
        objectWasVisible = false;
      }

      const objectAttentionActive = specialObject?.visible && now < objectAttentionUntil;
      if (objectAttentionActive && !pendingGaze) {
        setGazeTarget(mapObjectToGaze(specialObject), now, false);
      } else if (!reduced && !objectAttentionActive && now >= nextGazeAt) {
        const gaze = chooseNextGaze(previousGaze);
        previousGaze = gaze.type;
        setGazeTarget(gaze, now);
        nextGazeAt = now + getGazeInterval();
      }

      const gazeSmoothing = 1 - Math.exp(-GAZE_SMOOTHING_SPEED * elapsed);
      gazeX += (targetGazeX - gazeX) * gazeSmoothing;
      gazeY += (targetGazeY - gazeY) * gazeSmoothing;
      const irisTransform = `translate(${gazeX} ${gazeY})`;
      leftIris?.setAttribute("transform", irisTransform);
      rightIris?.setAttribute("transform", irisTransform);

      // Shared playback energy controls the movement; this is not audio/beat analysis.
      const pulse = (Math.sin(phase * 2.1) + 1) / 2;
      const rotation = Math.sin(phase) * (0.2 + energy * 0.9) * motion * faceMovement;
      const lift = -2 * energy * pulse * motion * faceMovement;
      const scale = 1 + (0.001 + energy * 0.014) * pulse * motion * faceMovement;
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
        lastBlinkAt = now;
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
      gazeX = 0;
      gazeY = 0;
      targetGazeX = 0;
      targetGazeY = 0;
      nextGazeAt = performance.now() + getGazeInterval();
      previousGaze = "center";
      pendingGaze = null;
      objectAttentionUntil = 0;
      objectWasVisible = false;
      leftIris?.removeAttribute("transform");
      rightIris?.removeAttribute("transform");
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
      leftIris?.removeAttribute("transform");
      rightIris?.removeAttribute("transform");
      delete face.dataset.expression;
    };
  }, [leftIrisRef, rightIrisRef, sceneRef]);

  return faceRef;
}
