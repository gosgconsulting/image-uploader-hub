/**
 * Client-side image resize for Shopify product photos.
 *
 * Shopify product image guidance (https://help.shopify.com/manual/products/product-media):
 *  - Recommended dimensions: 2048×2048 for best zoom + crop quality.
 *  - JPEG file size: keep under ~1 MB; the platform will re-encode anyway.
 *  - Hard upload cap: 20 MB per image (we'd never reach that after resize).
 *
 * Resizing in the browser before upload cuts a 4–7 MB DSLR JPEG down to ~300–800 KB,
 * which makes large batches (1000+ images) actually finish on consumer connections.
 */

const DEFAULT_MAX_WIDTH = 2048;
const DEFAULT_QUALITY = 0.85;
const SKIP_THRESHOLD_BYTES = 900_000;

export interface ResizeOptions {
  maxWidth?: number;
  quality?: number;
  /** If the original is already JPEG and below this, return it unchanged. */
  skipBelowBytes?: number;
}

export interface ResizedFile {
  file: File;
  resized: boolean;
  originalSize: number;
  finalSize: number;
}

async function decodeBlob(file: File): Promise<ImageBitmap> {
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

/**
 * Resize a single image. Returns the original File untouched if it's already small
 * enough; otherwise returns a new JPEG File that fits within `maxWidth`.
 */
export async function resizeImageForShopify(
  file: File,
  opts: ResizeOptions = {},
): Promise<ResizedFile> {
  const maxWidth = opts.maxWidth ?? DEFAULT_MAX_WIDTH;
  const quality = opts.quality ?? DEFAULT_QUALITY;
  const skipBelow = opts.skipBelowBytes ?? SKIP_THRESHOLD_BYTES;
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
    const ratio = bitmap.width > maxWidth ? maxWidth / bitmap.width : 1;
    const w = Math.max(1, Math.round(bitmap.width * ratio));
    const h = Math.max(1, Math.round(bitmap.height * ratio));
    const canvas = makeCanvas(w, h);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return { file, resized: false, originalSize, finalSize: originalSize };
    }
    ctx.drawImage(bitmap, 0, 0, w, h);
    const blob = await canvasToJpeg(canvas, quality);

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
