// src/perf/photoPipeline.ts (pure browser code, no Supabase)
import { VARIANT_WIDTHS } from './imageUrls';

export type Format = { ext: 'webp' | 'jpg'; mime: 'image/webp' | 'image/jpeg' };

export interface ProcessedPhoto extends Format {
  width: number; // after EXIF rotation
  height: number;
  variants: Record<number, Blob>; // 480 / 750 / 1080
  blurDataURL: string;
  dominantColor: string;
}

const BUDGET_BYTES: Record<number, number> = { 480: 70_000, 750: 150_000, 1080: 250_000 };

function canvasOf(bitmap: ImageBitmap, targetWidth: number): HTMLCanvasElement {
  const scale = Math.min(1, targetWidth / bitmap.width); // never upscale
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas is not available');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function toBlob(canvas: HTMLCanvasElement, mime: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), mime, quality),
  );
}

let formatPromise: Promise<Format> | null = null;
function pickFormat(): Promise<Format> {
  formatPromise ??= (async (): Promise<Format> => {
    if (typeof document === 'undefined') return { ext: 'jpg', mime: 'image/jpeg' };
    const probe = document.createElement('canvas');
    probe.width = 1;
    probe.height = 1;
    const blob = await toBlob(probe, 'image/webp', 0.8).catch(() => null);
    return blob && blob.type === 'image/webp'
      ? { ext: 'webp', mime: 'image/webp' }
      : { ext: 'jpg', mime: 'image/jpeg' };
  })();
  return formatPromise;
}

async function encode(canvas: HTMLCanvasElement, mime: string, width: number): Promise<Blob> {
  let quality = width >= 1080 ? 0.78 : 0.75;
  let blob = await toBlob(canvas, mime, quality);
  while (blob.size > BUDGET_BYTES[width] && quality > 0.5) {
    quality -= 0.07; // squeeze until the variant fits its budget
    blob = await toBlob(canvas, mime, quality);
  }
  return blob;
}

export async function processPhoto(file: File): Promise<ProcessedPhoto> {
  const [format, bitmap] = await Promise.all([
    pickFormat(),
    createImageBitmap(file, { imageOrientation: 'from-image' }),
  ]);

  try {
    const variants: Record<number, Blob> = {};
    for (const w of VARIANT_WIDTHS) {
      variants[w] = await encode(canvasOf(bitmap, w), format.mime, w);
    }

    const blurDataURL = canvasOf(bitmap, 16).toDataURL(format.mime, 0.5);

    const px = document.createElement('canvas');
    px.width = 1;
    px.height = 1;
    const pctx = px.getContext('2d');
    if (!pctx) throw new Error('2D canvas is not available');
    pctx.drawImage(bitmap, 0, 0, 1, 1);
    const [r, g, b] = pctx.getImageData(0, 0, 1, 1).data;
    const hex = (v: number) => v.toString(16).padStart(2, '0');

    return {
      ...format,
      width: bitmap.width,
      height: bitmap.height,
      variants,
      blurDataURL,
      dominantColor: `#${hex(r)}${hex(g)}${hex(b)}`,
    };
  } finally {
    bitmap.close();
  }
}
