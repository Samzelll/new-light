"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  X,
  Trophy,
  Check,
  Camera,
  Send,
  ExternalLink,
  ShieldCheck,
  Calendar,
} from 'lucide-react';
import { SwipeablePhotoGallery } from '@/components/common/SwipeablePhotoGallery';
import { resolveImageUrl, shouldBeUnoptimized } from '@/services/storageService';
import { HAPTIC, haptic } from '@/perf/haptics';

export interface ContestParticipantModalProps {
  isOpen: boolean;
  onClose: () => void;
  photoUrl: string;
  photos?: string[];
  title: string;
  rank?: number;
  totalParticipants?: number;
  contestTitle?: string;
  percentage?: number | string;
  votesCount?: number;
  author?: string;
  authorAvatar?: string;
  authorBio?: string;
  submissionDate?: string;
  rulesVerified?: boolean;
  socialLinks?: {
    instagram?: string;
    telegram?: string;
    website?: string;
    twitter?: string;
  };
  isSelected?: boolean;
  onVote?: () => void;
}

export function ContestParticipantModal({
  isOpen,
  onClose,
  photoUrl,
  photos,
  title,
  rank,
  totalParticipants,
  contestTitle,
  percentage,
  votesCount,
  author,
  authorAvatar,
  authorBio,
  submissionDate,
  rulesVerified = true,
  socialLinks,
  isSelected,
  onVote,
}: ContestParticipantModalProps) {
  const allPhotos = photos && photos.length > 0 ? photos : photoUrl ? [photoUrl] : [];

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

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Детали участника конкурса: ${title}`}
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-scrim backdrop-blur-xs animate-fade-in"
        onClick={onClose}
      >
        <div
          className="relative z-10 w-full max-w-5xl max-h-[94vh] bg-surface border border-line rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col font-sans"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Top Header Bar ── */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-line bg-surface-2">
            <div className="flex items-center gap-2.5 min-w-0">
              {resolvedAvatar ? (
                <div className="relative w-8 h-8 rounded-full overflow-hidden border border-line shrink-0 ring-1 ring-accent/30">
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
                  {author ? author.charAt(0).toUpperCase() : 'C'}
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs sm:text-sm font-bold text-ink truncate font-display">{title}</h3>
                  {rank !== undefined && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent/15 border border-accent/40 text-accent-soft">
                      #{rank} в рейтинге
                    </span>
                  )}
                </div>
                {contestTitle && <p className="text-[11px] text-muted truncate">{contestTitle}</p>}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onClose}
                aria-label="Закрыть"
                className="w-8 h-8 rounded-full bg-surface-2 hover:bg-surface text-muted hover:text-ink flex items-center justify-center transition-colors border border-line"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* ── Modal Body: Multi-Photo Stage + Contest Metadata Column ── */}
          <div className="flex-1 overflow-y-auto min-h-0 flex flex-col md:flex-row">
            
            {/* Left: Dynamic Photo Stage with 4:5 Instagram Crop & Tap-to-Enlarge Original */}
            <div className="flex-1 p-2 sm:p-4 bg-bg flex flex-col justify-center items-center">
              <SwipeablePhotoGallery
                photos={allPhotos}
                title={title}
                author={author}
                cornerAccent="emerald"
              />
            </div>

            {/* Right Column: Tournament Placement, Official Rules Check & Vote Action */}
            <div className="w-full md:w-80 lg:w-96 p-4 sm:p-5 bg-surface border-t md:border-t-0 md:border-l border-line flex flex-col justify-between gap-4">
              <div className="space-y-4">
                
                {/* 1. Tournament Placement Card */}
                <div className="p-3.5 rounded-2xl bg-surface-2 border border-line space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-muted flex items-center gap-1.5 uppercase tracking-wider">
                      <Trophy size={13} className="text-accent" />
                      <span>Позиция в конкурсе</span>
                    </span>
                    {rank !== undefined && (
                      <span className="text-sm font-bold text-accent font-display tabular-nums">
                        #{rank} {totalParticipants ? `из ${totalParticipants}` : ''}
                      </span>
                    )}
                  </div>

                  {percentage !== undefined && (
                    <div className="pt-1 border-t border-line flex items-center justify-between text-xs">
                      <span className="text-muted">Рейтинг сообщества:</span>
                      <span className="font-bold text-ink tabular-nums">{percentage}%</span>
                    </div>
                  )}

                  {percentage !== undefined && (
                    <div className="w-full h-1 bg-surface rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* 2. Rules Verification Badge */}
                {rulesVerified && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-accent/10 border border-accent/30 text-accent-soft text-xs font-semibold">
                    <ShieldCheck size={15} strokeWidth={2.4} className="shrink-0 text-accent" />
                    <span>Работа проверена модерацией конкурса</span>
                  </div>
                )}

                {/* 3. Author Profile & Bio */}
                <div>
                  <h4 className="text-xs font-bold text-muted mb-1">
                    Автор: {author || 'Конкурсант'}
                  </h4>
                  {authorBio ? (
                    <p className="text-xs text-ink/90 leading-relaxed">{authorBio}</p>
                  ) : (
                    <p className="text-xs text-faint italic">Заявка подана в основной этап конкурса.</p>
                  )}
                </div>

                {/* 4. Submission Date */}
                {submissionDate && (
                  <div className="flex items-center gap-1.5 text-xs text-muted">
                    <Calendar size={13} />
                    <span>Подано: {submissionDate}</span>
                  </div>
                )}

                {/* 5. Creator Links */}
                {socialLinks && Object.values(socialLinks).some(Boolean) && (
                  <div className="space-y-2 pt-2 border-t border-line">
                    <h4 className="text-xs font-bold text-muted">Контакты автора</h4>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {socialLinks.instagram && (
                        <a
                          href={`https://instagram.com/${socialLinks.instagram.replace('@', '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-surface-2 hover:bg-surface text-ink transition-colors flex items-center gap-1 border border-line"
                        >
                          <Camera size={12} className="text-accent" />
                          <span>Instagram</span>
                        </a>
                      )}
                      {socialLinks.telegram && (
                        <a
                          href={`https://t.me/${socialLinks.telegram.replace('@', '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-surface-2 hover:bg-surface text-ink transition-colors flex items-center gap-1 border border-line"
                        >
                          <Send size={12} className="text-accent" />
                          <span>Telegram</span>
                        </a>
                      )}
                      {socialLinks.website && (
                        <a
                          href={socialLinks.website}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-surface-2 hover:bg-surface text-ink transition-colors flex items-center gap-1 border border-line"
                        >
                          <ExternalLink size={12} className="text-accent" />
                          <span>Сайт</span>
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* ── Contest Vote Action ── */}
              {onVote && (
                <button
                  type="button"
                  onClick={() => {
                    haptic(isSelected ? HAPTIC.unvote : HAPTIC.vote);
                    onVote();
                    onClose();
                  }}
                  className={`w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm uppercase tracking-wide flex items-center justify-center gap-2 transition-all active:scale-98 shadow-md cursor-pointer ${
                    isSelected
                      ? 'bg-surface-2 hover:bg-surface text-accent border border-accent/40'
                      : 'bg-accent-solid hover:bg-accent-hover text-white shadow-lg'
                  }`}
                >
                  {isSelected ? (
                    <>
                      <Check size={16} strokeWidth={2.8} />
                      <span>Ваш голос отдан (Нажмите для отмены)</span>
                    </>
                  ) : (
                    <>
                      <Check size={16} strokeWidth={2.8} />
                      <span>Отдать голос за участника</span>
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
export default ContestParticipantModal;
