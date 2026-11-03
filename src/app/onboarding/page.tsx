"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  Zap,
  ArrowRight,
  ArrowLeft,
  X as XIcon,
  Check,
  Sparkles,
  Trophy,
} from 'lucide-react';

const SAMPLE_ENTRIES = [
  {
    id: 'sample-1',
    name: 'Cyber Neon Tokyo',
    author: '@kenji_lens',
    photo: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&q=80',
    percent: 58,
  },
  {
    id: 'sample-2',
    name: 'Alpine Sunrise Solitude',
    author: '@elena_peaks',
    photo: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&q=80',
    percent: 42,
  },
];

const CATEGORIES = [
  { id: 'photography', label: '📷 Street & Portrait Photo', desc: 'Raw aesthetic shots' },
  { id: 'sports', label: '⚡ Movement & Sports', desc: 'High adrenaline action' },
  { id: 'art', label: '🎨 Digital Art & Cyber', desc: 'Futuristic visual concepts' },
  { id: 'design', label: '✨ 3D & Product Design', desc: 'Crafted render showcases' },
  { id: 'nature', label: '🌿 Wild Nature & Wildlife', desc: 'Majestic landscapes' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);

  // Step 1: Interactive first vote state
  const [votedChoice, setVotedChoice] = useState<string | null>(null);

  // Step 2: Chosen interests
  const [selectedInterests, setSelectedInterests] = useState<string[]>(['photography', 'sports']);

  const handleExit = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('onboarded', 'true');
      localStorage.setItem('opinion_net_onboarded', 'true');
      if (selectedInterests.length > 0) {
        localStorage.setItem('user_interests', JSON.stringify(selectedInterests));
      }
    }
    router.push('/?tab=battles');
  };

  const handleNext = () => {
    if (currentStep < 2) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleExit();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const toggleInterest = (id: string) => {
    setSelectedInterests((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col items-center justify-between p-4 selection:bg-accent/30 font-sans">
      {/* Top Header */}
      <header className="w-full max-w-md flex items-center justify-between pt-3 pb-2">
        <button
          type="button"
          onClick={handleExit}
          className="text-xs font-bold uppercase tracking-tight text-ink flex items-center gap-1.5 hover:text-accent transition-colors font-display"
        >
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <span>Opinion Net</span>
        </button>

        <button
          type="button"
          onClick={handleExit}
          className="text-xs font-semibold text-muted hover:text-ink px-3 py-1 rounded-full bg-surface hover:bg-surface-2 border border-line transition-colors flex items-center gap-1"
        >
          <span>Skip</span>
          <XIcon size={14} />
        </button>
      </header>

      {/* Main Interactive Stage */}
      <div className="w-full max-w-md my-auto py-2">
        <AnimatePresence mode="wait">
          {/* STEP 1: INTERACTIVE FIRST VOTE */}
          {currentStep === 0 && (
            <motion.div
              key="step-0"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.22 }}
              className="bg-surface border border-line rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-0.5 rounded-full bg-accent/15 text-accent-soft text-[10px] font-bold uppercase tracking-wider">
                  Step 1 · First Experience
                </span>
                <span className="text-xs font-medium text-muted">
                  Tap your pick below
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl font-bold text-ink uppercase tracking-tight leading-tight font-display">
                Cast Your First Vote
              </h1>
              <p className="text-xs text-muted mt-1 mb-4">
                No bots or fake spikes. One tap decides who leads the arena.
              </p>

              {/* Interactive Dual Cards */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {SAMPLE_ENTRIES.map((entry) => {
                  const isSelected = votedChoice === entry.id;
                  return (
                    <div
                      key={entry.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setVotedChoice(entry.id)}
                      className={`relative aspect-[3/4] rounded-xl overflow-hidden cursor-pointer transition-all duration-300 border ${
                        isSelected
                          ? 'border-emerald-500 ring-2 ring-emerald-500/30 scale-[0.98] shadow-lg shadow-emerald-500/10'
                          : votedChoice
                          ? 'border-line opacity-60'
                          : 'border-line hover:border-line-strong active:scale-95'
                      }`}
                    >
                      <Image
                        src={entry.photo}
                        alt={entry.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 50vw, 200px"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />

                      {isSelected && (
                        <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full bg-emerald-600 text-[10px] font-bold text-white flex items-center gap-1 shadow-md">
                          <Check size={11} strokeWidth={3} />
                          <span>Voted</span>
                        </div>
                      )}

                      <div className="absolute bottom-2 inset-x-2 z-10">
                        <div className="text-[11px] font-bold text-ink truncate">
                          {entry.name}
                        </div>
                        <div className="text-[10px] text-muted truncate">
                          {entry.author}
                        </div>
                        {votedChoice && (
                          <div className="mt-1 text-xs font-bold text-emerald-400 tabular-nums">
                            {entry.percent}%
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reward Feedback on First Vote */}
              {votedChoice ? (
                <div className="p-3 rounded-xl bg-surface-2 border border-accent/30 flex items-center gap-2.5 animate-fade-in text-accent-soft text-xs">
                  <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center shrink-0">
                    <Sparkles size={16} className="text-accent" />
                  </div>
                  <div>
                    <div className="font-bold text-ink">+1.0 Trust Weight Unlocked!</div>
                    <div className="text-[11px] text-muted">
                      Your vote just shaped the real-time tournament standings.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-surface-2 border border-line text-center text-xs text-muted">
                  Tap either photo above to preview live split results.
                </div>
              )}
            </motion.div>
          )}

          {/* STEP 2: CHOOSE INTERESTS */}
          {currentStep === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.22 }}
              className="bg-surface border border-line rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-0.5 rounded-full bg-accent/15 text-accent-soft text-[10px] font-bold uppercase tracking-wider">
                  Step 2 · Personalization
                </span>
                <span className="text-xs font-medium text-muted">
                  {selectedInterests.length} selected
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl font-bold text-ink uppercase tracking-tight leading-tight font-display">
                Pick Your Interests
              </h1>
              <p className="text-xs text-muted mt-1 mb-4">
                We will curate your battles and contest feed based on what you love.
              </p>

              <div className="space-y-2 mb-4">
                {CATEGORIES.map((cat) => {
                  const isChecked = selectedInterests.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggleInterest(cat.id)}
                      className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                        isChecked
                          ? 'bg-surface-2 border-accent text-ink shadow-sm'
                          : 'bg-surface border-line text-muted hover:border-line-strong'
                      }`}
                    >
                      <div>
                        <div className="text-xs sm:text-sm font-semibold flex items-center gap-1.5 text-ink">
                          <span>{cat.label}</span>
                        </div>
                        <div className="text-[11px] text-muted mt-0.5">
                          {cat.desc}
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                          isChecked
                            ? 'bg-accent border-accent text-on-accent'
                            : 'border-line-strong bg-surface-2'
                        }`}
                      >
                        {isChecked && <Check size={12} strokeWidth={3} />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* STEP 3: YOU'RE ALL SET */}
          {currentStep === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.22 }}
              className="bg-surface border border-line rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-accent-solid flex items-center justify-center mx-auto mb-4 shadow-md">
                <Trophy size={28} className="text-white" />
              </div>

              <span className="inline-block px-2.5 py-0.5 rounded-full bg-accent/15 text-accent-soft text-[10px] font-bold uppercase tracking-wider mb-2">
                Ready to compete & vote
              </span>

              <h1 className="text-2xl font-bold text-ink uppercase tracking-tight leading-tight font-display">
                Welcome to Opinion Net
              </h1>

              <p className="text-xs sm:text-sm text-muted leading-relaxed mt-2 max-w-xs mx-auto">
                Your personalized battle arena is ready. Vote on daily duels, support creator entries, or enter your own work to win prize pools!
              </p>

              <div className="mt-5 p-3.5 rounded-xl bg-surface-2 border border-line text-left space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-ink">
                  <span>Initial Status:</span>
                  <span className="text-accent font-bold">Verified Member</span>
                </div>
                <div className="flex items-center justify-between text-xs font-semibold text-ink">
                  <span>Trust Score:</span>
                  <span className="text-muted tabular-nums">1.0 Reputation</span>
                </div>
                <div className="flex items-center justify-between text-xs font-semibold text-ink">
                  <span>Curated Interests:</span>
                  <span className="text-accent-soft">{selectedInterests.length} Categories</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Step Indicator Dots */}
        <div className="flex items-center justify-center gap-1.5 my-5">
          {[0, 1, 2].map((idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === currentStep ? 'w-6 bg-accent' : 'w-2 bg-line-strong'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Bottom CTA Row */}
      <footer className="w-full max-w-md pb-4 flex items-center gap-3">
        {currentStep > 0 && (
          <button
            type="button"
            onClick={handlePrev}
            className="py-3 px-4 rounded-full bg-surface-2 hover:bg-line text-muted hover:text-ink font-semibold text-xs flex items-center justify-center transition-colors border border-line"
          >
            <ArrowLeft size={16} />
          </button>
        )}
        <button
          type="button"
          onClick={handleNext}
          className="flex-1 py-3 px-6 rounded-full bg-accent-solid hover:bg-accent-hover text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99]"
        >
          <span>
            {currentStep === 2
              ? 'Enter Arena'
              : currentStep === 0 && !votedChoice
              ? 'Next'
              : 'Continue'}
          </span>
          <ArrowRight size={16} />
        </button>
      </footer>
    </div>
  );
}
