export const PLAYBACK_ENERGY = {
  playing: 1,
  paused: 0.15,
  idle: 0.08,
  trackChangeCap: 0.35,
};

export function getTargetEnergy({ isPlaying, hasTrack, isTrackChanging = false }) {
  const playbackEnergy = isPlaying
    ? PLAYBACK_ENERGY.playing
    : hasTrack
      ? PLAYBACK_ENERGY.paused
      : PLAYBACK_ENERGY.idle;

  return isTrackChanging
    ? Math.min(playbackEnergy, PLAYBACK_ENERGY.trackChangeCap)
    : playbackEnergy;
}
