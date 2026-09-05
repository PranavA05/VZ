import test from "node:test";
import assert from "node:assert/strict";
import {
  BASE_INNER_RADIUS,
  BASE_MAX_BAR_HEIGHT,
  calculateVisualizerGeometry,
} from "./geometry.js";

test("preserves the prototype geometry when the stage has enough room", () => {
  const geometry = calculateVisualizerGeometry(800, 400);

  assert.equal(geometry.centerX, 400);
  assert.equal(geometry.centerY, 200);
  assert.equal(geometry.innerRadius, BASE_INNER_RADIUS);
  assert.equal(geometry.maxBarHeight, BASE_MAX_BAR_HEIGHT);
});

test("scales the full ring inside a smaller square with a safe margin", () => {
  const geometry = calculateVisualizerGeometry(300, 300);
  const outerRadius = geometry.innerRadius + geometry.maxBarHeight;

  assert.equal(geometry.centerX, 150);
  assert.equal(geometry.centerY, 150);
  assert.equal(outerRadius, 135);
  assert.ok(outerRadius < 150);
});

test("does not enlarge the ring beyond its intended desktop size", () => {
  const geometry = calculateVisualizerGeometry(1600, 900);

  assert.equal(geometry.innerRadius, BASE_INNER_RADIUS);
  assert.equal(geometry.maxBarHeight, BASE_MAX_BAR_HEIGHT);
});
