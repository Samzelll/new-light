"use client";

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  Edit3,
  Snowflake,
  Play,
  Eye,
  EyeOff,
  ExternalLink,
  PlusCircle,
  Users,
  Shield,
  Sparkles,
  AlertTriangle,
  Clock,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useDispatch } from 'react-redux';
import { setAuth } from '@/features/auth/authSlice';
import {
  isPlatformAdmin as checkIsPlatformAdmin,
  isCreator as checkIsCreator,
  canAccessAdminDashboard,
} from '@/constants/permissions';
import {
  getContests,
  updateContestStatus,
  toggleFreezeContest,
  toggleHideContest,
  getCategories,
  type Contest,
} from '@/services/contestService';
import { getParticipants, updateParticipantStatus } from '@/services/participantService';
import { saveStageGroupsAndMembers } from '@/services/groupService';
import { distributeIntoGroups } from '@/utils/groupAlgorithm';
import { setUserRole } from '@/services/profileService';
import { supabase } from '@/services/supabase';
import { PostProductionModal } from '@/components/admin/PostProductionModal';

export default function AdminPage() {
  const { user, profile, isInitialized } = useAuth();
  const dispatch = useDispatch();

  const [activeTab, setActiveTab] = useState<'contests' | 'participants' | 'flags' | 'users'>('contests');
  const [contestFilter, setContestFilter] = useState<'all' | 'active' | 'registration' | 'frozen' | 'hidden' | 'completed'>('all');

  // Lists
  const [contests, setContests] = useState<Contest[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [pendingApplications, setPendingApplications] = useState<any[]>([]);
  const [fraudFlags, setFraudFlags] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);

  // Post-Production Modal State
  const [editingContest, setEditingContest] = useState<Contest | null>(null);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [adminToast, setAdminToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setAdminToast(msg);
    setTimeout(() => setAdminToast(null), 3500);
  };

  const isSuperAdmin = useMemo(() => {
    return Boolean(profile && checkIsPlatformAdmin(profile.role));
  }, [profile]);

  const isCreatorRole = useMemo(() => {
    return Boolean(profile && checkIsCreator(profile.role));
  }, [profile]);

  const hasAccess = useMemo(() => {
    return Boolean(profile && canAccessAdminDashboard(profile.role));
  }, [profile]);

  // Loading admin data
  const loadAdminData = useCallback(async () => {
    if (!hasAccess) return;
    setLoading(true);
    try {
      // 1. Load categories
      const { data: catData } = await getCategories();
      if (catData) setCategories(catData);

      // 2. Load all contests (includePausedOrBlocked: true)
      const { data: cData } = await getContests({ includePausedOrBlocked: true });
      if (cData) setContests(cData);

      // 3. Load pending participants
      const { data: pData } = await supabase
        .from('participants')
        .select('*, profiles(username, display_name), contests(title)')
        .eq('status', 'pending');
      if (pData) setPendingApplications(pData);

      // 4. Load fraud flags
      const { data: fData } = await supabase
        .from('fraud_flags')
        .select('*, participants(id, submission_data, profiles(username))')
        .eq('reviewed', false);
      if (fData) setFraudFlags(fData);

      // 5. Load users list
      const { data: uData } = await supabase
        .from('profiles')
        .select('*')
        .limit(100);
      if (uData) setUsersList(uData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [hasAccess]);

  useEffect(() => {
    if (isInitialized && hasAccess) {
      loadAdminData();
    }
  }, [isInitialized, hasAccess, loadAdminData]);

  // Fast Dev Switcher between Super Admin and Creator mode directly in the admin header
  const handleQuickRoleSwitch = (targetRole: 'admin' | 'creator') => {
    if (targetRole === 'admin') {
      dispatch(
        setAuth({
          user: { id: 'usr-admin-01', email: 'admin@opinion.net' },
          profile: {
            id: 'usr-admin-01',
            username: 'admin',
            displayName: 'Alexander (Super Admin)',
            role: 'admin',
            avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=faces',
          } as any,
        })
      );
      showToast('Switched to 👑 Super Admin mode (Full Post-Production)');
    } else {
      dispatch(
        setAuth({
          user: { id: 'usr-creator-01', email: 'creator@opinion.net' },
          profile: {
            id: 'usr-creator-01',
            username: 'marcus_creator',
            displayName: 'Marcus Creator',
            role: 'creator',
            avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=faces',
          } as any,
        })
      );
      showToast('Switched to 🎨 Creator mode (Basic Contest Management)');
    }
  };

  // ── Contest Actions ──
  const handleUpdateContestStatus = async (contestId: string, status: any) => {
    setActionLoading(true);
    const { error } = await updateContestStatus(contestId, status);
    if (!error) {
      showToast(`Contest status updated to ${status}`);
      loadAdminData();
    } else {
      showToast(error);
    }
    setActionLoading(false);
  };

  const handleToggleFreeze = async (c: Contest) => {
    if (!isSuperAdmin) {
      showToast('Only Super Administrators can freeze/unfreeze contests.');
      return;
    }
    setActionLoading(true);
    const isCurrentlyFrozen = c.status === 'paused';
    const { error, newStatus } = await toggleFreezeContest(c.id, isCurrentlyFrozen);
    if (!error) {
      showToast(newStatus === 'paused' ? '❄️ Contest frozen (voting paused)' : '▶️ Contest un-frozen');
      loadAdminData();
    } else {
      showToast(error);
    }
    setActionLoading(false);
  };

  const handleToggleHide = async (c: Contest) => {
    if (!isSuperAdmin) {
      showToast('Only Super Administrators can hide/unhide contests from public feed.');
      return;
    }
    setActionLoading(true);
    const isCurrentlyHidden = c.visibility === 'private';
    const { error, newVisibility } = await toggleHideContest(c.id, isCurrentlyHidden);
    if (!error) {
      showToast(newVisibility === 'private' ? '👁️‍🗨️ Contest hidden from explore/feed' : '👁️ Contest is now public');
      loadAdminData();
    } else {
      showToast(error);
    }
    setActionLoading(false);
  };

  // Handle participant approval
  const handleReviewApplication = async (participantId: string, status: 'approved' | 'rejected') => {
    setActionLoading(true);
    const { error } = await updateParticipantStatus(participantId, status);
    if (!error) {
      showToast(`Participant ${status === 'approved' ? 'approved' : 'rejected'}`);
      loadAdminData();
    } else {
      showToast(error);
    }
    setActionLoading(false);
  };

  // Form groups algorithm trigger
  const handleFormGroups = async (contestId: string) => {
    setActionLoading(true);
    try {
      const { data: stage } = await supabase
        .from('contest_stages')
        .select('*')
        .eq('contest_id', contestId)
        .eq('status', 'active')
        .single();

      if (!stage) {
        showToast('No active stage found. Please create and activate a stage first.');
        setActionLoading(false);
        return;
      }

      const { data: parts } = await getParticipants(contestId, 'approved');
      if (!parts || parts.length < 2) {
        showToast('Not enough approved participants to form groups (minimum 2).');
        setActionLoading(false);
        return;
      }

      const participantIds = parts.map((p) => p.id);
      const groupsList = distributeIntoGroups(participantIds, 6);

      const { error } = await saveStageGroupsAndMembers(contestId, stage.id, groupsList);
      if (error) {
        showToast(error);
      } else {
        showToast(`Successfully formed ${groupsList.length} groups!`);
      }
    } catch (err: any) {
      showToast(err.message || 'Error forming groups');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle fraud flag actions
  const handleResolveFlag = async (flagId: string, action: 'dismissed' | 'disqualified', participantId: string) => {
    setActionLoading(true);
    try {
      const { error: flagErr } = await supabase
        .from('fraud_flags')
        .update({ reviewed: true, admin_action: action })
        .eq('id', flagId);

      if (flagErr) throw flagErr;

      if (action === 'disqualified') {
        const { error: partErr } = await updateParticipantStatus(
          participantId,
          'eliminated',
          'Disqualified due to fraudulent activity.'
        );
        if (partErr) throw partErr;
      }

      showToast(`Flag resolved as: ${action}`);
      loadAdminData();
    } catch (err: any) {
      showToast(err.message || 'Error resolving flag');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle user role modification
  const handleUpdateRole = async (userId: string, role: any) => {
    if (!isSuperAdmin) {
      showToast('Only Super Administrators can modify user roles.');
      return;
    }
    setActionLoading(true);
    const { error } = await setUserRole(userId, role);
    if (!error) {
      showToast(`User role updated to ${role}`);
      loadAdminData();
    } else {
      showToast(error);
    }
    setActionLoading(false);
  };

  // Filtered contests list
  const displayedContests = useMemo(() => {
    let list = [...contests];

    // If Creator mode, they primarily manage their contests
    if (isCreatorRole && !isSuperAdmin) {
      const myContests = list.filter((c) => c.created_by === profile?.id);
      if (myContests.length > 0) {
        list = myContests;
      }
    }

    if (contestFilter === 'active') {
      return list.filter((c) => c.status === 'active' || (c.status as string) === 'voting');
    }
    if (contestFilter === 'registration') {
      return list.filter((c) => c.status === 'registration');
    }
    if (contestFilter === 'frozen') {
      return list.filter((c) => c.status === 'paused');
    }
    if (contestFilter === 'hidden') {
      return list.filter((c) => c.visibility === 'private');
    }
    if (contestFilter === 'completed') {
      return list.filter((c) => c.status === 'completed');
    }
    return list;
  }, [contests, contestFilter, isCreatorRole, isSuperAdmin, profile]);

  if (!isInitialized || (hasAccess && loading)) {
    return (
      <main className="page-container space-y-8 bg-[#0b0b0d] min-h-screen text-white p-4 sm:p-6">
        <div className="space-y-4">
          <div className="h-8 w-48 bg-neutral-800 rounded-lg animate-pulse" />
          <div className="flex border-b border-neutral-800 gap-4 pb-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-8 w-28 bg-neutral-800 rounded-md animate-pulse" />
            ))}
          </div>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-neutral-900 border border-neutral-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      </main>
    );
  }

  if (!hasAccess) {
    return (
      <main className="page-container flex justify-center items-center py-20 bg-[#0b0b0d] min-h-screen text-white">
        <div className="text-center max-w-sm bg-[#16161a] border border-neutral-800 rounded-3xl p-8 space-y-4 shadow-2xl">
          <div className="text-4xl">🛑</div>
          <h2 className="text-xl font-black text-white">Access Denied</h2>
          <p className="text-neutral-400 text-xs leading-relaxed">
            You need Admin or Contest Creator privileges to access the post-production studio.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => handleQuickRoleSwitch('admin')}
              className="px-5 py-2.5 rounded-xl bg-[#ff6a2b] hover:bg-[#ff7a3d] text-white font-bold text-xs shadow-lg transition-colors"
            >
              👑 Switch to Super Admin
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page-container space-y-6 animate-fade-in bg-[#0b0b0d] text-[#F9F9F9] min-h-screen p-3 sm:p-6 pb-24 font-sans">
      {/* Toast Feedback */}
      {adminToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-[#ff6a2b] text-white text-xs font-bold shadow-2xl animate-fade-in pointer-events-none">
          {adminToast}
        </div>
      )}

      {/* ── Top Header ── */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-neutral-800 gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            aria-label="Back to feed"
            className="w-9 h-9 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white flex items-center justify-center transition-colors border border-neutral-700 shrink-0"
          >
            <ArrowLeft size={18} strokeWidth={2.5} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black text-white leading-none">
                {isSuperAdmin ? 'Admin Post-Production Studio' : 'Creator Contest Studio'}
              </h1>
              <span
                className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  isSuperAdmin
                    ? 'bg-amber-950 text-amber-400 border border-amber-800'
                    : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                }`}
              >
                {isSuperAdmin ? '👑 Super Admin' : '🎨 Creator'}
              </span>
            </div>
            <span className="text-[11px] text-neutral-400 mt-0.5 block">
              {isSuperAdmin
                ? 'Full authority: freeze, hide, edit rules, inspect competitors, adjust deadlines'
                : 'Manage and update your active contests, works, and photo details'}
            </span>
          </div>
        </div>

        {/* Quick Role Toggle Bar (for instant testing of creator vs admin levels) */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#16161a] border border-neutral-800 self-start sm:self-auto">
          <span className="text-[10px] text-neutral-500 font-bold px-2 uppercase">Test Mode:</span>
          <button
            type="button"
            onClick={() => handleQuickRoleSwitch('admin')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              isSuperAdmin
                ? 'bg-[#ff6a2b] text-white shadow'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Admin
          </button>
          <button
            type="button"
            onClick={() => handleQuickRoleSwitch('creator')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              isCreatorRole && !isSuperAdmin
                ? 'bg-emerald-600 text-white shadow'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Creator
          </button>
        </div>
      </header>

      {/* Tabs Menu */}
      <div className="flex border-b border-neutral-800 overflow-x-auto no-scrollbar gap-1 sm:gap-2">
        <button
          onClick={() => setActiveTab('contests')}
          className={`py-3 px-3 sm:px-4 text-xs font-bold border-b-2 uppercase tracking-wider transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'contests' ? 'border-[#ff6a2b] text-white' : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          <Layers size={14} />
          <span>Contests & Post-Prod ({contests.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('participants')}
          className={`py-3 px-3 sm:px-4 text-xs font-bold border-b-2 uppercase tracking-wider transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'participants' ? 'border-[#ff6a2b] text-white' : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          <Users size={14} />
          <span>Applications ({pendingApplications.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('flags')}
          className={`py-3 px-3 sm:px-4 text-xs font-bold border-b-2 uppercase tracking-wider transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'flags' ? 'border-[#ff6a2b] text-white' : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          <AlertTriangle size={14} />
          <span>Anti-Fraud ({fraudFlags.length})</span>
        </button>

        {isSuperAdmin && (
          <button
            onClick={() => setActiveTab('users')}
            className={`py-3 px-3 sm:px-4 text-xs font-bold border-b-2 uppercase tracking-wider transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'users' ? 'border-[#ff6a2b] text-white' : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <Shield size={14} />
            <span>User Roles ({usersList.length})</span>
          </button>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── CONTESTS & POST-PRODUCTION TAB ──                           */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'contests' && (
        <div className="space-y-4">
          {/* Quick Sub-Filter Badges */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              {[
                { id: 'all', label: 'All Contests' },
                { id: 'active', label: 'Active Voting' },
                { id: 'registration', label: 'Registration' },
                { id: 'frozen', label: '❄️ Frozen' },
                { id: 'hidden', label: '👁️‍🗨️ Hidden' },
                { id: 'completed', label: 'Completed' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setContestFilter(f.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap border ${
                    contestFilter === f.id
                      ? 'bg-[#ff6a2b] text-white border-[#ff6a2b]'
                      : 'bg-[#16161a] hover:bg-[#202026] text-neutral-400 border-neutral-800'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <Link
              href="/create"
              className="px-3.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors border border-neutral-700"
            >
              <PlusCircle size={14} />
              <span>Create New</span>
            </Link>
          </div>

          {/* Contests Cards Grid */}
          <div className="grid grid-cols-1 gap-3">
            {displayedContests.length === 0 ? (
              <div className="p-8 text-center bg-[#141418] rounded-2xl border border-neutral-800 text-neutral-400 text-xs">
                No contests matching the selected filter.
              </div>
            ) : (
              displayedContests.map((c) => {
                const isFrozen = c.status === 'paused';
                const isHidden = c.visibility === 'private';

                return (
                  <div
                    key={c.id}
                    className="p-4 sm:p-5 rounded-2xl bg-[#141418] border border-neutral-800/90 hover:border-neutral-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg"
                  >
                    {/* Contest Info Left */}
                    <div className="flex items-start gap-3.5 min-w-0">
                      {c.cover_url && (
                        <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-black shrink-0 border border-neutral-700">
                          <Image
                            src={c.cover_url}
                            alt={c.title}
                            fill
                            className="object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300">
                            {c.type}
                          </span>
                          <span
                            className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              c.status === 'active' || (c.status as string) === 'voting'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : c.status === 'registration'
                                ? 'bg-blue-950 text-blue-400 border border-blue-800'
                                : 'bg-neutral-800 text-neutral-400'
                            }`}
                          >
                            {c.status}
                          </span>
                          {isFrozen && (
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-950 text-blue-400 border border-blue-800 flex items-center gap-1">
                              <Snowflake size={11} />
                              <span>FROZEN</span>
                            </span>
                          )}
                          {isHidden && (
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-950 text-amber-400 border border-amber-800 flex items-center gap-1">
                              <EyeOff size={11} />
                              <span>HIDDEN</span>
                            </span>
                          )}
                        </div>

                        <h3 className="text-sm sm:text-base font-bold text-white truncate">{c.title}</h3>
                        <p className="text-xs text-neutral-400 truncate mt-0.5">
                          {c.description || 'No description provided'}
                        </p>

                        <div className="flex items-center gap-3 mt-2 text-[11px] text-neutral-500">
                          <span>Deadline: {c.voting_end ? new Date(c.voting_end).toLocaleDateString() : 'None'}</span>
                          {c.prize && <span className="text-amber-400/90 font-semibold">🏆 {c.prize}</span>}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons Right */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0 self-end md:self-center">
                      {/* 1. Full Post-Production & Edit button */}
                      <button
                        type="button"
                        onClick={() => setEditingContest(c)}
                        className="px-3.5 py-2 rounded-xl bg-[#ff6a2b] hover:bg-[#ff7a3d] text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-[#ff6a2b]/20 transition-all active:scale-95"
                      >
                        <Edit3 size={13} />
                        <span>Post-Production</span>
                      </button>

                      {/* 2. Freeze Toggle (Super Admin Only) */}
                      {isSuperAdmin && (
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => handleToggleFreeze(c)}
                          className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 border transition-colors ${
                            isFrozen
                              ? 'bg-blue-600 hover:bg-blue-500 text-white border-blue-500'
                              : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border-neutral-700'
                          }`}
                          title={isFrozen ? 'Unfreeze voting' : 'Freeze contest immediately'}
                        >
                          {isFrozen ? <Play size={13} /> : <Snowflake size={13} />}
                          <span>{isFrozen ? 'Unfreeze' : 'Freeze'}</span>
                        </button>
                      )}

                      {/* 3. Hide Toggle (Super Admin Only) */}
                      {isSuperAdmin && (
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => handleToggleHide(c)}
                          className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 border transition-colors ${
                            isHidden
                              ? 'bg-amber-600 hover:bg-amber-500 text-white border-amber-500'
                              : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border-neutral-700'
                          }`}
                          title={isHidden ? 'Make public on explore feed' : 'Hide from explore feed'}
                        >
                          {isHidden ? <Eye size={13} /> : <EyeOff size={13} />}
                        </button>
                      )}

                      {/* 4. Public Page Jump */}
                      <Link
                        href={`/contest/${c.id}`}
                        target="_blank"
                        className="w-8 h-8 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center justify-center transition-colors border border-neutral-700"
                        title="View public contest page"
                      >
                        <ExternalLink size={14} />
                      </Link>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── PARTICIPANTS APPLICATIONS TAB ──                            */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'participants' && (
        <div className="space-y-4">
          <h3 className="text-base font-bold text-white">Pending Applications ({pendingApplications.length})</h3>

          {pendingApplications.length === 0 ? (
            <div className="text-center py-10 bg-[#141418] border border-neutral-800 rounded-2xl">
              <p className="text-neutral-400 text-xs">No applications pending review.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {pendingApplications.map((app) => {
                const name = app.profiles?.display_name || app.profiles?.username || 'Anonymous';
                const image = app.submission_data?.photos?.[0];

                return (
                  <div key={app.id} className="bg-[#141418] border border-neutral-800 p-4 sm:p-5 rounded-2xl flex flex-col md:flex-row gap-4">
                    <div className="w-full md:w-44 aspect-video bg-neutral-900 overflow-hidden rounded-xl border border-neutral-800 relative">
                      {image ? (
                        <Image src={image} alt="Application" fill className="object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="h-full flex items-center justify-center text-xs text-neutral-600">No media</div>
                      )}
                    </div>

                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="font-bold text-white text-sm sm:text-base">{name}</h4>
                        <span className="text-[11px] text-neutral-400 block mt-0.5">Applied to: {app.contests?.title}</span>
                        {app.submission_data?.description && (
                          <p className="text-neutral-300 text-xs mt-2 leading-relaxed">{app.submission_data.description}</p>
                        )}
                      </div>

                      <div className="flex gap-2.5 mt-4 justify-end">
                        <button
                          onClick={() => handleReviewApplication(app.id, 'rejected')}
                          className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-bold transition-colors"
                          disabled={actionLoading}
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleReviewApplication(app.id, 'approved')}
                          className="px-4 py-2 rounded-xl bg-[#ff6a2b] hover:bg-[#ff7a3d] text-white text-xs font-bold transition-colors shadow"
                          disabled={actionLoading}
                        >
                          Approve
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── ANTI-FRAUD TAB ──                                           */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'flags' && (
        <div className="space-y-4">
          <h3 className="text-base font-bold text-white">Anti-Fraud Logs ({fraudFlags.length})</h3>

          {fraudFlags.length === 0 ? (
            <div className="text-center py-10 bg-[#141418] border border-neutral-800 rounded-2xl">
              <p className="text-neutral-400 text-xs">No suspicious activity reported.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {fraudFlags.map((flag) => {
                const pName = flag.participants?.profiles?.username || 'Anonymous';

                return (
                  <div key={flag.id} className="bg-[#141418] border border-neutral-800 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-800">
                          {flag.severity} Severity
                        </span>
                        <span className="text-xs text-neutral-400 font-semibold">{flag.flag_type}</span>
                      </div>
                      <h4 className="font-bold text-white text-sm mt-1.5">Suspected Participant: @{pName}</h4>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleResolveFlag(flag.id, 'dismissed', flag.participant_id)}
                        className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-white"
                        disabled={actionLoading}
                      >
                        Dismiss
                      </button>
                      <button
                        onClick={() => handleResolveFlag(flag.id, 'disqualified', flag.participant_id)}
                        className="px-3.5 py-2 rounded-xl bg-red-950 hover:bg-red-900 text-xs font-bold text-red-300 border border-red-800"
                        disabled={actionLoading}
                      >
                        Disqualify
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* ── USER ROLES TAB (SUPER ADMIN ONLY) ──                        */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {activeTab === 'users' && isSuperAdmin && (
        <div className="space-y-4">
          <h3 className="text-base font-bold text-white">Platform Role Control</h3>
          <div className="space-y-2.5">
            {usersList.map((u) => (
              <div key={u.id} className="bg-[#141418] border border-neutral-800 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h4 className="font-bold text-white text-sm">{u.display_name || u.username || 'Anonymous User'}</h4>
                  <span className="text-xs text-neutral-500 font-medium">Role: <strong className="text-neutral-300 uppercase">{u.role}</strong></span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {u.role !== 'admin' && (
                    <button
                      onClick={() => handleUpdateRole(u.id, 'admin')}
                      className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-amber-400 border border-neutral-700"
                      disabled={actionLoading}
                    >
                      Make Admin
                    </button>
                  )}
                  {u.role !== 'creator' && (
                    <button
                      onClick={() => handleUpdateRole(u.id, 'creator')}
                      className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-emerald-400 border border-neutral-700"
                      disabled={actionLoading}
                    >
                      Make Creator
                    </button>
                  )}
                  {u.role !== 'user' && (
                    <button
                      onClick={() => handleUpdateRole(u.id, 'user')}
                      className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-neutral-400 hover:text-white"
                      disabled={actionLoading}
                    >
                      Reset to User
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Post-Production Modal ── */}
      {editingContest && (
        <PostProductionModal
          isOpen={!!editingContest}
          onClose={() => setEditingContest(null)}
          contest={editingContest}
          categories={categories}
          isSuperAdmin={isSuperAdmin}
          isCreator={isCreatorRole}
          onSaved={() => {
            loadAdminData();
            // Refresh currently editing contest data
            const updated = contests.find((x) => x.id === editingContest.id);
            if (updated) setEditingContest(updated);
          }}
          showToast={showToast}
        />
      )}
    </main>
  );
}
