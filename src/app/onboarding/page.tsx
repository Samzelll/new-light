"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, Trophy, Flame, ArrowRight, ChevronRight, X } from 'lucide-react';

const SCREENS = [
  {
    id: 'discover',
    emoji: '⚡',
    title: 'Vote on what matters',
    subtitle: 'Battles. Polls. Rankings.',
    description: 'Scroll through live contests — fashion, sports, design, lifestyle — and cast your vote in seconds. No noise, just the best picks.',
    cta: 'Show me',
    color: '#3861ff',
    glow: 'rgba(56,97,255,0.4)',
    bg: 'linear-gradient(135deg, rgba(56,97,255,0.15) 0%, rgba(56,97,255,0.03) 100%)',
    visual: <DiscoverVisual />,
  },
  {
    id: 'compete',
    emoji: '🔥',
    title: 'Every vote counts',
    subtitle: 'Real results, real community.',
    description: 'Voting is live — watch the counters move. Support your favourite, share your pick, and see if your side wins. Results update in real time.',
    cta: 'Got it',
    color: '#ff5757',
    glow: 'rgba(255,87,87,0.4)',
    bg: 'linear-gradient(135deg, rgba(255,87,87,0.12) 0%, rgba(255,87,87,0.02) 100%)',
    visual: <BattleVisual />,
  },
  {
    id: 'streak',
    emoji: '🏆',
    title: 'Build your streak',
    subtitle: 'Come back daily. Level up.',
    description: 'Vote every day to build your streak and grow your Trust Score. The more you vote, the more weight your opinion carries.',
    cta: "Let's go",
    color: '#ffc857',
    glow: 'rgba(255,200,87,0.4)',
    bg: 'linear-gradient(135deg, rgba(255,200,87,0.12) 0%, rgba(255,200,87,0.02) 100%)',
    visual: <StreakVisual />,
  },
];

// ─── Micro-visuals per screen ─────────────────────────────────────────────────

function DiscoverVisual() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
      {[
        { type: 'BATTLE', title: 'Nike vs Adidas — Best 2024 Drop', votes: '2.4k', hot: true },
        { type: 'RACE', title: 'Top 10 Street Style Looks', votes: '891' },
        { type: 'ETERNAL', title: 'Greatest Goal of All Time', votes: '12k' },
      ].map((item, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '12px 14px', borderRadius: '14px',
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          animation: `fadeSlideUp 0.4s ${i * 0.12}s both`,
        }}>
          <div style={{
            fontSize: '9px', fontWeight: '800', letterSpacing: '0.1em',
            padding: '3px 8px', borderRadius: '6px',
            background: item.type === 'BATTLE' ? 'rgba(255,87,87,0.15)' : item.type === 'RACE' ? 'rgba(255,200,87,0.15)' : 'rgba(168,85,247,0.15)',
            color: item.type === 'BATTLE' ? '#ff5757' : item.type === 'RACE' ? '#ffc857' : '#a855f7',
            flexShrink: 0,
          }}>{item.type}</div>
          <div style={{ flex: 1, fontSize: '12px', fontWeight: '600', color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
          {item.hot && <span style={{ fontSize: '10px', color: '#ff5757' }}>🔥</span>}
          <div style={{ fontSize: '11px', color: 'rgb(107,114,128)', flexShrink: 0 }}>🗳️ {item.votes}</div>
        </div>
      ))}
    </div>
  );
}

function BattleVisual() {
  const [pct, setPct] = useState(50);
  useEffect(() => {
    const t = setTimeout(() => setPct(63), 600);
    return () => clearTimeout(t);
  }, []);
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        {[
          { name: 'Jordan 1 Retro', pct, color: '#3861ff', voted: true },
          { name: 'Yeezy 350', pct: 100 - pct, color: 'rgba(255,255,255,0.2)', voted: false },
        ].map((side, i) => (
          <div key={i} style={{
            padding: '14px', borderRadius: '16px', textAlign: 'center',
            background: side.voted ? 'rgba(56,97,255,0.15)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${side.voted ? 'rgba(56,97,255,0.4)' : 'rgba(255,255,255,0.08)'}`,
            transition: 'all 0.5s',
          }}>
            <div style={{ fontSize: '28px', marginBottom: '6px' }}>{i === 0 ? '👟' : '🥿'}</div>
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'white', marginBottom: '4px' }}>{side.name}</div>
            <div style={{ fontSize: '20px', fontWeight: '900', color: i === 0 ? '#3861ff' : 'rgb(107,114,128)', transition: 'all 0.5s' }}>{side.pct}%</div>
            {side.voted && <div style={{ fontSize: '9px', color: '#3861ff', fontWeight: '800', marginTop: '4px' }}>YOUR VOTE ✓</div>}
          </div>
        ))}
      </div>
      <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, #3861ff, #a855f7)', borderRadius: '3px', transition: 'width 0.8s cubic-bezier(0.34,1.56,0.64,1)' }} />
      </div>
      <div style={{ textAlign: 'center', fontSize: '11px', color: 'rgb(107,114,128)' }}>Live · 341 votes today</div>
    </div>
  );
}

function StreakVisual() {
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '6px' }}>
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
          const done = i < 5;
          const today = i === 4;
          return (
            <div key={day} style={{ textAlign: 'center' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px', marginBottom: '4px',
                background: done ? (today ? '#ffc857' : 'rgba(255,200,87,0.3)') : 'rgba(255,255,255,0.05)',
                border: `1px solid ${done ? (today ? '#ffc857' : 'rgba(255,200,87,0.4)') : 'rgba(255,255,255,0.08)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: today ? '18px' : '14px',
                animation: today ? 'glowPulse 2s infinite' : 'none',
                boxShadow: today ? '0 0 12px rgba(255,200,87,0.5)' : 'none',
              }}>
                {done ? (today ? '🔥' : '✓') : '·'}
              </div>
              <div style={{ fontSize: '9px', color: today ? '#ffc857' : 'rgb(107,114,128)', fontWeight: today ? '700' : '400' }}>{day}</div>
            </div>
          );
        })}
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', borderRadius: '14px',
        background: 'rgba(255,200,87,0.08)', border: '1px solid rgba(255,200,87,0.2)',
      }}>
        <div>
          <div style={{ fontSize: '11px', color: 'rgb(107,114,128)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Current Streak</div>
          <div style={{ fontSize: '28px', fontWeight: '900', color: '#ffc857', lineHeight: '1.1' }}>5 🔥</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '11px', color: 'rgb(107,114,128)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Next milestone</div>
          <div style={{ fontSize: '14px', fontWeight: '700', color: 'white' }}>7 days ✨</div>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const [screen, setScreen] = useState(0);
  const [exiting, setExiting] = useState(false);
  const touchStartX = useRef(0);

  const active = SCREENS[screen];

  const finish = () => {
    localStorage.setItem('onboarded', 'true');
    router.push('/');
  };

  const goNext = () => {
    if (screen < SCREENS.length - 1) {
      setExiting(true);
      setTimeout(() => { setScreen(s => s + 1); setExiting(false); }, 180);
    } else {
      finish();
    }
  };

  const goBack = () => {
    if (screen > 0) {
      setExiting(true);
      setTimeout(() => { setScreen(s => s - 1); setExiting(false); }, 180);
    }
  };

  // Swipe support
  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (diff > 50) goNext();
    else if (diff < -50) goBack();
  };

  return (
    <div
      style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '24px 16px',
        background: 'var(--color-surface-900)',
      }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Skip */}
      <button
        onClick={finish}
        style={{
          position: 'fixed', top: '20px', right: '20px',
          display: 'flex', alignItems: 'center', gap: '4px',
          padding: '6px 14px', borderRadius: '10px',
          background: 'var(--color-surface-700)', border: '1px solid var(--color-surface-500)',
          color: 'rgb(107,114,128)', fontSize: '12px', fontWeight: '600',
          cursor: 'pointer', transition: 'all 0.15s',
          zIndex: 10,
        }}
        onMouseEnter={e => (e.currentTarget.style.color = 'white')}
        onMouseLeave={e => (e.currentTarget.style.color = 'rgb(107,114,128)')}
      >
        Skip <X size={12} />
      </button>

      {/* Card */}
      <div
        style={{
          width: '100%', maxWidth: '440px',
          background: active.bg,
          border: `1px solid ${active.color}25`,
          borderRadius: '28px',
          padding: '32px 28px',
          boxShadow: `0 0 60px ${active.glow}, 0 20px 60px rgba(0,0,0,0.5)`,
          transition: 'all 0.3s ease',
          opacity: exiting ? 0 : 1,
          transform: exiting ? 'translateY(8px) scale(0.98)' : 'translateY(0) scale(1)',
        }}
      >
        {/* Screen indicator */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '28px' }}>
          {SCREENS.map((_, i) => (
            <button
              key={i}
              onClick={() => setScreen(i)}
              style={{
                height: '3px',
                width: i === screen ? '28px' : '10px',
                borderRadius: '2px',
                background: i === screen ? active.color : 'rgba(255,255,255,0.15)',
                border: 'none', cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
              }}
            />
          ))}
        </div>

        {/* Emoji header */}
        <div style={{
          fontSize: '52px', marginBottom: '8px',
          filter: `drop-shadow(0 0 16px ${active.glow})`,
          animation: 'glowPulse 3s infinite',
          display: 'inline-block',
        }}>
          {active.emoji}
        </div>

        {/* Text */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{
            fontSize: '11px', fontWeight: '800', letterSpacing: '0.12em',
            textTransform: 'uppercase', color: active.color,
            marginBottom: '8px',
          }}>
            {active.subtitle}
          </div>
          <h1 style={{
            fontSize: '26px', fontWeight: '900', color: 'white',
            lineHeight: '1.2', margin: '0 0 12px',
          }}>
            {active.title}
          </h1>
          <p style={{
            fontSize: '14px', color: 'rgb(156,163,175)',
            lineHeight: '1.65', margin: 0,
          }}>
            {active.description}
          </p>
        </div>

        {/* Visual */}
        <div style={{ marginBottom: '28px' }}>
          {active.visual}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px' }}>
          {screen > 0 && (
            <button
              onClick={goBack}
              style={{
                padding: '13px 20px', borderRadius: '16px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgb(156,163,175)', fontSize: '14px', fontWeight: '600',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              ←
            </button>
          )}

          <button
            onClick={goNext}
            style={{
              flex: 1, padding: '13px 24px', borderRadius: '16px',
              background: `linear-gradient(135deg, ${active.color}, ${active.color}cc)`,
              border: 'none', color: 'white',
              fontSize: '15px', fontWeight: '800',
              cursor: 'pointer', transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              boxShadow: `0 8px 24px ${active.glow}`,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; }}
          >
            {screen === SCREENS.length - 1 ? (
              <>Explore contests <ArrowRight size={16} /></>
            ) : (
              <>{active.cta} <ChevronRight size={16} /></>
            )}
          </button>
        </div>
      </div>

      {/* Bottom hint */}
      <p style={{ marginTop: '20px', fontSize: '12px', color: 'rgb(75,85,99)' }}>
        Swipe to navigate · {screen + 1} of {SCREENS.length}
      </p>
    </div>
  );
}
