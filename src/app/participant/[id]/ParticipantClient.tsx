"use client";

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { getParticipantById } from '@/services/participantService';
import { supabase } from '@/services/supabase';
import { formatPercentage } from '@/utils/formatters';
import { SwipeablePhotoGallery } from '@/components/common/SwipeablePhotoGallery';
import { ContestParticipantModal } from '@/components/contest/ContestParticipantModal';
import { resolveImageUrl, shouldBeUnoptimized } from '@/services/storageService';
import {
  ArrowLeft,
  ShieldCheck,
  Award,
  Maximize2,
  ExternalLink,
  Camera,
  Send,
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
        setError('Participant profile not found.');
        return;
      }
      setParticipant(data);

      const { data: resultsData } = await supabase
        .from('stage_results')
        .select('*, contest_stages(stage_number, title)')
        .eq('participant_id', participantId);
      if (resultsData) setResults(resultsData);
    } catch (err: any) {
      setError(err.message || 'Unable to load participant details.');
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
        <div className="h-64 sm:h-96 rounded-2xl bg-surface animate-pulse border border-line" />
        <div className="h-40 rounded-2xl bg-surface animate-pulse border border-line" />
      </main>
    );
  }

  if (error || !participant) {
    return (
      <main className="max-w-lg mx-auto px-4 py-20 text-center space-y-4">
        <div className="p-4 rounded-xl bg-surface-2 border border-danger/40 text-danger text-sm font-medium">
          {error || 'Participant not found.'}
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-surface-2 hover:bg-line text-ink font-bold text-xs transition-colors border border-line"
        >
          <ArrowLeft size={14} />
          <span>Return to feed</span>
        </Link>
      </main>
    );
  }

  const name =
    participant.profiles?.display_name ||
    participant.profiles?.username ||
    participant.submission_data?.name ||
    'Participant';
  const description = participant.submission_data?.description;
  const rawPhotos: string[] = participant.submission_data?.photos || [];
  const photos: string[] = rawPhotos.map((p) => resolveImageUrl(p, 'submissions'));
  const rawMain = rawPhotos[0] || participant.submission_data?.photo || '';
  const mainPhoto = rawMain ? resolveImageUrl(rawMain, 'submissions') : '';
  const socialLinks = participant.submission_data?.social_links || {};
  const sponsor = participant.submission_data?.sponsor || null;

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-8 space-y-6 animate-fade-in text-ink select-none font-sans">
      {/* Sleek Minimal Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href={participant.contest_id ? `/contest/${participant.contest_id}` : '/'}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink transition-colors py-1"
        >
          <ArrowLeft size={15} />
          <span>Back to contest</span>
        </Link>

        {mainPhoto && (
          <button
            type="button"
            onClick={() => setIsLightboxOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface hover:bg-surface-2 text-muted hover:text-ink text-xs font-medium border border-line transition-colors"
          >
            <Maximize2 size={13} />
            <span>View fullscreen</span>
          </button>
        )}
      </div>

      {/* Main Showcase Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Photo Stage with Swipe Carousel & Bottom Counter */}
        <div className="lg:col-span-7">
          <SwipeablePhotoGallery
            photos={photos.length > 0 ? photos : [mainPhoto]}
            title={name}
            author={name}
            cornerAccent="emerald"
          />
        </div>

        {/* Details Column */}
        <div className="lg:col-span-5 space-y-4">
          {/* Creator Profile */}
          <div className="p-5 rounded-2xl bg-surface border border-line space-y-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 rounded-full overflow-hidden bg-surface-2 border border-line shrink-0 ring-1 ring-accent/30">
                {(() => {
                  const resolvedAvatar = participant.profiles?.avatar_url
                    ? resolveImageUrl(participant.profiles.avatar_url, 'avatars')
                    : null;
                  const isValid = resolvedAvatar && (resolvedAvatar.startsWith('http://') || resolvedAvatar.startsWith('https://') || resolvedAvatar.startsWith('data:') || resolvedAvatar.startsWith('/'));
                  return isValid ? (
                    <Image
                      src={resolvedAvatar}
                      alt={name}
                      fill
                      unoptimized={shouldBeUnoptimized(resolvedAvatar)}
                      className="object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-base text-accent bg-surface-2 font-display">
                      {name[0]?.toUpperCase() || 'U'}
                    </div>
                  );
                })()}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-base sm:text-lg font-bold text-ink truncate font-display">{name}</h1>
                  <ShieldCheck size={16} className="text-accent shrink-0" />
                </div>
                {participant.profiles?.username && (
                  <p className="text-xs text-muted truncate">@{participant.profiles.username}</p>
                )}
              </div>
            </div>

            {description && (
              <p className="text-xs sm:text-sm text-muted leading-relaxed pt-2 border-t border-line">
                {description}
              </p>
            )}

            {/* Social Links */}
            {Object.keys(socialLinks).length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-line">
                {socialLinks.instagram && (
                  <a
                    href={`https://instagram.com/${socialLinks.instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-2 hover:bg-surface text-ink text-xs transition-colors border border-line"
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
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-2 hover:bg-surface text-ink text-xs transition-colors border border-line"
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
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-2 hover:bg-surface text-ink text-xs transition-colors border border-line"
                  >
                    <Globe size={12} className="text-accent" />
                    <span>Website</span>
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Sponsor card if available */}
          {sponsor && (
            <div className="p-4 rounded-2xl bg-surface border border-line flex items-center gap-3 shadow-lg">
              <Award size={18} className="text-accent shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-accent-soft block">
                  Submission sponsor
                </span>
                <h4 className="text-xs font-bold text-ink truncate font-display">{sponsor.name}</h4>
                {sponsor.product_name && (
                  <p className="text-[11px] text-muted truncate">{sponsor.product_name}</p>
                )}
              </div>
            </div>
          )}

          {/* Results history */}
          {results.length > 0 && (
            <div className="p-4 rounded-2xl bg-surface border border-line space-y-2 shadow-lg">
              <h3 className="text-xs font-bold text-muted uppercase tracking-wider font-display">
                Round history
              </h3>
              <div className="space-y-1.5">
                {results.map((res) => (
                  <div
                    key={res.id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-surface-2 border border-line text-xs"
                  >
                    <div>
                      <span className="font-semibold text-ink block">
                        {res.contest_stages?.title || `Stage ${res.contest_stages?.stage_number}`}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase ${
                          res.passed ? 'text-accent' : 'text-faint'
                        }`}
                      >
                        {res.passed ? '✓ Advanced' : '✗ Eliminated'}
                      </span>
                    </div>
                    <div className="text-right tabular-nums">
                      <span className="font-bold text-ink block">
                        {formatPercentage(res.vote_percentage)}
                      </span>
                      <span className="text-[10px] text-muted">Rank #{res.rank_in_group}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Contest Participant Details Modal (with Swipe Carousel) */}
      {isLightboxOpen && (
        <ContestParticipantModal
          isOpen={isLightboxOpen}
          onClose={() => setIsLightboxOpen(false)}
          photoUrl={mainPhoto}
          photos={photos.length > 0 ? photos : [mainPhoto]}
          title={name}
          contestTitle="Конкурс"
          author={participant.profiles?.username ? `@${participant.profiles.username}` : name}
          authorAvatar={participant.profiles?.avatar_url}
          authorBio={description}
          rulesVerified={true}
        />
      )}
    </main>
  );
}
