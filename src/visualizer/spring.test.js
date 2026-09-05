import test from "node:test";
import assert from "node:assert/strict";
import { stepSpring } from "./spring.js";

test("accelerates a resting value toward a higher target", () => {
  const next = stepSpring(0, 0, 1, 1 / 60);

  assert.ok(next.position > 0);
  assert.ok(next.velocity > 0);
});

test("preserves momentum instead of reducing motion to a linear interpolation", () => {
  const next = stepSpring(1, 2, 1, 1 / 60);

  assert.ok(next.position > 1);
  assert.ok(next.velocity > 0);
});
