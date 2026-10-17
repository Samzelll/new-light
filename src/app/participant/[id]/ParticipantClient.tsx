"use client";

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { getParticipantById } from '@/services/participantService';
import { supabase } from '@/services/supabase';
import { formatPercentage } from '@/utils/formatters';
import { PhotoLightbox } from '@/components/common/PhotoLightbox';
import {
  ArrowLeft,
  ShieldCheck,
  Award,
  Maximize2,
  ExternalLink,
  Camera,
  Send,
  Share2,
  Globe,
} from 'lucide-react';

export default function ParticipantPageClient({ params }: { params?: { id?: string } }) {
  const routeParams = useParams();
  const participantId =
    (typeof routeParams?.id === 'string'
      ? routeParams.id
      : Array.isArray(routeParams?.id)
      ? routeParams.id[0]
      : params?.id) || '';

  const [participant, setParticipant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<any[]>([]);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await getParticipantById(participantId);
      if (fetchErr) {
        setError(fetchErr);
        return;
      }
      if (!data) {
        setError('Профиль участника не найден.');
        return;
      }
      setParticipant(data);

      const { data: resultsData } = await supabase
        .from('stage_results')
        .select('*, contest_stages(stage_number, title)')
        .eq('participant_id', participantId);
      if (resultsData) setResults(resultsData);
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки данных участника.');
    } finally {
      setLoading(false);
    }
  }, [participantId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-4">
        <div className="h-64 sm:h-96 rounded-3xl bg-neutral-900 animate-pulse" />
        <div className="h-40 rounded-3xl bg-neutral-900 animate-pulse" />
      </main>
    );
  }

  if (error || !participant) {
    return (
      <main className="max-w-lg mx-auto px-4 py-20 text-center space-y-4">
        <div className="p-5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error || 'Участник не найден.'}
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Вернуться в ленту</span>
        </Link>
      </main>
    );
  }

  const name =
    participant.profiles?.display_name ||
    participant.profiles?.username ||
    participant.submission_data?.name ||
    'Участник';
  const description = participant.submission_data?.description;
  const photos: string[] = participant.submission_data?.photos || [];
  const mainPhoto = photos[0] || participant.submission_data?.photo || '';
  const socialLinks = participant.submission_data?.social_links || {};
  const sponsor = participant.submission_data?.sponsor || null;

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-8 space-y-6 animate-fade-in text-white select-none">
      {/* Sleek Minimal Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href={participant.contest_id ? `/contest/${participant.contest_id}` : '/'}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-400 hover:text-white transition-colors py-1"
        >
          <ArrowLeft size={15} />
          <span>Назад к конкурсу</span>
        </Link>

        {mainPhoto && (
          <button
            type="button"
            onClick={() => setIsLightboxOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white text-xs font-medium border border-white/10 transition-colors"
          >
            <Maximize2 size={13} />
            <span>На весь экран</span>
          </button>
        )}
      </div>

      {/* Main Showcase Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Photo Stage: Ambient Glow + Natural Crisp Photo Fit */}
        <div className="lg:col-span-7">
          <div
            onClick={() => setIsLightboxOpen(true)}
            className="relative w-full h-[52vh] sm:h-[62vh] rounded-3xl overflow-hidden bg-[#121216] border border-white/10 shadow-2xl flex items-center justify-center group cursor-zoom-in"
          >
            {mainPhoto ? (
              <>
                {/* Soft ambient glow to eliminate harsh dead black space */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <Image
                    src={mainPhoto}
                    alt=""
                    fill
                    sizes="100vw"
                    className="object-cover filter blur-3xl opacity-35 scale-110"
                    referrerPolicy="no-referrer"
                    priority
                  />
                  <div className="absolute inset-0 bg-[#0d0d12]/40" />
                </div>

                {/* Natural fit photo */}
                <div className="relative w-full h-full p-2 sm:p-4 flex items-center justify-center z-10">
                  <Image
                    src={mainPhoto}
                    alt={name}
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 700px"
                    className="object-contain group-hover:scale-[1.01] transition-transform duration-300"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </>
            ) : (
              <div className="text-neutral-500 text-xs">Нет загруженного фото</div>
            )}
          </div>

          {/* Photos carousel thumbnails if multiple */}
          {photos.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto mt-3 py-1 no-scrollbar">
              {photos.map((ph, idx) => (
                <button
                  key={ph + idx}
                  type="button"
                  onClick={() => setIsLightboxOpen(true)}
                  className="relative shrink-0 w-14 h-14 rounded-xl overflow-hidden border border-white/15 opacity-70 hover:opacity-100 transition-opacity"
                >
                  <Image src={ph} alt="" fill sizes="56px" className="object-cover" referrerPolicy="no-referrer" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details Column */}
        <div className="lg:col-span-5 space-y-4">
          {/* Creator Profile */}
          <div className="p-5 rounded-3xl bg-[#141418] border border-white/5 space-y-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 rounded-full overflow-hidden bg-neutral-800 border border-white/10 shrink-0">
                {participant.profiles?.avatar_url ? (
                  <Image
                    src={participant.profiles.avatar_url}
                    alt={name}
                    fill
                    className="object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-bold text-base text-white bg-neutral-700">
                    {name[0]?.toUpperCase() || 'U'}
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-base sm:text-lg font-bold text-white truncate">{name}</h1>
                  <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
                </div>
                {participant.profiles?.username && (
                  <p className="text-xs text-neutral-400 truncate">@{participant.profiles.username}</p>
                )}
              </div>
            </div>

            {description && (
              <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed pt-2 border-t border-white/5">
                {description}
              </p>
            )}

            {/* Social Links */}
            {Object.keys(socialLinks).length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-white/5">
                {socialLinks.instagram && (
                  <a
                    href={`https://instagram.com/${socialLinks.instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white text-xs transition-colors"
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
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white text-xs transition-colors"
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
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white text-xs transition-colors"
                  >
                    <Globe size={12} className="text-emerald-400" />
                    <span>Сайт</span>
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Sponsor card if available */}
          {sponsor && (
            <div className="p-4 rounded-3xl bg-[#141418] border border-white/5 flex items-center gap-3 shadow-lg">
              <Award size={18} className="text-amber-400 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400/90 block">
                  Спонсор работы
                </span>
                <h4 className="text-xs font-bold text-white truncate">{sponsor.name}</h4>
                {sponsor.product_name && (
                  <p className="text-[11px] text-neutral-400 truncate">{sponsor.product_name}</p>
                )}
              </div>
            </div>
          )}

          {/* Results history */}
          {results.length > 0 && (
            <div className="p-4 rounded-3xl bg-[#141418] border border-white/5 space-y-2 shadow-lg">
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                История раундов
              </h3>
              <div className="space-y-1.5">
                {results.map((res) => (
                  <div
                    key={res.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-white block">
                        {res.contest_stages?.title || `Этап ${res.contest_stages?.stage_number}`}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase ${
                          res.passed ? 'text-emerald-400' : 'text-neutral-500'
                        }`}
                      >
                        {res.passed ? '✓ Прошел' : '✗ Выбыл'}
                      </span>
                    </div>
                    <div className="text-right tabular-nums">
                      <span className="font-bold text-white block">
                        {formatPercentage(res.vote_percentage)}
                      </span>
                      <span className="text-[10px] text-neutral-400">Ранг #{res.rank_in_group}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Modal */}
      {isLightboxOpen && (
        <PhotoLightbox
          isOpen={isLightboxOpen}
          onClose={() => setIsLightboxOpen(false)}
          photoUrl={mainPhoto}
          photos={photos.length > 0 ? photos : [mainPhoto]}
          title={name}
          author={participant.profiles?.username ? `@${participant.profiles.username}` : name}
          authorAvatar={participant.profiles?.avatar_url}
          authorBio={description}
        />
      )}
    </main>
  );
}
