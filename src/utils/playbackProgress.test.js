import test from "node:test";
import assert from "node:assert/strict";
import { calculateProgressMs } from "./playbackProgress.js";

function createPlayback(overrides = {}) {
  return {
    track: { durationMs: 180_000 },
    progressMs: 42_000,
    isPlaying: true,
    ...overrides,
  };
}

test("advances playing progress using local elapsed time", () => {
  assert.equal(calculateProgressMs(createPlayback(), 10_000, 12_500), 44_500);
});

test("does not advance progress while paused", () => {
  const paused = createPlayback({ isPlaying: false });
  assert.equal(calculateProgressMs(paused, 10_000, 12_500), 42_000);
});

test("clamps estimated progress to the track duration", () => {
  const nearEnd = createPlayback({ progressMs: 179_000 });
  assert.equal(calculateProgressMs(nearEnd, 10_000, 12_500), 180_000);
});
