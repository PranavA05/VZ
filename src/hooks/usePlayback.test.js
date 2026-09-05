import test from "node:test";
import assert from "node:assert/strict";
import { getCurrentPlaybackError } from "./usePlayback.js";

test("returns no playback error after disconnect", () => {
  assert.equal(getCurrentPlaybackError(null, undefined), null);
});

test("returns only the error for the active Spotify session", () => {
  const details = { kind: "offline", message: "You are offline." };
  const error = { accessToken: "current-token", details };

  assert.equal(getCurrentPlaybackError(error, "current-token"), details);
  assert.equal(getCurrentPlaybackError(error, "new-token"), null);
});
