import test from "node:test";
import assert from "node:assert/strict";
import { normalizePlayback } from "./normalize.js";

test("normalizes the Spotify track fields used by the app", () => {
  const playback = normalizePlayback({
    currently_playing_type: "track",
    progress_ms: 42_000,
    is_playing: true,
    item: {
      id: "track-123",
      type: "track",
      name: "A Test Track",
      duration_ms: 180_000,
      external_urls: { spotify: "https://open.spotify.com/track/track-123" },
      artists: [{ name: "First Artist", id: "artist-1" }, { name: "Second Artist" }],
      album: {
        name: "A Test Album",
        images: [{ url: "https://example.com/artwork.jpg" }],
      },
    },
  });

  assert.deepEqual(playback, {
    track: {
      id: "track-123",
      title: "A Test Track",
      artists: ["First Artist", "Second Artist"],
      artistIds: ["artist-1"],
      album: "A Test Album",
      artworkUrl: "https://example.com/artwork.jpg",
      durationMs: 180_000,
      spotifyUrl: "https://open.spotify.com/track/track-123",
    },
    progressMs: 42_000,
    isPlaying: true,
    status: "playing",
  });
});

test("normalizes an empty response into the idle playback contract", () => {
  assert.deepEqual(normalizePlayback(null), {
    track: null,
    progressMs: 0,
    isPlaying: false,
    status: "idle",
  });
});

test("handles unsupported playback item types safely", () => {
  assert.deepEqual(
    normalizePlayback({
      currently_playing_type: "episode",
      is_playing: true,
      item: { type: "episode", name: "A Podcast Episode" },
    }),
    {
      track: null,
      progressMs: 0,
      isPlaying: false,
      status: "unsupported-content",
    },
  );
});
