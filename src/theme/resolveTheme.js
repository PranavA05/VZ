export const DEFAULT_THEME = {
  accent: [215, 154, 98],
  gradientStart: [128, 73, 48],
  gradientEnd: [53, 72, 96],
  motionSpeed: 1,
  sun: false,
};

// Small personal examples. IDs avoid collisions between similarly named artists.
const ARTIST_THEMES = {
  "4c4Ce4N4vJOs3Tzee020S4": { motionSpeed: 0.8 }, // Planet Funk
};
const TRACK_THEMES = {
  "2YhdkdWE7MCHzaQ5Wn6dJy": { sun: true }, // Chase the Sun
  "59NiB53LKACMEXxcynTdwO": { sun: true }, // Non Zero Sumness Plus One edition
};

export function resolveTheme(track, artworkPalette) {
  if (!track) return DEFAULT_THEME;
  const artistTheme = (track.artistIds ?? []).map((id) => ARTIST_THEMES[id]).find(Boolean);
  const [primary, secondary] = artworkPalette ?? [];
  return {
    ...DEFAULT_THEME,
    ...(primary ? {
      accent: primary,
      gradientStart: primary,
      gradientEnd: secondary ?? primary,
    } : {}),
    ...artistTheme,
    ...TRACK_THEMES[track.id],
  };
}
