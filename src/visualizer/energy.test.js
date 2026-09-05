import test from "node:test";
import assert from "node:assert/strict";
import { getTargetEnergy, PLAYBACK_ENERGY } from "./energy.js";

test("uses full energy during playback", () => {
  assert.equal(
    getTargetEnergy({ isPlaying: true, hasTrack: true }),
    PLAYBACK_ENERGY.playing,
  );
});

test("keeps a paused track gently alive", () => {
  assert.equal(
    getTargetEnergy({ isPlaying: false, hasTrack: true }),
    PLAYBACK_ENERGY.paused,
  );
});

test("uses the lowest living energy when no track is available", () => {
  assert.equal(
    getTargetEnergy({ isPlaying: false, hasTrack: false }),
    PLAYBACK_ENERGY.idle,
  );
});

test("briefly caps full playback energy during a track change", () => {
  assert.equal(
    getTargetEnergy({
      isPlaying: true,
      hasTrack: true,
      isTrackChanging: true,
    }),
    PLAYBACK_ENERGY.trackChangeCap,
  );
});

test("does not raise paused energy during a track change", () => {
  assert.equal(
    getTargetEnergy({
      isPlaying: false,
      hasTrack: true,
      isTrackChanging: true,
    }),
    PLAYBACK_ENERGY.paused,
  );
});
