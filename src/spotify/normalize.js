export function emptyPlayback(status = "idle") {
  return {
    track: null,
    progressMs: 0,
    isPlaying: false,
    status,
  };
}

function nonNegativeNumber(value) {
  return Number.isFinite(value) ? Math.max(value, 0) : 0;
}

export function normalizePlayback(payload) {
  const item = payload?.item;
  const itemType = payload?.currently_playing_type ?? item?.type;

  if (!item) {
    return emptyPlayback();
  }

  if (itemType !== "track") {
    return emptyPlayback("unsupported-content");
  }

  const durationMs = nonNegativeNumber(item.duration_ms);
  const rawProgressMs = nonNegativeNumber(payload.progress_ms);
  const progressMs = durationMs
    ? Math.min(rawProgressMs, durationMs)
    : rawProgressMs;

  const artists = Array.isArray(item.artists)
    ? item.artists
        .map((artist) => artist?.name)
        .filter((name) => typeof name === "string" && name.length > 0)
    : [];

  const artwork = Array.isArray(item.album?.images)
    ? item.album.images.find((image) => typeof image?.url === "string")
    : null;

  return {
    track: {
      id: item.id ?? item.uri ?? null,
      title: typeof item.name === "string" ? item.name : "Unknown track",
      artists,
      artistIds: Array.isArray(item.artists)
        ? item.artists.map((artist) => artist?.id).filter((id) => typeof id === "string")
        : [],
      album:
        typeof item.album?.name === "string" ? item.album.name : "Unknown album",
      artworkUrl: artwork?.url ?? null,
      durationMs,
      spotifyUrl:
        typeof item.external_urls?.spotify === "string"
          ? item.external_urls.spotify
          : null,
    },
    progressMs,
    isPlaying: Boolean(payload.is_playing),
    status: payload.is_playing ? "playing" : "paused",
  };
}
