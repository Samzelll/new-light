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
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-fade-in"
        onClick={onClose}
      >
        <div
          className="relative z-10 w-full max-w-5xl max-h-[94vh] bg-[#161c17] border border-[#232b24] rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col font-['Onest',sans-serif]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Top Header Bar ── */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-[#232b24] bg-[#111612]">
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
                <div className="w-8 h-8 rounded-full bg-[#232b24] flex items-center justify-center text-xs font-bold text-white shrink-0">
                  {author ? author.charAt(0).toUpperCase() : 'C'}
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs sm:text-sm font-extrabold text-[#eef2ec] truncate">{title}</h3>
                  {rank !== undefined && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#3fc27a]/15 border border-[#3fc27a]/40 text-[#3fc27a]">
                      #{rank} в рейтинге
                    </span>
                  )}
                </div>
                {contestTitle && <p className="text-[11px] text-[#8d998f] truncate">{contestTitle}</p>}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onClose}
                aria-label="Закрыть"
                className="w-8 h-8 rounded-full bg-[#232b24] hover:bg-[#2d382e] text-[#8d998f] hover:text-[#eef2ec] flex items-center justify-center transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* ── Modal Body: Multi-Photo Stage + Contest Metadata Column ── */}
          <div className="flex-1 overflow-y-auto min-h-0 flex flex-col md:flex-row">
            
            {/* Left: Dynamic Photo Stage with 4:5 Instagram Crop & Tap-to-Enlarge Original */}
            <div className="flex-1 p-2 sm:p-4 bg-[#0d110e] flex flex-col justify-center items-center">
              <SwipeablePhotoGallery
                photos={allPhotos}
                title={title}
                author={author}
                cornerAccent="emerald"
              />
            </div>

            {/* Right Column: Tournament Placement, Official Rules Check & Vote Action */}
            <div className="w-full md:w-80 lg:w-96 p-4 sm:p-5 bg-[#161c17] border-t md:border-t-0 md:border-l border-[#232b24] flex flex-col justify-between gap-4">
              <div className="space-y-4">
                
                {/* 1. Tournament Placement Card */}
                <div className="p-3.5 rounded-2xl bg-[#0d110e] border border-[#232b24] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#8d998f] flex items-center gap-1.5 uppercase tracking-wider">
                      <Trophy size={13} className="text-[#3fc27a]" />
                      <span>Позиция в конкурсе</span>
                    </span>
                    {rank !== undefined && (
                      <span className="text-sm font-extrabold text-[#3fc27a] tabular-nums">
                        #{rank} {totalParticipants ? `из ${totalParticipants}` : ''}
                      </span>
                    )}
                  </div>

                  {percentage !== undefined && (
                    <div className="pt-1 border-t border-[#232b24] flex items-center justify-between text-xs">
                      <span className="text-[#8d998f]">Рейтинг сообщества:</span>
                      <span className="font-extrabold text-[#eef2ec] tabular-nums">{percentage}%</span>
                    </div>
                  )}

                  {percentage !== undefined && (
                    <div className="w-full h-1 bg-[#232b24] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#3fc27a] rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* 2. Rules Verification Badge */}
                {rulesVerified && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#3fc27a]/10 border border-[#3fc27a]/30 text-[#3fc27a] text-xs font-semibold">
                    <ShieldCheck size={15} strokeWidth={2.4} className="shrink-0" />
                    <span>Работа проверена модерацией конкурса</span>
                  </div>
                )}

                {/* 3. Author Profile & Bio */}
                <div>
                  <h4 className="text-xs font-bold text-[#8d998f] mb-1">
                    Автор: {author || 'Конкурсант'}
                  </h4>
                  {authorBio ? (
                    <p className="text-xs text-[#eef2ec]/90 leading-relaxed">{authorBio}</p>
                  ) : (
                    <p className="text-xs text-[#8d998f] italic">Заявка подана в основной этап конкурса.</p>
                  )}
                </div>

                {/* 4. Submission Date */}
                {submissionDate && (
                  <div className="flex items-center gap-1.5 text-xs text-[#8d998f]">
                    <Calendar size={13} />
                    <span>Подано: {submissionDate}</span>
                  </div>
                )}

                {/* 5. Creator Links */}
                {socialLinks && Object.values(socialLinks).some(Boolean) && (
                  <div className="space-y-2 pt-2 border-t border-[#232b24]">
                    <h4 className="text-xs font-bold text-[#8d998f]">Контакты автора</h4>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {socialLinks.instagram && (
                        <a
                          href={`https://instagram.com/${socialLinks.instagram.replace('@', '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-[#232b24] hover:bg-[#2d382e] text-[#eef2ec] transition-colors flex items-center gap-1"
                        >
                          <Camera size={12} className="text-pink-400" />
                          <span>Instagram</span>
                        </a>
                      )}
                      {socialLinks.telegram && (
                        <a
                          href={`https://t.me/${socialLinks.telegram.replace('@', '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-[#232b24] hover:bg-[#2d382e] text-[#eef2ec] transition-colors flex items-center gap-1"
                        >
                          <Send size={12} className="text-sky-400" />
                          <span>Telegram</span>
                        </a>
                      )}
                      {socialLinks.website && (
                        <a
                          href={socialLinks.website}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-[#232b24] hover:bg-[#2d382e] text-[#eef2ec] transition-colors flex items-center gap-1"
                        >
                          <ExternalLink size={12} className="text-emerald-400" />
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
                      ? 'bg-[#232b24] hover:bg-[#2d382e] text-[#3fc27a] border border-[#3fc27a]/40'
                      : 'bg-[#3fc27a] hover:bg-[#38b06e] text-black shadow-[#3fc27a]/20'
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
