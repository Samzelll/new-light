// src/perf/imageUrls.ts
import { PROFILE_LIMITS, getProfile } from './netProfile';

export const VARIANT_WIDTHS = [480, 750, 1080] as const;

export const FEED_SIZES = '(max-width: 640px) 100vw, 480px'; // 1v1 battle card
export const GRID_SIZES = '(max-width: 640px) 50vw, 240px'; // 2x2 group cells, catalog tiles

const OWN_VARIANT = /^(.*\/)(?:480|750|1080)(\.[a-z0-9]+)$/i;

function pickVariant(width: number): number {
  const capped = Math.min(width, PROFILE_LIMITS[getProfile()].maxWidth);
  return VARIANT_WIDTHS.find((w) => w >= capped) ?? VARIANT_WIDTHS[VARIANT_WIDTHS.length - 1];
}

// Use as <Image loader={photoLoader} … /> and inside getImageProps(). Client code only.
export function photoLoader({ src, width }: { src: string; width: number; quality?: number }): string {
  if (!src) return '';
  const w = pickVariant(width);

  // 1) Our own uploads: .../<id>/1080.webp -> .../<id>/<w>.webp
  const own = src.match(OWN_VARIANT);
  if (own) return `${own[1]}${w}${own[2]}`;

  // 2) Mock data on Unsplash: the CDN resizes for us
  if (src.includes('images.unsplash.com')) {
    try {
      const url = new URL(src);
      url.searchParams.set('w', String(w));
      url.searchParams.set('q', '75');
      url.searchParams.set('fm', 'webp');
      return url.toString();
    } catch {
      return src;
    }
  }

  // 3) Anything else: as is
  return src;
}
