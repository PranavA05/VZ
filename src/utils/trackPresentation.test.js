import test from "node:test";
import assert from "node:assert/strict";
import { emptyPlayback } from "../spotify/normalize.js";
import { createPresentation, updatePresentation } from "./trackPresentation.js";

function snapshot(id, artworkUrl = `${id}.jpg`, progressMs = 0, isPlaying = true) {
  return {
    playback: {
      track: { id, title: id, artists: [], artworkUrl, durationMs: 180_000 },
      progressMs,
      isPlaying,
    },
    receivedAt: progressMs + 1_000,
  };
}

function receive(state, next) {
  return updatePresentation(state, { type: "receive", snapshot: next });
}

function ready(state, failed = false) {
  return updatePresentation(state, { type: "prepared", request: state.pending, failed });
}

test("holds the whole displayed track until the new cover is ready", () => {
  const first = snapshot("A");
  let state = ready(createPresentation(first));
  const next = snapshot("B");
  state = receive(state, next);
  assert.equal(state.displayed, first);
  assert.equal(state.incoming, next);
  state = ready(state);
  assert.equal(state.displayed, next);
  assert.equal(state.pending, null);
});

test("polling during preparation preserves the request and promotes latest time/pause", () => {
  let state = createPresentation(snapshot("A"));
  const request = state.pending;
  const latest = snapshot("A", "A.jpg", 12_000, false);
  state = receive(state, latest);
  assert.equal(state.pending, request);
  assert.equal(ready(state).displayed, latest);
});

test("rapid skips ignore a stale completion and returning to the active track cancels pending", () => {
  const first = snapshot("A");
  let state = receive(ready(createPresentation(first)), snapshot("B"));
  const oldRequest = state.pending;
  state = receive(state, snapshot("C"));
  assert.equal(updatePresentation(state, {
    type: "prepared", request: oldRequest, failed: false,
  }), state);
  state = receive(state, first);
  assert.equal(state.pending, null);
  assert.equal(state.displayed, first);
});

test("failure promotes new metadata with neutral eyes and stays neutral on later polls", () => {
  let state = receive(ready(createPresentation(snapshot("A"))), snapshot("B"));
  state = ready(state, true);
  assert.equal(state.displayed.playback.track.id, "B");
  assert.equal(state.displayed.playback.track.artworkUrl, null);
  assert.equal(state.displayed.playback.artworkUnavailable, true);
  state = receive(state, snapshot("B", "B.jpg", 8_000));
  assert.equal(state.pending, null);
  assert.equal(state.displayed.playback.track.artworkUrl, null);
  assert.equal(state.displayed.playback.progressMs, 8_000);
});

test("disconnect clears immediately and a late result cannot restore artwork", () => {
  let state = receive(ready(createPresentation(snapshot("A"))), snapshot("B"));
  const request = state.pending;
  const idle = { playback: emptyPlayback(), receivedAt: 0 };
  state = receive(state, idle);
  assert.equal(state.displayed, idle);
  assert.equal(state.pending, null);
  state = receive(state, snapshot("B"));
  assert.notEqual(state.pending, request);
  assert.equal(updatePresentation(state, { type: "prepared", request, failed: false }), state);
  assert.equal(state.displayed.playback.track, null);
});

test("missing artwork promotes immediately; different tracks sharing a cover remain distinct", () => {
  let state = createPresentation(snapshot("A", null));
  assert.equal(state.pending, null);
  assert.equal(state.displayed.playback.track.id, "A");
  state = ready(receive(state, snapshot("B", "shared.jpg")));
  state = receive(state, snapshot("C", "shared.jpg"));
  assert.equal(state.displayed.playback.track.id, "B");
  assert.equal(ready(state).displayed.playback.track.id, "C");
});

test("first load has no unprepared cover and same-track updates need no reload", () => {
  let state = createPresentation(snapshot("A"));
  assert.equal(state.displayed.playback.track, null);
  state = ready(state);
  const updated = snapshot("A", "A.jpg", 5_000);
  state = receive(state, updated);
  assert.equal(state.displayed, updated);
  assert.equal(state.pending, null);
});

test("palette promotes with the display, survives polling, ignores stale work and clears on disconnect", () => {
  let state = createPresentation(snapshot("A"));
  const palette = [[40, 180, 210], [210, 70, 120]];
  state = updatePresentation(state, { type: "prepared", request: state.pending, failed: false, palette });
  state = receive(state, snapshot("A", "A.jpg", 4_000));
  assert.equal(state.artworkPalette, palette);
  state = receive(state, snapshot("B"));
  const stale = state.pending;
  assert.equal(state.artworkPalette, palette);
  state = receive(state, snapshot("C"));
  state = updatePresentation(state, { type: "prepared", request: stale, palette: [[255, 0, 0], [0, 0, 255]] });
  assert.equal(state.artworkPalette, palette);
  state = ready(state, true);
  assert.equal(state.artworkPalette, null);
  state = receive(state, { playback: emptyPlayback(), receivedAt: 0 });
  assert.equal(state.artworkPalette, null);
});
