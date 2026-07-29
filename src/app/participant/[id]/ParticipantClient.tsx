"use client";

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getParticipantById } from '@/services/participantService';
import { getPublicUrl } from '@/services/storageService';
import { supabase } from '@/services/supabase';
import { formatPercentage } from '@/utils/formatters';

export default function ParticipantPageClient({ params }: { params?: { id?: string } }) {
  const routeParams = useParams();
  const participantId = (typeof routeParams?.id === 'string' ? routeParams.id : Array.isArray(routeParams?.id) ? routeParams.id[0] : params?.id) || '';

  const [participant, setParticipant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await getParticipantById(participantId);
      if (fetchErr) { setError(fetchErr); return; }
      if (!data) { setError('Participant profile not found.'); return; }
      setParticipant(data);

      const { data: resultsData } = await supabase
        .from('stage_results')
        .select('*, contest_stages(stage_number, title)')
        .eq('participant_id', participantId);
      if (resultsData) setResults(resultsData);
    } catch (err: any) {
      setError(err.message || 'An error occurred loading participant details.');
    } finally {
      setLoading(false);
    }
  }, [participantId]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <main className="page-container" style={{ display: 'grid', gap: '16px' }}>
        <div className="skeleton-shimmer" style={{ height: '200px' }} />
        <div className="skeleton-shimmer" style={{ height: '300px' }} />
      </main>
    );
  }

  if (error || !participant) {
    return (
      <main className="page-container" style={{ textAlign: 'center', paddingTop: '80px' }}>
        <div style={{
          padding: '20px', borderRadius: '16px',
          background: 'rgba(255,87,87,0.05)', border: '1px solid rgba(255,87,87,0.2)',
          color: 'var(--color-accent-red)', marginBottom: '20px',
        }}>
          {error || 'Participant not found.'}
        </div>
        <Link href="/" className="btn btn-secondary">Back to Feed</Link>
      </main>
    );
  }

  const name = participant.profiles?.display_name || participant.profiles?.username || 'Anonymous';
  const description = participant.submission_data?.description;
  const photos = participant.submission_data?.photos || [];
  const socialLinks = participant.submission_data?.social_links || {};
  const sponsor = participant.submission_data?.sponsor || null;

  return (
    <main className="page-container animate-fade-in" style={{ display: 'grid', gap: '20px' }}>
      {/* Back */}
      <Link href={`/contest/${participant.contest_id}`} style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        fontSize: '13px', fontWeight: '600', color: 'rgb(107,114,128)',
        textDecoration: 'none', transition: 'color 0.15s',
      }}
        onMouseEnter={e => (e.currentTarget.style.color = 'white')}
        onMouseLeave={e => (e.currentTarget.style.color = 'rgb(107,114,128)')}
      >
        ← Back to Contest
      </Link>

      {/* Main card */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '24px', background: 'var(--color-surface-800)',
        border: '1px solid var(--color-surface-600)', borderRadius: '24px', padding: '28px',
      }}>
        {/* Photo */}
        <div style={{
          aspectRatio: '1', borderRadius: '16px', overflow: 'hidden',
          background: 'var(--color-surface-700)', border: '1px solid var(--color-surface-600)',
        }}>
          {photos.length > 0 ? (
            <img src={photos[0]} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgb(75,85,99)', fontSize: '13px' }}>
              No photo uploaded
            </div>
          )}
        </div>

        {/* Details */}
        <div style={{ display: 'grid', gap: '20px', alignContent: 'start' }}>
          <div>
            <span className="badge-blue" style={{ fontSize: '10px', letterSpacing: '0.07em', marginBottom: '10px', display: 'inline-block' }}>
              Participant
            </span>
            <h1 style={{ fontSize: '28px', fontWeight: '800', color: 'white', margin: '0 0 6px' }}>{name}</h1>
            {participant.profiles?.username && (
              <span style={{ fontSize: '13px', color: 'rgb(107,114,128)' }}>@{participant.profiles.username}</span>
            )}
          </div>

          {description && (
            <div>
              <h4 style={{ fontSize: '11px', fontWeight: '700', color: 'rgb(107,114,128)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                Submission
              </h4>
              <p style={{ fontSize: '14px', color: 'rgb(209,213,219)', lineHeight: '1.6', margin: 0 }}>{description}</p>
            </div>
          )}

          {Object.keys(socialLinks).length > 0 && (
            <div>
              <h4 style={{ fontSize: '11px', fontWeight: '700', color: 'rgb(107,114,128)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
                Social Links
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {socialLinks.instagram && <span className="badge-muted">Instagram: {socialLinks.instagram}</span>}
                {socialLinks.tiktok && <span className="badge-muted">TikTok: {socialLinks.tiktok}</span>}
                {socialLinks.website && (
                  <a href={socialLinks.website} target="_blank" rel="noreferrer" className="badge-blue" style={{ textDecoration: 'underline' }}>
                    Website ↗
                  </a>
                )}
              </div>
            </div>
          )}

          {sponsor && (
            <div style={{
              padding: '16px', borderRadius: '14px',
              background: 'rgba(255,200,87,0.06)', border: '1px solid rgba(255,200,87,0.2)',
            }}>
              <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--color-accent-yellow)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Sponsored Entry
              </span>
              <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'white', margin: '6px 0 4px' }}>{sponsor.name}</h4>
              {sponsor.product_name && <p style={{ fontSize: '12px', color: 'rgb(107,114,128)', margin: '0 0 10px' }}>{sponsor.product_name}</p>}
              {sponsor.buy_link && (
                <a href={sponsor.buy_link} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">
                  View Product ↗
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Results History */}
      {results.length > 0 && (
        <div style={{
          background: 'var(--color-surface-800)', border: '1px solid var(--color-surface-600)',
          borderRadius: '24px', padding: '28px',
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'white', margin: '0 0 16px' }}>Results History</h3>
          <div style={{ display: 'grid', gap: '10px' }}>
            {results.map((result) => (
              <div key={result.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '14px 16px', borderRadius: '12px',
                background: 'var(--color-surface-700)', border: '1px solid var(--color-surface-600)',
              }}>
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: '700', color: 'white', margin: '0 0 4px' }}>
                    {result.contest_stages?.title || `Stage ${result.contest_stages?.stage_number}`}
                  </h4>
                  <span style={{
                    fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em',
                    color: result.passed ? 'var(--color-accent-green)' : 'rgb(107,114,128)',
                  }}>
                    {result.passed ? '✓ Passed' : '✗ Eliminated'}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '20px', fontWeight: '800', color: 'white' }}>
                    {formatPercentage(result.vote_percentage)}
                  </span>
                  <span style={{ display: 'block', fontSize: '10px', color: 'rgb(107,114,128)', textTransform: 'uppercase' }}>
                    Rank #{result.rank_in_group}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
