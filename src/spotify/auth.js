const AUTHORIZATION_ENDPOINT = "https://accounts.spotify.com/authorize";
const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";

const SCOPES = ["user-read-currently-playing"];
const EXPIRY_BUFFER_MS = 30_000;

const STORAGE_KEYS = {
  codeVerifier: "spotify_pkce_code_verifier",
  state: "spotify_oauth_state",
  session: "spotify_session",
};

export class SpotifyAuthError extends Error {
  constructor(message, code = "authentication_error") {
    super(message);
    this.name = "SpotifyAuthError";
    this.code = code;
  }
}

function getConfiguration() {
  const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID?.trim();
  const redirectUri = import.meta.env.VITE_SPOTIFY_REDIRECT_URI?.trim();

  if (!clientId || !redirectUri) {
    throw new SpotifyAuthError(
      "Spotify configuration is missing. Check the VITE_SPOTIFY_CLIENT_ID and VITE_SPOTIFY_REDIRECT_URI values.",
      "missing_configuration",
    );
  }

  return { clientId, redirectUri };
}

function encodeBase64Url(bytes) {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

function generateRandomValue(byteLength) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return encodeBase64Url(bytes);
}

export function generateCodeVerifier() {
  // 64 random bytes become an 86-character URL-safe verifier, within PKCE's
  // required 43-to-128-character range.
  return generateRandomValue(64);
}

export async function generateCodeChallenge(codeVerifier) {
  const verifierBytes = new TextEncoder().encode(codeVerifier);
  const digest = await crypto.subtle.digest("SHA-256", verifierBytes);
  return encodeBase64Url(new Uint8Array(digest));
}

function clearPendingAuthorization() {
  sessionStorage.removeItem(STORAGE_KEYS.codeVerifier);
  sessionStorage.removeItem(STORAGE_KEYS.state);
}

export function getCleanAppUrl(origin, baseUrl = "/") {
  return new URL(baseUrl, origin).toString();
}

function cleanCallbackUrl() {
  const baseUrl = import.meta.env?.BASE_URL ?? "/";
  window.history.replaceState(
    {},
    document.title,
    getCleanAppUrl(window.location.origin, baseUrl),
  );
}

async function readTokenResponse(response, existingRefreshToken = null) {
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = body.error_description ?? body.error ?? "Spotify rejected the token request.";
    throw new SpotifyAuthError(message, "token_request_failed");
  }

  if (!body.access_token || !body.expires_in) {
    throw new SpotifyAuthError(
      "Spotify returned an incomplete token response.",
      "invalid_token_response",
    );
  }

  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token ?? existingRefreshToken,
    expiresAt: Date.now() + body.expires_in * 1000,
    scope: body.scope ?? "",
    tokenType: body.token_type ?? "Bearer",
  };
}

function storeSession(session) {
  localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(session));
  return session;
}

export async function buildAuthorizationUrl() {
  const { clientId, redirectUri } = getConfiguration();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateRandomValue(32);

  sessionStorage.setItem(STORAGE_KEYS.codeVerifier, codeVerifier);
  sessionStorage.setItem(STORAGE_KEYS.state, state);

  const authorizationUrl = new URL(AUTHORIZATION_ENDPOINT);
  authorizationUrl.search = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: SCOPES.join(" "),
    code_challenge_method: "S256",
    code_challenge: codeChallenge,
    state,
  }).toString();

  return authorizationUrl.toString();
}

export async function redirectToSpotify() {
  const authorizationUrl = await buildAuthorizationUrl();
  window.location.assign(authorizationUrl);
}

export async function exchangeCodeForToken(code, codeVerifier) {
  const { clientId, redirectUri } = getConfiguration();
  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  });

  return storeSession(await readTokenResponse(response));
}

export async function handleAuthCallback() {
  const parameters = new URLSearchParams(window.location.search);
  const code = parameters.get("code");
  const returnedState = parameters.get("state");
  const authorizationError = parameters.get("error");

  if (!code && !authorizationError) {
    return null;
  }

  try {
    if (authorizationError) {
      throw new SpotifyAuthError(
        authorizationError === "access_denied"
          ? "Spotify authorization was cancelled."
          : `Spotify authorization failed: ${authorizationError}`,
        authorizationError,
      );
    }

    const expectedState = sessionStorage.getItem(STORAGE_KEYS.state);
    const codeVerifier = sessionStorage.getItem(STORAGE_KEYS.codeVerifier);

    if (!expectedState || !returnedState || returnedState !== expectedState) {
      throw new SpotifyAuthError(
        "The Spotify authorization state did not match. Please connect again.",
        "state_mismatch",
      );
    }

    if (!codeVerifier) {
      throw new SpotifyAuthError(
        "The Spotify authorization session expired. Please connect again.",
        "missing_code_verifier",
      );
    }

    return await exchangeCodeForToken(code, codeVerifier);
  } finally {
    clearPendingAuthorization();
    cleanCallbackUrl();
  }
}

export function getStoredSession() {
  const storedSession = localStorage.getItem(STORAGE_KEYS.session);

  if (!storedSession) {
    return null;
  }

  try {
    const session = JSON.parse(storedSession);

    if (!session.accessToken || !session.expiresAt) {
      clearSession();
      return null;
    }

    return session;
  } catch {
    clearSession();
    return null;
  }
}

export function isSessionExpired(session) {
  return !session || Date.now() >= session.expiresAt - EXPIRY_BUFFER_MS;
}

export async function refreshAccessToken(session) {
  if (!session?.refreshToken) {
    throw new SpotifyAuthError(
      "The Spotify session cannot be refreshed. Please connect again.",
      "missing_refresh_token",
    );
  }

  const { clientId } = getConfiguration();
  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: "refresh_token",
      refresh_token: session.refreshToken,
    }),
  });

  return storeSession(await readTokenResponse(response, session.refreshToken));
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEYS.session);
  clearPendingAuthorization();
}
