import { emptyPlayback } from "../spotify/normalize.js";

function trackKey(track) {
  return track
    ? JSON.stringify([
        track.id ?? [track.title, track.artists, track.album],
        track.artworkUrl,
      ])
    : null;
}

function present(snapshot, artworkUnavailable = false) {
  if (!artworkUnavailable) return snapshot;
  return {
    ...snapshot,
    playback: {
      ...snapshot.playback,
      artworkUnavailable: true,
      track: { ...snapshot.playback.track, artworkUrl: null },
    },
  };
}

export function createPresentation(snapshot) {
  return updatePresentation({
    incoming: null,
    displayed: { playback: emptyPlayback(), receivedAt: 0 },
    activeKey: null,
    artworkPalette: null,
    pending: null,
  }, { type: "receive", snapshot });
}

export function updatePresentation(state, action) {
  if (action.type === "prepared") {
    // Request identity also rejects late results after disconnect/reconnect.
    if (state.pending !== action.request) return state;
    return {
      ...state,
      displayed: present(state.incoming, action.failed),
      activeKey: state.pending.key,
      artworkPalette: action.failed ? null : action.palette ?? null,
      pending: null,
    };
  }

  const incoming = action.snapshot;
  const track = incoming.playback.track;
  const key = trackKey(track);

  if (!track) {
    return { incoming, displayed: incoming, activeKey: null, pending: null, artworkPalette: null };
  }

  if (key === state.activeKey || !track.artworkUrl) {
    const unavailable = !track.artworkUrl || state.displayed.playback.artworkUnavailable;
    return {
      incoming,
      displayed: present(incoming, unavailable),
      activeKey: key,
      artworkPalette: key === state.activeKey ? state.artworkPalette : null,
      pending: null,
    };
  }

  return {
    ...state,
    incoming,
    pending: state.pending?.key === key
      ? state.pending
      : { key, url: track.artworkUrl },
  };
}
