export const DEFAULT_THEME = {
  accent: [215, 154, 98],
  gradientStart: [128, 73, 48],
  gradientEnd: [53, 72, 96],
  motionSpeed: 1,
  face: {
    movement: 1,
    gazeActivity: 1,
  },
  ring: {
    intensity: 1,
    sharpness: 1,
  },
  environment: {
    particleType: "dust",
    particleSpeed: 1,
    particleOpacity: 1,
  },
  sun: false,
};

// Small personal examples. IDs avoid collisions between similarly named artists.
const ARTIST_THEMES = {
  "4c4Ce4N4vJOs3Tzee020S4": {
    motionSpeed: 0.82,
    face: {
      movement: 0.82,
      gazeActivity: 0.8,
    },
    ring: {
      intensity: 0.9,
      sharpness: 0.9,
    },
    environment: {
      particleType: "stars",
      particleSpeed: 0.8,
      particleOpacity: 0.85,
    },
  }, // Planet Funk
};
const TRACK_THEMES = {
  "2YhdkdWE7MCHzaQ5Wn6dJy": { sun: true }, // Chase the Sun
  "59NiB53LKACMEXxcynTdwO": {
    sun: true,
    environment: { particleType: "sparks" },
  }, // Non Zero Sumness Plus One edition
};

export function resolveTheme(track, artworkPalette) {
  if (!track) return DEFAULT_THEME;
  const artistTheme = (track.artistIds ?? []).map((id) => ARTIST_THEMES[id]).find(Boolean);
  const trackTheme = TRACK_THEMES[track.id] ?? {};
  const [primary, secondary] = artworkPalette ?? [];
  return {
    ...DEFAULT_THEME,
    ...(primary ? {
      accent: primary,
      gradientStart: primary,
      gradientEnd: secondary ?? primary,
    } : {}),
    ...artistTheme,
    ...trackTheme,
    face: {
      ...DEFAULT_THEME.face,
      ...artistTheme?.face,
      ...trackTheme.face,
    },
    ring: {
      ...DEFAULT_THEME.ring,
      ...artistTheme?.ring,
      ...trackTheme.ring,
    },
    environment: {
      ...DEFAULT_THEME.environment,
      ...artistTheme?.environment,
      ...trackTheme.environment,
    },
  };
}
