// Pure client-side image resize + compress with iterative quality fallback.
// No external dependencies — uses Canvas + Blob APIs only.

export interface CompressImageOptions {
  maxWidth?: number;       // default: 1600
  maxHeight?: number;      // default: 1600
  maxSizeBytes?: number;   // default: 300 * 1024 (300 KB)
  initialQuality?: number; // default: 0.85
  minQuality?: number;     // default: 0.5
  mimeType?: 'image/webp' | 'image/jpeg'; // default: 'image/webp'
}

export interface CompressImageResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  width: number;
  height: number;
  wasCompressed: boolean;
}

const DEFAULTS = {
  maxWidth: 1600,
  maxHeight: 1600,
  maxSizeBytes: 300 * 1024,
  initialQuality: 0.85,
  minQuality: 0.5,
  mimeType: 'image/webp' as const,
};

/** Load a File/Blob into an HTMLImageElement via object URL. */
function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to decode image file.'));
    };
    img.src = url;
  });
}

/** Compute target dimensions preserving aspect ratio, capped at max bounds. */
function computeDimensions(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  const scale = Math.min(1, maxWidth / width, maxHeight / height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** Draw the image scaled down using multi-step halving for better quality. */
function drawScaled(
  img: HTMLImageElement,
  targetW: number,
  targetH: number,
  mimeType: string
): HTMLCanvasElement {
  let currentW = img.naturalWidth;
  let currentH = img.naturalHeight;
  let source: CanvasImageSource = img;

  // Progressive halving reduces aliasing vs. one-shot downscale.
  while (currentW / 2 >= targetW && currentH / 2 >= targetH) {
    const half = document.createElement('canvas');
    half.width = Math.round(currentW / 2);
    half.height = Math.round(currentH / 2);
    const ctx = half.getContext('2d');
    if (!ctx) break;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source, 0, 0, half.width, half.height);
    source = half;
    currentW = half.width;
    currentH = half.height;
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable.');

  // JPEG has no alpha — fill white to avoid black backgrounds.
  if (mimeType === 'image/jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetW, targetH);
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, targetW, targetH);
  return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas toBlob failed.'))),
      type,
      quality
    );
  });
}

function buildFileName(originalName: string, mimeType: string): string {
  const base = originalName.replace(/\.[^.]+$/, '') || 'image';
  const ext = mimeType === 'image/webp' ? 'webp' : 'jpg';
  return base + '-compressed.' + ext;
}

export async function compressImageFile(
  file: File,
  options?: CompressImageOptions
): Promise<CompressImageResult> {
  const opts = { ...DEFAULTS, ...options };
  const originalSize = file.size;

  // SSR / non-DOM environment guard: pass through untouched.
  if (typeof document === 'undefined') {
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      width: 0,
      height: 0,
      wasCompressed: false,
    };
  }

  // Non-image files pass through untouched.
  if (!file.type.startsWith('image/')) {
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      width: 0,
      height: 0,
      wasCompressed: false,
    };
  }

  // WebP encoding not supported by this browser -> fallback to JPEG.
  let mimeType: 'image/webp' | 'image/jpeg' = opts.mimeType;
  const testCanvas = document.createElement('canvas');
  testCanvas.width = 1;
  testCanvas.height = 1;
  if (testCanvas.toDataURL('image/webp').indexOf('data:image/webp') !== 0) {
    mimeType = 'image/jpeg';
  }

  try {
    const img = await loadImage(file);
    const { width, height } = computeDimensions(
      img.naturalWidth,
      img.naturalHeight,
      opts.maxWidth,
      opts.maxHeight
    );

    const needsResize = width < img.naturalWidth || height < img.naturalHeight;

    // Already within budget & dimensions? Return original untouched.
    if (!needsResize && originalSize <= opts.maxSizeBytes) {
      return {
        file,
        originalSize,
        compressedSize: originalSize,
        width: img.naturalWidth,
        height: img.naturalHeight,
        wasCompressed: false,
      };
    }

    const canvas = drawScaled(img, width, height, mimeType);

    // Quality reduction between initialQuality and minQuality.
    let quality = opts.initialQuality;
    let blob = await canvasToBlob(canvas, mimeType, quality);

    while (blob.size > opts.maxSizeBytes && quality > opts.minQuality) {
      quality = Math.max(opts.minQuality, Number((quality - 0.1).toFixed(2)));
      blob = await canvasToBlob(canvas, mimeType, quality);
    }

    // Still over budget at minQuality -> progressively shrink dimensions.
    let finalW = width;
    let finalH = height;
    let finalCanvas = canvas;
    while (blob.size > opts.maxSizeBytes && finalW > 64 && finalH > 64) {
      finalW = Math.max(1, Math.round(finalW * 0.8));
      finalH = Math.max(1, Math.round(finalH * 0.8));
      finalCanvas = drawScaled(img, finalW, finalH, mimeType);
      blob = await canvasToBlob(finalCanvas, mimeType, opts.minQuality);
    }

    const compressedFile = new File([blob], buildFileName(file.name, mimeType), {
      type: mimeType,
      lastModified: Date.now(),
    });

    return {
      file: compressedFile,
      originalSize,
      compressedSize: blob.size,
      width: finalW,
      height: finalH,
      wasCompressed: true,
    };
  } catch {
    // Corrupt or unreadable image -> pass through original file untouched.
    return {
      file,
      originalSize,
      compressedSize: originalSize,
      width: 0,
      height: 0,
      wasCompressed: false,
    };
  }
}
