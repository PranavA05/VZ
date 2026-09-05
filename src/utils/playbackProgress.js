export function calculateProgressMs(playback, receivedAt, currentTime) {
  if (!playback?.track) {
    return 0;
  }

  const reportedProgress = Math.max(playback.progressMs, 0);
  const localElapsed = playback.isPlaying
    ? Math.max(currentTime - receivedAt, 0)
    : 0;
  const estimatedProgress = reportedProgress + localElapsed;

  return playback.track.durationMs > 0
    ? Math.min(estimatedProgress, playback.track.durationMs)
    : estimatedProgress;
}
