"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { LazyImage } from '@/components/common/LazyImage';
import {
  X,
  Save,
  Eye,
  EyeOff,
  Snowflake,
  Play,
  Clock,
  Plus,
  Trash2,
  Edit3,
  ShieldAlert,
  Check,
  RefreshCw,
  AlertTriangle,
  ExternalLink,
  Layers,
  Sparkles,
  Users,
  Image as ImageIcon,
} from 'lucide-react';
import type { Contest } from '@/services/contestService';
import {
  updateContest,
  deleteContest,
  toggleFreezeContest,
  toggleHideContest,
  extendContestDeadline,
} from '@/services/contestService';
import {
  getParticipants,
  updateParticipantDetails,
  deleteParticipant,
  resetParticipantVotes,
  addBattleParticipant,
  type Participant,
} from '@/services/participantService';

export interface PostProductionModalProps {
  isOpen: boolean;
  onClose: () => void;
  contest: Contest | null;
  categories: Array<{ id: string; name: string }>;
  isSuperAdmin: boolean;
  isCreator: boolean;
  onSaved: () => void;
  showToast: (msg: string) => void;
}

export function PostProductionModal({
  isOpen,
  onClose,
  contest,
  categories,
  isSuperAdmin,
  isCreator,
  onSaved,
  showToast,
}: PostProductionModalProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'lifecycle' | 'participants' | 'raw'>('general');
  const [saving, setSaving] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [rules, setRules] = useState('');
  const [prize, setPrize] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [contestType, setContestType] = useState<string>('battle');
  const [status, setStatus] = useState<string>('active');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');

  // Participants State
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [editPartName, setEditPartName] = useState('');
  const [editPartPhoto, setEditPartPhoto] = useState('');
  const [editPartDesc, setEditPartDesc] = useState('');

  // Add Competitor State
  const [isAddingCompetitor, setIsAddingCompetitor] = useState(false);
  const [newCompName, setNewCompName] = useState('');
  const [newCompPhoto, setNewCompPhoto] = useState('');
  const [newCompDesc, setNewCompDesc] = useState('');

  // Delete Contest Confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Load contest values into state
  useEffect(() => {
    if (contest) {
      setTitle(contest.title || '');
      setDescription(contest.description || '');
      setRules(contest.rules || '');
      setPrize(contest.prize || '');
      setCategoryId(contest.category_id || categories[0]?.id || '');
      setCoverUrl(contest.cover_url || '');
      setContestType(contest.type || 'battle');
      setStatus(contest.status || 'active');
      setVisibility(contest.visibility || 'public');
      loadParticipants(contest.id);
    }
  }, [contest, categories]);

  const loadParticipants = async (contestId: string) => {
    setLoadingParticipants(true);
    const { data } = await getParticipants(contestId, 'all');
    if (data) setParticipants(data);
    setLoadingParticipants(false);
  };

  if (!isOpen || !contest) return null;

  const isFrozen = status === 'paused';
  const isHidden = visibility === 'private';

  // ── SAVE GENERAL SETTINGS ──
  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updates: Partial<Contest> = {
        title: title.trim(),
        description: description.trim() || null,
        rules: rules.trim() || null,
        prize: prize.trim() || null,
        category_id: categoryId || null,
        cover_url: coverUrl.trim() || null,
      };

      // Super Admin can also change type
      if (isSuperAdmin) {
        updates.type = contestType as any;
      }

      const { error } = await updateContest(contest.id, updates);
      if (error) {
        showToast(error);
      } else {
        showToast('Contest updated successfully!');
        onSaved();
      }
    } catch (err: any) {
      showToast(err.message || 'Error saving contest');
    } finally {
      setSaving(false);
    }
  };

  // ── TOGGLE FREEZE ──
  const handleToggleFreeze = async () => {
    if (!isSuperAdmin) {
      showToast('Freezing contests requires Super Admin privileges.');
      return;
    }
    setSaving(true);
    const { error, newStatus } = await toggleFreezeContest(contest.id, isFrozen);
    if (!error) {
      setStatus(newStatus);
      showToast(newStatus === 'paused' ? '❄️ Contest frozen (voting paused)' : '▶️ Contest un-frozen (voting resumed)');
      onSaved();
    } else {
      showToast(error);
    }
    setSaving(false);
  };

  // ── TOGGLE HIDE ──
  const handleToggleHide = async () => {
    if (!isSuperAdmin) {
      showToast('Changing contest visibility requires Super Admin privileges.');
      return;
    }
    setSaving(true);
    const { error, newVisibility } = await toggleHideContest(contest.id, isHidden);
    if (!error) {
      setVisibility(newVisibility);
      showToast(newVisibility === 'private' ? '👁️‍🗨️ Contest hidden from public explore' : '👁️ Contest is now public');
      onSaved();
    } else {
      showToast(error);
    }
    setSaving(false);
  };

  // ── EXTEND DEADLINE ──
  const handleExtendDeadline = async (days: number) => {
    setSaving(true);
    const { error, newEnd } = await extendContestDeadline(contest.id, days);
    if (!error) {
      showToast(`Deadline extended by +${days} days (${new Date(newEnd).toLocaleDateString()})`);
      onSaved();
    } else {
      showToast(error);
    }
    setSaving(false);
  };

  // ── FORCE STATUS CHANGE ──
  const handleForceStatus = async (newStatus: any) => {
    if (!isSuperAdmin) {
      showToast('Force status switching requires Super Admin privileges.');
      return;
    }
    setSaving(true);
    const { error } = await updateContest(contest.id, { status: newStatus });
    if (!error) {
      setStatus(newStatus);
      showToast(`Status changed to: ${newStatus}`);
      onSaved();
    } else {
      showToast(error);
    }
    setSaving(false);
  };

  // ── DELETE CONTEST ──
  const handleDeleteContest = async () => {
    if (!isSuperAdmin) {
      showToast('Deleting contest requires Super Admin privileges.');
      return;
    }
    setSaving(true);
    const { error } = await deleteContest(contest.id);
    if (!error) {
      showToast('Contest permanently deleted.');
      onSaved();
      onClose();
    } else {
      showToast(error);
    }
    setSaving(false);
  };

  // ── PARTICIPANT ACTIONS ──
  const handleSaveParticipantEdit = async () => {
    if (!editingParticipant) return;
    setSaving(true);
    const { error } = await updateParticipantDetails(editingParticipant.id, {
      name: editPartName,
      photoUrl: editPartPhoto,
      description: editPartDesc,
    });
    if (!error) {
      showToast('Entry updated successfully!');
      setEditingParticipant(null);
      loadParticipants(contest.id);
    } else {
      showToast(error);
    }
    setSaving(false);
  };

  const handleDisqualifyParticipant = async (pId: string) => {
    setSaving(true);
    const { error } = await updateParticipantDetails(pId, {
      status: 'eliminated',
      adminNote: 'Disqualified by administration during post-production review.',
    });
    if (!error) {
      showToast('Participant disqualified.');
      loadParticipants(contest.id);
    } else {
      showToast(error);
    }
    setSaving(false);
  };

  const handleResetVotes = async (pId: string) => {
    if (!isSuperAdmin) {
      showToast('Resetting votes requires Super Admin privileges.');
      return;
    }
    setSaving(true);
    const { error } = await resetParticipantVotes(pId);
    if (!error) {
      showToast('Votes reset for this entrant.');
      loadParticipants(contest.id);
    } else {
      showToast(error);
    }
    setSaving(false);
  };

  const handleDeleteParticipant = async (pId: string) => {
    setSaving(true);
    const { error } = await deleteParticipant(pId);
    if (!error) {
      showToast('Participant removed.');
      loadParticipants(contest.id);
    } else {
      showToast(error);
    }
    setSaving(false);
  };

  const handleAddCompetitor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompName.trim() || !newCompPhoto.trim()) {
      showToast('Please provide both name and photo URL.');
      return;
    }
    setSaving(true);
    const { error } = await addBattleParticipant({
      contestId: contest.id,
      name: newCompName.trim(),
      photoUrl: newCompPhoto.trim(),
      description: newCompDesc.trim(),
    });
    if (!error) {
      showToast('Competitor added to contest!');
      setIsAddingCompetitor(false);
      setNewCompName('');
      setNewCompPhoto('');
      setNewCompDesc('');
      loadParticipants(contest.id);
    } else {
      showToast(error);
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-[#121215] border border-neutral-800 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden text-white font-sans my-auto">
        {/* ── Modal Top Header ── */}
        <header className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-neutral-800 shrink-0 bg-[#16161a]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#ff6a2b]/20 text-[#ff6a2b] flex items-center justify-center font-bold text-xs shrink-0 border border-[#ff6a2b]/30">
              ⚙️
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black truncate">{contest.title}</h2>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300">
                  {contest.type}
                </span>
                {isFrozen && (
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-950 text-blue-400 border border-blue-800/80">
                    ❄️ Frozen
                  </span>
                )}
                {isHidden && (
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-950 text-amber-400 border border-amber-800/80">
                    👁️ Hidden
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-neutral-400 mt-0.5">
                <span>Role:</span>
                <span className={`font-bold ${isSuperAdmin ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {isSuperAdmin ? '👑 Super Admin (Full Post-Production)' : '🎨 Creator (Basic Details)'}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-white flex items-center justify-center transition-colors shrink-0"
            aria-label="Close modal"
          >
            <X size={16} strokeWidth={2.5} />
          </button>
        </header>

        {/* ── Tab Navigation ── */}
        <div className="flex border-b border-neutral-800 px-4 sm:px-6 bg-[#141418] overflow-x-auto no-scrollbar shrink-0 gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`py-3 px-3 sm:px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'general' ? 'border-[#ff6a2b] text-white' : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <Edit3 size={14} />
            <span>General Info</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('lifecycle')}
            className={`py-3 px-3 sm:px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'lifecycle' ? 'border-[#ff6a2b] text-white' : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <Clock size={14} />
            <span>Lifecycle & Controls</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('participants')}
            className={`py-3 px-3 sm:px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'participants' ? 'border-[#ff6a2b] text-white' : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <Users size={14} />
            <span>Entries & Competitors ({participants.length})</span>
          </button>

          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => setActiveTab('raw')}
              className={`py-3 px-3 sm:px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'raw' ? 'border-[#ff6a2b] text-white' : 'border-transparent text-neutral-400 hover:text-white'
              }`}
            >
              <ShieldAlert size={14} />
              <span>Danger & RAW</span>
            </button>
          )}
        </div>

        {/* ── Modal Content Body ── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* ══════════════════════════════════════════════════════════════ */}
          {/* TAB 1: GENERAL INFO                                           */}
          {/* ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'general' && (
            <form onSubmit={handleSaveGeneral} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Title */}
                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                    Contest Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-[#18181c] border border-neutral-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#ff6a2b]"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                    Category
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full bg-[#18181c] border border-neutral-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#ff6a2b]"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Contest Type (Super Admin Only) */}
                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                    Contest Format {isSuperAdmin ? '' : '(Locked for Creators)'}
                  </label>
                  <select
                    disabled={!isSuperAdmin}
                    value={contestType}
                    onChange={(e) => setContestType(e.target.value)}
                    className="w-full bg-[#18181c] border border-neutral-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#ff6a2b] disabled:opacity-60"
                  >
                    <option value="battle">1v1 Battle (Head-to-head)</option>
                    <option value="race">Live Race (Sprint Leaderboard)</option>
                    <option value="standard">Standard Tournament</option>
                    <option value="eternal">Eternal / Hall of Fame</option>
                  </select>
                </div>

                {/* Prize Pool */}
                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                    Prize Pool or Reward
                  </label>
                  <input
                    type="text"
                    value={prize}
                    onChange={(e) => setPrize(e.target.value)}
                    placeholder="e.g. $1,500 + Sony Alpha A7 IV"
                    className="w-full bg-[#18181c] border border-neutral-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#ff6a2b]"
                  />
                </div>
              </div>

              {/* Cover Image URL with Live Preview */}
              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                  Cover Photo URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={coverUrl}
                    onChange={(e) => setCoverUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="flex-1 bg-[#18181c] border border-neutral-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#ff6a2b]"
                  />
                  {coverUrl && (
                    <div className="relative w-12 h-10 rounded-lg overflow-hidden border border-neutral-700 shrink-0">
                      <LazyImage
                        src={coverUrl}
                        alt="Preview"
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                </div>
                {/* Quick Presets */}
                <div className="flex gap-2 mt-2">
                  <span className="text-[11px] text-neutral-500">Presets:</span>
                  {[
                    { label: 'Cyberpunk', url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1000' },
                    { label: 'Minimal', url: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=1000' },
                    { label: 'Nature', url: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1000' },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setCoverUrl(preset.url)}
                      className="text-[11px] text-[#ff6a2b] hover:underline"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                  Description & Context
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#18181c] border border-neutral-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#ff6a2b]"
                  placeholder="Explain the theme, guidelines, and vision of this contest..."
                />
              </div>

              {/* Rules */}
              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1.5">
                  Rules & Criteria
                </label>
                <textarea
                  rows={3}
                  value={rules}
                  onChange={(e) => setRules(e.target.value)}
                  className="w-full bg-[#18181c] border border-neutral-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#ff6a2b]"
                  placeholder="Only original photos, no heavy AI manipulation, EXIF preserved..."
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-[#ff6a2b] hover:bg-[#ff7a3d] text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-[#ff6a2b]/25 transition-all"
                >
                  <Save size={16} />
                  <span>{saving ? 'Saving...' : 'Save General Changes'}</span>
                </button>
              </div>
            </form>
          )}

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* TAB 2: LIFECYCLE & CONTROLS                                    */}
          {/* ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'lifecycle' && (
            <div className="space-y-6">
              {/* Post-Production Action Center */}
              <div className="p-4 rounded-2xl bg-[#18181c] border border-neutral-800 space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Sparkles size={16} className="text-[#ff6a2b]" />
                  <span>Post-Production Controls</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Freeze / Unfreeze Toggle */}
                  <div className="p-3.5 rounded-xl bg-[#121215] border border-neutral-800 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Snowflake size={16} className={isFrozen ? 'text-blue-400' : 'text-neutral-500'} />
                        <span className="font-bold text-xs text-white">Contest Freeze</span>
                      </div>
                      <p className="text-[11px] text-neutral-400 mt-0.5">
                        {isFrozen ? 'Voting is halted. Contest is frozen.' : 'Active voting enabled.'}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={saving || !isSuperAdmin}
                      onClick={handleToggleFreeze}
                      className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors ${
                        isFrozen
                          ? 'bg-blue-600 hover:bg-blue-500 text-white'
                          : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                      } ${!isSuperAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {isFrozen ? <Play size={14} /> : <Snowflake size={14} />}
                      <span>{isFrozen ? 'Unfreeze' : 'Freeze'}</span>
                    </button>
                  </div>

                  {/* Hide / Unhide Toggle */}
                  <div className="p-3.5 rounded-xl bg-[#121215] border border-neutral-800 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        {isHidden ? <EyeOff size={16} className="text-amber-400" /> : <Eye size={16} className="text-neutral-500" />}
                        <span className="font-bold text-xs text-white">Visibility</span>
                      </div>
                      <p className="text-[11px] text-neutral-400 mt-0.5">
                        {isHidden ? 'Hidden from search & home feed.' : 'Publicly listed on feed.'}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={saving || !isSuperAdmin}
                      onClick={handleToggleHide}
                      className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors ${
                        isHidden
                          ? 'bg-amber-600 hover:bg-amber-500 text-white'
                          : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                      } ${!isSuperAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {isHidden ? <Eye size={14} /> : <EyeOff size={14} />}
                      <span>{isHidden ? 'Make Public' : 'Hide'}</span>
                    </button>
                  </div>
                </div>

                {!isSuperAdmin && (
                  <p className="text-[11px] text-amber-400/90 italic">
                    ℹ️ Note: Global Freeze and Feed-Hiding toggles are reserved for platform administrators.
                  </p>
                )}
              </div>

              {/* Deadline & Extensions */}
              <div className="p-4 rounded-2xl bg-[#18181c] border border-neutral-800 space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Clock size={15} className="text-[#ff6a2b]" />
                  <span>Voting Deadline Extension</span>
                </h4>
                <p className="text-xs text-neutral-400">
                  Current voting deadline:{' '}
                  <span className="text-white font-bold">
                    {contest.voting_end ? new Date(contest.voting_end).toLocaleString() : 'No set deadline'}
                  </span>
                </p>

                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleExtendDeadline(1)}
                    className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-white border border-neutral-700 transition-colors"
                  >
                    +1 Day
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleExtendDeadline(3)}
                    className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-white border border-neutral-700 transition-colors"
                  >
                    +3 Days
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleExtendDeadline(7)}
                    className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-white border border-neutral-700 transition-colors"
                  >
                    +7 Days
                  </button>
                </div>
              </div>

              {/* Force Status Switcher (Super Admin Only) */}
              {isSuperAdmin && (
                <div className="p-4 rounded-2xl bg-[#18181c] border border-neutral-800 space-y-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Layers size={15} className="text-amber-400" />
                    <span>Force Contest Phase (Emergency Jump)</span>
                  </h4>
                  <p className="text-xs text-neutral-400">
                    Immediately change the lifecycle state of this contest without waiting for automated timers:
                  </p>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    {[
                      { id: 'registration', label: 'Registration' },
                      { id: 'active', label: 'Active Voting' },
                      { id: 'paused', label: 'Paused / Frozen' },
                      { id: 'completed', label: 'Completed' },
                    ].map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        disabled={saving || status === st.id}
                        onClick={() => handleForceStatus(st.id)}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-colors border ${
                          status === st.id
                            ? 'bg-[#ff6a2b] text-white border-[#ff6a2b]'
                            : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border-neutral-700'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* TAB 3: PARTICIPANTS & BATTLE COMPETITORS                       */}
          {/* ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'participants' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Competitor & Work Management</h3>
                  <p className="text-xs text-neutral-400">
                    Edit photos, rename works, disqualify violaters, or reset suspicious votes.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddingCompetitor(!isAddingCompetitor)}
                  className="px-3.5 py-1.5 rounded-xl bg-[#ff6a2b] hover:bg-[#ff7a3d] text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Plus size={14} />
                  <span>Add Competitor</span>
                </button>
              </div>

              {/* Add Competitor Form */}
              {isAddingCompetitor && (
                <form
                  onSubmit={handleAddCompetitor}
                  className="p-4 rounded-2xl bg-[#18181c] border border-[#ff6a2b]/40 space-y-3 animate-fade-in"
                >
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider text-[#ff6a2b]">
                    New Competitor / Photo Entry
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-400 mb-1">
                        Work / Entrant Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={newCompName}
                        onChange={(e) => setNewCompName(e.target.value)}
                        placeholder="e.g. Neon Tokyo Alleyway"
                        className="w-full bg-[#121215] border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-400 mb-1">
                        Photo URL *
                      </label>
                      <input
                        type="url"
                        required
                        value={newCompPhoto}
                        onChange={(e) => setNewCompPhoto(e.target.value)}
                        placeholder="https://images.unsplash.com/..."
                        className="w-full bg-[#121215] border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-400 mb-1">
                      Description / Author Note (Optional)
                    </label>
                    <input
                      type="text"
                      value={newCompDesc}
                      onChange={(e) => setNewCompDesc(e.target.value)}
                      placeholder="Shot with Leica M11, 35mm f/1.4"
                      className="w-full bg-[#121215] border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddingCompetitor(false)}
                      className="px-3 py-1.5 rounded-lg bg-neutral-800 text-xs text-neutral-300 font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-4 py-1.5 rounded-lg bg-[#ff6a2b] hover:bg-[#ff7a3d] text-xs font-bold text-white"
                    >
                      Save Competitor
                    </button>
                  </div>
                </form>
              )}

              {/* Edit Participant Inline Modal */}
              {editingParticipant && (
                <div className="p-4 rounded-2xl bg-[#18181c] border border-emerald-500/40 space-y-3 animate-fade-in">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider text-emerald-400">
                    Edit Entrant: {editingParticipant.profiles?.username || 'Entrant'}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-400 mb-1">
                        Title / Work Name
                      </label>
                      <input
                        type="text"
                        value={editPartName}
                        onChange={(e) => setEditPartName(e.target.value)}
                        className="w-full bg-[#121215] border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-neutral-400 mb-1">
                        Photo URL
                      </label>
                      <input
                        type="url"
                        value={editPartPhoto}
                        onChange={(e) => setEditPartPhoto(e.target.value)}
                        className="w-full bg-[#121215] border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-400 mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      value={editPartDesc}
                      onChange={(e) => setEditPartDesc(e.target.value)}
                      className="w-full bg-[#121215] border border-neutral-700 rounded-lg px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setEditingParticipant(null)}
                      className="px-3 py-1.5 rounded-lg bg-neutral-800 text-xs text-neutral-300 font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={handleSaveParticipantEdit}
                      className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              )}

              {/* Participant List Cards */}
              {loadingParticipants ? (
                <div className="py-8 text-center text-xs text-neutral-400">Loading participants...</div>
              ) : participants.length === 0 ? (
                <div className="p-8 text-center bg-[#18181c] rounded-2xl border border-neutral-800">
                  <p className="text-xs text-neutral-400">No competitors in this contest yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {participants.map((p) => {
                    const photo = p.submission_data?.photos?.[0];
                    const name = p.submission_data?.name || p.profiles?.display_name || p.profiles?.username || 'Entrant';
                    const author = p.profiles?.username ? `@${p.profiles.username}` : 'Author';

                    return (
                      <div
                        key={p.id}
                        className="p-3.5 rounded-2xl bg-[#18181c] border border-neutral-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-black shrink-0 border border-neutral-700">
                            {photo ? (
                              <LazyImage
                                src={photo}
                                alt={name}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-neutral-600">
                                <ImageIcon size={20} />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-white truncate">{name}</h4>
                            <p className="text-xs text-neutral-400 truncate">{author}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span
                                className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                  p.status === 'approved'
                                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                    : p.status === 'eliminated'
                                    ? 'bg-red-950 text-red-400 border border-red-800'
                                    : 'bg-neutral-800 text-neutral-300'
                                }`}
                              >
                                {p.status}
                              </span>
                              {p.submission_data?.description && (
                                <span className="text-[10px] text-neutral-500 truncate max-w-[200px]">
                                  {p.submission_data.description}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-wrap items-center gap-1.5 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingParticipant(p);
                              setEditPartName(p.submission_data?.name || '');
                              setEditPartPhoto(photo || '');
                              setEditPartDesc(p.submission_data?.description || '');
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-white flex items-center gap-1 transition-colors"
                          >
                            <Edit3 size={12} />
                            <span>Edit</span>
                          </button>

                          {isSuperAdmin && (
                            <button
                              type="button"
                              onClick={() => handleResetVotes(p.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-amber-400 flex items-center gap-1 transition-colors"
                              title="Clear votes for this entrant"
                            >
                              <RefreshCw size={12} />
                              <span>Reset Votes</span>
                            </button>
                          )}

                          {p.status !== 'eliminated' && (
                            <button
                              type="button"
                              onClick={() => handleDisqualifyParticipant(p.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-red-950/70 hover:bg-red-900 text-xs font-bold text-red-400 flex items-center gap-1 transition-colors border border-red-800/60"
                            >
                              <AlertTriangle size={12} />
                              <span>Disqualify</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDeleteParticipant(p.id)}
                            className="p-1.5 rounded-lg hover:bg-red-950 text-neutral-500 hover:text-red-400 transition-colors"
                            title="Delete entry"
                          >
                            <Trash2 size={14} />
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
          {/* TAB 4: DANGER & RAW INSPECTOR                                  */}
          {/* ══════════════════════════════════════════════════════════════ */}
          {activeTab === 'raw' && isSuperAdmin && (
            <div className="space-y-6">
              <div className="p-4 rounded-2xl bg-red-950/20 border border-red-800/50 space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-red-400 flex items-center gap-2">
                  <AlertTriangle size={16} />
                  <span>Danger Zone (Irreversible Actions)</span>
                </h4>
                <p className="text-xs text-neutral-400">
                  Permanently delete this contest, its participants, and all associated vote records.
                </p>

                {showDeleteConfirm ? (
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={handleDeleteContest}
                      className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs"
                    >
                      Yes, Permanently Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 font-bold text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-4 py-2 rounded-xl bg-red-900/60 hover:bg-red-900 text-red-300 font-bold text-xs border border-red-800"
                  >
                    Delete Contest
                  </button>
                )}
              </div>

              {/* RAW Object Data Inspector */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
                  Raw Contest Object (Database Record)
                </span>
                <pre className="p-4 rounded-2xl bg-[#0b0b0d] border border-neutral-800 text-[11px] text-emerald-400 font-mono overflow-x-auto max-h-60">
                  {JSON.stringify(contest, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
