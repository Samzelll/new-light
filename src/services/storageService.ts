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
 * Retreives the public URL for a file in a bucket.
 * Supports on-the-fly resizing and optimization parameters.
 */
export function getPublicUrl(
  bucketName: 'avatars' | 'submissions' | 'contests',
  path: string,
  options?: { width?: number; quality?: number }
): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  const { data } = supabase.storage.from(bucketName).getPublicUrl(path);
  let url = data.publicUrl;

  if (options && (options.width || options.quality)) {
    // If using Supabase image optimization
    const params = new URLSearchParams();
    if (options.width) params.append('width', options.width.toString());
    if (options.quality) params.append('quality', options.quality.toString());
    url = `${url}?${params.toString()}`;
  }

  return url;
}
