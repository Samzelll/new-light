"use client";

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useTrust } from '@/hooks/useTrust';
import { getMyProfile, updateProfile } from '@/services/profileService';
import { getMyVoteHistory } from '@/services/voteService';
import { getMySubscriptions, getContestById } from '@/services/contestService';
import { uploadAvatar, getPublicUrl } from '@/services/storageService';
import { formatDate } from '@/utils/formatters';
import { StreakCard } from '@/components/ui/StreakCard';
import { usePush } from '@/hooks/usePush';

const LEVEL_COLORS: Record<string, string> = {
  new:     'rgb(107,114,128)',
  member:  'var(--color-brand-400)',
  trusted: 'var(--color-accent-green)',
  senior:  'var(--color-accent-yellow)',
  expert:  'var(--color-accent-purple)',
};

export default function ProfilePage() {
  const { isAuthenticated, isInitialized, logout } = useAuth();
  const { trustData, levelInfo, loading: trustLoading } = useTrust();

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [showParticipations, setShowParticipations] = useState(true);
  const [notice, setNotice] = useState<{ msg: string; ok: boolean } | null>(null);
  const [updating, setUpdating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [voteHistory, setVoteHistory] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'settings' | 'streak' | 'history' | 'following'>('settings');
  const { permission, isSubscribed, requesting, requestPermission, unsubscribe } = usePush();

  const loadData = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const { data: prof } = await getMyProfile();
      if (prof) {
        setProfile(prof);
        setDisplayName(prof.display_name || '');
        setBio(prof.bio || '');
        setShowParticipations(prof.show_participations ?? true);
      }
      const { data: vHist } = await getMyVoteHistory();
      if (vHist) setVoteHistory(vHist);
      const { data: subIds } = await getMySubscriptions();
      if (subIds && subIds.length > 0) {
        const details = await Promise.all(subIds.map(async (id: string) => {
          const { data } = await getContestById(id);
          return data;
        }));
        setSubscriptions(details.filter(Boolean));
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isInitialized) {
      if (isAuthenticated) loadData();
      else setLoading(false);
    }
  }, [isInitialized, isAuthenticated, loadData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    setNotice(null);
    try {
      const { error } = await updateProfile({ display_name: displayName, bio, show_participations: showParticipations });
      if (error) setNotice({ msg: error, ok: false });
      else {
        setNotice({ msg: 'Profile updated!', ok: true });
        setProfile((p: any) => ({ ...p, display_name: displayName, bio, show_participations: showParticipations }));
      }
    } catch (err: any) {
      setNotice({ msg: err.message || 'An error occurred.', ok: false });
    } finally { setUpdating(false); }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setUploading(true);
    setNotice(null);
    try {
      const { path, error: uploadErr } = await uploadAvatar(profile.id, file);
      if (uploadErr || !path) { setNotice({ msg: uploadErr || 'Upload failed.', ok: false }); return; }
      const { error: updateErr } = await updateProfile({ avatar_url: path });
      if (updateErr) setNotice({ msg: updateErr, ok: false });
      else { setProfile((p: any) => ({ ...p, avatar_url: path })); setNotice({ msg: 'Avatar updated!', ok: true }); }
    } catch (err: any) {
      setNotice({ msg: err.message || 'Upload error.', ok: false });
    } finally { setUploading(false); }
  };

  /* ── Loading state ── */
  if (loading || (isInitialized && isAuthenticated && trustLoading)) {
    return (
      <main className="page-container">
        <div className="skeleton-shimmer" style={{ height: '160px', marginBottom: '20px' }} />
        <div className="skeleton-shimmer" style={{ height: '320px' }} />
      </main>
    );
  }

  /* ── Not authenticated ── */
  if (!isAuthenticated) {
    return (
      <main className="page-container" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh',
      }}>
        <div style={{
          textAlign: 'center', padding: '48px 36px', borderRadius: '24px',
          background: 'var(--color-surface-800)', border: '1px solid var(--color-surface-600)',
          maxWidth: '360px', width: '100%',
        }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '20px', margin: '0 auto 20px',
            background: 'rgba(56,97,255,0.1)', border: '1px solid rgba(56,97,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px',
          }}>
            🔐
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'white', marginBottom: '10px' }}>
            Sign in required
          </h2>
          <p style={{ fontSize: '14px', color: 'rgb(107,114,128)', marginBottom: '24px', lineHeight: '1.5' }}>
            Sign in to view your profile, reputation, and voting history.
          </p>
          <Link href="/auth" style={{
            display: 'block', padding: '13px 24px', borderRadius: '14px', textDecoration: 'none',
            background: 'linear-gradient(135deg, var(--color-brand-600), var(--color-brand-400))',
            color: 'white', fontWeight: '700', fontSize: '15px', textAlign: 'center',
            boxShadow: '0 6px 20px rgba(56,97,255,0.35)',
          }}>
            Sign In
          </Link>
        </div>
      </main>
    );
  }

  const avatarUrl = profile?.avatar_url
    ? getPublicUrl('avatars', profile.avatar_url, { width: 120, quality: 80 })
    : null;

  const levelColor = LEVEL_COLORS[levelInfo?.key || 'new'] || 'rgb(107,114,128)';
  const trustScore = trustData?.score ?? 0;
  const trustMax = 1000;
  const trustPct = Math.min((trustScore / trustMax) * 100, 100);

  return (
    <main className="page-container animate-fade-in" style={{ display: 'grid', gap: '20px' }}>

      {/* ── Profile Hero ── */}
      <div style={{
        background: 'var(--color-surface-800)', border: '1px solid var(--color-surface-600)',
        borderRadius: '24px', padding: '28px', position: 'relative', overflow: 'hidden',
      }}>
        {/* BG decoration */}
        <div style={{
          position: 'absolute', top: '-40px', right: '-40px',
          width: '180px', height: '180px', borderRadius: '50%',
          background: `radial-gradient(circle, ${levelColor}22 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap', position: 'relative' }}>
          {/* Avatar */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%',
              border: `3px solid ${levelColor}44`,
              overflow: 'hidden', background: 'var(--color-surface-700)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{
                  fontSize: '28px', fontWeight: '800', color: 'white',
                  background: `linear-gradient(135deg, var(--color-brand-600), var(--color-accent-purple))`,
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                }}>
                  {(displayName || 'U')[0].toUpperCase()}
                </span>
              )}
            </div>
            <label style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', opacity: 0, transition: 'opacity 0.15s',
              fontSize: '11px', fontWeight: '700', color: 'white',
            }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
            >
              {uploading ? '...' : '📷'}
              <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} disabled={uploading} />
            </label>
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'white', margin: '0 0 6px', lineHeight: '1.2' }}>
              {displayName || 'Anonymous Member'}
            </h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
              {levelInfo && (
                <span style={{
                  padding: '3px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '700',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  color: levelColor, background: `${levelColor}18`, border: `1px solid ${levelColor}33`,
                }}>
                  {levelInfo.label}
                </span>
              )}
              {profile?.role && (
                <span style={{
                  padding: '3px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '700',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  color: 'rgb(107,114,128)', background: 'var(--color-surface-700)', border: '1px solid var(--color-surface-500)',
                }}>
                  {profile.role}
                </span>
              )}
              {/* Streak compact badge */}
              <StreakCard voteDates={voteHistory.map((v: any) => v.created_at)} compact />
            </div>

            {/* Trust score bar */}
            {trustData && (
              <div style={{ marginTop: '12px', maxWidth: '260px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span style={{ fontSize: '11px', color: 'rgb(107,114,128)', fontWeight: '600' }}>Trust Score</span>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: levelColor }}>{trustScore} pts</span>
                </div>
                <div style={{ height: '5px', background: 'var(--color-surface-600)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${trustPct}%`,
                    background: `linear-gradient(90deg, ${levelColor}, ${levelColor}aa)`,
                    borderRadius: '3px', transition: 'width 0.8s ease',
                  }} />
                </div>
              </div>
            )}
          </div>

          <button
            onClick={logout}
            style={{
              padding: '8px 16px', borderRadius: '12px', border: '1px solid var(--color-surface-500)',
              background: 'var(--color-surface-700)', color: 'rgb(156,163,175)',
              fontSize: '12px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.15s',
              alignSelf: 'flex-start',
            }}
            onMouseEnter={e => { (e.currentTarget).style.color = 'white'; (e.currentTarget).style.borderColor = 'var(--color-surface-400)'; }}
            onMouseLeave={e => { (e.currentTarget).style.color = 'rgb(156,163,175)'; (e.currentTarget).style.borderColor = 'var(--color-surface-500)'; }}
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-surface-600)', gap: '2px', overflowX: 'auto' }}>
        {[
          { key: 'settings', label: '⚙️ Settings' },
          { key: 'streak',   label: '🔥 Streak' },
          { key: 'history',  label: `🗳️ Votes${voteHistory.length > 0 ? ` (${voteHistory.length})` : ''}` },
          { key: 'following', label: `⭐ Following${subscriptions.length > 0 ? ` (${subscriptions.length})` : ''}` },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              padding: '10px 16px', fontSize: '13px', fontWeight: activeTab === tab.key ? '700' : '500',
              color: activeTab === tab.key ? 'white' : 'rgb(107,114,128)',
              background: 'none', border: 'none',
              borderBottom: activeTab === tab.key ? '2px solid var(--color-brand-500)' : '2px solid transparent',
              cursor: 'pointer', transition: 'all 0.15s', paddingBottom: '12px',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Settings tab ── */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSave} style={{
          background: 'var(--color-surface-800)', border: '1px solid var(--color-surface-600)',
          borderRadius: '20px', padding: '24px', display: 'grid', gap: '18px',
        }}>
          {notice && (
            <div style={{
              padding: '12px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: '600',
              textAlign: 'center',
              background: notice.ok ? 'rgba(0,229,160,0.08)' : 'rgba(255,87,87,0.08)',
              border: `1px solid ${notice.ok ? 'rgba(0,229,160,0.25)' : 'rgba(255,87,87,0.25)'}`,
              color: notice.ok ? 'var(--color-accent-green)' : 'var(--color-accent-red)',
            }}>
              {notice.msg}
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'rgb(156,163,175)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
              Display Name
            </label>
            <input
              type="text"
              className="input"
              placeholder="Your display name"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'rgb(156,163,175)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
              Bio
            </label>
            <textarea
              className="input"
              placeholder="Tell us about yourself..."
              value={bio}
              onChange={e => setBio(e.target.value)}
              rows={3}
              style={{ resize: 'vertical' }}
            />
          </div>

          <label style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px', borderRadius: '12px',
            background: 'var(--color-surface-700)', border: '1px solid var(--color-surface-500)',
            cursor: 'pointer',
          }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: 'white' }}>Show Participations</div>
              <div style={{ fontSize: '12px', color: 'rgb(107,114,128)', marginTop: '2px' }}>
                Display your contest entries on your public profile
              </div>
            </div>
            <input
              type="checkbox"
              checked={showParticipations}
              onChange={e => setShowParticipations(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: 'var(--color-brand-500)' }}
            />
          </label>

          <button
            type="submit"
            disabled={updating}
            style={{
              width: '100%', padding: '13px 20px', borderRadius: '14px', border: 'none',
              background: updating ? 'var(--color-surface-600)' : 'linear-gradient(135deg, var(--color-brand-600), var(--color-brand-400))',
              color: 'white', fontSize: '14px', fontWeight: '700', cursor: updating ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              boxShadow: updating ? 'none' : '0 4px 16px rgba(56,97,255,0.3)',
            }}
          >
            {updating ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      )}

      {/* ── Streak tab ── */}
      {activeTab === 'streak' && (
        <div style={{ display: 'grid', gap: '16px' }}>
          <StreakCard voteDates={voteHistory.map((v: any) => v.created_at)} />

          {/* Push notifications panel */}
          <div style={{
            background: 'var(--color-surface-800)', border: '1px solid var(--color-surface-600)',
            borderRadius: '20px', padding: '20px 22px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '18px' }}>🔔</span>
                  <span style={{ fontSize: '14px', fontWeight: '700', color: 'white' }}>Push Notifications</span>
                  {isSubscribed && (
                    <span style={{
                      fontSize: '9px', fontWeight: '800', letterSpacing: '0.1em',
                      color: 'var(--color-accent-green)', background: 'rgba(0,229,160,0.12)',
                      border: '1px solid rgba(0,229,160,0.25)', padding: '2px 7px', borderRadius: '4px',
                      textTransform: 'uppercase',
                    }}>ON</span>
                  )}
                </div>
                <p style={{ fontSize: '12px', color: 'rgb(107,114,128)', margin: 0, lineHeight: '1.4' }}>
                  {permission === 'denied'
                    ? 'Notifications blocked in browser settings.'
                    : 'Get alerted when a battle you voted in is about to end, or when new contests go live.'}
                </p>
              </div>

              {permission !== 'denied' && (
                <button
                  onClick={isSubscribed ? unsubscribe : requestPermission}
                  disabled={requesting}
                  style={{
                    padding: '10px 20px', borderRadius: '12px',
                    background: isSubscribed ? 'rgba(255,87,87,0.1)' : 'rgba(56,97,255,0.12)',
                    color: isSubscribed ? 'var(--color-accent-red)' : 'var(--color-brand-400)',
                    fontSize: '13px', fontWeight: '700', cursor: requesting ? 'wait' : 'pointer',
                    border: `1px solid ${isSubscribed ? 'rgba(255,87,87,0.25)' : 'rgba(56,97,255,0.25)'}`,
                    transition: 'all 0.2s', whiteSpace: 'nowrap', flexShrink: 0,
                  }}
                >
                  {requesting ? '...' : isSubscribed ? '🔕 Turn Off' : '🔔 Enable'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Voting History tab ── */}
      {activeTab === 'history' && (
        <div style={{ display: 'grid', gap: '10px' }}>
          {voteHistory.length === 0 ? (
            <div style={{
              padding: '48px 40px', textAlign: 'center', borderRadius: '20px',
              background: 'var(--color-surface-800)', border: '1px solid var(--color-surface-600)',
            }}>
              <div style={{ fontSize: '36px', marginBottom: '12px' }}>🗳️</div>
              <p style={{ color: 'rgb(107,114,128)', fontSize: '14px' }}>
                No votes cast yet. Participate in contests to build your history.
              </p>
            </div>
          ) : voteHistory.map(vote => (
            <div key={vote.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '14px 18px', borderRadius: '14px',
              background: 'var(--color-surface-800)', border: '1px solid var(--color-surface-600)',
            }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: 'white', marginBottom: '3px' }}>
                  Vote cast
                </div>
                <div style={{ fontSize: '12px', color: 'rgb(107,114,128)' }}>
                  {formatDate(vote.created_at)}
                </div>
              </div>
              <span style={{
                padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '700',
                color: 'var(--color-brand-400)', background: 'rgba(56,97,255,0.1)',
                border: '1px solid rgba(56,97,255,0.2)',
              }}>
                ×{vote.trust_weight} weight
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Following tab ── */}
      {activeTab === 'following' && (
        <div style={{ display: 'grid', gap: '10px' }}>
          {subscriptions.length === 0 ? (
            <div style={{
              padding: '48px 40px', textAlign: 'center', borderRadius: '20px',
              background: 'var(--color-surface-800)', border: '1px solid var(--color-surface-600)',
            }}>
              <div style={{ fontSize: '36px', marginBottom: '12px' }}>⭐</div>
              <p style={{ color: 'rgb(107,114,128)', fontSize: '14px' }}>
                You're not following any contests. Tap Follow on a contest to track it.
              </p>
              <Link href="/" style={{
                display: 'inline-block', marginTop: '16px', padding: '10px 20px',
                borderRadius: '12px', textDecoration: 'none',
                background: 'var(--color-surface-700)', border: '1px solid var(--color-surface-500)',
                color: 'white', fontSize: '13px', fontWeight: '600',
              }}>
                Browse Contests
              </Link>
            </div>
          ) : subscriptions.map(sub => (
            <Link key={sub.id} href={`/contest/${sub.id}`} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '14px 18px', borderRadius: '14px', cursor: 'pointer',
                background: 'var(--color-surface-800)', border: '1px solid var(--color-surface-600)',
                transition: 'all 0.15s',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-surface-500)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--color-surface-600)'; }}
              >
                <div style={{ fontWeight: '700', color: 'white', fontSize: '14px' }}>
                  {sub.title}
                </div>
                <span style={{
                  fontSize: '10px', fontWeight: '700', textTransform: 'uppercase',
                  letterSpacing: '0.06em', color: 'rgb(107,114,128)',
                }}>
                  {sub.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
