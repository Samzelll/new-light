"use client";

export const dynamic = 'force-dynamic';

import { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Search, X } from 'lucide-react';

const TYPE_CONFIG: Record<string, { color: string; bg: string; border: string; emoji: string }> = {
  battle:   { color: 'var(--color-accent-red)',    bg: 'rgba(255,87,87,0.1)',  border: 'rgba(255,87,87,0.2)',  emoji: '⚔️' },
  race:     { color: 'var(--color-accent-yellow)', bg: 'rgba(255,200,87,0.1)', border: 'rgba(255,200,87,0.2)', emoji: '🏁' },
  eternal:  { color: 'var(--color-accent-purple)', bg: 'rgba(168,85,247,0.1)', border: 'rgba(168,85,247,0.2)', emoji: '♾️' },
  standard: { color: 'var(--color-brand-400)',     bg: 'rgba(56,97,255,0.1)',  border: 'rgba(56,97,255,0.2)',  emoji: '🗳️' },
};

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  active:       { color: 'var(--color-accent-green)',  bg: 'rgba(0,229,160,0.1)',   label: 'Live' },
  registration: { color: 'var(--color-accent-yellow)', bg: 'rgba(255,200,87,0.1)',  label: 'Reg. Open' },
  completed:    { color: 'var(--color-brand-400)',     bg: 'rgba(56,97,255,0.1)',   label: 'Ended' },
  draft:        { color: 'rgb(107,114,128)',            bg: 'rgba(107,114,128,0.1)', label: 'Draft' },
  paused:       { color: 'var(--color-accent-red)',    bg: 'rgba(255,87,87,0.1)',   label: 'Paused' },
};

const TRENDING_TOPICS = [
  { label: '👟 Sneakers',  q: 'sneakers' },
  { label: '💄 Beauty',    q: 'beauty' },
  { label: '📸 Photography', q: 'photo' },
  { label: '🎮 Gaming',    q: 'game' },
  { label: '⚽ Sports',    q: 'sport' },
  { label: '🎨 Design',    q: 'design' },
  { label: '🍕 Food',      q: 'food' },
  { label: '✈️ Travel',    q: 'travel' },
];

export default function SearchPage() {
  const [query, setQuery]           = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [allContests, setAllContests]   = useState<any[]>([]);
  const [loading, setLoading]           = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load all contests once on mount
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { getContests } = await import('@/services/contestService');
        const { data } = await getContests({ includePausedOrBlocked: false });
        setAllContests(data || []);
      } catch {}
      finally { setLoading(false); setInitialLoaded(true); }
    })();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
  };

  // Derived filtered results — instant, no debounce needed (client-side)
  const results = allContests.filter(c => {
    const q = query.toLowerCase().trim();
    const matchesQuery = !q ||
      c.title?.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q) ||
      c.category?.toLowerCase().includes(q);
    const matchesType   = typeFilter === 'all'   || c.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesQuery && matchesType && matchesStatus;
  });

  const hasActiveFilters = query || typeFilter !== 'all' || statusFilter !== 'all';

  const clearAll = () => { setQuery(''); setTypeFilter('all'); setStatusFilter('all'); };

  return (
    <main className="page-container animate-fade-in" style={{ display: 'grid', gap: '20px' }}>

      {/* ── Search bar ── */}
      <div style={{ position: 'relative' }}>
        <div style={{
          position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)',
          color: 'rgb(107,114,128)', pointerEvents: 'none', zIndex: 1,
        }}>
          <Search size={18} strokeWidth={2} />
        </div>
        <input
          id="search-input"
          className="input"
          type="text"
          placeholder="Search contests by name, category…"
          value={query}
          onChange={handleChange}
          style={{ paddingLeft: '46px', paddingRight: query ? '44px' : '16px', fontSize: '15px', height: '52px' }}
          autoFocus
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            style={{
              position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
              background: 'var(--color-surface-600)', border: 'none', borderRadius: '6px',
              width: '26px', height: '26px', cursor: 'pointer', color: 'rgb(156,163,175)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={14} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* ── Filter row ── */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Type filters */}
        {['all', 'battle', 'race', 'eternal', 'standard'].map(t => {
          const active = typeFilter === t;
          const tc = TYPE_CONFIG[t];
          return (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              style={{
                padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '700',
                border: `1px solid ${active ? (tc?.color || 'var(--color-brand-400)') + '60' : 'var(--color-surface-500)'}`,
                background: active ? (tc?.bg || 'rgba(56,97,255,0.1)') : 'var(--color-surface-700)',
                color: active ? (tc?.color || 'var(--color-brand-400)') : 'rgb(107,114,128)',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {t === 'all' ? '✦ All Types' : `${tc?.emoji} ${t.charAt(0).toUpperCase() + t.slice(1)}`}
            </button>
          );
        })}

        <div style={{ height: '20px', width: '1px', background: 'var(--color-surface-600)', margin: '0 2px' }} />

        {/* Status filters */}
        {['all', 'active', 'registration', 'completed'].map(s => {
          const active = statusFilter === s;
          const sc = STATUS_CONFIG[s];
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '700',
                border: `1px solid ${active ? (sc?.color || 'var(--color-brand-400)') + '60' : 'var(--color-surface-500)'}`,
                background: active ? (sc?.bg || 'rgba(56,97,255,0.1)') : 'var(--color-surface-700)',
                color: active ? (sc?.color || 'var(--color-brand-400)') : 'rgb(107,114,128)',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {s === 'all' ? '✦ All Status' : sc?.label || s}
            </button>
          );
        })}

        {hasActiveFilters && (
          <button
            onClick={clearAll}
            style={{
              padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '700',
              border: '1px solid rgba(255,87,87,0.3)', background: 'rgba(255,87,87,0.08)',
              color: 'var(--color-accent-red)', cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            Clear all ×
          </button>
        )}
      </div>

      {/* ── Loading ── */}
      {loading ? (
        <div style={{ display: 'grid', gap: '10px' }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton-shimmer" style={{ height: '80px', borderRadius: '14px' }} />)}
        </div>
      ) : !initialLoaded ? null : hasActiveFilters && results.length === 0 ? (
        /* No results */
        <div style={{
          padding: '56px 40px', textAlign: 'center', borderRadius: '24px',
          background: 'var(--color-surface-800)', border: '1px solid var(--color-surface-600)',
        }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔍</div>
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'white', marginBottom: '8px' }}>No results found</h3>
          <p style={{ fontSize: '13px', color: 'rgb(107,114,128)', marginBottom: '16px' }}>
            Try different keywords or remove a filter
          </p>
          <button onClick={clearAll} style={{
            padding: '10px 20px', borderRadius: '12px', border: 'none', fontSize: '13px', fontWeight: '700',
            background: 'var(--color-surface-700)', color: 'white', cursor: 'pointer',
          }}>Clear Filters</button>
        </div>
      ) : hasActiveFilters ? (
        /* Results */
        <div>
          <p style={{ fontSize: '12px', color: 'rgb(107,114,128)', marginBottom: '12px', fontWeight: '600' }}>
            {results.length} contest{results.length !== 1 ? 's' : ''} found
          </p>
          <div style={{ display: 'grid', gap: '10px' }}>
            {results.map(contest => {
              const tc = TYPE_CONFIG[contest.type] ?? TYPE_CONFIG.standard;
              const sc = STATUS_CONFIG[contest.status] ?? STATUS_CONFIG.draft;
              return (
                <Link key={contest.id} href={`/contest/${contest.id}`} style={{ textDecoration: 'none' }}>
                  <div
                    style={{
                      display: 'flex', alignItems: 'center', gap: '14px',
                      padding: '14px 18px', borderRadius: '16px',
                      background: 'var(--color-surface-800)', border: '1px solid var(--color-surface-600)',
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-surface-500)';
                      (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-surface-600)';
                      (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                    }}
                  >
                    {/* Type icon */}
                    <div style={{
                      width: '42px', height: '42px', borderRadius: '12px', flexShrink: 0,
                      background: tc.bg, border: `1px solid ${tc.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
                    }}>
                      {tc.emoji}
                    </div>

                    {/* Title + desc */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '14px', fontWeight: '700', color: 'white',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '3px',
                      }}>
                        {contest.title}
                      </div>
                      <div style={{ fontSize: '12px', color: 'rgb(107,114,128)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {contest.description || 'No description'}
                      </div>
                    </div>

                    {/* Status badge */}
                    <span style={{
                      padding: '4px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: '800',
                      textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0,
                      color: sc.color, background: sc.bg,
                    }}>
                      {sc.label}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ) : (
        /* Initial / empty state — show trending + all contests */
        <div style={{ display: 'grid', gap: '20px' }}>
          {/* Trending Topics */}
          <div>
            <p style={{ fontSize: '12px', fontWeight: '700', color: 'rgb(107,114,128)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>
              🔥 Trending Topics
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {TRENDING_TOPICS.map(topic => (
                <button
                  key={topic.q}
                  onClick={() => setQuery(topic.q)}
                  style={{
                    padding: '8px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: '600',
                    background: 'var(--color-surface-700)', border: '1px solid var(--color-surface-500)',
                    color: 'rgb(156,163,175)', cursor: 'pointer', transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { (e.currentTarget).style.color = 'white'; (e.currentTarget).style.borderColor = 'var(--color-surface-400)'; }}
                  onMouseLeave={e => { (e.currentTarget).style.color = 'rgb(156,163,175)'; (e.currentTarget).style.borderColor = 'var(--color-surface-500)'; }}
                >
                  {topic.label}
                </button>
              ))}
            </div>
          </div>

          {/* All live contests */}
          {allContests.filter(c => c.status === 'active').length > 0 && (
            <div>
              <p style={{ fontSize: '12px', fontWeight: '700', color: 'rgb(107,114,128)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>
                ⚡ Live Now
              </p>
              <div style={{ display: 'grid', gap: '8px' }}>
                {allContests.filter(c => c.status === 'active').slice(0, 6).map(contest => {
                  const tc = TYPE_CONFIG[contest.type] ?? TYPE_CONFIG.standard;
                  return (
                    <Link key={contest.id} href={`/contest/${contest.id}`} style={{ textDecoration: 'none' }}>
                      <div
                        style={{
                          display: 'flex', alignItems: 'center', gap: '12px',
                          padding: '12px 16px', borderRadius: '14px',
                          background: 'var(--color-surface-800)', border: '1px solid var(--color-surface-600)',
                          cursor: 'pointer', transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-surface-500)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-surface-600)'; }}
                      >
                        <span style={{ fontSize: '18px' }}>{tc.emoji}</span>
                        <span style={{ flex: 1, fontSize: '14px', fontWeight: '600', color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {contest.title}
                        </span>
                        <span style={{ fontSize: '10px', color: 'var(--color-accent-green)', fontWeight: '800', textTransform: 'uppercase' }}>Live</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
