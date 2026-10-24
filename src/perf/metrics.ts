// src/perf/metrics.ts
import { onCLS, onINP, onLCP, type Metric } from 'web-vitals';
import { getProfile } from './netProfile';

const SAMPLE_RATE = 0.2;
const sampled = typeof window !== 'undefined' && Math.random() < SAMPLE_RATE;

type Extra = Record<string, string | number | boolean>;

function send(name: string, value: number, extra: Extra = {}): void {
  if (typeof window === 'undefined') return;
  const payload = {
    name,
    value: Math.round(value * 100) / 100,
    profile: getProfile(),
    path: typeof location !== 'undefined' ? location.pathname : '/',
    ...extra,
  };

  if (process.env.NODE_ENV !== 'production') {
    // console.debug('[perf]', payload);
  }
  if (!sampled || process.env.NODE_ENV !== 'production') return;

  const body = JSON.stringify(payload);
  const ok = navigator.sendBeacon?.('/api/perf', new Blob([body], { type: 'application/json' }));
  if (!ok) {
    fetch('/api/perf', {
      method: 'POST',
      body,
      keepalive: true,
      headers: { 'content-type': 'application/json' },
    }).catch(() => {});
  }
}

export function initWebVitals(): void {
  if (typeof window === 'undefined') return;
  try {
    const report = (m: Metric) => send(m.name, m.value, { rating: m.rating });
    onLCP(report);
    onINP(report);
    onCLS(report);
  } catch {
    // Graceful fallback if unsupported
  }
}

/** Time from "slide became active" to "both photos decoded and voting enabled". */
export const reportTTV = (ms: number, hit: boolean) => send('TTV', ms, { hit });

/** Round trip of the vote request. */
export const reportVoteLatency = (ms: number, ok: boolean) => send('VOTE_LATENCY', ms, { ok });

export interface BatchRevealMetric {
  ms: number;
  pins: number;
  readyAtReveal: number;
  failed: number;
  reason: 'all' | 'soft' | 'hard';
}

/** Synchronized batch reveal latency and gate reason */
export const reportBatchReveal = ({ ms, pins, readyAtReveal, failed, reason }: BatchRevealMetric) =>
  send('BATCH_REVEAL', ms, { pins, readyAtReveal, failed, reason });
