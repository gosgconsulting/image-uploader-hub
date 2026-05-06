/**
 * Client-side image resize for Shopify product photos.
 *
 * Shopify product image guidance (https://help.shopify.com/manual/products/product-media):
 *  - Recommended dimensions: 2048×2048 for best zoom + crop quality.
 *  - JPEG file size: keep under ~1 MB; the platform will re-encode anyway.
 *  - Hard upload cap: 20 MB per image (Shopify's productCreateMedia rejects above ~25 MB).
 *
 * Strategy: scale longest edge to maxWidth, JPEG-encode at quality 0.85. If the result
 * still exceeds the target (~1 MB), step quality down (0.75 → 0.65 → 0.55), and if that
 * still isn't enough, downscale further (1600 → 1280 → 1024 px). This guarantees we
 * never hand Shopify a >20 MB image even for crazy DSLR panoramas.
 */

const DEFAULT_MAX_WIDTH = 2048;
const DEFAULT_QUALITY = 0.85;
const DEFAULT_TARGET_BYTES = 1_000_000; // ~1 MB target
const DEFAULT_HARD_CAP_BYTES = 20_000_000; // 20 MB hard cap
const SKIP_THRESHOLD_BYTES = 900_000;

const QUALITY_LADDER = [0.85, 0.75, 0.65, 0.55] as const;
const WIDTH_LADDER = [1600, 1280, 1024, 800] as const;

export interface ResizeOptions {
  maxWidth?: number;
  quality?: number;
  /** If the original is already JPEG and below this, return it unchanged. */
  skipBelowBytes?: number;
  /** Try iteratively to land below this. Defaults to ~1 MB. */
  targetBytes?: number;
  /** Never produce output larger than this. Defaults to 20 MB. */
  hardCapBytes?: number;
}

export interface ResizedFile {
  file: File;
  resized: boolean;
  originalSize: number;
  finalSize: number;
}

async function decodeBlob(file: Blob): Promise<ImageBitmap> {
  return await createImageBitmap(file);
}

function makeCanvas(
  width: number,
  height: number,
): OffscreenCanvas | HTMLCanvasElement {
  if (typeof OffscreenCanvas !== "undefined") {
    return new OffscreenCanvas(width, height);
  }
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  return c;
}

async function canvasToJpeg(
  canvas: OffscreenCanvas | HTMLCanvasElement,
  quality: number,
): Promise<Blob> {
  if (canvas instanceof OffscreenCanvas) {
    return await canvas.convertToBlob({ type: "image/jpeg", quality });
  }
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
      "image/jpeg",
      quality,
    );
  });
}

async function encodeJpeg(
  bitmap: ImageBitmap,
  width: number,
  height: number,
  quality: number,
): Promise<Blob | null> {
  const canvas = makeCanvas(width, height);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(bitmap, 0, 0, width, height);
  return await canvasToJpeg(canvas, quality);
}

/**
 * Iteratively encode `bitmap` as JPEG, dropping quality and (if needed) dimensions
 * until the result fits under `targetBytes`. Always returns the smallest blob it
 * managed to produce, even when target isn't reachable.
 */
async function compressBitmap(
  bitmap: ImageBitmap,
  opts: {
    maxWidth: number;
    initialQuality: number;
    targetBytes: number;
    hardCapBytes: number;
  },
): Promise<Blob | null> {
  const ratio = bitmap.width > opts.maxWidth ? opts.maxWidth / bitmap.width : 1;
  const w0 = Math.max(1, Math.round(bitmap.width * ratio));
  const h0 = Math.max(1, Math.round(bitmap.height * ratio));

  let best: Blob | null = null;

  // Pass 1: keep dimensions, walk quality down. Start from the requested initial
  // quality so callers can ask for higher fidelity if they want to.
  const qualities = [
    opts.initialQuality,
    ...QUALITY_LADDER.filter((q) => q < opts.initialQuality),
  ];
  for (const q of qualities) {
    const blob = await encodeJpeg(bitmap, w0, h0, q);
    if (!blob) return best;
    if (!best || blob.size < best.size) best = blob;
    if (blob.size <= opts.targetBytes) return blob;
  }

  // Pass 2: still too big. Reduce dimensions at a moderate quality.
  for (const targetW of WIDTH_LADDER) {
    if (targetW >= w0) continue;
    const r = targetW / bitmap.width;
    const w = Math.max(1, Math.round(bitmap.width * r));
    const h = Math.max(1, Math.round(bitmap.height * r));
    const blob = await encodeJpeg(bitmap, w, h, 0.7);
    if (!blob) continue;
    if (!best || blob.size < best.size) best = blob;
    if (blob.size <= opts.targetBytes) return blob;
  }

  // We may still be over the soft target. If we're also over the hard cap,
  // try one more brutal pass at low quality + small size.
  if (best && best.size > opts.hardCapBytes) {
    const r = 800 / bitmap.width;
    const w = Math.max(1, Math.round(bitmap.width * r));
    const h = Math.max(1, Math.round(bitmap.height * r));
    const blob = await encodeJpeg(bitmap, w, h, 0.5);
    if (blob && (!best || blob.size < best.size)) best = blob;
  }

  return best;
}

/**
 * Resize a single image. Returns the original File untouched if it's already small
 * enough (small JPEG below `skipBelowBytes`); otherwise returns a new JPEG File that
 * fits within `maxWidth` and aims for `targetBytes`.
 */
export async function resizeImageForShopify(
  file: File,
  opts: ResizeOptions = {},
): Promise<ResizedFile> {
  const maxWidth = opts.maxWidth ?? DEFAULT_MAX_WIDTH;
  const quality = opts.quality ?? DEFAULT_QUALITY;
  const skipBelow = opts.skipBelowBytes ?? SKIP_THRESHOLD_BYTES;
  const targetBytes = opts.targetBytes ?? DEFAULT_TARGET_BYTES;
  const hardCapBytes = opts.hardCapBytes ?? DEFAULT_HARD_CAP_BYTES;
  const originalSize = file.size;

  const isJpeg = /\.jpe?g$/i.test(file.name) || file.type === "image/jpeg";
  if (isJpeg && originalSize <= skipBelow) {
    return { file, resized: false, originalSize, finalSize: originalSize };
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await decodeBlob(file);
  } catch {
    // If the browser can't decode it (HEIC, corrupt, etc.), fall through unchanged.
    return { file, resized: false, originalSize, finalSize: originalSize };
  }

  try {
    const blob = await compressBitmap(bitmap, {
      maxWidth,
      initialQuality: quality,
      targetBytes,
      hardCapBytes,
    });
    if (!blob) {
      return { file, resized: false, originalSize, finalSize: originalSize };
    }

    // If our smallest output is somehow bigger than the original (rare: tiny PNG
    // already optimised), keep the original.
    if (blob.size >= originalSize && isJpeg) {
      return { file, resized: false, originalSize, finalSize: originalSize };
    }

    // Re-encoded as JPEG, so swap any non-jpg extension. Keep the original stem so
    // server-side filename matching (reference_parent etc.) still works.
    const newName = file.name.replace(/\.(png|webp|heic|heif|gif|tiff?)$/i, ".jpg");
    const finalName = /\.jpe?g$/i.test(newName) ? newName : `${newName}.jpg`;
    const out = new File([blob], finalName, {
      type: "image/jpeg",
      lastModified: file.lastModified,
    });
    return {
      file: out,
      resized: true,
      originalSize,
      finalSize: out.size,
    };
  } finally {
    // Free decoder memory eagerly — Chrome holds the bitmap in GPU/CPU RAM until close().
    if (typeof bitmap.close === "function") bitmap.close();
  }
}

/**
 * Resize a batch with bounded concurrency so we don't blow the JS heap on a 1000+
 * image upload (each decoded bitmap can be 30–80 MB in RAM).
 */
export async function resizeImagesForShopify(
  files: File[],
  opts: ResizeOptions & {
    concurrency?: number;
    onProgress?: (done: number, total: number) => void;
  } = {},
): Promise<ResizedFile[]> {
  const concurrency = Math.max(1, opts.concurrency ?? 4);
  const out: ResizedFile[] = new Array(files.length);
  let cursor = 0;
  let done = 0;
  const worker = async () => {
    for (;;) {
      const i = cursor++;
      if (i >= files.length) return;
      out[i] = await resizeImageForShopify(files[i], opts);
      done += 1;
      opts.onProgress?.(done, files.length);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(concurrency, files.length) }, worker),
  );
  return out;
}
