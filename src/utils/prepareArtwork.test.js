import test from "node:test";
import assert from "node:assert/strict";
import { prepareArtwork } from "./prepareArtwork.js";

function fakeImages(t, outcomes) {
  const images = [];
  const previous = Object.getOwnPropertyDescriptor(globalThis, "Image");
  class FakeImage {
    constructor() {
      images.push(this);
    }
    set src(value) {
      this.url = value;
      const outcome = outcomes.shift();
      if (outcome) queueMicrotask(() => this[outcome]?.());
    }
    removeAttribute() {
      this.url = null;
    }
  }
  Object.defineProperty(globalThis, "Image", { configurable: true, value: FakeImage });
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, "Image", previous);
    else delete globalThis.Image;
  });
  return images;
}

test("successful artwork loads once and releases its handlers", async (t) => {
  const images = fakeImages(t, ["onload"]);
  assert.deepEqual(await prepareArtwork("cover.jpg", new AbortController().signal), { loaded: true, palette: null });
  assert.equal(images.length, 1);
  assert.equal(images[0].onload, null);
  assert.equal(images[0].onerror, null);
});

test("one failed load retries once and may recover", async (t) => {
  const images = fakeImages(t, ["onerror", "onload"]);
  assert.deepEqual(await prepareArtwork("cover.jpg", new AbortController().signal), { loaded: true, palette: null });
  assert.equal(images.length, 2);
  assert.equal(images[0].crossOrigin, "anonymous");
  assert.equal(images[1].crossOrigin, undefined);
});

test("two failures return fallback without a third request", async (t) => {
  const images = fakeImages(t, ["onerror", "onerror"]);
  assert.deepEqual(await prepareArtwork("cover.jpg", new AbortController().signal), { loaded: false, palette: null });
  assert.equal(images.length, 2);
});

test("unresponsive requests time out instead of blocking the display forever", async (t) => {
  const images = fakeImages(t, []);
  assert.deepEqual(await prepareArtwork("cover.jpg", new AbortController().signal, 5), { loaded: false, palette: null });
  assert.equal(images.length, 2);
  assert.ok(images.every((image) => image.onload === null && image.url === null));
});

test("cancelling an active request settles it without retrying", async (t) => {
  const images = fakeImages(t, []);
  const controller = new AbortController();
  const result = prepareArtwork("cover.jpg", controller.signal);
  controller.abort();
  assert.deepEqual(await result, { loaded: false, palette: null });
  assert.equal(images.length, 1);
  assert.equal(images[0].onload, null);
  assert.equal(images[0].url, null);
});

test("an already cancelled request never creates an image", async (t) => {
  const images = fakeImages(t, []);
  const controller = new AbortController();
  controller.abort();
  assert.deepEqual(await prepareArtwork("cover.jpg", controller.signal), { loaded: false, palette: null });
  assert.equal(images.length, 0);
});

test("successful pixel access returns artwork and its palette in one result", async (t) => {
  const images = fakeImages(t, ["onload"]);
  const previous = Object.getOwnPropertyDescriptor(globalThis, "document");
  let drawnImage;
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      createElement: () => ({
        getContext: () => ({
          drawImage: (image) => { drawnImage = image; },
          getImageData: () => ({ data: new Uint8ClampedArray([40, 180, 210, 255]) }),
        }),
      }),
    },
  });
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, "document", previous);
    else delete globalThis.document;
  });
  assert.deepEqual(await prepareArtwork("cover.jpg", new AbortController().signal), {
    loaded: true, palette: [[40, 180, 210], [25, 112, 130]],
  });
  assert.equal(drawnImage, images[0]);
  assert.equal(images.length, 1);
});

test("blocked pixel access keeps a valid cover without retrying it", async (t) => {
  const images = fakeImages(t, ["onload"]);
  const previous = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      createElement: () => ({ getContext: () => ({
        drawImage() {},
        getImageData() { throw new Error("Pixel access blocked"); },
      }) }),
    },
  });
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, "document", previous);
    else delete globalThis.document;
  });
  assert.deepEqual(await prepareArtwork("cover.jpg", new AbortController().signal), {
    loaded: true, palette: null,
  });
  assert.equal(images.length, 1);
});
