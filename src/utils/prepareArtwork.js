import { extractArtworkPalette } from "../theme/extractArtworkPalette.js";

function loadImage(url, signal, timeoutMs, readPixels) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason);
      return;
    }

    const image = new Image();
    if (readPixels) image.crossOrigin = "anonymous";
    const timer = setTimeout(() => finish(new Error("Artwork timed out.")), timeoutMs);

    function finish(error) {
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      image.onload = null;
      image.onerror = null;
      if (error) image.removeAttribute("src");
      if (error) reject(error);
      else resolve(image);
    }

    function abort() {
      finish(signal.reason);
    }

    signal.addEventListener("abort", abort, { once: true });
    image.onload = () => finish();
    image.onerror = () => finish(new Error("Artwork could not be loaded."));
    image.src = url;
  });
}

// Each attempt is bounded; cancellation stops retries and releases handlers.
export async function prepareArtwork(url, signal, timeoutMs = 5_000) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      // Retry without CORS if pixel access is rejected; the eyes still get a cover.
      const image = await loadImage(url, signal, timeoutMs, attempt === 0);
      return { loaded: true, palette: extractArtworkPalette(image) };
    } catch {
      if (signal.aborted) break;
    }
  }
  return { loaded: false, palette: null };
}
