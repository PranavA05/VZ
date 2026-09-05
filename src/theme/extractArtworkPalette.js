function averageColor(bucket) {
  return bucket.sum.map((value) => value / bucket.count);
}

function colorDistance(first, second) {
  return Math.hypot(
    first[0] - second[0],
    first[1] - second[1],
    first[2] - second[2],
  );
}

function liftColor(color, minimumBrightness) {
  const brightness = Math.max(...color);
  if (brightness === 0) {
    return [minimumBrightness, minimumBrightness, minimumBrightness];
  }
  const scale = Math.max(1, minimumBrightness / brightness);
  return color.map((value) => Math.round(Math.min(255, value * scale)));
}

function companionColor(color) {
  const factor = Math.max(...color) > 180 ? 0.62 : 1.28;
  return color.map((value) => Math.round(Math.min(255, value * factor)));
}

// Color buckets preserve real cover hues instead of averaging the artwork to brown.
export function pickArtworkPalette(pixels) {
  const chromaticBuckets = new Map();
  const neutralBuckets = new Map();

  for (let i = 0; i < pixels.length; i += 4) {
    const [r, g, b, alpha] = pixels.subarray(i, i + 4);
    if (alpha < 128) continue;

    const chroma = Math.max(r, g, b) - Math.min(r, g, b);
    const buckets = chroma >= 18 ? chromaticBuckets : neutralBuckets;
    const key = `${r >> 5},${g >> 5},${b >> 5}`;
    const bucket = buckets.get(key) ?? {
      sum: [0, 0, 0],
      count: 0,
      weight: 0,
    };

    bucket.sum[0] += r;
    bucket.sum[1] += g;
    bucket.sum[2] += b;
    bucket.count += 1;
    bucket.weight += 1 + chroma / 255;
    buckets.set(key, bucket);
  }

  const buckets = chromaticBuckets.size ? chromaticBuckets : neutralBuckets;
  const ranked = [...buckets.values()].sort((a, b) => b.weight - a.weight);
  if (!ranked.length) return null;

  const primarySource = averageColor(ranked[0]);
  const primary = liftColor(primarySource, 170);
  const candidates = ranked.slice(1, 13);

  let secondarySource = null;
  let bestScore = -1;

  for (const candidate of candidates) {
    const color = averageColor(candidate);
    const frequency = Math.sqrt(candidate.weight / ranked[0].weight);
    const difference = colorDistance(primarySource, color) / 442;
    const score = frequency * 0.55 + difference * 0.45;

    if (score > bestScore) {
      bestScore = score;
      secondarySource = color;
    }
  }

  let secondary = secondarySource
    ? liftColor(secondarySource, 130)
    : companionColor(primary);

  if (colorDistance(primary, secondary) < 36) {
    secondary = companionColor(primary);
  }

  return [primary, secondary];
}

export function extractArtworkPalette(image) {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 32;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(image, 0, 0, 32, 32);
    return pickArtworkPalette(context.getImageData(0, 0, 32, 32).data);
  } catch {
    // Pixel access is optional: CORS/canvas failures must not hide valid artwork.
    return null;
  }
}
