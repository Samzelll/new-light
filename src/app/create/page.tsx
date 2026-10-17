"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  Swords,
  Trophy,
  Upload,
  Image as ImageIcon,
  Sparkles,
  Check,
  AlertCircle,
  Clock,
  Layers,
  ChevronRight,
  Link as LinkIcon,
  AtSign,
  Camera,
  CheckCircle2,
  Info,
  Type,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { createContest, getCategories } from '@/services/contestService';
import { addBattleParticipants } from '@/services/participantService';
import type { ContestType, ContestStatus } from '@/constants/contestTypes';

interface CategoryItem {
  id: string;
  name: string;
}

export default function CreateContestPage() {
  const router = useRouter();
  const { isAuthenticated, isInitialized } = useAuth();

  // Mode: 'battle' (1v1 fast duel) or 'standard' (group tournament)
  const [selectedFormat, setSelectedFormat] = useState<'battle' | 'standard'>('battle');

  // Categories
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [categoryId, setCategoryId] = useState('');

  // General Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [rules, setRules] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [publishImmediately, setPublishImmediately] = useState(true);

  // Battle Specific: The 2 Competitors
  const [redName, setRedName] = useState('');
  const [redAuthor, setRedAuthor] = useState('');
  const [redPhoto, setRedPhoto] = useState('https://images.unsplash.com/photo-1514565131-fce0801e5785?w=700&q=80');

  const [greenName, setGreenName] = useState('');
  const [greenAuthor, setGreenAuthor] = useState('');
  const [greenPhoto, setGreenPhoto] = useState('https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=700&q=80');

  // Standard Contest Fields (only when selectedFormat === 'standard')
  const [groupSize, setGroupSize] = useState(6);
  const [maxParticipants, setMaxParticipants] = useState<number | ''>(48);
  const [standardStatus, setStandardStatus] = useState<ContestStatus>('registration');
  const [standardStep, setStandardStep] = useState<1 | 2>(1);

  const [isLoading, setIsLoading] = useState(false);
  const [formNotice, setFormNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Fetch categories on load
  useEffect(() => {
    async function loadCats() {
      const { data } = await getCategories();
      if (data && data.length > 0) {
        setCategories(data);
        setCategoryId(data[0].id);
      }
    }
    loadCats();
  }, []);

  // Handle image file upload into Data URL
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'cover' | 'red' | 'green') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const dataUrl = uploadEvent.target?.result as string;
        if (dataUrl) {
          if (target === 'cover') setCoverUrl(dataUrl);
          if (target === 'red') setRedPhoto(dataUrl);
          if (target === 'green') setGreenPhoto(dataUrl);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // ── SUBMIT BATTLE OR TOURNAMENT ──
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated) {
      setFormNotice({ type: 'error', message: 'You must be signed in to create a contest or battle.' });
      return;
    }

    if (!title.trim()) {
      setFormNotice({ type: 'error', message: 'Please enter a title.' });
      return;
    }

    // Battle Validation
    if (selectedFormat === 'battle') {
      if (!redName.trim() || !redPhoto.trim()) {
        setFormNotice({ type: 'error', message: 'Please provide Challenger 1 name and photo.' });
        return;
      }
      if (!greenName.trim() || !greenPhoto.trim()) {
        setFormNotice({ type: 'error', message: 'Please provide Challenger 2 name and photo.' });
        return;
      }
    }

    // Standard format step 1 validation
    if (selectedFormat === 'standard' && standardStep === 1) {
      setStandardStep(2);
      return;
    }

    setIsLoading(true);
    setFormNotice(null);

    try {
      const finalType: ContestType = selectedFormat === 'battle' ? 'battle' : 'standard';
      const finalStatus: ContestStatus = selectedFormat === 'battle'
        ? (publishImmediately ? 'active' : 'draft')
        : standardStatus;

      // Create contest
      const { data, error } = await createContest({
        title: title.trim(),
        description: description.trim() || undefined,
        rules: rules.trim() || undefined,
        category_id: selectedFormat === 'battle' ? undefined : (categoryId || undefined),
        type: finalType,
        status: finalStatus,
        cover_url: (coverUrl.trim() || (selectedFormat === 'battle' ? redPhoto : undefined)),
        group_size: selectedFormat === 'battle' ? 2 : groupSize,
        max_participants: selectedFormat === 'battle' ? 2 : (maxParticipants === '' ? undefined : Number(maxParticipants)),
      });

      if (error) {
        setFormNotice({ type: 'error', message: error });
        setIsLoading(false);
        return;
      }

      if (data) {
        // If Battle, immediately create the 2 competitors (no forced fake author handles)
        if (selectedFormat === 'battle') {
          const competitors = [
            {
              name: redName.trim(),
              author: redAuthor.trim() || undefined,
              photoUrl: redPhoto.trim(),
              description: 'Challenger 1',
            },
            {
              name: greenName.trim(),
              author: greenAuthor.trim() || undefined,
              photoUrl: greenPhoto.trim(),
              description: 'Challenger 2',
            },
          ];

          await addBattleParticipants(data.id, competitors);
        }

        setFormNotice({
          type: 'success',
          message: selectedFormat === 'battle'
            ? '🔥 Battle created and published! Redirecting to live duel...'
            : 'Contest created successfully! Redirecting...',
        });

        setTimeout(() => {
          router.push(`/contest/${data.id}`);
        }, 900);
      }
    } catch (err: any) {
      setFormNotice({ type: 'error', message: err.message || 'Failed to create.' });
      setIsLoading(false);
    }
  };

  if (!isInitialized) {
    return (
      <main className="page-container p-4 max-w-2xl mx-auto">
        <div className="h-64 rounded-2xl bg-neutral-900 animate-pulse" />
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="page-container flex justify-center items-center py-20 px-4 min-h-screen bg-[#0b0b0d] text-white">
        <div className="text-center max-w-md w-full bg-[#16161a] border-2 border-neutral-800 rounded-3xl p-8 space-y-5 shadow-2xl">
          <div className="text-4xl text-amber-500">🔒</div>
          <h2 className="text-xl font-black text-white">Sign in Required</h2>
          <p className="text-neutral-400 text-xs leading-relaxed">
            You must be signed in with an active account to publish a battle or launch a contest.
          </p>
          <button
            onClick={() => router.push('/auth')}
            className="w-full py-3.5 px-6 rounded-xl bg-[#ff6a2b] hover:bg-[#ff7a3d] text-white font-bold text-sm shadow-lg shadow-[#ff6a2b]/25 transition-all"
          >
            Sign In / Register
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0b0b0d] text-[#F9F9F9] p-3 sm:p-6 pb-28 font-sans">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* ── Top Header ── */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              aria-label="Back to home"
              className="w-10 h-10 rounded-xl bg-[#18181c] hover:bg-neutral-800 text-white flex items-center justify-center transition-colors border-2 border-neutral-700 shrink-0"
            >
              <ArrowLeft size={20} strokeWidth={2.5} />
            </Link>
            <div>
              <h1 className="text-lg sm:text-xl font-black text-white leading-none">
                {selectedFormat === 'battle' ? 'Create 1v1 Battle' : 'Create Contest'}
              </h1>
              <span className="text-[11px] sm:text-xs text-neutral-300 mt-1 block">
                {selectedFormat === 'battle'
                  ? '⚡ 1v1 photo showdown: direct to live voting without group phases'
                  : '🏆 Multi-stage tournament with applications and groups'}
              </span>
            </div>
          </div>
        </div>

        {/* ── Format Selector Toggle (Mobile-First High Contrast Cards) ── */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => {
              setSelectedFormat('battle');
              setStandardStep(1);
            }}
            className={`p-3.5 sm:p-4 rounded-2xl border-2 text-left transition-all flex flex-col gap-1 cursor-pointer active:scale-98 ${
              selectedFormat === 'battle'
                ? 'border-[#ff6a2b] bg-[#ff6a2b]/20 text-white shadow-xl shadow-[#ff6a2b]/20 ring-2 ring-[#ff6a2b]/40'
                : 'border-neutral-600 bg-[#141418] text-neutral-300 hover:text-white hover:border-neutral-500'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-black text-sm sm:text-base flex items-center gap-1.5 text-white">
                <Swords size={18} className="text-[#ff6a2b]" />
                <span>1v1 Battle</span>
              </span>
              {selectedFormat === 'battle' && (
                <span className="w-2.5 h-2.5 rounded-full bg-[#ff6a2b] shadow-[0_0_10px_#ff6a2b]" />
              )}
            </div>
            <span className="text-[11px] text-neutral-300 leading-tight">
              2 Photos · No Groups · Live Voting
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedFormat('standard')}
            className={`p-3.5 sm:p-4 rounded-2xl border-2 text-left transition-all flex flex-col gap-1 cursor-pointer active:scale-98 ${
              selectedFormat === 'standard'
                ? 'border-[#ff6a2b] bg-[#ff6a2b]/20 text-white shadow-xl shadow-[#ff6a2b]/20 ring-2 ring-[#ff6a2b]/40'
                : 'border-neutral-600 bg-[#141418] text-neutral-300 hover:text-white hover:border-neutral-500'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-black text-sm sm:text-base flex items-center gap-1.5 text-white">
                <Trophy size={18} className="text-[#ff6a2b]" />
                <span>Tournament</span>
              </span>
              {selectedFormat === 'standard' && (
                <span className="w-2.5 h-2.5 rounded-full bg-[#ff6a2b] shadow-[0_0_10px_#ff6a2b]" />
              )}
            </div>
            <span className="text-[11px] text-neutral-300 leading-tight">
              Brackets · Registration · Group Rounds
            </span>
          </button>
        </div>

        {/* ── Notification Banner ── */}
        {formNotice && (
          <div
            className={`p-4 rounded-2xl text-xs sm:text-sm font-bold border flex items-center gap-2.5 animate-fade-in ${
              formNotice.type === 'error'
                ? 'bg-red-950/80 border-red-700 text-red-200'
                : 'bg-emerald-950/80 border-emerald-700 text-emerald-200'
            }`}
          >
            <AlertCircle size={18} className="shrink-0" />
            <span>{formNotice.message}</span>
          </div>
        )}

        {/* ── Main Creation Form ── */}
        <form onSubmit={onSubmit} className="space-y-6">
          {/* ══════════════════════════════════════════════════════════════ */}
          {/* SECTION A: BATTLE DETAILS (1v1 SHOWDOWN)                       */}
          {/* ══════════════════════════════════════════════════════════════ */}
          {selectedFormat === 'battle' ? (
            <div className="space-y-6 animate-fade-in">
              {/* ⚡ Callout: Clarifying Battle Rules */}
              <div className="p-4 sm:p-5 rounded-3xl bg-amber-500/10 border-2 border-amber-500/50 text-amber-200 text-xs sm:text-sm space-y-2 shadow-lg">
                <div className="flex items-center gap-2 text-amber-300 font-black uppercase tracking-wider text-xs sm:text-sm">
                  <Sparkles size={16} className="text-amber-400 shrink-0" />
                  <span>1v1 Battle Rules · Instant Duel</span>
                </div>
                <div className="space-y-1 text-neutral-300 text-xs sm:text-[13px] leading-relaxed">
                  <p>
                    • <strong className="text-white">No Group Stages:</strong> exactly two photos compete head-to-head.
                  </p>
                  <p>
                    • <strong className="text-white">No Participant Limits:</strong> open for live community voting right away.
                  </p>
                  <p>
                    • <strong className="text-white">Instant Publishing:</strong> publishes directly into the live voting duel arena!
                  </p>
                </div>
              </div>

              {/* 1. General Battle Info Card (Category Removed) */}
              <div className="p-4 sm:p-6 rounded-3xl bg-[#141418] border-2 border-neutral-700/80 space-y-5 shadow-2xl">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-[#ff6a2b]/20 text-[#ff6a2b] flex items-center justify-center font-bold text-xs border border-[#ff6a2b]/30">
                      1
                    </span>
                    <span>Battle Information</span>
                  </h3>
                  <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                    General
                  </span>
                </div>

                {/* Field 1: Battle Title (High Contrast Mobile Input) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="battle-title-input"
                      className="text-xs sm:text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5"
                    >
                      <Type size={14} className="text-[#ff6a2b]" />
                      <span>Battle Title</span>
                    </label>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#ff6a2b]/20 text-[#ff6a2b] border border-[#ff6a2b]/40">
                      Required *
                    </span>
                  </div>
                  <span className="text-[11px] text-neutral-400 block">
                    Catchy title for the duel (e.g. &ldquo;Neon Tokyo: Shinjuku vs Shibuya&rdquo;)
                  </span>
                  {/* Distinct, deep-contrast input container */}
                  <div className="relative rounded-2xl bg-[#070709] border-2 border-neutral-500 hover:border-neutral-400 focus-within:border-[#ff6a2b] focus-within:ring-4 focus-within:ring-[#ff6a2b]/20 transition-all shadow-inner">
                    <input
                      id="battle-title-input"
                      type="text"
                      required
                      placeholder="Enter battle title..."
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full bg-transparent px-4 py-3.5 text-sm sm:text-base text-white font-bold placeholder:text-neutral-500 placeholder:font-normal placeholder:italic focus:outline-none"
                    />
                  </div>
                </div>

                {/* Field 2: Description (Optional) */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="battle-description-input"
                    className="text-xs sm:text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5"
                  >
                    <Sparkles size={14} className="text-neutral-400" />
                    <span>Description & Notes (Optional)</span>
                  </label>
                  <div className="relative rounded-2xl bg-[#070709] border-2 border-neutral-600 hover:border-neutral-500 focus-within:border-[#ff6a2b] focus-within:ring-4 focus-within:ring-[#ff6a2b]/20 transition-all shadow-inner">
                    <textarea
                      id="battle-description-input"
                      rows={2}
                      placeholder="Theme context, mood, or camera setup details..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full bg-transparent px-4 py-3 text-sm text-white font-medium placeholder:text-neutral-500 placeholder:font-normal placeholder:italic focus:outline-none resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* ══════════════════════════════════════════════════════════ */}
              {/* THE 2 COMPETITORS (RED CORNER VS GREEN CORNER)             */}
              {/* ══════════════════════════════════════════════════════════ */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-[#ff6a2b]/20 text-[#ff6a2b] flex items-center justify-center font-bold text-xs border border-[#ff6a2b]/30">
                      2
                    </span>
                    <span>The Two Competitors (1 on 1)</span>
                  </h3>
                  <span className="text-[11px] text-neutral-400 font-bold uppercase tracking-wider">
                    Exactly 2 works
                  </span>
                </div>

                {/* 🔴 RED CORNER (Challenger 1) */}
                <div className="p-4 sm:p-6 rounded-3xl bg-[#170e13] border-2 border-red-500/80 space-y-4 shadow-2xl">
                  {/* Header Corner Badge */}
                  <div className="flex items-center justify-between border-b border-red-500/40 pb-3">
                    <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-red-400 flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_10px_#ef4444]" />
                      <span>🔴 Challenger 1 (Top Photo)</span>
                    </span>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/40">
                      Top in Arena
                    </span>
                  </div>

                  {/* Inputs Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Work Title */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor="red-name-input"
                          className="text-xs font-black text-neutral-200 uppercase tracking-wider flex items-center gap-1.5"
                        >
                          <Camera size={13} className="text-red-400" />
                          <span>Work Title *</span>
                        </label>
                        <span className="text-[10px] font-bold text-red-400">REQUIRED</span>
                      </div>
                      <div className="relative rounded-2xl bg-[#080507] border-2 border-red-500/70 hover:border-red-400 focus-within:border-red-400 focus-within:ring-4 focus-within:ring-red-500/20 transition-all shadow-inner">
                        <input
                          id="red-name-input"
                          type="text"
                          required
                          placeholder="e.g. Shinjuku in Rain"
                          value={redName}
                          onChange={(e) => setRedName(e.target.value)}
                          className="w-full bg-transparent px-3.5 py-3 text-sm sm:text-base text-white font-bold placeholder:text-neutral-500 placeholder:font-normal placeholder:italic focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Author (Optional) */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor="red-author-input"
                          className="text-xs font-black text-neutral-200 uppercase tracking-wider flex items-center gap-1.5"
                        >
                          <AtSign size={13} className="text-red-400" />
                          <span>Author (Optional)</span>
                        </label>
                        <span className="text-[10px] font-bold text-neutral-400">OPTIONAL</span>
                      </div>
                      <div className="relative rounded-2xl bg-[#080507] border-2 border-neutral-700 hover:border-neutral-500 focus-within:border-red-400 focus-within:ring-4 focus-within:ring-red-500/20 transition-all shadow-inner">
                        <input
                          id="red-author-input"
                          type="text"
                          placeholder="Leave empty for title only"
                          value={redAuthor}
                          onChange={(e) => setRedAuthor(e.target.value)}
                          className="w-full bg-transparent px-3.5 py-3 text-sm sm:text-base text-white font-medium placeholder:text-neutral-500 placeholder:font-normal placeholder:italic focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Photo Input */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
                        <ImageIcon size={13} className="text-red-400" />
                        <span>Work Photo *</span>
                      </label>
                      <span className="text-[10px] font-bold text-neutral-400 uppercase">
                        Upload file or enter URL
                      </span>
                    </div>

                    {/* Upload button + URL input */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <label className="py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 border-2 border-neutral-600 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors active:scale-98 shadow-md">
                        <Upload size={16} className="text-red-400" />
                        <span>📸 Upload from device</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, 'red')}
                        />
                      </label>

                      <div className="flex-1 relative rounded-xl bg-[#080507] border-2 border-red-500/70 hover:border-red-400 focus-within:border-red-400 focus-within:ring-2 focus-within:ring-red-500/20 transition-all">
                        <div className="flex items-center px-3">
                          <LinkIcon size={14} className="text-red-400/80 shrink-0 mr-2" />
                          <input
                            type="url"
                            required
                            placeholder="Or paste photo URL (https://...)"
                            value={redPhoto}
                            onChange={(e) => setRedPhoto(e.target.value)}
                            className="w-full bg-transparent py-2.5 text-xs sm:text-sm text-white font-mono placeholder:text-neutral-500 placeholder:italic focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Quick presets */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] text-neutral-400 font-bold uppercase">Quick Samples:</span>
                      {[
                        { label: 'Rain Alley', url: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=700&q=80' },
                        { label: 'Sneakers', url: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=700&q=80' },
                        { label: 'Tennis', url: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=700&q=80' },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setRedPhoto(preset.url)}
                          className="px-2.5 py-1 rounded-lg text-[10px] bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold border border-neutral-700 transition-colors"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>

                    {/* Live Thumbnail Preview */}
                    {redPhoto && (
                      <div className="relative w-full h-40 rounded-2xl overflow-hidden bg-black border-2 border-red-500/80 mt-2 shadow-lg">
                        <Image
                          src={redPhoto}
                          alt="Challenger 1 preview"
                          fill
                          className="object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />
                        <span className="absolute top-2 left-2 text-[10px] font-black px-2.5 py-1 rounded-full bg-red-600 text-white shadow-md">
                          🔴 Top Card in Duel
                        </span>
                        <div className="absolute bottom-2.5 left-3 text-white text-xs font-bold drop-shadow-md">
                          <div>{redName || 'Work Title 1'}</div>
                          {redAuthor && <div className="text-[11px] text-neutral-300 font-normal">{redAuthor}</div>}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 🟢 GREEN CORNER (Challenger 2) */}
                <div className="p-4 sm:p-6 rounded-3xl bg-[#0c1611] border-2 border-emerald-500/80 space-y-4 shadow-2xl">
                  {/* Header Corner Badge */}
                  <div className="flex items-center justify-between border-b border-emerald-500/40 pb-3">
                    <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]" />
                      <span>🟢 Challenger 2 (Bottom Photo)</span>
                    </span>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      Bottom in Arena
                    </span>
                  </div>

                  {/* Inputs Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Work Title */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor="green-name-input"
                          className="text-xs font-black text-neutral-200 uppercase tracking-wider flex items-center gap-1.5"
                        >
                          <Camera size={13} className="text-emerald-400" />
                          <span>Work Title *</span>
                        </label>
                        <span className="text-[10px] font-bold text-emerald-400">REQUIRED</span>
                      </div>
                      <div className="relative rounded-2xl bg-[#050906] border-2 border-emerald-500/70 hover:border-emerald-400 focus-within:border-emerald-400 focus-within:ring-4 focus-within:ring-emerald-500/20 transition-all shadow-inner">
                        <input
                          id="green-name-input"
                          type="text"
                          required
                          placeholder="e.g. Neon Crossing"
                          value={greenName}
                          onChange={(e) => setGreenName(e.target.value)}
                          className="w-full bg-transparent px-3.5 py-3 text-sm sm:text-base text-white font-bold placeholder:text-neutral-500 placeholder:font-normal placeholder:italic focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Author (Optional) */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor="green-author-input"
                          className="text-xs font-black text-neutral-200 uppercase tracking-wider flex items-center gap-1.5"
                        >
                          <AtSign size={13} className="text-emerald-400" />
                          <span>Author (Optional)</span>
                        </label>
                        <span className="text-[10px] font-bold text-neutral-400">OPTIONAL</span>
                      </div>
                      <div className="relative rounded-2xl bg-[#050906] border-2 border-neutral-700 hover:border-neutral-500 focus-within:border-emerald-400 focus-within:ring-4 focus-within:ring-emerald-500/20 transition-all shadow-inner">
                        <input
                          id="green-author-input"
                          type="text"
                          placeholder="Leave empty for title only"
                          value={greenAuthor}
                          onChange={(e) => setGreenAuthor(e.target.value)}
                          className="w-full bg-transparent px-3.5 py-3 text-sm sm:text-base text-white font-medium placeholder:text-neutral-500 placeholder:font-normal placeholder:italic focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Photo Input */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
                        <ImageIcon size={13} className="text-emerald-400" />
                        <span>Work Photo *</span>
                      </label>
                      <span className="text-[10px] font-bold text-neutral-400 uppercase">
                        Upload file or enter URL
                      </span>
                    </div>

                    {/* Upload button + URL input */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <label className="py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 border-2 border-neutral-600 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors active:scale-98 shadow-md">
                        <Upload size={16} className="text-emerald-400" />
                        <span>📸 Upload from device</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload(e, 'green')}
                        />
                      </label>

                      <div className="flex-1 relative rounded-xl bg-[#050906] border-2 border-emerald-500/70 hover:border-emerald-400 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
                        <div className="flex items-center px-3">
                          <LinkIcon size={14} className="text-emerald-400/80 shrink-0 mr-2" />
                          <input
                            type="url"
                            required
                            placeholder="Or paste photo URL (https://...)"
                            value={greenPhoto}
                            onChange={(e) => setGreenPhoto(e.target.value)}
                            className="w-full bg-transparent py-2.5 text-xs sm:text-sm text-white font-mono placeholder:text-neutral-500 placeholder:italic focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Quick presets */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] text-neutral-400 font-bold uppercase">Quick Samples:</span>
                      {[
                        { label: 'Cyber Shibuya', url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=700&q=80' },
                        { label: 'Retro Runner', url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=700&q=80' },
                        { label: 'Padel Serve', url: 'https://images.unsplash.com/photo-1622163642998-1ea32b0bbc67?w=700&q=80' },
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setGreenPhoto(preset.url)}
                          className="px-2.5 py-1 rounded-lg text-[10px] bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold border border-neutral-700 transition-colors"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>

                    {/* Live Thumbnail Preview */}
                    {greenPhoto && (
                      <div className="relative w-full h-40 rounded-2xl overflow-hidden bg-black border-2 border-emerald-500/80 mt-2 shadow-lg">
                        <Image
                          src={greenPhoto}
                          alt="Challenger 2 preview"
                          fill
                          className="object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />
                        <span className="absolute top-2 left-2 text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-600 text-white shadow-md">
                          🟢 Bottom Card in Duel
                        </span>
                        <div className="absolute bottom-2.5 left-3 text-white text-xs font-bold drop-shadow-md">
                          <div>{greenName || 'Work Title 2'}</div>
                          {greenAuthor && <div className="text-[11px] text-neutral-300 font-normal">{greenAuthor}</div>}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Instant Publishing Card ── */}
              <div className="p-4 sm:p-5 rounded-3xl bg-[#141418] border-2 border-neutral-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl">
                <div>
                  <span className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
                    <CheckCircle2 size={16} className="text-emerald-400" />
                    <span>Publishing Status</span>
                  </span>
                  <span className="text-[11px] sm:text-xs text-neutral-400 block mt-0.5">
                    {publishImmediately
                      ? '🚀 Live immediately: voters can cast ballots right after creation.'
                      : '🔒 Draft: saved privately until you choose to publish.'}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setPublishImmediately(true)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all border-2 ${
                      publishImmediately
                        ? 'bg-emerald-600 text-white border-emerald-400 shadow-lg shadow-emerald-600/30'
                        : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-white'
                    }`}
                  >
                    ✓ Live Voting Now
                  </button>

                  <button
                    type="button"
                    onClick={() => setPublishImmediately(false)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all border-2 ${
                      !publishImmediately
                        ? 'bg-amber-600 text-white border-amber-400 shadow-lg'
                        : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-white'
                    }`}
                  >
                    Save as Draft
                  </button>
                </div>
              </div>

              {/* ── Big Prominent Mobile-First Publish Button ── */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 sm:py-5 px-6 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-[#ff6a2b] via-[#ff7a3d] to-[#ff5500] hover:from-[#ff7a3d] hover:to-[#ff6a2b] text-white font-black text-base sm:text-lg shadow-2xl shadow-[#ff6a2b]/40 flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] cursor-pointer border-2 border-white/20"
              >
                <Swords size={22} className="shrink-0" />
                <span>{isLoading ? 'Creating Battle...' : '🔥 Publish Battle & Start Voting'}</span>
              </button>
            </div>
          ) : (
            /* ══════════════════════════════════════════════════════════════ */
            /* SECTION B: STANDARD TOURNAMENT CONTEST                         */
            /* ══════════════════════════════════════════════════════════════ */
            <div className="space-y-6 animate-fade-in">
              {standardStep === 1 ? (
                <div className="p-4 sm:p-5 rounded-3xl bg-[#141418] border-2 border-neutral-800 space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-wider text-neutral-400 border-b border-neutral-800 pb-2">
                    1. Tournament Information
                  </h3>

                  <div>
                    <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
                      Tournament Title *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Annual Architecture Photography 2026"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full bg-[#18181c] border-2 border-neutral-700 focus:border-[#ff6a2b] rounded-xl px-4 py-3.5 text-sm sm:text-base text-white focus:outline-none transition-all placeholder:text-neutral-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
                      Category
                    </label>
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="w-full bg-[#18181c] border-2 border-neutral-700 focus:border-[#ff6a2b] rounded-xl px-4 py-3.5 text-sm sm:text-base text-white focus:outline-none transition-all cursor-pointer"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
                      Description
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Theme criteria, background story..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full bg-[#18181c] border-2 border-neutral-700 focus:border-[#ff6a2b] rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition-all placeholder:text-neutral-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
                      Rules & Requirements
                    </label>
                    <textarea
                      rows={3}
                      placeholder="1 submission per entrant, high-resolution original works only..."
                      value={rules}
                      onChange={(e) => setRules(e.target.value)}
                      className="w-full bg-[#18181c] border-2 border-neutral-700 focus:border-[#ff6a2b] rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition-all placeholder:text-neutral-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
                      Cover Photo URL
                    </label>
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/..."
                      value={coverUrl}
                      onChange={(e) => setCoverUrl(e.target.value)}
                      className="w-full bg-[#18181c] border-2 border-neutral-700 focus:border-[#ff6a2b] rounded-xl px-4 py-3 text-xs sm:text-sm text-white focus:outline-none transition-all placeholder:text-neutral-500"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (!title.trim()) {
                        setFormNotice({ type: 'error', message: 'Please enter a title before continuing.' });
                        return;
                      }
                      setFormNotice(null);
                      setStandardStep(2);
                    }}
                    className="w-full py-3.5 px-6 rounded-2xl bg-[#ff6a2b] hover:bg-[#ff7a3d] text-white font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                  >
                    <span>Next: Tournament Stages →</span>
                  </button>
                </div>
              ) : (
                <div className="p-4 sm:p-5 rounded-3xl bg-[#141418] border-2 border-neutral-800 space-y-5 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                    <h3 className="text-xs font-black uppercase tracking-wider text-neutral-400">
                      2. Group Sizes & Application Pool
                    </h3>
                    <button
                      type="button"
                      onClick={() => setStandardStep(1)}
                      className="text-xs text-[#ff6a2b] hover:underline font-bold"
                    >
                      ← Back to Details
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-2">
                      Initial Phase
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { id: 'registration', label: 'Registration Open', desc: 'Accept participant applications immediately.' },
                        { id: 'active', label: 'Direct Voting', desc: 'Jump straight into live round voting.' },
                      ].map((st) => (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => setStandardStatus(st.id as ContestStatus)}
                          className={`p-3 rounded-xl border-2 text-left transition-all ${
                            standardStatus === st.id
                              ? 'border-[#ff6a2b] bg-[#ff6a2b]/15 text-white'
                              : 'border-neutral-700 bg-[#18181c] text-neutral-400'
                          }`}
                        >
                          <span className="block font-bold text-xs text-white">{st.label}</span>
                          <span className="text-[11px] text-neutral-400">{st.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
                        Group Size (Participants per Group)
                      </label>
                      <input
                        type="number"
                        min={2}
                        max={16}
                        value={groupSize}
                        onChange={(e) => setGroupSize(Number(e.target.value))}
                        className="w-full bg-[#18181c] border-2 border-neutral-700 focus:border-[#ff6a2b] rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
                        Max Participants Capacity
                      </label>
                      <input
                        type="number"
                        min={4}
                        max={120}
                        placeholder="e.g. 48"
                        value={maxParticipants === '' ? '' : maxParticipants}
                        onChange={(e) => setMaxParticipants(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full bg-[#18181c] border-2 border-neutral-700 focus:border-[#ff6a2b] rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setStandardStep(1)}
                      className="py-3.5 px-5 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-xs"
                    >
                      ← Back
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex-1 py-3.5 px-6 rounded-2xl bg-[#ff6a2b] hover:bg-[#ff7a3d] text-white font-bold text-sm shadow-lg shadow-[#ff6a2b]/25"
                    >
                      {isLoading ? 'Creating Contest...' : 'Publish Tournament Contest ✨'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </form>
      </div>
    </main>
  );
}
