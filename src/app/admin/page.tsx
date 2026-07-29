"use client";

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/Toast';
import { isAdmin as checkIsAdmin } from '@/constants/permissions';
import { getContests, updateContestStatus } from '@/services/contestService';
import { getParticipants, updateParticipantStatus } from '@/services/participantService';
import { saveStageGroupsAndMembers } from '@/services/groupService';
import { distributeIntoGroups } from '@/utils/groupAlgorithm';
import { setUserRole } from '@/services/profileService';
import { supabase } from '@/services/supabase';

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  draft:        { color: 'rgb(107,114,128)',          bg: 'rgba(107,114,128,0.12)' },
  registration: { color: 'var(--color-accent-yellow)', bg: 'rgba(255,200,87,0.1)' },
  active:       { color: 'var(--color-accent-green)',  bg: 'rgba(0,229,160,0.1)' },
  completed:    { color: 'var(--color-brand-400)',     bg: 'rgba(56,97,255,0.1)' },
  paused:       { color: 'var(--color-accent-red)',    bg: 'rgba(255,87,87,0.1)' },
};

const ROLE_COLORS: Record<string, string> = {
  developer: '#a855f7',
  admin:     '#ff5757',
  creator:   '#ffc857',
  moderator: '#00e5a0',
  user:      'rgb(107,114,128)',
};

export default function AdminPage() {
  const { profile, isInitialized } = useAuth();
  const { success: toastSuccess, error: toastError, info: toastInfo } = useToast();
  const [activeTab, setActiveTab] = useState<'overview' | 'contests' | 'participants' | 'flags' | 'users'>('overview');

  const [contests, setContests] = useState<any[]>([]);
  const [pendingApplications, setPendingApplications] = useState<any[]>([]);
  const [fraudFlags, setFraudFlags] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const isAdmin = useMemo(() => profile && checkIsAdmin(profile.role), [profile]);

  const loadAdminData = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const [cRes, pRes, fRes, uRes, vRes] = await Promise.all([
        getContests(),
        supabase.from('participants').select('*, profiles(username, display_name), contests(title)').eq('status', 'pending'),
        supabase.from('fraud_flags').select('*, participants(id, submission_data, profiles(username))').eq('reviewed', false),
        supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(150),
        supabase.from('votes').select('id', { count: 'exact', head: true }),
      ]);
      if (cRes.data)  setContests(cRes.data);
      if (pRes.data)  setPendingApplications(pRes.data);
      if (fRes.data)  setFraudFlags(fRes.data);
      if (uRes.data)  setUsersList(uRes.data);
      if (vRes.count !== null) setTotalVotes(vRes.count);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isInitialized && isAdmin) loadAdminData();
    else if (isInitialized && !isAdmin) setLoading(false);
  }, [isInitialized, isAdmin, loadAdminData]);

  const handleUpdateContestStatus = async (contestId: string, status: any) => {
    setActionLoading(true);
    const { error } = await updateContestStatus(contestId, status);
    if (error) toastError(error);
    else { toastSuccess(`Status updated to ${status}`, '✅'); loadAdminData(); }
    setActionLoading(false);
  };

  const handleReviewApplication = async (participantId: string, status: 'approved' | 'rejected') => {
    setActionLoading(true);
    const { error } = await updateParticipantStatus(participantId, status);
    if (error) toastError(error);
    else { toastSuccess(`Application ${status}`, status === 'approved' ? '✅' : '❌'); loadAdminData(); }
    setActionLoading(false);
  };

  const handleFormGroups = async (contestId: string) => {
    setActionLoading(true);
    try {
      const { data: stage } = await supabase.from('contest_stages').select('*').eq('contest_id', contestId).eq('status', 'active').single();
      if (!stage) { toastError('No active stage found. Create and activate a stage first.'); setActionLoading(false); return; }
      const { data: parts } = await getParticipants(contestId, 'approved');
      if (!parts || parts.length < 2) { toastError('Need at least 2 approved participants to form groups.'); setActionLoading(false); return; }
      const groupsList = distributeIntoGroups(parts.map(p => p.id), 6);
      const { error } = await saveStageGroupsAndMembers(contestId, stage.id, groupsList);
      if (error) toastError(error);
      else toastSuccess(`Formed ${groupsList.length} groups successfully!`, '🎯');
    } catch (err: any) {
      toastError(err.message || 'Error forming groups');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolveFlag = async (flagId: string, action: 'dismissed' | 'disqualified', participantId: string) => {
    setActionLoading(true);
    try {
      const { error: flagErr } = await supabase.from('fraud_flags').update({ reviewed: true, admin_action: action }).eq('id', flagId);
      if (flagErr) throw flagErr;
      if (action === 'disqualified') {
        const { error: partErr } = await updateParticipantStatus(participantId, 'eliminated', 'Disqualified due to fraudulent activity.');
        if (partErr) throw partErr;
      }
      toastSuccess(`Flag resolved: ${action}`, action === 'dismissed' ? '✓' : '🚫');
      loadAdminData();
    } catch (err: any) {
      toastError(err.message || 'Error resolving flag');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateRole = async (userId: string, role: any) => {
    setActionLoading(true);
    const { error } = await setUserRole(userId, role);
    if (error) toastError(error);
    else { toastSuccess(`Role updated to ${role}`, '🔑'); loadAdminData(); }
    setActionLoading(false);
  };

  // ── Derived stats ─────────────────────────────────────────────────────────
  const activeContests   = contests.filter(c => c.status === 'active').length;
  const totalContests    = contests.length;
  const totalUsers       = usersList.length;
  const highFlags        = fraudFlags.filter(f => f.severity === 'high').length;

  const TABS = [
    { key: 'overview',      label: '📊 Overview' },
    { key: 'contests',      label: `🏆 Contests (${totalContests})` },
    { key: 'participants',  label: `📋 Applications ${pendingApplications.length > 0 ? `(${pendingApplications.length})` : ''}` },
    { key: 'flags',         label: `🚩 Flags ${fraudFlags.length > 0 ? `(${fraudFlags.length})` : ''}` },
    { key: 'users',         label: `👥 Users (${totalUsers})` },
  ] as const;

  // ── Loading ────────────────────────────────────────────────────────────────
  if (!isInitialized || (isAdmin && loading)) {
    return (
      <main style={{ padding: '24px', maxWidth: '960px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '24px' }}>
          {[1,2,3,4].map(i => (
            <div key={i} className="skeleton-shimmer" style={{ height: '80px', borderRadius: '16px' }} />
          ))}
        </div>
        <div className="skeleton-shimmer" style={{ height: '48px', borderRadius: '12px', marginBottom: '24px' }} />
        {[1,2,3].map(i => <div key={i} className="skeleton-shimmer" style={{ height: '72px', borderRadius: '14px', marginBottom: '10px' }} />)}
      </main>
    );
  }

  // ── Access denied ─────────────────────────────────────────────────────────
  if (!isAdmin) {
    return (
      <main style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{
          textAlign: 'center', padding: '48px 36px', borderRadius: '24px',
          background: 'var(--color-surface-800)', border: '1px solid rgba(255,87,87,0.2)',
          maxWidth: '320px',
        }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>🛑</div>
          <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'white', marginBottom: '8px' }}>Access Denied</h2>
          <p style={{ fontSize: '13px', color: 'rgb(107,114,128)' }}>Admin or Developer role required.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="page-container animate-fade-in" style={{ display: 'grid', gap: '20px' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '900', color: 'white', margin: 0 }}>
            Admin Panel
          </h1>
          <p style={{ fontSize: '13px', color: 'rgb(107,114,128)', margin: '4px 0 0' }}>
            Logged in as <span style={{ color: ROLE_COLORS[profile?.role ?? ''] || 'white', fontWeight: '700' }}>{profile?.role}</span>
          </p>
        </div>
        <button
          onClick={loadAdminData}
          disabled={loading}
          style={{
            padding: '9px 18px', borderRadius: '12px',
            background: 'var(--color-surface-700)', border: '1px solid var(--color-surface-500)',
            color: 'rgb(156,163,175)', fontSize: '13px', fontWeight: '600',
            cursor: 'pointer', transition: 'all 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'white')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgb(156,163,175)')}
        >
          {loading ? '⏳ Refreshing…' : '↻ Refresh'}
        </button>
      </div>

      {/* ── Stat cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
        {[
          { label: 'Total Contests', value: totalContests, emoji: '🏆', color: 'var(--color-brand-400)' },
          { label: 'Live Now',       value: activeContests, emoji: '🔴', color: 'var(--color-accent-green)' },
          { label: 'Total Votes',    value: totalVotes.toLocaleString(), emoji: '🗳️', color: 'var(--color-accent-yellow)' },
          { label: 'Fraud Alerts',   value: highFlags,      emoji: '🚩', color: highFlags > 0 ? 'var(--color-accent-red)' : 'rgb(107,114,128)' },
          { label: 'Pending Apps',   value: pendingApplications.length, emoji: '📋', color: pendingApplications.length > 0 ? 'var(--color-accent-yellow)' : 'rgb(107,114,128)' },
          { label: 'Total Users',    value: totalUsers,     emoji: '👥', color: 'var(--color-accent-purple)' },
        ].map(stat => (
          <div key={stat.label} style={{
            padding: '16px 18px', borderRadius: '16px',
            background: 'var(--color-surface-800)', border: '1px solid var(--color-surface-600)',
          }}>
            <div style={{ fontSize: '20px', marginBottom: '6px' }}>{stat.emoji}</div>
            <div style={{ fontSize: '22px', fontWeight: '900', color: stat.color, lineHeight: '1' }}>{stat.value}</div>
            <div style={{ fontSize: '11px', color: 'rgb(107,114,128)', fontWeight: '600', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* ── Tab bar ── */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-surface-600)', gap: '2px', overflowX: 'auto' }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              padding: '10px 16px', fontSize: '13px', fontWeight: activeTab === tab.key ? '700' : '500',
              color: activeTab === tab.key ? 'white' : 'rgb(107,114,128)',
              background: 'none', border: 'none', whiteSpace: 'nowrap',
              borderBottom: activeTab === tab.key ? '2px solid var(--color-brand-500)' : '2px solid transparent',
              cursor: 'pointer', transition: 'all 0.15s', paddingBottom: '12px',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Overview Tab ── */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gap: '12px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'white', margin: 0 }}>Recent Contests</h3>
          {contests.slice(0, 8).map(c => {
            const sc = STATUS_COLORS[c.status] || STATUS_COLORS.draft;
            return (
              <div key={c.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 18px', borderRadius: '14px',
                background: 'var(--color-surface-800)', border: '1px solid var(--color-surface-600)',
                flexWrap: 'wrap', gap: '10px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    padding: '3px 10px', borderRadius: '7px', fontSize: '10px', fontWeight: '800',
                    textTransform: 'uppercase', letterSpacing: '0.08em',
                    color: sc.color, background: sc.bg, flexShrink: 0,
                  }}>{c.status}</div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: 'white' }}>{c.title}</div>
                </div>
                <Link href={`/contest/${c.id}`} style={{
                  fontSize: '12px', color: 'var(--color-brand-400)', textDecoration: 'none', fontWeight: '600',
                }}>View →</Link>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Contests Tab ── */}
      {activeTab === 'contests' && (
        <div style={{ display: 'grid', gap: '10px' }}>
          {contests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'rgb(107,114,128)' }}>No contests found.</div>
          ) : contests.map(c => {
            const sc = STATUS_COLORS[c.status] || STATUS_COLORS.draft;
            return (
              <div key={c.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 20px', borderRadius: '16px',
                background: 'var(--color-surface-800)', border: '1px solid var(--color-surface-600)',
                flexWrap: 'wrap', gap: '12px',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: 'white', marginBottom: '6px' }}>{c.title}</div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '800',
                      textTransform: 'uppercase', color: sc.color, background: sc.bg,
                    }}>{c.status}</span>
                    <span style={{
                      padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700',
                      textTransform: 'uppercase', color: 'rgb(107,114,128)', background: 'var(--color-surface-700)',
                    }}>{c.type}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <Link href={`/contest/${c.id}`} style={{
                    padding: '7px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: '600',
                    background: 'var(--color-surface-700)', border: '1px solid var(--color-surface-500)',
                    color: 'rgb(156,163,175)', textDecoration: 'none',
                  }}>View</Link>
                  {c.status === 'draft' && (
                    <button onClick={() => handleUpdateContestStatus(c.id, 'registration')} disabled={actionLoading}
                      style={{ padding: '7px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: '700', border: 'none', cursor: 'pointer', background: 'rgba(255,200,87,0.15)', color: 'var(--color-accent-yellow)' }}>
                      Open Reg
                    </button>
                  )}
                  {c.status === 'registration' && (
                    <button onClick={() => handleUpdateContestStatus(c.id, 'active')} disabled={actionLoading}
                      style={{ padding: '7px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: '700', border: 'none', cursor: 'pointer', background: 'rgba(0,229,160,0.15)', color: 'var(--color-accent-green)' }}>
                      Start Voting
                    </button>
                  )}
                  {c.status === 'active' && (<>
                    <button onClick={() => handleFormGroups(c.id)} disabled={actionLoading}
                      style={{ padding: '7px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: '700', border: 'none', cursor: 'pointer', background: 'rgba(56,97,255,0.15)', color: 'var(--color-brand-400)' }}>
                      Form Groups
                    </button>
                    <button onClick={() => handleUpdateContestStatus(c.id, 'completed')} disabled={actionLoading}
                      style={{ padding: '7px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: '700', border: 'none', cursor: 'pointer', background: 'rgba(107,114,128,0.15)', color: 'rgb(156,163,175)' }}>
                      Complete
                    </button>
                  </>)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Participants Tab ── */}
      {activeTab === 'participants' && (
        <div style={{ display: 'grid', gap: '14px' }}>
          <div style={{ fontSize: '15px', fontWeight: '700', color: 'white' }}>
            Pending Applications ({pendingApplications.length})
          </div>
          {pendingApplications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', color: 'rgb(107,114,128)', borderRadius: '16px', background: 'var(--color-surface-800)', border: '1px solid var(--color-surface-600)' }}>
              <div style={{ fontSize: '32px', marginBottom: '10px' }}>✅</div>
              All caught up — no pending applications.
            </div>
          ) : pendingApplications.map(app => {
            const name = app.profiles?.display_name || app.profiles?.username || 'Anonymous';
            const image = app.submission_data.photos?.[0];
            return (
              <div key={app.id} style={{
                display: 'flex', gap: '16px', padding: '18px', borderRadius: '18px',
                background: 'var(--color-surface-800)', border: '1px solid var(--color-surface-600)',
                flexWrap: 'wrap',
              }}>
                {image && (
                  <div style={{ width: '100px', flexShrink: 0, aspectRatio: '1/1', borderRadius: '12px', overflow: 'hidden', background: 'var(--color-surface-700)' }}>
                    <img src={image} alt="Entry" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: 'white', marginBottom: '3px' }}>{name}</div>
                    <div style={{ fontSize: '11px', color: 'rgb(107,114,128)' }}>→ {app.contests?.title}</div>
                    {app.submission_data.description && (
                      <p style={{ fontSize: '12px', color: 'rgb(156,163,175)', marginTop: '8px', lineHeight: '1.5' }}>
                        {app.submission_data.description.slice(0, 180)}
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button onClick={() => handleReviewApplication(app.id, 'rejected')} disabled={actionLoading}
                      style={{ padding: '8px 16px', borderRadius: '10px', fontSize: '12px', fontWeight: '700', border: 'none', cursor: 'pointer', background: 'rgba(255,87,87,0.12)', color: 'var(--color-accent-red)' }}>
                      ✗ Reject
                    </button>
                    <button onClick={() => handleReviewApplication(app.id, 'approved')} disabled={actionLoading}
                      style={{ padding: '8px 16px', borderRadius: '10px', fontSize: '12px', fontWeight: '700', border: 'none', cursor: 'pointer', background: 'rgba(0,229,160,0.12)', color: 'var(--color-accent-green)' }}>
                      ✓ Approve
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Flags Tab ── */}
      {activeTab === 'flags' && (
        <div style={{ display: 'grid', gap: '10px' }}>
          <div style={{ fontSize: '15px', fontWeight: '700', color: 'white' }}>
            Anti-Fraud Queue ({fraudFlags.length})
          </div>
          {fraudFlags.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', color: 'rgb(107,114,128)', borderRadius: '16px', background: 'var(--color-surface-800)', border: '1px solid var(--color-surface-600)' }}>
              <div style={{ fontSize: '32px', marginBottom: '10px' }}>🛡️</div>
              No suspicious activity detected.
            </div>
          ) : fraudFlags.map(flag => {
            const sev = flag.severity;
            const sevColor = sev === 'high' ? 'var(--color-accent-red)' : sev === 'medium' ? 'var(--color-accent-yellow)' : 'rgb(107,114,128)';
            return (
              <div key={flag.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '16px 20px', borderRadius: '16px',
                background: 'var(--color-surface-800)',
                border: `1px solid ${sev === 'high' ? 'rgba(255,87,87,0.2)' : 'var(--color-surface-600)'}`,
                flexWrap: 'wrap', gap: '12px',
              }}>
                <div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ padding: '2px 9px', borderRadius: '6px', fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em', color: sevColor, background: `${sevColor}18` }}>
                      {sev}
                    </span>
                    <span style={{ fontSize: '11px', color: 'rgb(107,114,128)' }}>{flag.flag_type}</span>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: 'white' }}>
                    @{flag.participants?.profiles?.username || 'unknown'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => handleResolveFlag(flag.id, 'dismissed', flag.participant_id)} disabled={actionLoading}
                    style={{ padding: '7px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: '700', border: 'none', cursor: 'pointer', background: 'rgba(107,114,128,0.12)', color: 'rgb(156,163,175)' }}>
                    Dismiss
                  </button>
                  <button onClick={() => handleResolveFlag(flag.id, 'disqualified', flag.participant_id)} disabled={actionLoading}
                    style={{ padding: '7px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: '700', border: 'none', cursor: 'pointer', background: 'rgba(255,87,87,0.12)', color: 'var(--color-accent-red)' }}>
                    Disqualify
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Users Tab ── */}
      {activeTab === 'users' && (
        <div style={{ display: 'grid', gap: '10px' }}>
          <div style={{ fontSize: '15px', fontWeight: '700', color: 'white' }}>
            User Management ({usersList.length})
          </div>
          {usersList.map(u => {
            const rc = ROLE_COLORS[u.role] || 'rgb(107,114,128)';
            return (
              <div key={u.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 18px', borderRadius: '14px',
                background: 'var(--color-surface-800)', border: '1px solid var(--color-surface-600)',
                flexWrap: 'wrap', gap: '10px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                    background: `${rc}22`, border: `1px solid ${rc}44`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '14px', fontWeight: '800', color: rc,
                  }}>
                    {(u.display_name || u.username || 'U')[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: 'white' }}>
                      {u.display_name || u.username || 'Anonymous'}
                    </div>
                    <span style={{
                      fontSize: '10px', fontWeight: '700', textTransform: 'uppercase',
                      letterSpacing: '0.08em', color: rc,
                    }}>{u.role}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {(['admin', 'developer', 'creator', 'moderator', 'user'] as const)
                    .filter(r => r !== u.role)
                    .map(r => (
                      <button key={r} onClick={() => handleUpdateRole(u.id, r)} disabled={actionLoading}
                        style={{
                          padding: '5px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '700',
                          border: `1px solid ${ROLE_COLORS[r]}30`, cursor: 'pointer', transition: 'all 0.15s',
                          background: `${ROLE_COLORS[r]}10`, color: ROLE_COLORS[r],
                        }}>
                        {r}
                      </button>
                    ))
                  }
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
