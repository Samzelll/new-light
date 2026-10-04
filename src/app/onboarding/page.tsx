"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { Flame, ShieldCheck, Zap, ArrowRight, ArrowLeft, Check } from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      badge: "Step 1 of 3",
      title: "What is Opinion Net?",
      subtitle: "Fair competitive arena and rankings",
      description:
        "Opinion Net is a mobile-first platform where creators enter their best photos, designs, and work into structured tournaments. No bots or fraudulent spikes: all votes are cryptographically verified.",
      icon: <Flame size={36} className="text-[#ff6a2b]" />,
      accentColor: "from-[#ff6a2b]/20 to-transparent",
    },
    {
      badge: "Step 2 of 3",
      title: "How does voting work?",
      subtitle: "Groups of 4 & live 1v1 battles",
      description:
        "Contestants face off daily in groups of 4 or 1v1 duels. Vote with a single tap. In group stages, percentages stay concealed until round close at 06:00 UTC, while live battles reveal splits instantly.",
      icon: <Zap size={36} className="text-amber-400" />,
      accentColor: "from-amber-500/20 to-transparent",
    },
    {
      badge: "Step 3 of 3",
      title: "Your vote grows stronger",
      subtitle: "Trust Score reputation levels",
      description:
        "Consistent and fair activity elevates your trust level from New to Senior. The higher your reputation, the greater weight your vote carries in crowning champions!",
      icon: <ShieldCheck size={36} className="text-emerald-400" />,
      accentColor: "from-emerald-500/20 to-transparent",
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      if (typeof window !== 'undefined') {
        localStorage.setItem('opinion_net_onboarded', 'true');
      }
      router.push('/');
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const step = steps[currentStep];

  return (
    <div className="min-h-screen bg-[#0b0b0d] text-white flex flex-col items-center justify-between p-4 selection:bg-[#ff6a2b]/30">
      {/* Top Bar with Skip */}
      <header className="w-full max-w-sm flex items-center justify-between pt-4 pb-2">
        <Link href="/" className="text-xs font-black uppercase tracking-tight text-white flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#ff6a2b]" />
          <span>Opinion Net</span>
        </Link>
        <button
          type="button"
          onClick={() => router.push('/')}
          className="text-xs text-neutral-400 hover:text-white transition-colors"
        >
          Skip
        </button>
      </header>

      {/* Main Step Card with Animation */}
      <div className="w-full max-w-sm my-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.22 }}
            className="bg-[#161619] border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden"
          >
            {/* Ambient Background Gradient */}
            <div
              className={`absolute -top-16 -right-16 w-44 h-44 rounded-full bg-gradient-to-br ${step.accentColor} blur-2xl pointer-events-none`}
            />

            {/* Icon Bubble */}
            <div className="w-16 h-16 rounded-2xl bg-[#222226] border border-neutral-700/60 flex items-center justify-center mb-6 shadow-inner">
              {step.icon}
            </div>

            {/* Badge */}
            <span className="inline-block px-2.5 py-1 rounded-full bg-[#ff6a2b]/15 text-[#ff8a4d] text-[11px] font-bold uppercase tracking-wider mb-2">
              {step.badge}
            </span>

            {/* Content */}
            <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight leading-tight mb-1">
              {step.title}
            </h1>
            <p className="text-xs font-bold text-[#ff6a2b] mb-4">
              {step.subtitle}
            </p>
            <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
              {step.description}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Dots Step Indicator */}
        <div className="flex items-center justify-center gap-1.5 my-6">
          {steps.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === currentStep ? 'w-6 bg-[#ff6a2b]' : 'w-2 bg-neutral-700'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Bottom Navigation */}
      <footer className="w-full max-w-sm pb-6 flex items-center gap-3">
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
          <span>{currentStep === steps.length - 1 ? 'Start Voting' : 'Next'}</span>
          <ArrowRight size={16} />
        </button>
      </footer>
    </div>
  );
}
