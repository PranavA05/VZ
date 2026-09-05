import { useCallback, useEffect, useState } from "react";
import { getCurrentlyPlaying, SpotifyApiError } from "../spotify/api.js";
import { emptyPlayback, normalizePlayback } from "../spotify/normalize.js";

const POLL_INTERVAL_MS = 4_000;

const INITIAL_PLAYBACK = emptyPlayback();

function describeError(error) {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { kind: "offline", message: "You are offline." };
  }

  if (error instanceof SpotifyApiError && error.status === 429) {
    return {
      kind: "rate-limited",
      message: "Spotify is receiving too many requests. Trying again shortly.",
    };
  }

  return {
    kind: "temporary-error",
    message:
      error instanceof Error
        ? error.message
        : "Current playback could not be loaded.",
  };
}

export function getCurrentPlaybackError(error, accessToken) {
  return error && error.accessToken === accessToken ? error.details : null;
}

export function usePlayback(session, refreshSession) {
  const [snapshot, setSnapshot] = useState({
    accessToken: null,
    playback: INITIAL_PLAYBACK,
    receivedAt: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [requestVersion, setRequestVersion] = useState(0);

  const retry = useCallback(() => {
    setError(null);
    setRequestVersion((version) => version + 1);
  }, []);

  useEffect(() => {
    const accessToken = session?.accessToken;

    if (!accessToken) {
      return undefined;
    }

    let cancelled = false;
    let pollTimer;
    let activeController;
    let requestInFlight = false;
    let refreshAfterRequest = false;
    let isFirstRequest = true;

    function pollingAllowed() {
      return !document.hidden && navigator.onLine;
    }

    function clearPollTimer() {
      window.clearTimeout(pollTimer);
      pollTimer = undefined;
    }

    function schedulePoll(delay) {
      clearPollTimer();

      if (!cancelled && pollingAllowed()) {
        pollTimer = window.setTimeout(pollPlayback, delay);
      }
    }

    function requestImmediatePoll() {
      clearPollTimer();

      if (!pollingAllowed()) return;

      if (requestInFlight) {
        refreshAfterRequest = true;
        return;
      }

      void pollPlayback();
    }

    async function pollPlayback() {
      if (cancelled || !pollingAllowed() || requestInFlight) return;

      requestInFlight = true;
      activeController = new AbortController();
      let nextDelay = POLL_INTERVAL_MS;
      let shouldContinuePolling = true;

      if (isFirstRequest) {
        setLoading(true);
      }

      try {
        const spotifyPlayback = await getCurrentlyPlaying(accessToken, {
          signal: activeController.signal,
        });

        if (!cancelled && navigator.onLine) {
          setSnapshot({
            accessToken,
            playback: normalizePlayback(spotifyPlayback),
            receivedAt: Date.now(),
          });
          setError(null);
          refreshAfterRequest = false;
        }
      } catch (playbackError) {
        if (playbackError.name === "AbortError" || cancelled) {
          shouldContinuePolling = false;
          return;
        }

        if (playbackError instanceof SpotifyApiError && playbackError.status === 401) {
          // Stop this loop. A successful refresh changes the access token and
          // starts a fresh effect with a new polling loop.
          shouldContinuePolling = false;
          await refreshSession();
          return;
        }

        if (playbackError instanceof SpotifyApiError && playbackError.status === 429) {
          const retryAfterSeconds = Number(playbackError.retryAfter);

          if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
            nextDelay = retryAfterSeconds * 1000;
          }
        }

        if (!cancelled) {
          setError({
            accessToken,
            details: describeError(playbackError),
          });
        }
      } finally {
        requestInFlight = false;
        activeController = undefined;

        if (!cancelled) {
          setLoading(false);

          if (shouldContinuePolling) {
            if (refreshAfterRequest && nextDelay === POLL_INTERVAL_MS) {
              refreshAfterRequest = false;
              requestImmediatePoll();
            } else {
              refreshAfterRequest = false;
              schedulePoll(nextDelay);
            }
          }
        }

        isFirstRequest = false;
      }
    }

    function handleVisibilityChange() {
      if (document.hidden) {
        clearPollTimer();
        refreshAfterRequest = false;
      } else if (navigator.onLine) {
        requestImmediatePoll();
      }
    }

    function handleOffline() {
      clearPollTimer();
      refreshAfterRequest = false;
      setLoading(false);
      setError({
        accessToken,
        details: { kind: "offline", message: "You are offline." },
      });
    }

    function handleOnline() {
      setError(null);
      requestImmediatePoll();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    if (navigator.onLine) {
      requestImmediatePoll();
    } else {
      handleOffline();
    }

    return () => {
      cancelled = true;
      clearPollTimer();
      activeController?.abort();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [refreshSession, requestVersion, session?.accessToken]);

  const hasSession = Boolean(session?.accessToken);
  const hasCurrentSnapshot = snapshot.accessToken === session?.accessToken;
  const currentError = getCurrentPlaybackError(error, session?.accessToken);

  return {
    playback: hasSession && hasCurrentSnapshot ? snapshot.playback : INITIAL_PLAYBACK,
    receivedAt: hasSession && hasCurrentSnapshot ? snapshot.receivedAt : 0,
    loading: hasSession && (loading || (!hasCurrentSnapshot && !currentError)),
    error: hasSession ? currentError : null,
    retry,
  };
}
