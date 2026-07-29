"use client";

import { calculateStreak, getStreakLabel, StreakInfo } from '@/utils/streak';

interface StreakCardProps {
  voteDates: string[]; // ISO timestamps of all user votes
  compact?: boolean;
}

export function StreakCard({ voteDates, compact = false }: StreakCardProps) {
  const streak = calculateStreak(voteDates);
  const label = getStreakLabel(streak.current);

  if (compact) {
    return <StreakCompact streak={streak} label={label} />;
  }

  return <StreakFull streak={streak} label={label} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Compact version — shown inline in hero
// ─────────────────────────────────────────────────────────────────────────────
function StreakCompact({ streak, label }: { streak: StreakInfo; label: ReturnType<typeof getStreakLabel> }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '5px 12px',
        borderRadius: '10px',
        background: streak.current > 0 ? `${label.color}15` : 'var(--color-surface-700)',
        border: `1px solid ${streak.current > 0 ? label.color + '30' : 'var(--color-surface-500)'}`,
      }}
    >
      <span style={{ fontSize: '14px' }}>{label.emoji}</span>
      <span style={{ fontSize: '13px', fontWeight: '700', color: label.color }}>
        {streak.current}
      </span>
      <span style={{ fontSize: '11px', color: 'rgb(107,114,128)', fontWeight: '500' }}>
        day streak
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Full card — shown in profile
// ─────────────────────────────────────────────────────────────────────────────
const MILESTONE_DAYS = [3, 7, 14, 30, 60, 100];

function StreakFull({ streak, label }: { streak: StreakInfo; label: ReturnType<typeof getStreakLabel> }) {
  const progressToNext = (() => {
    const next = MILESTONE_DAYS.find((m) => m > streak.current);
    if (!next) return { next: null, pct: 100 };
    const prev = MILESTONE_DAYS[MILESTONE_DAYS.indexOf(next) - 1] ?? 0;
    const pct = ((streak.current - prev) / (next - prev)) * 100;
    return { next, pct: Math.max(0, Math.min(100, pct)) };
  })();

  return (
    <div
      style={{
        background: streak.current > 0
          ? `linear-gradient(135deg, ${label.color}10, ${label.color}05)`
          : 'var(--color-surface-800)',
        border: `1px solid ${streak.current > 0 ? label.color + '25' : 'var(--color-surface-600)'}`,
        borderRadius: '20px',
        padding: '20px 22px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background glow */}
      {streak.current >= 3 && (
        <div
          style={{
            position: 'absolute',
            top: '-30px', right: '-30px',
            width: '120px', height: '120px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${label.color}20, transparent 70%)`,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '24px' }}>{label.emoji}</span>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '700', color: 'rgb(156,163,175)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Daily Streak
            </div>
            <div style={{ fontSize: '11px', color: 'rgb(107,114,128)', marginTop: '1px' }}>
              {label.label}
            </div>
          </div>
        </div>

        {/* Big streak number */}
        <div style={{ textAlign: 'right' }}>
          <span
            style={{
              fontSize: '40px',
              fontWeight: '900',
              color: streak.current > 0 ? label.color : 'rgb(107,114,128)',
              lineHeight: '1',
              letterSpacing: '-0.02em',
            }}
          >
            {streak.current}
          </span>
          <span style={{ fontSize: '13px', color: 'rgb(107,114,128)', display: 'block', marginTop: '1px' }}>
            {streak.current === 1 ? 'day' : 'days'}
          </span>
        </div>
      </div>

      {/* Today indicator */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', alignItems: 'center' }}>
        <div
          style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: streak.votedToday ? 'var(--color-accent-green)' : 'var(--color-surface-500)',
            boxShadow: streak.votedToday ? '0 0 8px var(--color-accent-green)' : 'none',
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: '12px', color: streak.votedToday ? 'var(--color-accent-green)' : 'rgb(107,114,128)', fontWeight: '600' }}>
          {streak.votedToday
            ? '✓ Voted today — streak safe!'
            : streak.votedYesterday
            ? '⚠️ Vote today to keep your streak!'
            : streak.current > 0
            ? '❌ Streak lost — start a new one!'
            : 'Vote today to start your streak'}
        </span>
      </div>

      {/* Progress to next milestone */}
      {progressToNext.next && (
        <div style={{ marginBottom: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
            <span style={{ fontSize: '11px', color: 'rgb(107,114,128)', fontWeight: '600' }}>
              Next milestone
            </span>
            <span style={{ fontSize: '11px', color: label.color, fontWeight: '700' }}>
              {streak.current} / {progressToNext.next} days
            </span>
          </div>
          <div style={{ height: '6px', background: 'var(--color-surface-700)', borderRadius: '3px', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${progressToNext.pct}%`,
                background: `linear-gradient(90deg, ${label.color}88, ${label.color})`,
                borderRadius: '3px',
                transition: 'width 1s ease',
              }}
            />
          </div>
        </div>
      )}

      {/* Stats row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '10px',
          paddingTop: '14px',
          borderTop: '1px solid var(--color-surface-700)',
        }}
      >
        <div style={{ textAlign: 'center', padding: '10px', borderRadius: '12px', background: 'var(--color-surface-900)' }}>
          <div style={{ fontSize: '20px', fontWeight: '800', color: 'white' }}>{streak.longest}</div>
          <div style={{ fontSize: '10px', color: 'rgb(107,114,128)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '2px' }}>
            Best streak
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: '10px', borderRadius: '12px', background: 'var(--color-surface-900)' }}>
          <div style={{ fontSize: '20px', fontWeight: '800', color: 'white' }}>{streak.milestones.length}</div>
          <div style={{ fontSize: '10px', color: 'rgb(107,114,128)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '2px' }}>
            Milestones
          </div>
        </div>
      </div>

      {/* Milestone badges */}
      {MILESTONE_DAYS.length > 0 && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '12px' }}>
          {MILESTONE_DAYS.map((m) => {
            const achieved = streak.current >= m;
            return (
              <div
                key={m}
                style={{
                  padding: '4px 10px',
                  borderRadius: '8px',
                  fontSize: '10px',
                  fontWeight: '700',
                  background: achieved ? label.color + '20' : 'var(--color-surface-700)',
                  border: `1px solid ${achieved ? label.color + '40' : 'var(--color-surface-600)'}`,
                  color: achieved ? label.color : 'rgb(107,114,128)',
                  transition: 'all 0.3s',
                }}
              >
                {m}d {achieved ? '✓' : ''}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
