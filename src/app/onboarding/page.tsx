"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import {
  Flame,
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
    <div className="min-h-screen bg-[#0b0b0d] text-white flex flex-col items-center justify-between p-4 selection:bg-[#ff6a2b]/30 font-sans">
      {/* Top Header */}
      <header className="w-full max-w-md flex items-center justify-between pt-3 pb-2">
        <button
          type="button"
          onClick={handleExit}
          className="text-xs font-black uppercase tracking-tight text-white flex items-center gap-1.5 hover:text-[#ff6a2b] transition-colors"
        >
          <span className="w-2 h-2 rounded-full bg-[#ff6a2b] animate-pulse" />
          <span>Opinion Net</span>
        </button>

        <button
          type="button"
          onClick={handleExit}
          className="text-xs font-bold text-neutral-400 hover:text-white px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-colors flex items-center gap-1"
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
              className="bg-[#161619] border border-neutral-800 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-0.5 rounded-full bg-[#ff6a2b]/15 text-[#ff8a4d] text-[10px] font-extrabold uppercase tracking-wider">
                  Step 1 · First Experience
                </span>
                <span className="text-xs font-semibold text-neutral-400">
                  Tap your pick below
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight leading-tight">
                Cast Your First Vote
              </h1>
              <p className="text-xs text-neutral-400 mt-1 mb-4">
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
                      className={`relative aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 border ${
                        isSelected
                          ? 'border-emerald-500 ring-2 ring-emerald-500/40 scale-[0.98] shadow-lg shadow-emerald-500/20'
                          : votedChoice
                          ? 'border-neutral-800 opacity-60'
                          : 'border-neutral-700 hover:border-neutral-500 active:scale-95'
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
                        <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full bg-emerald-600 text-[10px] font-black text-white flex items-center gap-1 shadow-md">
                          <Check size={11} strokeWidth={3} />
                          <span>Voted</span>
                        </div>
                      )}

                      <div className="absolute bottom-2 inset-x-2 z-10">
                        <div className="text-[11px] font-extrabold text-white truncate">
                          {entry.name}
                        </div>
                        <div className="text-[10px] text-neutral-400 truncate">
                          {entry.author}
                        </div>
                        {votedChoice && (
                          <div className="mt-1 text-xs font-black text-emerald-400 tabular-nums">
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
                <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex items-center gap-2.5 animate-fade-in text-emerald-300 text-xs">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600/30 flex items-center justify-center shrink-0">
                    <Sparkles size={16} className="text-emerald-400" />
                  </div>
                  <div>
                    <div className="font-black text-white">+1.0 Trust Weight Unlocked!</div>
                    <div className="text-[11px] text-emerald-300/80">
                      Your vote just shaped the real-time tournament standings.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 rounded-2xl bg-neutral-900 border border-neutral-800 text-center text-xs text-neutral-400">
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
              className="bg-[#161619] border border-neutral-800 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-[10px] font-extrabold uppercase tracking-wider">
                  Step 2 · Personalization
                </span>
                <span className="text-xs font-semibold text-neutral-400">
                  {selectedInterests.length} selected
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight leading-tight">
                Pick Your Interests
              </h1>
              <p className="text-xs text-neutral-400 mt-1 mb-4">
                We will curate your battles and contest feed based on what you love.
              </p>

              <div className="space-y-2.5 mb-4">
                {CATEGORIES.map((cat) => {
                  const isChecked = selectedInterests.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggleInterest(cat.id)}
                      className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                        isChecked
                          ? 'bg-[#ff6a2b]/15 border-[#ff6a2b]/60 text-white shadow-sm'
                          : 'bg-[#222226] border-neutral-700/60 text-neutral-300 hover:border-neutral-500'
                      }`}
                    >
                      <div>
                        <div className="text-xs sm:text-sm font-bold flex items-center gap-1.5">
                          <span>{cat.label}</span>
                        </div>
                        <div className="text-[11px] text-neutral-400 mt-0.5">
                          {cat.desc}
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                          isChecked
                            ? 'bg-[#ff6a2b] border-[#ff6a2b] text-white'
                            : 'border-neutral-600 bg-neutral-800'
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
              className="bg-[#161619] border border-neutral-800 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden text-center"
            >
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-[#ff6a2b] to-[#c9430b] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#ff6a2b]/30">
                <Trophy size={30} className="text-white" />
              </div>

              <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-extrabold uppercase tracking-wider mb-2">
                Ready to compete & vote
              </span>

              <h1 className="text-2xl font-black text-white uppercase tracking-tight leading-tight">
                Welcome to Opinion Net
              </h1>

              <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed mt-2 max-w-xs mx-auto">
                Your personalized battle arena is ready. Vote on daily duels, support creator entries, or enter your own work to win prize pools!
              </p>

              <div className="mt-5 p-3.5 rounded-2xl bg-[#222226] border border-neutral-700/60 text-left space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-white">
                  <span>Initial Status:</span>
                  <span className="text-emerald-400 font-extrabold">Verified Member</span>
                </div>
                <div className="flex items-center justify-between text-xs font-bold text-white">
                  <span>Trust Score:</span>
                  <span className="text-neutral-200 tabular-nums">1.0 Reputation</span>
                </div>
                <div className="flex items-center justify-between text-xs font-bold text-white">
                  <span>Curated Interests:</span>
                  <span className="text-[#ff8a4d]">{selectedInterests.length} Categories</span>
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
                idx === currentStep ? 'w-6 bg-[#ff6a2b]' : 'w-2 bg-neutral-700'
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
            className="py-3.5 px-4 rounded-2xl bg-[#222226] hover:bg-[#2c2c32] text-neutral-300 hover:text-white font-bold text-xs flex items-center justify-center transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
        )}
        <button
          type="button"
          onClick={handleNext}
          className="flex-1 py-3.5 px-6 rounded-2xl bg-[#ff6a2b] hover:bg-[#ff7a3d] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-[#ff6a2b]/25 transition-all active:scale-[0.99]"
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
