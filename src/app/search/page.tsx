"use client";

export const dynamic = 'force-dynamic';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { Search, X, Star, ArrowLeft, User, PlusCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const TYPE_CONFIG: Record<string, { color: string; bg: string; border: string }> = {
  battle:   { color: '#E85102', bg: 'rgba(232, 81, 2, 0.12)',  border: 'rgba(232, 81, 2, 0.35)' },
  race:     { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.3)' },
  eternal:  { color: '#a855f7', bg: 'rgba(168, 85, 247, 0.12)', border: 'rgba(168, 85, 247, 0.3)' },
  standard: { color: '#F9F9F9', bg: '#333333',                 border: '#484848' },
};

export default function SearchPage() {
  const { isAuthenticated, profile } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const allowedRoles = ['admin', 'developer', 'creator'];
  const canCreate = profile && allowedRoles.includes(profile.role);

  const handleSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setSearched(false); return; }
    setLoading(true);
    setSearched(true);
    try {
      const { getContests } = await import('@/services/contestService');
      const { data } = await getContests({ includePausedOrBlocked: true });
      // Client-side filter by title
      const filtered = (data || []).filter((c: any) =>
        c.title?.toLowerCase().includes(q.toLowerCase()) ||
        c.description?.toLowerCase().includes(q.toLowerCase())
      );
      setResults(filtered);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    handleSearch(val);
  };

  return (
    <main className="page-container animate-fade-in bg-[#000000] text-[#F9F9F9]">
      {/* ── Top Mobile Header with Navigation ── */}
      <header className="flex items-center justify-between py-3 mb-4 border-b border-[#333333]">
        <div className="flex items-center gap-2.5">
          <Link
            href="/"
            aria-label="Back to Home"
            className="w-9 h-9 rounded-xl bg-[#333333] hover:bg-[#484848] text-[#F9F9F9] flex items-center justify-center transition-colors border border-[#484848]"
          >
            <ArrowLeft size={18} strokeWidth={2.5} />
          </Link>
          <div>
            <h1 className="text-base font-extrabold tracking-tight text-[#F9F9F9] leading-none">
              Search
            </h1>
            <span className="text-[10px] font-semibold text-[#646464] tracking-wider uppercase">
              Contest Catalog
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canCreate && (
            <Link
              href="/create"
              aria-label="Create contest"
              className="w-9 h-9 rounded-xl bg-[#E85102] hover:bg-[#c94300] text-[#F9F9F9] flex items-center justify-center transition-colors shadow-sm"
              title="Create contest"
            >
              <PlusCircle size={18} strokeWidth={2.5} />
            </Link>
          )}

          <Link
            href={mounted && isAuthenticated ? "/profile" : "/auth"}
            aria-label="Profile"
            className="w-9 h-9 rounded-xl bg-[#333333] hover:bg-[#484848] text-[#F9F9F9] flex items-center justify-center transition-colors border border-[#484848]"
            suppressHydrationWarning
          >
            {mounted && isAuthenticated && profile?.username ? (
              <span className="text-xs font-bold text-[#E85102]">
                {profile.username[0].toUpperCase()}
              </span>
            ) : (
              <User size={18} strokeWidth={2} />
            )}
          </Link>
        </div>
      </header>

      {/* ── Search Input ── */}
      <div style={{ marginBottom: '24px', position: 'relative' }}>
        <div style={{
          position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)',
          color: '#646464', pointerEvents: 'none', zIndex: 1,
        }}>
          <Search size={18} strokeWidth={2} />
        </div>
        <input
          id="search-input"
          className="input"
          type="text"
          placeholder="Search by title or description..."
          value={query}
          onChange={handleChange}
          style={{
            paddingLeft: '46px', paddingRight: '16px', fontSize: '15px', height: '52px',
            backgroundColor: '#141414', borderColor: '#333333', color: '#F9F9F9',
          }}
          autoFocus
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setResults([]); setSearched(false); }}
            style={{
              position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
              background: '#333333', border: 'none', borderRadius: '6px',
              width: '24px', height: '24px', cursor: 'pointer', color: '#F9F9F9',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <X size={14} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div style={{ display: 'grid', gap: '12px' }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ height: '96px', backgroundColor: '#141414', border: '1px solid #333333', borderRadius: '16px' }} />
          ))}
        </div>
      ) : searched && results.length === 0 ? (
        <div style={{
          padding: '56px 40px', textAlign: 'center', borderRadius: '24px',
          background: '#141414', border: '1px solid #333333',
        }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔍</div>
          <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#F9F9F9', marginBottom: '8px' }}>
            No results found for &quot;{query}&quot;
          </h3>
          <p style={{ fontSize: '13px', color: '#646464' }}>
            Try different keywords or check spelling
          </p>
        </div>
      ) : results.length > 0 ? (
        <div>
          <p style={{ fontSize: '12px', color: '#646464', marginBottom: '14px', fontWeight: '600' }}>
            Results found: {results.length}
          </p>
          <div style={{ display: 'grid', gap: '10px' }}>
            {results.map((contest) => {
              const typeConf = TYPE_CONFIG[contest.type] ?? TYPE_CONFIG.standard;
              return (
                <Link
                  key={contest.id}
                  href={`/contest/${contest.id}`}
                  style={{ textDecoration: 'none' }}
                >
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '16px',
                    padding: '16px 20px', borderRadius: '16px',
                    background: '#141414',
                    border: '1px solid #333333',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = '#484848';
                      (e.currentTarget as HTMLDivElement).style.background = '#1c1c1c';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = '#333333';
                      (e.currentTarget as HTMLDivElement).style.background = '#141414';
                    }}
                  >
                    {/* Type icon */}
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0,
                      background: typeConf.bg, border: `1px solid ${typeConf.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Star size={18} strokeWidth={2} color={typeConf.color} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                        <span style={{
                          fontSize: '10px', fontWeight: '800', letterSpacing: '0.08em',
                          textTransform: 'uppercase', color: typeConf.color,
                        }}>
                          {contest.type}
                        </span>
                        {contest.categories && (
                          <span style={{ fontSize: '11px', color: '#646464' }}>
                            · {contest.categories.name}
                          </span>
                        )}
                      </div>
                      <h4 style={{
                        fontSize: '15px', fontWeight: '700', color: '#F9F9F9',
                        margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {contest.title}
                      </h4>
                      {contest.description && (
                        <p style={{
                          fontSize: '12px', color: '#646464', margin: '3px 0 0',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {contest.description}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ) : (
        <div style={{
          padding: '64px 40px', textAlign: 'center', borderRadius: '24px',
          background: '#141414', border: '1px solid #333333',
        }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>⚡</div>
          <h3 style={{ fontSize: '17px', fontWeight: '700', color: '#F9F9F9', marginBottom: '6px' }}>
            Search Contests & Battles
          </h3>
          <p style={{ fontSize: '13px', color: '#646464', margin: 0 }}>
            Enter keywords to search across all active and completed events
          </p>
        </div>
      )}
    </main>
  );
}
