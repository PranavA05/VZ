import { useEffect, useReducer } from "react";
import { createPresentation, updatePresentation } from "../utils/trackPresentation.js";
import { prepareArtwork } from "../utils/prepareArtwork.js";

export function useTrackPresentation(playback, receivedAt) {
  const [state, dispatch] = useReducer(
    updatePresentation,
    { playback, receivedAt },
    createPresentation,
  );

  // Adjust this component's state before children render, so idle/disconnect
  // clears the display immediately. Same-track polls keep the pending request.
  if (state.incoming.playback !== playback || state.incoming.receivedAt !== receivedAt) {
    dispatch({ type: "receive", snapshot: { playback, receivedAt } });
  }

  const request = state.pending;

  useEffect(() => {
    if (!request) return undefined;
    const controller = new AbortController();
    prepareArtwork(request.url, controller.signal).then(({ loaded, palette }) => {
      if (!controller.signal.aborted) {
        dispatch({ type: "prepared", request, failed: !loaded, palette });
      }
    });
    return () => controller.abort();
  }, [request]);

  return {
    ...state.displayed,
    artworkPalette: state.artworkPalette,
    isPreparing: Boolean(request),
  };
}
