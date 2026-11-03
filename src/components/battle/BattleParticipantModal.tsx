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
  const cornerColor = isRedCorner ? 'text-side-a' : 'text-side-b';
  const cornerBorder = isRedCorner ? 'border-side-a/40' : 'border-side-b/40';
  const cornerBg = isRedCorner ? 'bg-side-a/10' : 'bg-side-b/10';

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Детали участника баттла: ${title}`}
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-xs animate-fade-in"
        onClick={onClose}
      >
        <div
          className="relative z-10 w-full max-w-5xl max-h-[94vh] bg-surface border border-line rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Top Header Bar ── */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-line bg-surface-2">
            <div className="flex items-center gap-2.5 min-w-0">
              {resolvedAvatar ? (
                <div className={`relative w-8 h-8 rounded-full overflow-hidden ring-2 ${isRedCorner ? 'ring-side-a' : 'ring-side-b'} shrink-0 bg-surface`}>
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
                <div className="w-8 h-8 rounded-full bg-surface-2 border border-line flex items-center justify-center text-xs font-bold text-ink shrink-0">
                  {author ? author.charAt(0).toUpperCase() : 'B'}
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-display text-xs sm:text-sm font-bold text-ink truncate">{title}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${cornerBg} ${cornerBorder} ${cornerColor}`}>
                    {isRedCorner ? 'Side A' : 'Side B'}
                  </span>
                </div>
                {author && <p className="text-[11px] text-muted truncate">{author}</p>}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onClose}
                aria-label="Закрыть"
                className="w-8 h-8 rounded-full bg-surface-2 hover:bg-surface border border-line text-muted hover:text-ink flex items-center justify-center transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* ── Modal Body: Multi-Photo Stage + Battle Meta Column ── */}
          <div className="flex-1 overflow-y-auto min-h-0 flex flex-col md:flex-row">
            
            {/* Left: Dynamic Photo Stage */}
            <div className="flex-1 p-2 sm:p-4 bg-bg flex flex-col justify-center items-center">
              <SwipeablePhotoGallery
                photos={allPhotos}
                title={title}
                author={author}
                cornerAccent={isRedCorner ? 'red' : 'blue'}
              />
            </div>

            {/* Right Column: Battle Matchup, Abstract Concept & Voting Action */}
            <div className="w-full md:w-80 lg:w-96 p-4 sm:p-5 bg-surface border-t md:border-t-0 md:border-l border-line flex flex-col justify-between gap-4">
              <div className="space-y-4">
                
                {/* 1. Battle Matchup / Corner Status */}
                <div className={`p-3.5 rounded-xl border ${cornerBg} ${cornerBorder} space-y-2.5`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-muted flex items-center gap-1.5">
                      <Swords size={13} className={cornerColor} />
                      <span>Статус в баттле</span>
                    </span>
                    {percentage !== undefined && (
                      <span className={`text-sm font-bold tabular-nums ${cornerColor}`}>
                        {percentage}% голосов
                      </span>
                    )}
                  </div>

                  {/* Duel Matchup Bar */}
                  {opponentName && (
                    <div className="flex items-center gap-2 pt-1 border-t border-line">
                      <span className="text-[11px] text-muted">Дуэль против:</span>
                      <span className="text-xs font-bold text-ink truncate">{opponentName}</span>
                      {opponentPercentage !== undefined && (
                        <span className="text-[11px] text-muted tabular-nums ml-auto">
                          ({opponentPercentage}%)
                        </span>
                      )}
                    </div>
                  )}

                  {percentage !== undefined && (
                    <div className="w-full h-2 bg-surface-2 rounded-full overflow-hidden border border-line">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isRedCorner ? 'bg-side-a' : 'bg-side-b'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* 2. Topic / Category */}
                {category && (
                  <div className="text-[11px] font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
                    <Tag size={12} />
                    <span>{category}</span>
                  </div>
                )}

                {/* 3. Abstract Concept / Description */}
                {authorBio && (
                  <div>
                    <h4 className="text-xs font-bold text-muted mb-1">
                      О концепте и авторе
                    </h4>
                    <p className="text-xs text-ink/90 leading-relaxed">{authorBio}</p>
                  </div>
                )}

                {/* 4. Flexible Tags / Creative Keywords */}
                {tags && tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded-md bg-surface-2 text-[11px] text-muted border border-line"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* 5. Sponsor & Bounty */}
                {sponsorName && (
                  <div className="p-3 rounded-xl bg-surface-2 border border-line space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-ink">
                      <Award size={14} className="text-accent" />
                      <span>{sponsorName}</span>
                    </div>
                    {sponsorTier && (
                      <div className="text-[11px] text-muted">{sponsorTier}</div>
                    )}
                    {prizePool && (
                      <div className="text-xs font-bold text-accent">
                        Призовой фонд: {prizePool}
                      </div>
                    )}
                  </div>
                )}

                {/* 6. Social Handles */}
                {socialLinks && Object.values(socialLinks).some(Boolean) && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-muted">Контакты и портфолио</h4>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {socialLinks.instagram && (
                        <a
                          href={socialLinks.instagram}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-surface-2 hover:bg-line text-ink border border-line transition-colors flex items-center gap-1"
                        >
                          <Camera size={12} className="text-accent" />
                          <span>Instagram</span>
                        </a>
                      )}
                      {socialLinks.telegram && (
                        <a
                          href={socialLinks.telegram}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-surface-2 hover:bg-line text-ink border border-line transition-colors flex items-center gap-1"
                        >
                          <Send size={12} className="text-side-b" />
                          <span>Telegram</span>
                        </a>
                      )}
                      {socialLinks.portfolio && (
                        <a
                          href={socialLinks.portfolio}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-surface-2 hover:bg-line text-ink border border-line transition-colors flex items-center gap-1"
                        >
                          <ExternalLink size={12} className="text-accent" />
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
                  className={`w-full py-3 px-4 rounded-full font-bold text-xs sm:text-sm uppercase tracking-wide flex items-center justify-center gap-2 transition-all active:scale-98 shadow-md cursor-pointer ${
                    isSelected
                      ? 'bg-surface-2 hover:bg-surface text-danger border border-danger/40'
                      : isRedCorner
                      ? 'bg-side-a text-on-accent hover:opacity-90'
                      : 'bg-side-b text-on-side-b hover:opacity-90'
                  }`}
                >
                  {isSelected ? (
                    <>
                      <X size={16} strokeWidth={2.5} className="text-danger" />
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
