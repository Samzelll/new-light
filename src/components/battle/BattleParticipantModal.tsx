"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  X,
  Tag,
  Award,
  Check,
  Swords,
  Camera,
  Send,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { SwipeablePhotoGallery } from '@/components/common/SwipeablePhotoGallery';
import { resolveImageUrl, shouldBeUnoptimized } from '@/services/storageService';
import { HAPTIC, haptic } from '@/perf/haptics';

export interface BattleParticipantModalProps {
  isOpen: boolean;
  onClose: () => void;
  photoUrl: string;
  photos?: string[];
  title: string;
  author?: string;
  authorAvatar?: string;
  authorBio?: string;
  category?: string;
  corner?: 'red' | 'blue' | 'green';
  opponentName?: string;
  opponentAvatar?: string;
  opponentCorner?: 'red' | 'blue' | 'green';
  percentage?: number | string;
  opponentPercentage?: number | string;
  sponsorName?: string;
  sponsorTier?: string;
  prizePool?: string;
  tags?: string[];
  socialLinks?: {
    instagram?: string;
    telegram?: string;
    twitter?: string;
    portfolio?: string;
  };
  isSelected?: boolean;
  onVote?: () => void;
}

export function BattleParticipantModal({
  isOpen,
  onClose,
  photoUrl,
  photos,
  title,
  author,
  authorAvatar,
  authorBio,
  category,
  corner = 'red',
  opponentName,
  opponentAvatar,
  opponentCorner,
  percentage,
  opponentPercentage,
  sponsorName,
  sponsorTier,
  prizePool,
  tags,
  socialLinks,
  isSelected,
  onVote,
}: BattleParticipantModalProps) {
  // Normalize photos list
  const allPhotos = photos && photos.length > 0 ? photos : photoUrl ? [photoUrl] : [];

  // Keyboard close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const resolvedAvatar = authorAvatar ? resolveImageUrl(authorAvatar, 'avatars') : null;
  const isRedCorner = corner === 'red';
  const cornerColor = isRedCorner ? 'text-[#ff6a2b]' : 'text-sky-400';
  const cornerBorder = isRedCorner ? 'border-[#ff6a2b]/30' : 'border-sky-400/30';
  const cornerBg = isRedCorner ? 'bg-[#ff6a2b]/10' : 'bg-sky-400/10';

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Детали участника баттла: ${title}`}
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-fade-in"
        onClick={onClose}
      >
        <div
          className="relative z-10 w-full max-w-5xl max-h-[94vh] bg-[#141417] border border-neutral-800 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Top Header Bar ── */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-neutral-800/80 bg-[#18181c]">
            <div className="flex items-center gap-2.5 min-w-0">
              {resolvedAvatar ? (
                <div className="relative w-8 h-8 rounded-full overflow-hidden border border-white/20 shrink-0">
                  <Image
                    src={resolvedAvatar}
                    alt={author || ''}
                    fill
                    unoptimized={shouldBeUnoptimized(resolvedAvatar)}
                    className="object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-neutral-800 border border-white/20 flex items-center justify-center text-xs font-bold text-white shrink-0">
                  {author ? author.charAt(0).toUpperCase() : 'B'}
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs sm:text-sm font-black text-white truncate">{title}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${cornerBg} ${cornerBorder} ${cornerColor}`}>
                    {isRedCorner ? '🔴 Красный угол' : '🔵 Синий угол'}
                  </span>
                </div>
                {author && <p className="text-[11px] text-neutral-400 truncate">{author}</p>}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onClose}
                aria-label="Закрыть"
                className="w-8 h-8 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center justify-center transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* ── Modal Body: Multi-Photo Stage + Battle Meta Column ── */}
          <div className="flex-1 overflow-y-auto min-h-0 flex flex-col md:flex-row">
            
            {/* Left: Dynamic Photo Stage with 4:5 Instagram Crop & Tap-to-Enlarge Original */}
            <div className="flex-1 p-2 sm:p-4 bg-[#101014] flex flex-col justify-center items-center">
              <SwipeablePhotoGallery
                photos={allPhotos}
                title={title}
                author={author}
                cornerAccent={isRedCorner ? 'red' : 'blue'}
              />
            </div>

            {/* Right Column: Battle Matchup, Abstract Concept & Voting Action */}
            <div className="w-full md:w-80 lg:w-96 p-4 sm:p-5 bg-[#141417] border-t md:border-t-0 md:border-l border-neutral-800 flex flex-col justify-between gap-4">
              <div className="space-y-4">
                
                {/* 1. Battle Matchup / Corner Status */}
                <div className={`p-3.5 rounded-2xl border ${cornerBg} ${cornerBorder} space-y-2.5`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                      <Swords size={13} className={cornerColor} />
                      <span>Статус в баттле</span>
                    </span>
                    {percentage !== undefined && (
                      <span className={`text-sm font-black tabular-nums ${cornerColor}`}>
                        {percentage}% голосов
                      </span>
                    )}
                  </div>

                  {/* Duel Matchup Bar */}
                  {opponentName && (
                    <div className="flex items-center gap-2 pt-1 border-t border-white/5">
                      <span className="text-[11px] text-neutral-400">Дуэль против:</span>
                      <span className="text-xs font-bold text-white truncate">{opponentName}</span>
                      {opponentPercentage !== undefined && (
                        <span className="text-[11px] text-neutral-400 tabular-nums ml-auto">
                          ({opponentPercentage}%)
                        </span>
                      )}
                    </div>
                  )}

                  {percentage !== undefined && (
                    <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isRedCorner ? 'bg-[#ff6a2b]' : 'bg-sky-400'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* 2. Topic / Category */}
                {category && (
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#ff6a2b] flex items-center gap-1.5">
                    <Tag size={12} />
                    <span>{category}</span>
                  </div>
                )}

                {/* 3. Abstract Concept / Description */}
                {authorBio && (
                  <div>
                    <h4 className="text-xs font-bold text-neutral-400 mb-1">
                      О концепте и авторе
                    </h4>
                    <p className="text-xs text-neutral-300 leading-relaxed">{authorBio}</p>
                  </div>
                )}

                {/* 4. Flexible Tags / Creative Keywords */}
                {tags && tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded-md bg-neutral-800/80 text-[11px] text-neutral-300 border border-neutral-700/60"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* 5. Sponsor & Bounty (if present) */}
                {sponsorName && (
                  <div className="p-3 rounded-xl bg-neutral-900/90 border border-neutral-800 space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                      <Award size={14} className="text-[#ff6a2b]" />
                      <span>{sponsorName}</span>
                    </div>
                    {sponsorTier && (
                      <div className="text-[11px] text-neutral-400">{sponsorTier}</div>
                    )}
                    {prizePool && (
                      <div className="text-xs font-extrabold text-emerald-400">
                        Призовой фонд: {prizePool}
                      </div>
                    )}
                  </div>
                )}

                {/* 6. Social Handles */}
                {socialLinks && Object.values(socialLinks).some(Boolean) && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-neutral-400">Контакты и портфолио</h4>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {socialLinks.instagram && (
                        <a
                          href={socialLinks.instagram}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors flex items-center gap-1"
                        >
                          <Camera size={12} className="text-pink-400" />
                          <span>Instagram</span>
                        </a>
                      )}
                      {socialLinks.telegram && (
                        <a
                          href={socialLinks.telegram}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors flex items-center gap-1"
                        >
                          <Send size={12} className="text-sky-400" />
                          <span>Telegram</span>
                        </a>
                      )}
                      {socialLinks.portfolio && (
                        <a
                          href={socialLinks.portfolio}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 transition-colors flex items-center gap-1"
                        >
                          <ExternalLink size={12} className="text-amber-400" />
                          <span>Портфолио</span>
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* ── Direct Corner Vote Action ── */}
              {onVote && (
                <button
                  type="button"
                  onClick={() => {
                    haptic(isSelected ? HAPTIC.unvote : HAPTIC.vote);
                    onVote();
                    onClose();
                  }}
                  className={`w-full py-3 px-4 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wide flex items-center justify-center gap-2 transition-all active:scale-98 shadow-lg cursor-pointer ${
                    isSelected
                      ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700'
                      : isRedCorner
                      ? 'bg-[#ff6a2b] hover:bg-[#ff7a3d] text-white shadow-[#ff6a2b]/25'
                      : 'bg-sky-500 hover:bg-sky-400 text-white shadow-sky-500/25'
                  }`}
                >
                  {isSelected ? (
                    <>
                      <X size={16} strokeWidth={2.5} className="text-red-400" />
                      <span>Отменить голос за этот угол</span>
                    </>
                  ) : (
                    <>
                      <Check size={16} strokeWidth={2.5} />
                      <span>Голосовать за этот угол</span>
                    </>
                  )}
                </button>
              )}
            </div>

          </div>
        </div>
      </div>

    </>
  );
}
export default BattleParticipantModal;
