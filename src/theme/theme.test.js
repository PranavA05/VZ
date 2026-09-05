import test from "node:test";
import assert from "node:assert/strict";
import { pickArtworkPalette, extractArtworkPalette } from "./extractArtworkPalette.js";
import { DEFAULT_THEME, resolveTheme } from "./resolveTheme.js";

test("artwork selection uses two distinct colors from the cover", () => {
  const pixels = new Uint8ClampedArray([
    0, 0, 0, 255, 255, 255, 255, 255, 100, 100, 100, 255,
    255, 0, 0, 0, 40, 180, 210, 255, 42, 182, 212, 255,
    240, 30, 20, 255,
  ]);
  assert.deepEqual(pickArtworkPalette(pixels), [
    [41, 181, 211],
    [240, 30, 20],
  ]);
});

test("empty artwork and unavailable canvas safely use the default", () => {
  assert.equal(pickArtworkPalette(new Uint8ClampedArray()), null);
  assert.equal(extractArtworkPalette({}), null);
  assert.deepEqual(resolveTheme({ id: "unknown" }, null), DEFAULT_THEME);
});

test("grayscale and dark artwork still produce visible cover-derived palettes", () => {
  assert.deepEqual(
    pickArtworkPalette(new Uint8ClampedArray([80, 80, 80, 255])),
    [[170, 170, 170], [218, 218, 218]],
  );
  assert.deepEqual(
    pickArtworkPalette(new Uint8ClampedArray([60, 30, 0, 255])),
    [[170, 85, 0], [218, 109, 0]],
  );
  assert.deepEqual(
    pickArtworkPalette(new Uint8ClampedArray([0, 0, 0, 255])),
    [[170, 170, 170], [218, 218, 218]],
  );
});

test("artist and track overrides preserve the artwork color and default fields", () => {
  const palette = [[40, 180, 210], [210, 70, 120]];
  const track = { id: "59NiB53LKACMEXxcynTdwO", artistIds: ["4c4Ce4N4vJOs3Tzee020S4"] };
  assert.deepEqual(resolveTheme(track, palette), {
    accent: palette[0],
    gradientStart: palette[0],
    gradientEnd: palette[1],
    motionSpeed: 0.8,
    sun: true,
  });
  assert.equal(resolveTheme({ ...track, id: "other" }, palette).sun, false);
  assert.equal(resolveTheme({ ...track, artistIds: [] }, palette).motionSpeed, 1);
  assert.equal(resolveTheme(null, palette), DEFAULT_THEME);
  assert.deepEqual(DEFAULT_THEME.accent, [215, 154, 98]);
});
