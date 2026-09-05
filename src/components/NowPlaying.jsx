import { useEffect, useState } from "react";
import { formatTime } from "../utils/formatTime.js";
import { calculateProgressMs } from "../utils/playbackProgress.js";

const SPOTIFY_URL = "https://open.spotify.com";

function PlaybackAction({ href, onClick, children }) {
  if (href) {
    return (
      <a href={href} target="_blank" rel="noreferrer">
        {children}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  );
}

function PlaybackTime({ playback, receivedAt }) {
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    if (!playback.isPlaying) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 1_000);

    return () => window.clearInterval(timer);
  }, [playback.isPlaying]);

  const progressMs = calculateProgressMs(playback, receivedAt, currentTime);

  return (
    <p className="now-playing__time" aria-label="Track time">
      <time>{formatTime(progressMs)}</time>
      <span aria-hidden="true"> / </span>
      <time>{formatTime(playback.track.durationMs)}</time>
    </p>
  );
}

function NowPlaying({
  playback,
  receivedAt,
  preparing,
  loading,
  error,
  onRetry,
}) {
  if ((loading || preparing) && !playback.track) {
    return <p className="playback-status">Preparing current track…</p>;
  }

  if (error && !playback.track) {
    return (
      <div className="playback-status" role="alert">
        <p>{error.message}</p>
        <PlaybackAction onClick={onRetry}>Try again</PlaybackAction>
      </div>
    );
  }

  if (playback.status === "unsupported-content") {
    return (
      <div className="playback-status">
        <p>This Spotify content is not supported yet.</p>
        <PlaybackAction href={SPOTIFY_URL}>Open Spotify</PlaybackAction>
      </div>
    );
  }

  if (!playback.track) {
    return (
      <div className="playback-status">
        <p>Nothing is playing.</p>
        <PlaybackAction href={SPOTIFY_URL}>Open Spotify</PlaybackAction>
      </div>
    );
  }

  const { track } = playback;

  return (
    <section className="now-playing" aria-label="Now playing">
      <div>
        <p className="now-playing__label">
          {playback.isPlaying ? "Now playing" : "Paused"}
        </p>
        <h2 title={track.title}>
          {track.spotifyUrl ? (
            <a href={track.spotifyUrl} target="_blank" rel="noreferrer">
              {track.title}
            </a>
          ) : (
            track.title
          )}
        </h2>
        <p className="now-playing__artists">
          {track.artists.join(", ") || "Unknown artist"}
        </p>
        <p className="now-playing__album">{track.album}</p>
        <PlaybackTime playback={playback} receivedAt={receivedAt} />
        {playback.artworkUnavailable && (
          <p className="now-playing__artwork-status">Artwork unavailable</p>
        )}
      </div>
      {error && (
        <div className="playback-status playback-status--inline" role="status">
          <p>Playback information is temporarily unavailable.</p>
          <PlaybackAction onClick={onRetry}>Try again</PlaybackAction>
        </div>
      )}
    </section>
  );
}

export default NowPlaying;
