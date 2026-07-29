"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { getContestById, Contest } from '@/services/contestService';
import { submitApplication } from '@/services/participantService';
import { uploadSubmissionPhoto, getPublicUrl } from '@/services/storageService';

export default function ApplyClient({ id: propId }: { id?: string }) {
  const routeParams = useParams();
  const id = (typeof routeParams?.id === 'string' ? routeParams.id : Array.isArray(routeParams?.id) ? routeParams.id[0] : propId) || '';

  const router = useRouter();
  const { user, isAuthenticated, isInitialized } = useAuth();

  const [contest, setContest] = useState<Contest | null>(null);
  const [loadingContest, setLoadingContest] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Form state
  const [description, setDescription] = useState('');
  const [photoUrlInput, setPhotoUrlInput] = useState('');
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [instagram, setInstagram] = useState('');
  const [website, setWebsite] = useState('');
  const [sponsorName, setSponsorName] = useState('');
  const [sponsorUrl, setSponsorUrl] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formNotice, setFormNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    async function fetchContest() {
      if (!id) return;
      setLoadingContest(true);
      const { data, error } = await getContestById(id);
      if (error || !data) {
        setFetchError(error || 'Contest not found');
      } else {
        setContest(data);
      }
      setLoadingContest(false);
    }
    fetchContest();
  }, [id]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const preview = URL.createObjectURL(file);
      setFilePreview(preview);
    }
  };

  const handleAddPhotoUrl = () => {
    const trimmed = photoUrlInput.trim();
    if (trimmed) {
      setUploadedPhotos((prev) => [...prev, trimmed]);
      setPhotoUrlInput('');
    }
  };

  const handleRemovePhoto = (index: number) => {
    setUploadedPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormNotice(null);

    if (!isAuthenticated || !user) {
      setFormNotice({ type: 'error', message: 'You must be signed in to submit an application.' });
      return;
    }

    if (!contest) {
      setFormNotice({ type: 'error', message: 'Contest details could not be loaded.' });
      return;
    }

    setIsSubmitting(true);

    try {
      const finalPhotos: string[] = [...uploadedPhotos];

      if (selectedFile) {
        const tempId = `p_${Date.now()}`;
        const { path, error: uploadErr } = await uploadSubmissionPhoto(contest.id, tempId, 0, selectedFile);
        if (uploadErr) {
          console.warn('Storage upload warning:', uploadErr);
          if (filePreview) {
            finalPhotos.push(filePreview);
          }
        } else if (path) {
          const publicUrl = getPublicUrl('submissions', path);
          finalPhotos.push(publicUrl);
        }
      } else if (filePreview) {
        finalPhotos.push(filePreview);
      }

      if (finalPhotos.length === 0) {
        setFormNotice({ type: 'error', message: 'Please provide at least one photo or photo URL for your entry.' });
        setIsSubmitting(false);
        return;
      }

      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const socialLinks: Record<string, string> = {};
      if (instagram.trim()) socialLinks.instagram = instagram.trim();
      if (website.trim()) socialLinks.website = website.trim();

      const sponsor = sponsorName.trim()
        ? { name: sponsorName.trim(), url: sponsorUrl.trim() || '#' }
        : undefined;

      const { error: appError } = await submitApplication({
        contestId: contest.id,
        photos: finalPhotos,
        description: description.trim(),
        socialLinks,
        sponsor,
        tags,
      });

      if (appError) {
        setFormNotice({ type: 'error', message: appError });
      } else {
        setFormNotice({
          type: 'success',
          message: 'Your entry has been submitted and registered successfully!',
        });
        setTimeout(() => {
          router.push(`/contest/${contest.id}`);
        }, 1200);
      }
    } catch (err: any) {
      setFormNotice({ type: 'error', message: err.message || 'Failed to submit entry.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isInitialized || loadingContest) {
    return (
      <main className="max-w-2xl mx-auto p-4 space-y-6 animate-fade-in">
        <div className="card skeleton h-48" />
        <div className="card skeleton h-80" />
      </main>
    );
  }

  if (fetchError || !contest) {
    return (
      <main className="max-w-xl mx-auto p-4 text-center py-16">
        <div className="card bg-surface-800 border-surface-700 p-8 space-y-4">
          <div className="text-4xl text-accent-red">⚠️</div>
          <h2 className="text-xl font-bold text-white">{fetchError || 'Contest not found'}</h2>
          <Link href="/" className="btn btn-secondary inline-block">
            Return to Feed
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6 animate-fade-in pb-24">
      {/* Top Breadcrumb */}
      <div className="flex justify-between items-center text-sm text-gray-400">
        <Link href={`/contest/${contest.id}`} className="hover:text-white transition-colors">
          ← Back to {contest.title}
        </Link>
        <span className="badge bg-brand-500 text-white font-bold text-xs uppercase px-2.5 py-1">
          Registration Open
        </span>
      </div>

      {/* Header card */}
      <div className="card bg-surface-800 border-surface-600 p-6 space-y-2">
        <h1 className="text-2xl font-extrabold text-white">Enter {contest.title}</h1>
        <p className="text-gray-400 text-sm">
          Submit your photos and description to participate in this contest.
        </p>
      </div>

      {!isAuthenticated ? (
        <div className="card bg-surface-800 border-surface-600 p-8 text-center space-y-4">
          <div className="text-4xl">🔒</div>
          <h3 className="text-lg font-bold text-white">Authentication Required</h3>
          <p className="text-gray-400 text-sm">
            Please sign in or create an account to register your entry.
          </p>
          <Link href="/auth" className="btn btn-primary inline-block py-2.5 px-6 font-bold text-sm">
            Sign In / Register
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="card bg-surface-800 border-surface-600 p-6 sm:p-8 space-y-6">
          {formNotice && (
            <div
              className={`p-4 text-sm font-semibold rounded-xl border text-center ${
                formNotice.type === 'error'
                  ? 'bg-accent-red/10 border-accent-red/20 text-accent-red'
                  : 'bg-accent-green/10 border-accent-green/20 text-accent-green'
              }`}
            >
              {formNotice.message}
            </div>
          )}

          {/* Photo upload section */}
          <div className="space-y-4 border-b border-surface-700 pb-6">
            <label className="label text-xs uppercase tracking-wider text-gray-400 block font-bold">
              Entry Photo(s) *
            </label>

            {/* Selected File / URL Previews */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filePreview && (
                <div className="relative aspect-square rounded-xl overflow-hidden border-2 border-brand-500 group bg-surface-900">
                  <img src={filePreview} alt="Preview" className="w-full h-full object-cover" />
                  <span className="absolute bottom-1 left-1 bg-black/70 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                    Uploaded File
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      setFilePreview(null);
                    }}
                    className="absolute top-1 right-1 bg-red-600 text-white w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shadow"
                  >
                    ×
                  </button>
                </div>
              )}

              {uploadedPhotos.map((url, idx) => (
                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-surface-600 bg-surface-900">
                  <img src={url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(idx)}
                    className="absolute top-1 right-1 bg-red-600 text-white w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shadow"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            {/* File Input */}
            <div className="space-y-2">
              <span className="text-xs text-gray-400 font-semibold block">Option A: Upload Image File</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-brand-600 file:text-white hover:file:bg-brand-500 text-xs text-gray-400 cursor-pointer"
              />
            </div>

            {/* Or Image URL */}
            <div className="space-y-2 pt-2">
              <span className="text-xs text-gray-400 font-semibold block">Option B: Enter Direct Image URL</span>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/photo-..."
                  value={photoUrlInput}
                  onChange={(e) => setPhotoUrlInput(e.target.value)}
                  className="input text-xs"
                />
                <button
                  type="button"
                  onClick={handleAddPhotoUrl}
                  className="btn btn-secondary text-xs px-4 whitespace-nowrap"
                >
                  Add URL
                </button>
              </div>
            </div>
          </div>

          {/* Entry Description */}
          <div className="space-y-1">
            <label className="label text-xs uppercase tracking-wider text-gray-400 block font-bold">
              Entry Title & Description *
            </label>
            <textarea
              placeholder="Tell us about your entry, inspiration, or caption..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input"
              rows={4}
              required
            />
          </div>

          {/* Social Links */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-surface-700 pt-6">
            <div>
              <label className="label text-xs uppercase tracking-wider text-gray-400 block mb-1">
                Instagram Handle / URL (Optional)
              </label>
              <input
                type="text"
                placeholder="@username"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="label text-xs uppercase tracking-wider text-gray-400 block mb-1">
                Website / Portfolio (Optional)
              </label>
              <input
                type="url"
                placeholder="https://..."
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="input"
              />
            </div>
          </div>

          {/* Sponsor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-surface-700 pt-6">
            <div>
              <label className="label text-xs uppercase tracking-wider text-gray-400 block mb-1">
                Sponsor Name (Optional)
              </label>
              <input
                type="text"
                placeholder="Brand / Sponsor"
                value={sponsorName}
                onChange={(e) => setSponsorName(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="label text-xs uppercase tracking-wider text-gray-400 block mb-1">
                Sponsor Link (Optional)
              </label>
              <input
                type="url"
                placeholder="https://..."
                value={sponsorUrl}
                onChange={(e) => setSponsorUrl(e.target.value)}
                className="input"
              />
            </div>
          </div>

          {/* Tags */}
          <div className="border-t border-surface-700 pt-6 space-y-1">
            <label className="label text-xs uppercase tracking-wider text-gray-400 block font-bold">
              Tags (Comma separated, optional)
            </label>
            <input
              type="text"
              placeholder="fashion, summer, streetstyle"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="input"
            />
          </div>

          {/* Action Button */}
          <div className="pt-4 border-t border-surface-700 flex justify-end gap-3">
            <Link href={`/contest/${contest.id}`} className="btn btn-secondary text-xs px-5 py-2.5">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary text-xs px-6 py-2.5 font-bold"
            >
              {isSubmitting ? 'Submitting Application...' : 'Submit Entry ✨'}
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
