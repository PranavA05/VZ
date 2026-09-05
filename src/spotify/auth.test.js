import test from "node:test";
import assert from "node:assert/strict";
import { getCleanAppUrl } from "./auth.js";

test("rebuilds a clean callback URL without OAuth query parameters", () => {
  assert.equal(
    getCleanAppUrl("https://visualizer.example/callback?code=secret&ubi=value", "/"),
    "https://visualizer.example/",
  );
});

test("keeps a configured app base path", () => {
  assert.equal(
    getCleanAppUrl("https://visualizer.example/callback", "/music/"),
    "https://visualizer.example/music/",
  );
});
