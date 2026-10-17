import { supabase } from './supabase';

/**
 * Uploads a user's avatar to the 'avatars' bucket.
 * Destination path: {userId}/avatar.{ext}
 */
export async function uploadAvatar(
  userId: string,
  file: File
): Promise<{ path: string | null; error: string | null }> {
  try {
    const fileExt = file.name.split('.').pop() || 'jpg';
    const filePath = `${userId}/avatar.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type,
      });

    if (error) return { path: null, error: error.message };
    return { path: data.path, error: null };
  } catch (err: any) {
    return { path: null, error: err.message || 'An error occurred during upload' };
  }
}

/**
 * Uploads a participant application photo to the 'submissions' bucket.
 * Destination path: {contestId}/{participantId}/photo_{index}.{ext}
 */
export async function uploadSubmissionPhoto(
  contestId: string,
  participantId: string,
  index: number,
  file: File
): Promise<{ path: string | null; error: string | null }> {
  try {
    const fileExt = file.name.split('.').pop() || 'jpg';
    const filePath = `${contestId}/${participantId}/photo_${index}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('submissions')
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type,
      });

    if (error) return { path: null, error: error.message };
    return { path: data.path, error: null };
  } catch (err: any) {
    return { path: null, error: err.message || 'An error occurred during upload' };
  }
}

/**
 * Uploads a contest cover image to the 'contests' bucket.
 * Destination path: {contestId}/cover.{ext}
 */
export async function uploadContestCover(
  contestId: string,
  file: File
): Promise<{ path: string | null; error: string | null }> {
  try {
    const fileExt = file.name.split('.').pop() || 'jpg';
    const filePath = `${contestId}/cover.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('contests')
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type,
      });

    if (error) return { path: null, error: error.message };
    return { path: data.path, error: null };
  } catch (err: any) {
    return { path: null, error: err.message || 'An error occurred during upload' };
  }
}

/**
 * Returns the public URL for a file stored in a Supabase Storage bucket.
 *
 * For Supabase-hosted files, we append Supabase's Image Transformation
 * query params so the CDN returns a properly resized, compressed image
 * (WebP/AVIF) — the user only streams what they need, never the full original.
 *
 * For external URLs (Unsplash, etc.) the URL is passed through unchanged.
 */
export function getPublicUrl(
  bucketName: 'avatars' | 'submissions' | 'contests',
  path: string,
  options?: {
    width?: number;
    height?: number;
    quality?: number;
    /** 'origin' | 'cover' | 'fill' | 'inside' | 'outside' (default: 'cover') */
    resize?: 'origin' | 'cover' | 'fill' | 'inside' | 'outside';
  }
): string {
  if (!path) return '';

  // Pass-through for absolute external URLs (Unsplash CDN, data-URIs, etc.)
  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('data:')
  ) {
    return path;
  }

  // Use Supabase's built-in image transformation API for resize + compression
  const transformOptions = options
    ? {
        width: options.width,
        height: options.height,
        quality: options.quality ?? 80,
        resize: options.resize ?? 'cover',
      }
    : undefined;

  if (transformOptions) {
    const { data } = supabase.storage
      .from(bucketName)
      .getPublicUrl(path, { transform: transformOptions as any });
    return data.publicUrl;
  }

  const { data } = supabase.storage.from(bucketName).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Convenience helpers for common image sizes.
 * These produce correctly-sized thumbnails directly from the CDN.
 */
export const imgUrl = {
  avatar: (path: string) =>
    getPublicUrl('avatars', path, { width: 128, height: 128, resize: 'cover' }),

  avatarLarge: (path: string) =>
    getPublicUrl('avatars', path, { width: 256, height: 256, resize: 'cover' }),

  contestCover: (path: string, width = 640) =>
    getPublicUrl('contests', path, { width, resize: 'cover', quality: 85 }),

  submission: (path: string, width = 800) =>
    getPublicUrl('submissions', path, { width, resize: 'cover', quality: 85 }),

  submissionThumb: (path: string) =>
    getPublicUrl('submissions', path, { width: 400, height: 400, resize: 'cover', quality: 75 }),
};
