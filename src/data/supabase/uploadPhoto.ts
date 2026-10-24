// src/data/supabase/uploadPhoto.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import { VARIANT_WIDTHS } from '@/perf/imageUrls';
import type { ProcessedPhoto } from '@/perf/photoPipeline';

export interface UploadedPhoto {
  url: string; // public URL of the 1080 variant: this is what goes into `photo`
  width: number;
  height: number;
  blurDataURL: string;
  dominantColor: string;
}

export async function uploadProcessedPhoto(
  supabase: SupabaseClient | any,
  ownerId: string,
  photo: ProcessedPhoto,
): Promise<UploadedPhoto> {
  const base = `${ownerId}/${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`;
  const bucket = supabase.storage?.from ? supabase.storage.from('photos') : null;
  const paths = VARIANT_WIDTHS.map((w) => `${base}/${w}.${photo.ext}`);

  if (bucket && typeof bucket.upload === 'function') {
    const results = await Promise.all(
      VARIANT_WIDTHS.map((w, i) =>
        bucket.upload(paths[i], photo.variants[w], {
          contentType: photo.mime,
          cacheControl: '31536000', // 1 year: unique path per upload = immutable content
          upsert: false,
        }),
      ),
    );

    const failed = results.find((r: any) => r?.error);
    if (failed?.error) {
      if (typeof bucket.remove === 'function') {
        await bucket.remove(paths).catch(() => {});
      }
      throw failed.error;
    }

    const { data } = bucket.getPublicUrl(paths[paths.length - 1]); // 1080 variant
    return {
      url: data?.publicUrl || paths[paths.length - 1],
      width: photo.width,
      height: photo.height,
      blurDataURL: photo.blurDataURL,
      dominantColor: photo.dominantColor,
    };
  }

  // Fallback for mock environment
  const mockUrl = typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function'
    ? URL.createObjectURL(photo.variants[1080])
    : photo.blurDataURL;

  return {
    url: mockUrl,
    width: photo.width,
    height: photo.height,
    blurDataURL: photo.blurDataURL,
    dominantColor: photo.dominantColor,
  };
}
