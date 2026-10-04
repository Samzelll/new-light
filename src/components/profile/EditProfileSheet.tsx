"use client";

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { X, User } from 'lucide-react';

export interface EditProfileSheetProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: {
    displayName: string;
    bio: string;
    showParticipations: boolean;
    avatarUrl?: string | null;
  };
  onSave: (data: { displayName: string; bio: string; showParticipations: boolean }) => Promise<void>;
  onAvatarUpload: (file: File) => Promise<void>;
  onLogout: () => void;
  isSaving?: boolean;
  isUploading?: boolean;
}

export function EditProfileSheet({
  isOpen,
  onClose,
  initialData,
  onSave,
  onAvatarUpload,
  onLogout,
  isSaving = false,
  isUploading = false,
}: EditProfileSheetProps) {
  const [displayName, setDisplayName] = useState(initialData.displayName || '');
  const [bio, setBio] = useState(initialData.bio || '');
  const [showParticipations, setShowParticipations] = useState(initialData.showParticipations ?? true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Sync state whenever initialData or isOpen changes
  useEffect(() => {
    if (isOpen) {
      setDisplayName(initialData.displayName || '');
      setBio(initialData.bio || '');
      setShowParticipations(initialData.showParticipations ?? true);
      setShowLogoutConfirm(false);
    }
  }, [isOpen, initialData]);

  // Check if anything has changed
  const hasChanged =
    displayName.trim() !== (initialData.displayName || '').trim() ||
    bio.trim() !== (initialData.bio || '').trim() ||
    showParticipations !== (initialData.showParticipations ?? true);

  // Escape key handler and focus trap
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (showLogoutConfirm) {
          setShowLogoutConfirm(false);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, showLogoutConfirm, onClose]);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await onAvatarUpload(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasChanged || isSaving) return;

    await onSave({
      displayName: displayName.trim(),
      bio: bio.trim(),
      showParticipations,
    });
    onClose();
  };

  const handleConfirmLogout = () => {
    setShowLogoutConfirm(false);
    onClose();
    onLogout();
  };

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-profile-title"
      className="fixed inset-0 z-50 bg-[#0b0b0d] text-white flex flex-col items-center overflow-y-auto animate-fade-in"
    >
      {/* Mobile-first max-w-md container */}
      <div className="w-full max-w-md min-h-screen flex flex-col px-5 py-4 justify-between relative">
        {/* ── Top Header ── */}
        <div>
          <div className="flex items-center gap-3 py-2 border-b border-neutral-800/80 mb-6">
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="w-10 h-10 -ml-2 rounded-full text-[#ff6a2b] hover:text-[#ff854d] flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6a2b]"
            >
              <X size={26} strokeWidth={2.5} />
            </button>
            <h1 id="edit-profile-title" className="text-xl font-bold tracking-tight text-white">
              Edit Profile
            </h1>
          </div>

          {/* ── Avatar Block ── */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative w-20 h-20 rounded-full ring-2 ring-[#ff6a2b] ring-offset-2 ring-offset-[#0b0b0d] overflow-hidden bg-[#241712] flex items-center justify-center shadow-lg">
              {initialData.avatarUrl ? (
                <Image
                  src={initialData.avatarUrl}
                  alt={displayName || 'Avatar'}
                  fill
                  className="object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-[#ff824c] to-[#ff6a2b] text-white">
                  <User size={44} strokeWidth={2} className="text-[#0b0b0d] fill-current translate-y-1" />
                </div>
              )}

              {/* Uploading indicator */}
              {isUploading && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-xs font-bold text-white">
                  ...
                </div>
              )}
            </div>

            {/* Clickable "Change photo" link */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="text-[#ff6a2b] hover:text-[#ff854d] font-bold text-sm mt-2.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6a2b] rounded px-2 py-0.5 cursor-pointer"
            >
              {isUploading ? 'Uploading...' : 'Change photo'}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* ── Form Fields ── */}
          <form id="edit-profile-form" onSubmit={handleSubmit} className="space-y-4">
            {/* Field "Name" */}
            <div>
              <label htmlFor="field-display-name" className="block text-xs font-semibold text-neutral-400 mb-1.5">
                Name
              </label>
              <input
                id="field-display-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                required
                className="w-full bg-[#141418] border border-neutral-800 rounded-2xl px-4 py-3 text-white text-sm font-medium focus:border-[#ff6a2b] focus:outline-none transition-colors"
              />
            </div>

            {/* Field "Bio" with 120-character counter */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="field-bio" className="text-xs font-semibold text-neutral-400">
                  Bio
                </label>
                <span className="text-xs font-semibold text-neutral-400 tabular-nums">
                  {bio.length} / 120
                </span>
              </div>
              <textarea
                id="field-bio"
                value={bio}
                onChange={(e) => setBio(e.target.value.slice(0, 120))}
                maxLength={120}
                rows={3}
                placeholder="Tell about yourself..."
                className="w-full bg-[#141418] border border-neutral-800 rounded-2xl px-4 py-3 text-white text-sm font-medium focus:border-[#ff6a2b] focus:outline-none transition-colors resize-none leading-relaxed"
              />
            </div>

            {/* Toggle "Show participations" with switch */}
            <div
              className="bg-[#141418] border border-neutral-800 rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-colors hover:border-neutral-700/80"
              onClick={() => setShowParticipations((prev) => !prev)}
            >
              <div className="pr-3">
                <div className="text-sm font-bold text-white">
                  Show participations
                </div>
                <div className="text-xs text-neutral-400 mt-0.5 leading-snug">
                  Your contest entries are visible on your public profile
                </div>
              </div>

              {/* Accessible Switch */}
              <button
                type="button"
                role="switch"
                aria-checked={showParticipations}
                aria-label="Show participations on public profile"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowParticipations((prev) => !prev);
                }}
                className={`w-12 h-7 rounded-full p-1 transition-colors relative shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6a2b] ${
                  showParticipations ? 'bg-[#ff6a2b]' : 'bg-[#2a2a32]'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform shadow-md ${
                    showParticipations ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </form>
        </div>

        {/* ── Bottom Actions: Primary "Save" and Plain "Sign Out" ── */}
        <div className="pt-6 pb-4 flex flex-col items-center space-y-3">
          {/* Primary Save Button */}
          <button
            type="submit"
            form="edit-profile-form"
            disabled={!hasChanged || isSaving}
            className={`w-full py-3.5 px-6 rounded-full font-bold text-base transition-all text-center tracking-wide focus:outline-none focus-visible:ring-2 focus-visible:ring-white ${
              hasChanged && !isSaving
                ? 'bg-[#ff6a2b] hover:bg-[#ff7a3d] text-white shadow-lg shadow-[#ff6a2b]/25 active:scale-[0.99] cursor-pointer'
                : 'bg-[#18181e] text-neutral-500 cursor-not-allowed border border-neutral-800/80 shadow-none'
            }`}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>

          {/* Plain text button "Sign Out" (only sign-out in the app) */}
          <button
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            className="text-neutral-400 hover:text-red-400 text-sm font-semibold py-2 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6a2b] rounded px-3"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* ── Confirmation Dialog for Logout ── */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="logout-confirm-title"
            aria-describedby="logout-confirm-desc"
            className="bg-[#141418] border border-neutral-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4 animate-scale-up"
          >
            <div className="w-12 h-12 rounded-full bg-red-950/60 border border-red-800/50 text-red-400 flex items-center justify-center mx-auto text-xl">
              ⚠️
            </div>
            <div>
              <h2 id="logout-confirm-title" className="text-lg font-bold text-white">
                Sign out of your account?
              </h2>
              <p id="logout-confirm-desc" className="text-xs text-neutral-400 mt-1">
                You will need to sign in again to submit entries and vote.
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-3 px-4 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-sm font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLogout}
                className="flex-1 py-3 px-4 rounded-2xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold shadow-lg shadow-red-600/30 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EditProfileSheet;
