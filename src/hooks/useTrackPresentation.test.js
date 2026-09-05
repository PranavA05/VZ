import test from "node:test";
import assert from "node:assert/strict";
import { createElement, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { emptyPlayback } from "../spotify/normalize.js";
import { useTrackPresentation } from "./useTrackPresentation.js";

// Exercise real React renders without a DOM. Async image outcomes are covered
// separately by the presentation and loader tests.
function Probe({ snapshots }) {
  const [index, setIndex] = useState(0);
  const { playback, receivedAt } = snapshots[index];
  const displayed = useTrackPresentation(playback, receivedAt);
  if (index < snapshots.length - 1) setIndex(index + 1);
  return `${displayed.playback.track?.id ?? "idle"}:${displayed.isPreparing}`;
}

const idle = { playback: emptyPlayback(), receivedAt: 0 };
const noCover = {
  playback: { track: { id: "A", artworkUrl: null }, isPlaying: true, progressMs: 0 },
  receivedAt: 1_000,
};
const pending = {
  playback: { track: { id: "B", artworkUrl: "B.jpg" }, isPlaying: true, progressMs: 0 },
  receivedAt: 2_000,
};

test("React renders disconnected and first-load states without throwing", () => {
  assert.equal(renderToStaticMarkup(createElement(Probe, { snapshots: [idle] })), "idle:false");
  assert.equal(renderToStaticMarkup(createElement(Probe, { snapshots: [pending] })), "idle:true");
});

test("React keeps the active unit during preparation", () => {
  assert.equal(renderToStaticMarkup(createElement(Probe, {
    snapshots: [noCover, pending],
  })), "A:true");
});

test("React clears an active/pending unit on disconnect without a render loop", () => {
  assert.equal(renderToStaticMarkup(createElement(Probe, {
    snapshots: [idle, noCover, pending, idle],
  })), "idle:false");
});
