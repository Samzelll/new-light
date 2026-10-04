"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { createContest } from '@/services/contestService';
import { addBattleParticipants } from '@/services/participantService';
import type { ContestType, ContestStatus } from '@/constants/contestTypes';

export default function CreateContestPage() {
  const router = useRouter();
  const { isAuthenticated, isInitialized } = useAuth();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [rules, setRules] = useState('');
  const [type, setType] = useState<ContestType>('standard');
  const [status, setStatus] = useState<ContestStatus>('registration');
  const [coverUrl, setCoverUrl] = useState('');
  const [groupSize, setGroupSize] = useState(6);
  const [maxParticipants, setMaxParticipants] = useState<number | ''>('');
  
  // Battle format competitors (only used when type === 'battle')
  const [battleCompetitors, setBattleCompetitors] = useState<Array<{ name: string; photoUrl: string; description: string }>>([
    { name: 'Red Corner Challenger', photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500', description: 'Defending champion' },
    { name: 'Blue Corner Challenger', photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500', description: 'Rising contender' },
  ]);

  const [step, setStep] = useState<1 | 2>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [formNotice, setFormNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      if (!title.trim()) {
        setFormNotice({ type: 'error', message: 'Please add a contest title before continuing.' });
        return;
      }
      setFormNotice(null);
      setStep(2);
      return;
    }

    if (!isAuthenticated) {
      setFormNotice({ type: 'error', message: 'You must be signed in to create a contest.' });
      return;
    }

    setIsLoading(true);
    setFormNotice(null);

    const cappedParticipants = maxParticipants === '' ? null : Math.min(maxParticipants, 120);

    try {
      const { data, error } = await createContest({
        title,
        description,
        rules,
        type,
        status,
        cover_url: coverUrl.trim() || undefined,
        group_size: groupSize,
        max_participants: cappedParticipants ?? undefined,
      });

      if (error) {
        setFormNotice({ type: 'error', message: error });
      } else if (data) {
        if (type === 'battle' && battleCompetitors.length > 0) {
          await addBattleParticipants(data.id, battleCompetitors);
        }
        setFormNotice({ type: 'success', message: 'Contest & battle competitors created successfully!' });
        setTimeout(() => {
          router.push(`/contest/${data.id}`);
        }, 800);
      }
    } catch (err: any) {
      setFormNotice({ type: 'error', message: err.message || 'Failed to create contest.' });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isInitialized) {
    return (
      <main className="page-container space-y-6">
        <div className="skeleton h-[180px]" />
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="page-container flex justify-center items-center py-20">
        <div className="card text-center max-w-md bg-surface-800 border-surface-700 p-8 space-y-6">
          <div className="text-4xl text-brand-400">🔒</div>
          <h2 className="text-xl font-bold text-white">Sign in Required</h2>
          <p className="text-gray-400 text-sm">
            You need to be signed in to launch a new contest.
          </p>
          <button onClick={() => router.push('/auth')} className="btn btn-primary w-full py-3">
            Sign In / Register
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="page-container space-y-8 animate-fade-in max-w-3xl mx-auto">
      <div className="card bg-surface-800 border-surface-600 p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-surface-700 pb-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              aria-label="Назад"
              className="w-9 h-9 rounded-xl bg-[#333333] hover:bg-[#484848] text-[#F9F9F9] flex items-center justify-center transition-colors border border-[#484848]"
            >
              <ArrowLeft size={18} strokeWidth={2.5} />
            </Link>
            <h1 className="text-xl sm:text-2xl font-bold text-white">Создать конкурс</h1>
          </div>
          <div className="flex gap-2">
            <span className={`badge ${step === 1 ? 'badge-orange' : 'badge-muted'} text-[10px] font-bold uppercase tracking-wider py-1 px-2.5`}>
              1 · Детали
            </span>
            <span className={`badge ${step === 2 ? 'badge-orange' : 'badge-muted'} text-[10px] font-bold uppercase tracking-wider py-1 px-2.5`}>
              2 · Настройки
            </span>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-6">
          {formNotice && (
            <div className={`p-4 text-sm font-semibold rounded-xl border text-center ${
              formNotice.type === 'error' 
                ? 'bg-accent-red/10 border-accent-red/20 text-accent-red' 
                : 'bg-accent-green/10 border-accent-green/20 text-accent-green'
            }`}>
              {formNotice.message}
            </div>
          )}

          {step === 1 ? (
            <div className="space-y-5">
              <div>
                <label className="label text-xs uppercase tracking-wider text-gray-400 mb-1 block">Contest Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Summer Photo Contest 2026"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="input"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="label text-xs uppercase tracking-wider text-gray-400 mb-1 block">Description</label>
                <textarea
                  placeholder="Describe the theme, guidelines, and criteria..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input"
                  rows={3}
                />
              </div>

              <div>
                <label className="label text-xs uppercase tracking-wider text-gray-400 mb-1 block">Rules & Requirements</label>
                <textarea
                  placeholder="e.g. 1 entry per participant. High resolution photos only."
                  value={rules}
                  onChange={(e) => setRules(e.target.value)}
                  className="input"
                  rows={3}
                />
              </div>

              <div>
                <label className="label text-xs uppercase tracking-wider text-gray-400 mb-1 block">Cover Image URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={coverUrl}
                  onChange={(e) => setCoverUrl(e.target.value)}
                  className="input"
                />
              </div>

              <div className="space-y-2">
                <label className="label text-xs uppercase tracking-wider text-gray-400 block">Contest Format</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setType('standard')}
                    className={`btn text-left p-4 rounded-xl border flex flex-col gap-1 ${
                      type === 'standard' 
                        ? 'border-brand-500 bg-brand-500/10 text-white' 
                        : 'border-surface-600 bg-surface-700/50 text-gray-400 hover:text-white'
                    }`}
                  >
                    <span className="font-bold text-sm">🏆 Standard Group Voting</span>
                    <span className="text-xs text-gray-400">Multiple participants arranged in voting groups.</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('battle')}
                    className={`btn text-left p-4 rounded-xl border flex flex-col gap-1 ${
                      type === 'battle' 
                        ? 'border-brand-500 bg-brand-500/10 text-white' 
                        : 'border-surface-600 bg-surface-700/50 text-gray-400 hover:text-white'
                    }`}
                  >
                    <span className="font-bold text-sm">⚔️ Live Battle Match</span>
                    <span className="text-xs text-gray-400">Head-to-head 1v1 live vote showdown.</span>
                  </button>
                </div>
              </div>

              {type === 'battle' && (
                <div className="p-5 rounded-2xl bg-surface-900 border border-accent-red/30 space-y-5 animate-fade-in">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-surface-700 pb-3">
                    <div>
                      <h3 className="font-bold text-white text-base flex items-center gap-2">
                        <span>⚔️</span> Creator Battle Competitors Setup
                      </h3>
                      <p className="text-xs text-gray-400">
                        As the battle creator, add all competitors with their photos, title, and item description.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setBattleCompetitors(prev => [...prev, { name: `Competitor ${prev.length + 1}`, photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600', description: '' }])}
                      className="btn btn-secondary text-xs py-1.5 px-3 self-start sm:self-auto shrink-0"
                    >
                      + Add Competitor
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {battleCompetitors.map((comp, idx) => (
                      <div key={idx} className="p-4 rounded-xl bg-surface-800 border border-surface-700 space-y-4 relative shadow-sm">
                        <div className="flex justify-between items-center border-b border-surface-700/60 pb-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-brand-400 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-brand-500"></span>
                            Competitor / Item #{idx + 1}
                          </span>
                          {battleCompetitors.length > 2 && (
                            <button
                              type="button"
                              onClick={() => setBattleCompetitors(prev => prev.filter((_, i) => i !== idx))}
                              className="text-xs text-red-400 hover:text-red-300 font-semibold"
                            >
                              Remove
                            </button>
                          )}
                        </div>

                        <div>
                          <label className="label text-[11px] uppercase tracking-wider text-gray-400 mb-1 block font-semibold">Item / Competitor Name *</label>
                          <input
                            type="text"
                            placeholder="e.g. Red Corner Fighter / Item A"
                            value={comp.name}
                            onChange={(e) => {
                              const val = e.target.value;
                              setBattleCompetitors(prev => prev.map((item, i) => i === idx ? { ...item, name: val } : item));
                            }}
                            className="input text-xs py-2"
                            required={type === 'battle'}
                          />
                        </div>

                        {/* Photo Input: File Upload or URL */}
                        <div className="space-y-2">
                          <label className="label text-[11px] uppercase tracking-wider text-gray-400 block font-semibold">Competitor Photo *</label>
                          
                          <div className="flex flex-wrap items-center gap-2">
                            <label className="btn btn-secondary text-xs py-1.5 px-3 cursor-pointer inline-flex items-center gap-1.5 font-medium">
                              <span>📷</span> Upload Image File
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onload = (uploadEvent) => {
                                      const dataUrl = uploadEvent.target?.result as string;
                                      if (dataUrl) {
                                        setBattleCompetitors(prev => prev.map((item, i) => i === idx ? { ...item, photoUrl: dataUrl } : item));
                                      }
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                              />
                            </label>
                            <span className="text-[10px] text-gray-500 uppercase font-semibold">or paste URL:</span>
                          </div>

                          <input
                            type="text"
                            placeholder="https://images.unsplash.com/..."
                            value={comp.photoUrl}
                            onChange={(e) => {
                              const val = e.target.value;
                              setBattleCompetitors(prev => prev.map((item, i) => i === idx ? { ...item, photoUrl: val } : item));
                            }}
                            className="input text-xs py-2 font-mono text-[11px]"
                            required={type === 'battle'}
                          />

                          {/* Quick Sample Presets */}
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            <span className="text-[10px] text-gray-400 self-center">Sample Photos:</span>
                            {[
                              { label: '🏋️ Combat', url: 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=600' },
                              { label: '👟 Sneakers', url: 'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=600' },
                              { label: '🎮 Gaming', url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600' },
                              { label: '🍕 Gourmet', url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600' },
                            ].map((preset) => (
                              <button
                                key={preset.label}
                                type="button"
                                onClick={() => setBattleCompetitors(prev => prev.map((item, i) => i === idx ? { ...item, photoUrl: preset.url } : item))}
                                className="px-2 py-0.5 rounded text-[10px] bg-surface-700 hover:bg-surface-600 text-gray-300 font-medium"
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {comp.photoUrl && (
                          <div className="aspect-square w-full max-h-48 rounded-xl overflow-hidden bg-surface-900 border border-surface-700 relative shadow-inner">
                            <img src={comp.photoUrl} alt={comp.name} className="object-cover w-full h-full" />
                            <div className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full backdrop-blur-sm">
                              Preview
                            </div>
                          </div>
                        )}

                        <div>
                          <label className="label text-[11px] uppercase tracking-wider text-gray-400 mb-1 block font-semibold">Item Description / Story / Stats</label>
                          <textarea
                            rows={3}
                            placeholder="Describe this competitor or item in detail..."
                            value={comp.description}
                            onChange={(e) => {
                              const val = e.target.value;
                              setBattleCompetitors(prev => prev.map((item, i) => i === idx ? { ...item, description: val } : item));
                            }}
                            className="input text-xs py-2 resize-y"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <label className="label text-xs uppercase tracking-wider text-gray-400 mb-2 block">Initial Status</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'registration', label: 'Registration Open', desc: 'Accept participant applications immediately.' },
                    { id: 'active', label: 'Active Voting', desc: 'Open for live voting on entries.' },
                    { id: 'draft', label: 'Draft', desc: 'Hidden until published.' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setStatus(item.id as ContestStatus)}
                      className={`btn text-left p-3.5 rounded-xl border flex flex-col gap-1 ${
                        status === item.id 
                          ? 'border-brand-500 bg-brand-500/10 text-white' 
                          : 'border-surface-600 bg-surface-700/50 text-gray-400 hover:text-white'
                      }`}
                    >
                      <span className="font-bold text-xs">{item.label}</span>
                      <span className="text-[11px] text-gray-400 leading-tight">{item.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label text-xs uppercase tracking-wider text-gray-400 mb-1 block">Group Size</label>
                  <input
                    type="number"
                    min={2}
                    max={20}
                    value={groupSize}
                    onChange={(e) => setGroupSize(Number(e.target.value))}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="label text-xs uppercase tracking-wider text-gray-400 mb-1 block">Max Participants (Optional)</label>
                  <input
                    type="number"
                    min={2}
                    max={120}
                    placeholder="Unlimited"
                    value={maxParticipants === '' ? '' : maxParticipants}
                    onChange={(e) => {
                      const val = e.target.value;
                      setMaxParticipants(val === '' ? '' : Number(val));
                    }}
                    className="input"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center gap-4 pt-4 border-t border-surface-700">
            {step === 2 ? (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="btn btn-secondary px-6 py-2.5 text-xs font-semibold"
                disabled={isLoading}
              >
                ← Back
              </button>
            ) : (
              <div />
            )}

            <button
              type="submit"
              className="btn btn-primary px-6 py-2.5 text-xs font-bold"
              disabled={isLoading}
            >
              {step === 1 ? 'Next: Settings →' : isLoading ? 'Creating Contest...' : 'Publish Contest ✨'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
