import test from "node:test";
import assert from "node:assert/strict";
import { formatTime } from "./formatTime.js";

test("formats milliseconds as minutes and zero-padded seconds", () => {
  assert.equal(formatTime(82_000), "1:22");
  assert.equal(formatTime(600_000), "10:00");
});

test("clamps negative values to zero", () => {
  assert.equal(formatTime(-1_000), "0:00");
});
