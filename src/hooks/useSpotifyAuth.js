import { useCallback, useEffect, useRef, useState } from "react";
import {
  clearSession,
  getStoredSession,
  handleAuthCallback,
  isSessionExpired,
  redirectToSpotify,
  refreshAccessToken,
} from "../spotify/auth";

function getErrorMessage(error) {
  return error instanceof Error
    ? error.message
    : "Spotify authentication failed unexpectedly.";
}

export function useSpotifyAuth() {
  const [session, setSession] = useState(() => getStoredSession());
  const [status, setStatus] = useState(() =>
    new URLSearchParams(window.location.search).has("code")
      ? "authorizing"
      : getStoredSession()
        ? "connected"
        : "disconnected",
  );
  const [error, setError] = useState(null);
  const callbackPromiseRef = useRef(null);

  const refresh = useCallback(async () => {
    if (!session) {
      return null;
    }

    try {
      setStatus("refreshing");
      const refreshedSession = await refreshAccessToken(session);
      setSession(refreshedSession);
      setStatus("connected");
      return refreshedSession;
    } catch (refreshError) {
      clearSession();
      setSession(null);
      setStatus("error");
      setError(getErrorMessage(refreshError));
      return null;
    }
  }, [session]);

  useEffect(() => {
    let cancelled = false;

    async function initializeSession() {
      try {
        if (!callbackPromiseRef.current) {
          callbackPromiseRef.current = handleAuthCallback();
        }

        const callbackSession = await callbackPromiseRef.current;
        let nextSession = callbackSession ?? getStoredSession();

        if (nextSession && isSessionExpired(nextSession)) {
          setStatus("refreshing");
          nextSession = await refreshAccessToken(nextSession);
        }

        if (!cancelled) {
          setSession(nextSession);
          setStatus(nextSession ? "connected" : "disconnected");
        }
      } catch (initializationError) {
        clearSession();

        if (!cancelled) {
          setSession(null);
          setStatus("error");
          setError(getErrorMessage(initializationError));
        }
      }
    }

    initializeSession();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // Initialization owns expired sessions. This effect only schedules the next
    // refresh for a session that is already confirmed as usable.
    if (!session || status !== "connected" || isSessionExpired(session)) {
      return undefined;
    }

    const refreshDelay = Math.max(session.expiresAt - Date.now() - 60_000, 0);
    const refreshTimer = window.setTimeout(refresh, refreshDelay);

    return () => {
      window.clearTimeout(refreshTimer);
    };
  }, [refresh, session, status]);

  const connect = useCallback(async () => {
    try {
      setError(null);
      setStatus("authorizing");
      await redirectToSpotify();
    } catch (connectionError) {
      setStatus("error");
      setError(getErrorMessage(connectionError));
    }
  }, []);

  const disconnect = useCallback(() => {
    clearSession();
    setSession(null);
    setError(null);
    setStatus("disconnected");
  }, []);

  return {
    session,
    status,
    error,
    connect,
    disconnect,
    refresh,
  };
}
