const SPOTIFY_API_BASE_URL = "https://api.spotify.com/v1";

export class SpotifyApiError extends Error {
  constructor(message, { status = 0, retryAfter = null } = {}) {
    super(message);
    this.name = "SpotifyApiError";
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

async function readResponseBody(response) {
  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

async function requestSpotify(path, accessToken, { signal } = {}) {
  if (!accessToken) {
    throw new SpotifyApiError("A Spotify access token is required.");
  }

  const response = await fetch(`${SPOTIFY_API_BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    signal,
  });

  const body = await readResponseBody(response);

  if (!response.ok) {
    const spotifyMessage =
      typeof body === "object" && body !== null
        ? body.error?.message
        : null;

    throw new SpotifyApiError(
      spotifyMessage ?? `Spotify request failed with status ${response.status}.`,
      {
        status: response.status,
        retryAfter: response.headers.get("retry-after"),
      },
    );
  }

  return body;
}

export function getCurrentlyPlaying(accessToken, options = {}) {
  return requestSpotify("/me/player/currently-playing", accessToken, options);
}
