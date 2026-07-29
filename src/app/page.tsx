"use client";

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { User } from 'lucide-react';
import { useContests } from '@/hooks/useContests';
import { useAuth } from '@/hooks/useAuth';
import { getCategories } from '@/services/contestService';
import { getMySubscriptions } from '@/services/contestService';
import { getCountdown } from '@/utils/formatters';
import { FeedSkeleton } from '@/components/ui/Skeletons';
import { useLiveVoteCounts } from '@/hooks/useLiveVoteCounts';
import { useGuestVoting } from '@/hooks/useGuestVoting';

interface Category {
  id: string;
  name: string;
  slug: string;
  icon_url: string | null;
}

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  battle:   { label: 'BATTLE',   color: 'var(--color-accent-red)',    bg: 'rgba(255,87,87,0.1)',  border: 'rgba(255,87,87,0.2)' },
  race:     { label: 'RACE',     color: 'var(--color-accent-yellow)', bg: 'rgba(255,200,87,0.1)', border: 'rgba(255,200,87,0.2)' },
  eternal:  { label: 'ETERNAL',  color: 'var(--color-accent-purple)', bg: 'rgba(168,85,247,0.1)', border: 'rgba(168,85,247,0.2)' },
  standard: { label: 'STANDARD', color: 'var(--color-brand-400)',     bg: 'rgba(56,97,255,0.1)',  border: 'rgba(56,97,255,0.2)' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  registration: { label: 'Registration', color: 'var(--color-accent-green)' },
  active:       { label: 'Live Now',     color: 'var(--color-accent-red)' },
  paused:       { label: 'Paused',       color: '#eab308' },
  blocked:      { label: 'Caution',      color: '#ef4444' },
  completed:    { label: 'Ended',        color: 'rgb(107,114,128)' },
};

export default function HomePage() {
  const { isAuthenticated } = useAuth();
  const { handleSubscribe, handleUnsubscribe } = useContests();
  const { getState: getGuestState } = useGuestVoting();
  const guestVotes = getGuestState();
  const [contests, setContests] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subscriptions, setSubscriptions] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'all' | 'subscriptions' | 'active' | 'upcoming' | 'completed'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [isUsingCache, setIsUsingCache] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOffline(!navigator.onLine);
      const handleOnline = () => setIsOffline(false);
      const handleOffline = () => setIsOffline(true);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  useEffect(() => {
    async function loadCategories() {
      try {
        const { data } = await getCategories();
        if (data) {
          setCategories(data);
          try { localStorage.setItem('cached_categories', JSON.stringify(data)); } catch {}
        }
      } catch {
        try {
          const cached = localStorage.getItem('cached_categories');
          if (cached) setCategories(JSON.parse(cached));
        } catch {}
      }
    }
    loadCategories();
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsUsingCache(false);

    const cacheKey = `cached_contests_${activeTab}_${activeCategory}`;

    const tryLoadFromCache = () => {
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            setContests(parsed);
            setIsUsingCache(true);
            setError(null);
            return true;
          }
        }
      } catch {}
      return false;
    };

    if (typeof window !== 'undefined' && !navigator.onLine) {
      const loaded = tryLoadFromCache();
      if (!loaded) setError('You are offline and no cached contests were found.');
      setLoading(false);
      return;
    }

    try {
      let subIds: string[] = [];
      if (isAuthenticated) {
        const { data: subsData } = await getMySubscriptions();
        if (subsData) { subIds = subsData; setSubscriptions(subsData); }
      }
      const { getContests } = await import('@/services/contestService');
      const filters: any = {};
      if (activeCategory !== 'all') filters.category_id = activeCategory;
      if (activeTab === 'active') filters.status = 'active';
      else if (activeTab === 'upcoming') filters.status = 'registration';
      else if (activeTab === 'completed') filters.status = 'completed';
      else if (activeTab === 'subscriptions') filters.includePausedOrBlocked = true;

      const { data: contestsData, error: fetchErr } = await getContests(filters);
      if (fetchErr) {
        const loaded = tryLoadFromCache();
        if (!loaded) setError(fetchErr);
      } else if (contestsData) {
        const finalContests = activeTab === 'subscriptions'
          ? contestsData.filter(c => subIds.includes(c.id))
          : contestsData;
        setContests(finalContests);
        try { localStorage.setItem(cacheKey, JSON.stringify(finalContests)); } catch {}
      }
    } catch (err: any) {
      const loaded = tryLoadFromCache();
      if (!loaded) setError(err.message || 'An error occurred loading feed data.');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, activeCategory, activeTab]);

  useEffect(() => { loadData(); }, [loadData]);

  const toggleSubscribe = async (e: React.MouseEvent, contestId: string) => {
    e.preventDefault(); e.stopPropagation();
    if (!isAuthenticated) return;
    const isSubscribed = subscriptions.includes(contestId);
    if (isSubscribed) {
      const { error: err } = await handleUnsubscribe(contestId);
      if (!err) {
        setSubscriptions(prev => prev.filter(id => id !== contestId));
        if (activeTab === 'subscriptions') setContests(prev => prev.filter(c => c.id !== contestId));
      }
    } else {
      const { error: err } = await handleSubscribe(contestId);
      if (!err) setSubscriptions(prev => [...prev, contestId]);
    }
  };

  const tabs = [
    { key: 'all', label: 'All Contests' },
    ...(isAuthenticated ? [{ key: 'subscriptions', label: 'Following' }] : []),
    { key: 'active', label: '🔴 Live' },
    { key: 'upcoming', label: 'Open' },
    { key: 'completed', label: 'Ended' },
  ] as const;

  return (
    <main className="page-container animate-fade-in">
      {/* ── Offline Banner ── */}
      {(isOffline || isUsingCache) && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
          padding: '12px 18px', borderRadius: '14px',
          background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.15), rgba(245, 158, 11, 0.08))',
          border: '1px solid rgba(234, 179, 8, 0.3)',
          marginBottom: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>📡</span>
            <div>
              <p style={{ fontSize: '13px', fontWeight: '700', color: '#fef08a', margin: 0 }}>
                {isOffline ? 'You are offline (Offline Mode)' : 'Loaded from local cache'}
              </p>
              <p style={{ fontSize: '11px', color: 'rgba(254, 240, 138, 0.8)', margin: '2px 0 0 0' }}>
                Displaying offline saved contest feed. Reconnect to fetch latest live updates.
              </p>
            </div>
          </div>
          {!isOffline && (
            <button
              onClick={() => loadData()}
              style={{
                fontSize: '11px', fontWeight: '700', padding: '6px 12px', borderRadius: '8px',
                background: 'rgba(234, 179, 8, 0.25)', color: '#fef08a', border: '1px solid rgba(234, 179, 8, 0.4)',
                cursor: 'pointer', flexShrink: 0
              }}
            >
              🔄 Refresh
            </button>
          )}
        </div>
      )}

      {/* ── Sign In CTA for guests ── */}
      {!isAuthenticated && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
          padding: '14px 18px', borderRadius: '16px',
          background: 'linear-gradient(135deg, rgba(56,97,255,0.12), rgba(168,85,247,0.08))',
          border: '1px solid rgba(56,97,255,0.2)',
          marginBottom: '8px',
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
              background: 'rgba(56,97,255,0.15)', border: '1px solid rgba(56,97,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <User size={18} strokeWidth={2.5} className="text-brand-400" />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: 'white' }}>
                {guestVotes.used > 0
                  ? `${guestVotes.remaining} guest vote${guestVotes.remaining !== 1 ? 's' : ''} remaining`
                  : 'Join Opinion Net'}
              </div>
              <div style={{ fontSize: '12px', color: 'rgb(107,114,128)' }}>
                {guestVotes.used > 0
                  ? 'Sign up to vote without limits and build your reputation'
                  : 'Sign in to vote, follow contests and build your reputation'}
              </div>
            </div>
          </div>
          <Link href="/auth" style={{
            padding: '8px 18px', borderRadius: '12px', textDecoration: 'none', flexShrink: 0,
            background: 'linear-gradient(135deg, var(--color-brand-600), var(--color-brand-400))',
            color: 'white', fontSize: '13px', fontWeight: '700',
            boxShadow: '0 4px 12px rgba(56,97,255,0.3)',
          }}>
            {guestVotes.used > 0 ? 'Sign Up Free' : 'Sign In / Register'}
          </Link>
        </div>
      )}

      {/* ── Tabs ── */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--color-surface-600)', overflowX: 'auto' }} className="no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              style={{
                padding: '10px 16px', fontSize: '13px', fontWeight: activeTab === tab.key ? '700' : '500',
                color: activeTab === tab.key ? 'white' : 'rgb(107,114,128)',
                background: 'none', border: 'none',
                borderBottom: activeTab === tab.key ? '2px solid var(--color-brand-500)' : '2px solid transparent',
                cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s', paddingBottom: '12px',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Category chips */}
        {categories.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingTop: '14px', paddingBottom: '4px' }} className="no-scrollbar">
            {[{ id: 'all', name: 'All' }, ...categories].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                style={{
                  padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '600',
                  whiteSpace: 'nowrap', cursor: 'pointer', transition: 'all 0.15s',
                  background: activeCategory === cat.id ? 'var(--color-brand-600)' : 'var(--color-surface-700)',
                  color: activeCategory === cat.id ? 'white' : 'rgb(107,114,128)',
                  border: activeCategory === cat.id ? '1px solid var(--color-brand-500)' : '1px solid var(--color-surface-500)',
                }}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Contest grid ── */}
      {loading ? (
        <FeedSkeleton count={6} />
      ) : error ? (
        <div style={{
          padding: '40px', textAlign: 'center', borderRadius: '20px',
          background: 'rgba(255,87,87,0.05)', border: '1px solid rgba(255,87,87,0.2)',
        }}>
          <p style={{ color: 'var(--color-accent-red)', marginBottom: '16px', fontWeight: '500' }}>{error}</p>
          <button onClick={loadData} className="btn btn-secondary btn-sm">Try Again</button>
        </div>
      ) : contests.length === 0 ? (
        <div style={{
          padding: '64px 40px', textAlign: 'center', borderRadius: '24px',
          background: 'var(--color-surface-800)', border: '1px solid var(--color-surface-600)',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>✨</div>
          <h3 style={{ fontSize: '20px', fontWeight: '700', color: 'white', marginBottom: '8px' }}>
            No contests yet
          </h3>
          <p style={{ fontSize: '14px', color: 'rgb(107,114,128)' }}>
            Try a different tab or category filter.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          <LiveFeedCards contests={contests} subscriptions={subscriptions} toggleSubscribe={toggleSubscribe} isAuthenticated={isAuthenticated} />
        </div>
      )}
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LiveFeedCards — renders the feed grid with realtime vote counts + HOT badge
// ─────────────────────────────────────────────────────────────────────────────
interface LiveFeedCardsProps {
  contests: any[];
  subscriptions: string[];
  toggleSubscribe: (e: React.MouseEvent, id: string) => void;
  isAuthenticated: boolean;
}

function LiveFeedCards({ contests, subscriptions, toggleSubscribe, isAuthenticated }: LiveFeedCardsProps) {
  const contestIds = contests.map((c) => c.id);
  const liveVotes = useLiveVoteCounts(contestIds);

  return (
    <>
      {contests.map((contest) => {
        const isSubscribed = subscriptions.includes(contest.id);
        const countdown = getCountdown(
          contest.status === 'registration' ? contest.registration_end : contest.voting_end
        );
        const typeConf = TYPE_CONFIG[contest.type] ?? TYPE_CONFIG.standard;
        const statusConf = STATUS_CONFIG[contest.status] ?? { label: contest.status, color: 'rgb(107,114,128)' };
        const liveData = liveVotes[contest.id];
        const voteCount = liveData?.count ?? 0;
        const isHot = (liveData?.delta ?? 0) >= 3; // 3+ votes/min = hot

        return (
          <Link
            href={`/contest/${contest.id}`}
            key={contest.id}
            style={{ textDecoration: 'none', display: 'block' }}
          >
            <div
              style={{
                background: `linear-gradient(160deg, ${typeConf.bg}, var(--color-surface-800) 60%)`,
                border: isHot ? '1px solid rgba(255,87,87,0.35)' : `1px solid ${typeConf.border}`,
                borderRadius: '20px', padding: '22px',
                height: '100%', minHeight: '240px',
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                transition: 'all 0.25s cubic-bezier(0.34,1.56,0.64,1)',
                cursor: 'pointer', position: 'relative', overflow: 'hidden',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = isHot ? 'rgba(255,87,87,0.5)' : 'var(--color-surface-500)';
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = isHot
                  ? '0 12px 32px rgba(255,87,87,0.15), 0 4px 16px rgba(0,0,0,0.4)'
                  : '0 12px 32px rgba(0,0,0,0.4)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = isHot ? 'rgba(255,87,87,0.3)' : 'var(--color-surface-600)';
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
              }}
            >
              {/* Hot top accent line */}
              {isHot && (
                <div style={{
                  position: 'absolute', top: 0, right: 0, left: 0, height: '2px',
                  background: 'linear-gradient(90deg, transparent, var(--color-accent-red), transparent)',
                }} />
              )}

              {/* Top row */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                    {isHot && (
                      <span style={{
                        padding: '3px 8px', borderRadius: '6px', fontSize: '9px', fontWeight: '900',
                        letterSpacing: '0.1em', textTransform: 'uppercase', color: 'white',
                        background: 'var(--color-accent-red)',
                      }}>🔥 HOT</span>
                    )}
                    {contest.status === 'blocked' ? (
                      <span style={{ padding: '3px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', color: '#fff', background: 'rgba(239,68,68,0.9)' }}>⚠️ Caution</span>
                    ) : contest.status === 'paused' ? (
                      <span style={{ padding: '3px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', color: '#000', background: 'rgba(234,179,8,0.9)' }}>⏸️ Paused</span>
                    ) : null}
                    <span style={{ padding: '3px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', color: typeConf.color, background: typeConf.bg, border: `1px solid ${typeConf.border}` }}>
                      {typeConf.label}
                    </span>
                    {contest.categories && (
                      <span style={{ padding: '3px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: '600', color: 'rgb(107,114,128)', background: 'var(--color-surface-700)', border: '1px solid var(--color-surface-500)' }}>
                        {contest.categories.name}
                      </span>
                    )}
                  </div>
                  {isAuthenticated && (
                    <button
                      onClick={(e) => toggleSubscribe(e, contest.id)}
                      style={{
                        padding: '5px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: '700',
                        cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0,
                        background: isSubscribed ? 'rgba(56,97,255,0.12)' : 'var(--color-surface-700)',
                        color: isSubscribed ? 'var(--color-brand-300)' : 'rgb(156,163,175)',
                        border: isSubscribed ? '1px solid rgba(56,97,255,0.3)' : '1px solid var(--color-surface-500)',
                      }}
                    >
                      {isSubscribed ? '★ Following' : '☆ Follow'}
                    </button>
                  )}
                </div>

                <h3 style={{ fontSize: '17px', fontWeight: '700', color: 'white', lineHeight: '1.35', margin: '0 0 8px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {contest.title}
                </h3>
                <p style={{ fontSize: '13px', color: 'rgb(107,114,128)', lineHeight: '1.5', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {contest.description || 'No description provided.'}
                </p>
              </div>

              {/* Bottom row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', marginTop: '16px', borderTop: `1px solid ${typeConf.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  {contest.status === 'active' && (
                    <span style={{
                      width: '8px', height: '8px', borderRadius: '50%',
                      background: 'var(--color-accent-red)', display: 'inline-block',
                      animation: 'liveRing 1.5s infinite',
                    }} />
                  )}
                  <span style={{ fontSize: '12px', fontWeight: '600', color: 'white' }}>{countdown}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {voteCount > 0 && (
                    <span style={{ fontSize: '11px', fontWeight: '700', color: 'rgb(107,114,128)' }}>
                      🗳️ {voteCount.toLocaleString()}
                    </span>
                  )}
                  <span style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.07em', color: statusConf.color }}>
                    {statusConf.label}
                  </span>
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </>
  );
}
