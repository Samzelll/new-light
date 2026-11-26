import { compressImageFile } from '@/utils/imageCompression';

function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read image data'));
      }
    };
    reader.onerror = () => reject(reader.error || new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Compresses a user's avatar to a compact data URL stored directly in Firestore
 * (100% compatible with Firebase free Spark tier without paid Storage buckets).
 */
export async function uploadAvatar(
  _userId: string,
  file: File
): Promise<{ path: string | null; error: string | null }> {
  try {
    const { file: optimizedFile } = await compressImageFile(file, {
      maxWidth: 400,
      maxHeight: 400,
      maxSizeBytes: 120 * 1024,
    });
    const dataUrl = await fileToDataUrl(optimizedFile);
    return { path: dataUrl, error: null };
  } catch (err: any) {
    return { path: null, error: err?.message || 'An error occurred preparing avatar' };
  }
}

/**
 * Compresses a participant submission photo to a compact data URL for Firestore.
 */
export async function uploadSubmissionPhoto(
  _contestId: string,
  _participantId: string,
  _index: number,
  file: File
): Promise<{ path: string | null; error: string | null }> {
  try {
    const { file: optimizedFile } = await compressImageFile(file, {
      maxWidth: 1200,
      maxHeight: 1200,
      maxSizeBytes: 240 * 1024,
    });
    const dataUrl = await fileToDataUrl(optimizedFile);
    return { path: dataUrl, error: null };
  } catch (err: any) {
    return { path: null, error: err?.message || 'An error occurred preparing photo' };
  }
}

/**
 * Compresses a contest cover image to a compact data URL for Firestore.
 */
export async function uploadContestCover(
  _contestId: string,
  file: File
): Promise<{ path: string | null; error: string | null }> {
  try {
    const { file: optimizedFile } = await compressImageFile(file, {
      maxWidth: 1200,
      maxHeight: 1200,
      maxSizeBytes: 240 * 1024,
    });
    const dataUrl = await fileToDataUrl(optimizedFile);
    return { path: dataUrl, error: null };
  } catch (err: any) {
    return { path: null, error: err?.message || 'An error occurred preparing cover image' };
  }
}

export function getPublicUrl(
  _bucketName: 'avatars' | 'submissions' | 'contests',
  path: string,
  _options?: {
    width?: number;
    height?: number;
    quality?: number;
    resize?: 'origin' | 'cover' | 'fill' | 'inside' | 'outside';
  }
): string {
  if (!path) return '';
  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('data:') ||
    path.startsWith('/')
  ) {
    return path;
  }
  return '';
}

export function resolveImageUrl(
  path?: string | null,
  bucket: 'avatars' | 'submissions' | 'contests' = 'avatars',
  fallback: string = ''
): string {
  if (!path || typeof path !== 'string') return fallback;
  const trimmed = path.trim();
  if (!trimmed) return fallback;

  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('/')
  ) {
    return trimmed;
  }

  return (
    fallback ||
    (bucket === 'avatars'
      ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=faces'
      : 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=800')
  );
}

const OPTIMIZED_HOST_SUFFIXES = [
  'images.unsplash.com',
  'plus.unsplash.com',
  'picsum.photos',
  'elements-resized.envatousercontent.com',
  '.envatousercontent.com',
  '.envato.com',
  'images.pexels.com',
  'cdn.pixabay.com',
  '.googleusercontent.com',
  '.githubusercontent.com',
  '.cloudinary.com',
  '.imgur.com',
  '.firebasestorage.app',
  'firebasestorage.googleapis.com',
];

export function shouldBeUnoptimized(src?: string | null): boolean {
  if (!src || typeof src !== 'string') return false;
  if (src.startsWith('/') || src.startsWith('data:')) return false;
  try {
    const url = new URL(src);
    const host = url.hostname.toLowerCase();
    const isConfigured = OPTIMIZED_HOST_SUFFIXES.some(
      (suffix) => host === suffix || host.endsWith(suffix)
    );
    return !isConfigured;
  } catch {
    return true;
  }
}

export const imgUrl = {
  avatar: (path: string) => getPublicUrl('avatars', path, { width: 128, height: 128, resize: 'cover' }),
  avatarLarge: (path: string) => getPublicUrl('avatars', path, { width: 256, height: 256, resize: 'cover' }),
  contestCover: (path: string, width = 640) => getPublicUrl('contests', path, { width, resize: 'cover', quality: 85 }),
  submission: (path: string, width = 800) => getPublicUrl('submissions', path, { width, resize: 'cover', quality: 85 }),
  submissionThumb: (path: string) => getPublicUrl('submissions', path, { width: 400, height: 400, resize: 'cover', quality: 75 }),
};
