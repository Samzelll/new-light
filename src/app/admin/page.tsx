"use client";

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { isAdmin as checkIsAdmin } from '@/constants/permissions';
import { getContests, updateContestStatus } from '@/services/contestService';
import { getParticipants, updateParticipantStatus } from '@/services/participantService';
import { saveStageGroupsAndMembers } from '@/services/groupService';
import { distributeIntoGroups } from '@/utils/groupAlgorithm';
import { setUserRole } from '@/services/profileService';
import { supabase } from '@/services/supabase';

export default function AdminPage() {
  const { profile, isInitialized } = useAuth();
  const [activeTab, setActiveTab] = useState<'contests' | 'participants' | 'flags' | 'users'>('contests');

  // Lists
  const [contests, setContests] = useState<any[]>([]);
  const [pendingApplications, setPendingApplications] = useState<any[]>([]);
  const [fraudFlags, setFraudFlags] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const isAdmin = useMemo(() => {
    return profile && checkIsAdmin(profile.role);
  }, [profile]);

  // Loading admin data
  const loadAdminData = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      // 1. Load all contests
      const { data: cData } = await getContests();
      if (cData) setContests(cData);

      // 2. Load pending participants
      const { data: pData } = await supabase
        .from('participants')
        .select('*, profiles(username, display_name), contests(title)')
        .eq('status', 'pending');
      if (pData) setPendingApplications(pData);

      // 3. Load fraud flags
      const { data: fData } = await supabase
        .from('fraud_flags')
        .select('*, participants(id, submission_data, profiles(username))')
        .eq('reviewed', false);
      if (fData) setFraudFlags(fData);

      // 4. Load users list
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
  }, [isAdmin]);

  useEffect(() => {
    if (isInitialized && isAdmin) {
      loadAdminData();
    }
  }, [isInitialized, isAdmin, loadAdminData]);

  // Handle contest status changes
  const handleUpdateContestStatus = async (contestId: string, status: any) => {
    setActionLoading(true);
    const { error } = await updateContestStatus(contestId, status);
    if (!error) {
      loadAdminData();
    } else {
      alert(error);
    }
    setActionLoading(false);
  };

  // Handle participant approval
  const handleReviewApplication = async (participantId: string, status: 'approved' | 'rejected') => {
    setActionLoading(true);
    const { error } = await updateParticipantStatus(participantId, status);
    if (!error) {
      loadAdminData();
    } else {
      alert(error);
    }
    setActionLoading(false);
  };

  // Form groups algorithm trigger
  const handleFormGroups = async (contestId: string) => {
    setActionLoading(true);
    try {
      // 1. Fetch active stage
      const { data: stage } = await supabase
        .from('contest_stages')
        .select('*')
        .eq('contest_id', contestId)
        .eq('status', 'active')
        .single();

      if (!stage) {
        alert('No active stage found for this contest. Please create and activate a stage first.');
        setActionLoading(false);
        return;
      }

      // 2. Fetch approved participants
      const { data: parts } = await getParticipants(contestId, 'approved');
      if (!parts || parts.length < 2) {
        alert('Not enough approved participants to form groups (minimum 2).');
        setActionLoading(false);
        return;
      }

      // 3. Distribute using standard algorithm
      const participantIds = parts.map(p => p.id);
      const groupsList = distributeIntoGroups(participantIds, 6);

      // 4. Save to database
      const { error } = await saveStageGroupsAndMembers(contestId, stage.id, groupsList);
      if (error) {
        alert(error);
      } else {
        alert(`Successfully formed ${groupsList.length} groups!`);
      }
    } catch (err: any) {
      alert(err.message || 'Error forming groups');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle fraud flag actions
  const handleResolveFlag = async (flagId: string, action: 'dismissed' | 'disqualified', participantId: string) => {
    setActionLoading(true);
    try {
      // 1. Update the flag status
      const { error: flagErr } = await supabase
        .from('fraud_flags')
        .update({ reviewed: true, admin_action: action })
        .eq('id', flagId);

      if (flagErr) throw flagErr;

      // 2. If disqualified, update participant status to eliminated
      if (action === 'disqualified') {
        const { error: partErr } = await updateParticipantStatus(participantId, 'eliminated', 'Disqualified due to fraudulent activity.');
        if (partErr) throw partErr;
      }

      alert(`Flag resolved as: ${action}`);
      loadAdminData();
    } catch (err: any) {
      alert(err.message || 'Error resolving flag');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle user role modification
  const handleUpdateRole = async (userId: string, role: any) => {
    setActionLoading(true);
    const { error } = await setUserRole(userId, role);
    if (!error) {
      alert('User role updated.');
      loadAdminData();
    } else {
      alert(error);
    }
    setActionLoading(false);
  };

  if (!isInitialized || (isAdmin && loading)) {
    return (
      <main className="page-container space-y-8">
        {/* Skeleton Header & Tabs */}
        <div className="space-y-4">
          <div className="h-8 w-48 bg-surface-700 rounded-lg animate-pulse" />
          <div className="flex border-b border-surface-700 gap-4 pb-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-8 w-28 bg-surface-700/60 rounded-md animate-pulse" />
            ))}
          </div>
        </div>

        {/* Skeleton Participant List Cards */}
        <div className="space-y-6">
          <div className="h-6 w-52 bg-surface-700/80 rounded animate-pulse" />
          <div className="grid grid-cols-1 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card bg-surface-800 border-surface-700 p-6 flex flex-col md:flex-row gap-6 animate-pulse">
                <div className="w-full md:w-48 aspect-video bg-surface-700 rounded-xl" />
                <div className="flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="h-5 w-44 bg-surface-700 rounded" />
                    <div className="h-3 w-32 bg-surface-700/60 rounded" />
                    <div className="h-4 w-full bg-surface-700/40 rounded mt-3" />
                    <div className="h-4 w-2/3 bg-surface-700/40 rounded" />
                  </div>
                  <div className="flex gap-3 justify-end pt-2">
                    <div className="h-9 w-20 bg-surface-700 rounded-lg" />
                    <div className="h-9 w-24 bg-surface-700 rounded-lg" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="page-container flex justify-center items-center py-20">
        <div className="card text-center max-w-sm bg-surface-800 border-surface-700 p-8 space-y-6">
          <div className="text-4xl text-accent-red">🛑</div>
          <h2 className="text-xl font-bold text-white">Access Denied</h2>
          <p className="text-gray-400 text-sm">
            You do not have permission to access the feed moderation panel.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="page-container space-y-6 animate-fade-in bg-[#000000] text-[#F9F9F9]">
      {/* ── Top Header ── */}
      <header className="flex items-center justify-between py-3 border-b border-[#333333]">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            aria-label="Back"
            className="w-9 h-9 rounded-xl bg-[#333333] hover:bg-[#484848] text-[#F9F9F9] flex items-center justify-center transition-colors border border-[#484848]"
          >
            <ArrowLeft size={18} strokeWidth={2.5} />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-white leading-none">Admin Dashboard</h1>
            <span className="text-[11px] text-[#646464]">Contest management and moderation</span>
          </div>
        </div>
      </header>

      {/* Tabs Menu */}
      <div className="flex border-b border-surface-700 overflow-x-auto no-scrollbar gap-2">
        {(['contests', 'participants', 'flags', 'users'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-3 px-4 text-sm font-semibold border-b-2 uppercase tracking-wider transition-colors whitespace-nowrap ${
              activeTab === tab ? 'border-brand-500 text-white' : 'border-transparent text-gray-500 hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* --- CONTESTS TAB --- */}
      {activeTab === 'contests' && (
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-white">All Active / Registered Contests</h3>
          <div className="grid grid-cols-1 gap-4">
            {contests.map((c) => (
              <div key={c.id} className="card bg-surface-800 border-surface-700 p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h4 className="font-bold text-white text-base">{c.title}</h4>
                  <div className="flex gap-2 mt-2">
                    <span className="badge badge-muted text-[9px] uppercase tracking-wider">{c.status}</span>
                    <span className="badge badge-muted text-[9px] uppercase tracking-wider">{c.type}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  {c.status === 'draft' && (
                    <button
                      onClick={() => handleUpdateContestStatus(c.id, 'registration')}
                      className="btn btn-primary btn-sm text-xs font-semibold"
                      disabled={actionLoading}
                    >
                      Open Registration
                    </button>
                  )}
                  {c.status === 'registration' && (
                    <button
                      onClick={() => handleUpdateContestStatus(c.id, 'active')}
                      className="btn btn-primary btn-sm text-xs font-semibold"
                      disabled={actionLoading}
                    >
                      Start Voting
                    </button>
                  )}
                  {c.status === 'active' && (
                    <>
                      <button
                        onClick={() => handleFormGroups(c.id)}
                        className="btn btn-secondary btn-sm text-xs font-semibold"
                        disabled={actionLoading}
                      >
                        Form Groups
                      </button>
                      <button
                        onClick={() => handleUpdateContestStatus(c.id, 'completed')}
                        className="btn btn-primary btn-sm text-xs font-semibold"
                        disabled={actionLoading}
                      >
                        Complete Contest
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- PARTICIPANTS TAB --- */}
      {activeTab === 'participants' && (
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-white font-semibold">Pending Applications ({pendingApplications.length})</h3>
          
          {pendingApplications.length === 0 ? (
            <div className="card text-center py-10 bg-surface-800 border-surface-700">
              <p className="text-gray-400 text-sm">No applications pending review.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {pendingApplications.map((app) => {
                const name = app.profiles?.display_name || app.profiles?.username || 'Anonymous';
                const image = app.submission_data.photos?.[0];

                return (
                  <div key={app.id} className="card bg-surface-800 border-surface-700 p-6 flex flex-col md:flex-row gap-6">
                    <div className="w-full md:w-48 aspect-video bg-surface-900 overflow-hidden rounded-xl border border-surface-700">
                      {image ? (
                        <img src={image} alt="Application" className="object-cover w-full h-full" />
                      ) : (
                        <div className="h-full flex items-center justify-center text-xs text-gray-600">No media</div>
                      )}
                    </div>

                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="font-bold text-white text-base">{name}</h4>
                        <span className="text-[10px] text-gray-500">Applied to: {app.contests?.title}</span>
                        {app.submission_data.description && (
                          <p className="text-gray-300 text-xs mt-3 leading-relaxed">{app.submission_data.description}</p>
                        )}
                      </div>

                      <div className="flex gap-3 mt-4 justify-end">
                        <button
                          onClick={() => handleReviewApplication(app.id, 'rejected')}
                          className="btn btn-secondary btn-sm font-semibold"
                          disabled={actionLoading}
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleReviewApplication(app.id, 'approved')}
                          className="btn btn-primary btn-sm font-semibold"
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

      {/* --- FLAGS TAB --- */}
      {activeTab === 'flags' && (
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-white font-semibold">Anti-Fraud Logs ({fraudFlags.length})</h3>
          
          {fraudFlags.length === 0 ? (
            <div className="card text-center py-10 bg-surface-800 border-surface-700">
              <p className="text-gray-400 text-sm">No suspicious activity reported.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {fraudFlags.map((flag) => {
                const pName = flag.participants?.profiles?.username || 'Anonymous';
                
                return (
                  <div key={flag.id} className="card bg-surface-800 border-surface-700 p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`badge ${
                          flag.severity === 'high' ? 'badge-red' : 
                          flag.severity === 'medium' ? 'badge-yellow' : 'badge-muted'
                        } uppercase text-[9px] font-bold px-2 py-0.5 rounded`}>
                          {flag.severity} Severity
                        </span>
                        <span className="text-[10px] text-gray-500 font-semibold">{flag.flag_type}</span>
                      </div>
                      <h4 className="font-bold text-white text-sm mt-2">Suspected Participant: @{pName}</h4>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleResolveFlag(flag.id, 'dismissed', flag.participant_id)}
                        className="btn btn-secondary btn-sm text-xs font-semibold"
                        disabled={actionLoading}
                      >
                        Dismiss
                      </button>
                      <button
                        onClick={() => handleResolveFlag(flag.id, 'disqualified', flag.participant_id)}
                        className="btn btn-danger btn-sm text-xs font-semibold"
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

      {/* --- USERS TAB --- */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-white font-semibold">Role Control</h3>
          <div className="space-y-3">
            {usersList.map((u) => (
              <div key={u.id} className="card bg-surface-800 border-surface-700 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h4 className="font-bold text-white text-sm">{u.display_name || u.username || 'Anonymous User'}</h4>
                  <span className="text-[10px] text-gray-500 font-medium">Role: {u.role}</span>
                </div>

                <div className="flex gap-2">
                  {u.role !== 'admin' && (
                    <button
                      onClick={() => handleUpdateRole(u.id, 'admin')}
                      className="btn btn-secondary btn-sm text-xs font-semibold"
                      disabled={actionLoading}
                    >
                      Make Admin
                    </button>
                  )}
                  {u.role !== 'developer' && (
                    <button
                      onClick={() => handleUpdateRole(u.id, 'developer')}
                      className="btn btn-secondary btn-sm text-xs font-semibold"
                      disabled={actionLoading}
                    >
                      Make Dev
                    </button>
                  )}
                  {u.role !== 'user' && (
                    <button
                      onClick={() => handleUpdateRole(u.id, 'user')}
                      className="btn btn-ghost btn-sm text-xs font-semibold text-gray-400 hover:text-white"
                      disabled={actionLoading}
                    >
                      Reset Role
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
