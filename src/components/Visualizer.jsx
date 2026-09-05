import { useEffect, useRef } from "react";
import { getTargetEnergy } from "../visualizer/energy";
import {
  BASE_MAX_BAR_HEIGHT,
  BASE_MIN_BAR_HEIGHT,
  calculateVisualizerGeometry,
} from "../visualizer/geometry";
import { stepSpring } from "../visualizer/spring";
import { DEFAULT_THEME } from "../theme/resolveTheme.js";

// -----------------------------------------------------------------------------
// Canvas configuration
// -----------------------------------------------------------------------------

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 400;

// -----------------------------------------------------------------------------
// Bar configuration
// -----------------------------------------------------------------------------

const NUMBER_OF_BARS = 64;

// -----------------------------------------------------------------------------
// Wave and animation configuration
// -----------------------------------------------------------------------------

const WAVE_COUNT = 4;
const WAVE_SPEED = 1.5;
const ENERGY_SMOOTHING_SPEED = 3;
const MAX_DELTA_TIME = 0.05;

// Each bar slowly moves between different variation values so neighboring bars
// do not all have exactly the same height.
const MIN_VARIATION = 0.85;
const MAX_VARIATION = 1.15;
const MIN_VARIATION_INTERVAL = 0.6;
const VARIATION_INTERVAL_RANGE = 0.8;
const VARIATION_SMOOTHING_SPEED = 2;

function Visualizer({
  isPlaying = false,
  trackId = null,
  isTrackChanging = false,
  theme = DEFAULT_THEME,
  sceneRef,
}) {
  const canvasRef = useRef(null);
  const themeRef = useRef(theme);
  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);
  const targetEnergyRef = useRef(
    getTargetEnergy({
      isPlaying,
      hasTrack: Boolean(trackId),
      isTrackChanging,
    }),
  );

  useEffect(() => {
    targetEnergyRef.current = getTargetEnergy({
      isPlaying,
      hasTrack: Boolean(trackId),
      isTrackChanging,
    });
  }, [isPlaying, isTrackChanging, trackId]);

  useEffect(() => {
    // -------------------------------------------------------------------------
    // Canvas setup and derived geometry
    // -------------------------------------------------------------------------

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    if (!context) return undefined;
    const scene = sceneRef?.current;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const angleStep = (Math.PI * 2) / NUMBER_OF_BARS;
    let geometry = calculateVisualizerGeometry(CANVAS_WIDTH, CANVAS_HEIGHT);

    // -------------------------------------------------------------------------
    // Animation state
    // -------------------------------------------------------------------------

    let previousTime = null;
    let animationFrameId;
    let phase = 0;
    let energy = targetEnergyRef.current;
    const color = [...themeRef.current.accent];
    let motionSpeed = themeRef.current.motionSpeed;
    let sunOpacity = 0;

    const bars = createInitialBars();

    // -------------------------------------------------------------------------
    // Initialization
    // -------------------------------------------------------------------------

    function randomBetween(minimum, maximum) {
      return Math.random() * (maximum - minimum) + minimum;
    }

    function createInitialBars() {
      const initialBars = [];

      for (let i = 0; i < NUMBER_OF_BARS; i++) {
        const initialHeight = randomBetween(
          BASE_MIN_BAR_HEIGHT,
          BASE_MAX_BAR_HEIGHT,
        );
        const initialVariation = randomBetween(MIN_VARIATION, MAX_VARIATION);
        const variationInterval = randomBetween(
          MIN_VARIATION_INTERVAL,
          MIN_VARIATION_INTERVAL + VARIATION_INTERVAL_RANGE,
        );

        initialBars.push({
          height: initialHeight,
          targetHeight: initialHeight,
          velocity: 0,
          phaseOffset: randomBetween(-0.65, 0.65),
          response: randomBetween(0.88, 1.12),
          variation: initialVariation,
          targetVariation: initialVariation,
          variationTimer: Math.random() * variationInterval,
          variationInterval,
        });
      }

      return initialBars;
    }

    // -------------------------------------------------------------------------
    // Bar variation and target generation
    // -------------------------------------------------------------------------

    function updateBarVariations(deltaTime) {
      const variationSmoothing =
        1 - Math.exp(-VARIATION_SMOOTHING_SPEED * deltaTime);

      for (const bar of bars) {
        bar.variationTimer += deltaTime;

        if (bar.variationTimer >= bar.variationInterval) {
          bar.targetVariation = randomBetween(MIN_VARIATION, MAX_VARIATION);
          bar.variationTimer = 0;
          bar.variationInterval = randomBetween(
            MIN_VARIATION_INTERVAL,
            MIN_VARIATION_INTERVAL + VARIATION_INTERVAL_RANGE,
          );
        }

        bar.variation +=
          (bar.targetVariation - bar.variation) * variationSmoothing;
      }
    }

    function updateBarTargets() {
      for (let i = 0; i < bars.length; i++) {
        const bar = bars[i];
        const angle = getBarAngle(i);
        const primaryWave = Math.sin(angle * WAVE_COUNT + phase);
        const secondaryWave = Math.sin(
          angle * 7 - phase * 0.71 + bar.phaseOffset,
        );
        const slowWave = Math.sin(
          angle * 2 + phase * 0.37 + bar.phaseOffset * 1.7,
        );
        const combinedSignal =
          primaryWave * 0.55 + secondaryWave * 0.3 + slowWave * 0.15;
        const normalizedValue = (combinedSignal + 1) / 2;
        const energyAdjustedVariation =
          1 + (bar.variation - 1) * energy;

        const animatedRange =
          normalizedValue *
          (BASE_MAX_BAR_HEIGHT - BASE_MIN_BAR_HEIGHT) *
          energyAdjustedVariation *
          energy *
          bar.response;

        const rawTargetHeight = BASE_MIN_BAR_HEIGHT + animatedRange;
        bar.targetHeight = Math.min(rawTargetHeight, BASE_MAX_BAR_HEIGHT);
      }
    }

    // -------------------------------------------------------------------------
    // Drawing
    // -------------------------------------------------------------------------

    function getBarAngle(index) {
      // Subtracting a quarter-turn (90 degrees) starts the first bar at the top.
      return index * angleStep - Math.PI / 2;
    }

    function prepareCanvas() {
      context.clearRect(0, 0, geometry.width, geometry.height);
      context.strokeStyle = `rgb(${color.map(Math.round).join(" ")})`;
      context.lineWidth = geometry.barLineWidth;
      context.lineCap = "round";
    }

    function updateAndDrawBars(deltaTime) {
      for (let i = 0; i < bars.length; i++) {
        const bar = bars[i];
        const spring = stepSpring(
          bar.height,
          bar.velocity,
          bar.targetHeight,
          deltaTime,
        );
        bar.height = spring.position;
        bar.velocity = spring.velocity;

        const angle = getBarAngle(i);
        const heightRatio = Math.min(
          Math.max(
            (bar.height - BASE_MIN_BAR_HEIGHT) /
              (BASE_MAX_BAR_HEIGHT - BASE_MIN_BAR_HEIGHT),
            0,
          ),
          1,
        );
        const scaledBarHeight =
          geometry.minBarHeight +
          heightRatio * (geometry.maxBarHeight - geometry.minBarHeight);
        const outerRadius = geometry.innerRadius + scaledBarHeight;

        const innerX =
          geometry.centerX + Math.cos(angle) * geometry.innerRadius;
        const innerY =
          geometry.centerY + Math.sin(angle) * geometry.innerRadius;
        const outerX = geometry.centerX + Math.cos(angle) * outerRadius;
        const outerY = geometry.centerY + Math.sin(angle) * outerRadius;

        context.beginPath();
        context.moveTo(innerX, innerY);
        context.lineTo(outerX, outerY);
        context.stroke();
      }
    }

    function drawSun() {
      if (sunOpacity < 0.005) {
        if (scene) scene.specialObject = null;
        return;
      }
      const radius = geometry.innerRadius * 0.1;
      const angle = -Math.PI * 0.75 + (reducedMotion.matches ? 0 : Math.sin(phase * 0.15) * 0.06);
      const x = geometry.centerX + Math.cos(angle) * geometry.innerRadius * 1.32;
      const y = geometry.centerY + Math.sin(angle) * geometry.innerRadius * 1.32;
      if (scene) {
        scene.specialObject = {
          type: "sun",
          visible: true,
          x: x / geometry.width,
          y: y / geometry.height,
        };
      }
      context.save();
      context.globalAlpha = sunOpacity * 0.5;
      context.lineWidth = 1;
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      for (let i = 0; i < 12; i += 1) {
        const ray = i * Math.PI / 6;
        context.moveTo(x + Math.cos(ray) * radius * 1.3, y + Math.sin(ray) * radius * 1.3);
        context.lineTo(x + Math.cos(ray) * radius * 1.7, y + Math.sin(ray) * radius * 1.7);
      }
      context.stroke();
      context.restore();
    }

    function resizeCanvas() {
      const bounds = canvas.getBoundingClientRect();
      const width = bounds.width || CANVAS_WIDTH;
      const height = bounds.height || CANVAS_HEIGHT;
      const pixelRatio = Math.min(
        Math.max(window.devicePixelRatio || 1, 1),
        2,
      );
      const drawingWidth = Math.max(Math.round(width * pixelRatio), 1);
      const drawingHeight = Math.max(Math.round(height * pixelRatio), 1);

      if (canvas.width !== drawingWidth || canvas.height !== drawingHeight) {
        canvas.width = drawingWidth;
        canvas.height = drawingHeight;
      }

      // Canvas coordinates remain in CSS pixels while the backing bitmap uses
      // physical device pixels, producing crisp lines on high-density screens.
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      geometry = calculateVisualizerGeometry(width, height);
    }

    // -------------------------------------------------------------------------
    // Animation loop
    // -------------------------------------------------------------------------

    function animate(currentTime) {
      if (previousTime === null) {
        previousTime = currentTime;
      }

      const deltaTime = Math.min(
        (currentTime - previousTime) / 1000,
        MAX_DELTA_TIME,
      );

      previousTime = currentTime;

      const energySmoothing =
        1 - Math.exp(-ENERGY_SMOOTHING_SPEED * deltaTime);
      energy += (targetEnergyRef.current - energy) * energySmoothing;
      const themeSmoothing = 1 - Math.exp(-2 * deltaTime);
      const targetTheme = themeRef.current;
      color.forEach((value, index) => {
        color[index] += (targetTheme.accent[index] - value) * themeSmoothing;
      });
      motionSpeed += (targetTheme.motionSpeed - motionSpeed) * themeSmoothing;
      sunOpacity += (Number(targetTheme.sun) - sunOpacity) * themeSmoothing;

      // Energy scales both speed and amplitude. Paused and idle states keep a
      // faint living motion instead of freezing the ring abruptly.
      phase += WAVE_SPEED * energy * deltaTime * motionSpeed;

      updateBarVariations(deltaTime);
      updateBarTargets();

      prepareCanvas();
      drawSun();
      updateAndDrawBars(deltaTime);

      animationFrameId = requestAnimationFrame(animate);
    }

    function handleVisibilityChange() {
      cancelAnimationFrame(animationFrameId);
      previousTime = null;

      if (!document.hidden) {
        animationFrameId = requestAnimationFrame(animate);
      }
    }

    resizeCanvas();

    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(canvas);
    window.addEventListener("resize", resizeCanvas);

    document.addEventListener("visibilitychange", handleVisibilityChange);
    handleVisibilityChange();

    // Stop this external animation system when React removes the component.
    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      window.removeEventListener("resize", resizeCanvas);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (scene) scene.specialObject = null;
    };
  }, [sceneRef]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      aria-hidden="true"
    />
  );
}

export default Visualizer;
