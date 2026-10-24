// src/features/pin-grid/hooks/useBatchGate.ts
import { useReducer, useEffect, useRef, useCallback, useMemo } from 'react';
import { getProfile, type Profile } from '@/perf/netProfile';
import { schedulePhoto, CANCELLED } from '@/perf/imageScheduler';
import { reportBatchReveal } from '@/perf/metrics';
import type { PinItem, PinStatus, RevealReason, BatchInfo } from '../model/types';

export const PHOTO_TIMEOUT_MS = 15000;
export const DEFAULT_BATCH_SIZE = 10;

export const GATE_DEADLINES: Record<Profile, { soft: number; hard: number }> = {
  high: { soft: 1800, hard: 5000 },
  mid: { soft: 2500, hard: 7000 },
  low: { soft: 3500, hard: 9000 },
};

interface GateState {
  pinStatus: Record<string, PinStatus>;
  revealedPins: Set<string>;
  stragglerPins: Set<string>;
  batches: Record<number, BatchInfo>;
  retryCounts: Record<string, number>;
}

type GateAction =
  | { type: 'INIT_BATCH'; batchIndex: number; pinIds: string[]; startTime: number }
  | { type: 'SET_PIN_STATUS'; pinId: string; status: PinStatus; isStraggler?: boolean }
  | { type: 'REVEAL_BATCH'; batchIndex: number; readyPinIds: string[]; reason: RevealReason; ms: number }
  | { type: 'RECORD_RETRY'; pinId: string };

function gateReducer(state: GateState, action: GateAction): GateState {
  switch (action.type) {
    case 'INIT_BATCH': {
      const { batchIndex, pinIds, startTime } = action;
      if (state.batches[batchIndex]) return state;

      const nextStatus = { ...state.pinStatus };
      for (const id of pinIds) {
        if (!nextStatus[id]) {
          nextStatus[id] = 'pending';
        }
      }

      return {
        ...state,
        pinStatus: nextStatus,
        batches: {
          ...state.batches,
          [batchIndex]: {
            batchIndex,
            pinIds,
            startTime,
            revealed: false,
          },
        },
      };
    }

    case 'SET_PIN_STATUS': {
      const { pinId, status, isStraggler } = action;
      if (state.pinStatus[pinId] === status) return state;

      const nextStatus = { ...state.pinStatus, [pinId]: status };
      const nextRevealed = new Set(state.revealedPins);
      const nextStragglers = new Set(state.stragglerPins);

      if (status === 'ready' && isStraggler) {
        nextRevealed.add(pinId);
        nextStragglers.add(pinId);
      }

      return {
        ...state,
        pinStatus: nextStatus,
        revealedPins: nextRevealed,
        stragglerPins: nextStragglers,
      };
    }

    case 'REVEAL_BATCH': {
      const { batchIndex, readyPinIds, reason } = action;
      const batch = state.batches[batchIndex];
      if (!batch || batch.revealed) return state;

      const nextRevealed = new Set(state.revealedPins);
      for (const id of readyPinIds) {
        nextRevealed.add(id);
      }

      return {
        ...state,
        revealedPins: nextRevealed,
        batches: {
          ...state.batches,
          [batchIndex]: {
            ...batch,
            revealed: true,
            reason,
          },
        },
      };
    }

    case 'RECORD_RETRY': {
      return {
        ...state,
        retryCounts: {
          ...state.retryCounts,
          [action.pinId]: (state.retryCounts[action.pinId] || 0) + 1,
        },
      };
    }

    default:
      return state;
  }
}

export interface UseBatchGateOptions {
  batchSize?: number;
  onFail?: 'placeholder' | 'hide';
}

export function useBatchGate(pins: PinItem[], options: UseBatchGateOptions = {}) {
  const { batchSize = DEFAULT_BATCH_SIZE } = options;

  const [state, dispatch] = useReducer(gateReducer, {
    pinStatus: {},
    revealedPins: new Set<string>(),
    stragglerPins: new Set<string>(),
    batches: {},
    retryCounts: {},
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  const pinMap = useMemo(() => {
    const map = new Map<string, PinItem>();
    for (const p of pins) map.set(p.id, p);
    return map;
  }, [pins]);

  // Group pins into batches
  const batchList = useMemo(() => {
    const list: PinItem[][] = [];
    for (let i = 0; i < pins.length; i += batchSize) {
      list.push(pins.slice(i, i + batchSize));
    }
    return list;
  }, [pins, batchSize]);

  // Track timers per batch
  const timersRef = useRef<Map<number, NodeJS.Timeout[]>>(new Map());

  // Function to initiate photo load for a pin
  const loadPinPhoto = useCallback(
    (pin: PinItem, priority: 1 | 2 = 2) => {
      const pinId = pin.id;
      if (!pin.photo) {
        dispatch({ type: 'SET_PIN_STATUS', pinId, status: 'ready' });
        return;
      }

      let timeoutId: NodeJS.Timeout | null = null;
      let settled = false;

      // 15 second safety timeout
      timeoutId = setTimeout(() => {
        if (!settled) {
          settled = true;
          dispatch({ type: 'SET_PIN_STATUS', pinId, status: 'failed' });
        }
      }, PHOTO_TIMEOUT_MS);

      schedulePhoto(pin.photo, { priority, scope: 'pins' })
        .then(() => {
          if (!settled) {
            settled = true;
            if (timeoutId) clearTimeout(timeoutId);

            // Determine if the batch was already revealed (making this a straggler)
            const currentBatches = stateRef.current.batches;
            let isStraggler = false;
            for (const b of Object.values(currentBatches)) {
              if (b.pinIds.includes(pinId) && b.revealed) {
                isStraggler = true;
                break;
              }
            }

            dispatch({ type: 'SET_PIN_STATUS', pinId, status: 'ready', isStraggler });
          }
        })
        .catch((err: Error) => {
          if (!settled && err.message !== CANCELLED) {
            settled = true;
            if (timeoutId) clearTimeout(timeoutId);
            dispatch({ type: 'SET_PIN_STATUS', pinId, status: 'failed' });

            // Quiet auto-retry twice (at 1.5s and 4.0s)
            const count = stateRef.current.retryCounts[pinId] || 0;
            if (count < 2) {
              const delay = count === 0 ? 1500 : 4000;
              setTimeout(() => {
                dispatch({ type: 'RECORD_RETRY', pinId });
                loadPinPhoto(pin, 2);
              }, delay);
            }
          }
        });
    },
    []
  );

  // Manual retry trigger (e.g. from PinCard "Tap to retry")
  const retry = useCallback(
    (pinId: string) => {
      const pin = pinMap.get(pinId);
      if (!pin) return;
      dispatch({ type: 'RECORD_RETRY', pinId });
      dispatch({ type: 'SET_PIN_STATUS', pinId, status: 'pending' });
      loadPinPhoto(pin, 1);
    },
    [pinMap, loadPinPhoto]
  );

  // Synchronized reveal trigger
  const triggerReveal = useCallback(
    (batchIndex: number, reason: RevealReason) => {
      const batch = stateRef.current.batches[batchIndex];
      if (!batch || batch.revealed) return;

      const duration = performance.now() - batch.startTime;
      const readyPinIds: string[] = [];
      let readyCount = 0;
      let failedCount = 0;

      for (const id of batch.pinIds) {
        const s = stateRef.current.pinStatus[id];
        if (s === 'ready') {
          readyPinIds.push(id);
          readyCount++;
        } else if (s === 'failed') {
          failedCount++;
        }
      }

      // Flip all revealed pins in a SINGLE reducer dispatch inside requestAnimationFrame
      requestAnimationFrame(() => {
        dispatch({
          type: 'REVEAL_BATCH',
          batchIndex,
          readyPinIds,
          reason,
          ms: duration,
        });

        reportBatchReveal({
          ms: Math.round(duration),
          pins: batch.pinIds.length,
          readyAtReveal: readyCount,
          failed: failedCount,
          reason,
        });
      });

      // Clear batch timers
      const existingTimers = timersRef.current.get(batchIndex);
      if (existingTimers) {
        existingTimers.forEach(clearTimeout);
        timersRef.current.delete(batchIndex);
      }
    },
    []
  );

  // Initialize and monitor batches
  useEffect(() => {
    const profile = getProfile();
    const deadlines = GATE_DEADLINES[profile];

    batchList.forEach((batchPins, batchIndex) => {
      const pinIds = batchPins.map((p) => p.id);
      const existing = stateRef.current.batches[batchIndex];

      if (!existing) {
        const startTime = performance.now();
        dispatch({ type: 'INIT_BATCH', batchIndex, pinIds, startTime });

        // Request photos in parallel (priority 1 for initial batches near top, otherwise 2)
        const priority: 1 | 2 = batchIndex === 0 ? 1 : 2;
        batchPins.forEach((pin) => loadPinPhoto(pin, priority));

        // Setup Soft and Hard timers
        const softTimer = setTimeout(() => {
          const currentBatch = stateRef.current.batches[batchIndex];
          if (currentBatch && !currentBatch.revealed) {
            const readyCount = currentBatch.pinIds.filter(
              (id) => stateRef.current.pinStatus[id] === 'ready'
            ).length;
            const threshold = Math.ceil(0.6 * currentBatch.pinIds.length);
            if (readyCount >= threshold) {
              triggerReveal(batchIndex, 'soft');
            }
          }
        }, deadlines.soft);

        const hardTimer = setTimeout(() => {
          const currentBatch = stateRef.current.batches[batchIndex];
          if (currentBatch && !currentBatch.revealed) {
            triggerReveal(batchIndex, 'hard');
          }
        }, deadlines.hard);

        timersRef.current.set(batchIndex, [softTimer, hardTimer]);
      }
    });
  }, [batchList, loadPinPhoto, triggerReveal]);

  // Check Rule A (ALL pins settled) on state changes
  useEffect(() => {
    Object.values(state.batches).forEach((batch) => {
      if (!batch.revealed) {
        const allSettled = batch.pinIds.every((id) => {
          const s = state.pinStatus[id];
          return s === 'ready' || s === 'failed';
        });

        if (allSettled && batch.pinIds.length > 0) {
          triggerReveal(batch.batchIndex, 'all');
        }
      }
    });
  }, [state.pinStatus, state.batches, triggerReveal]);

  // Clean up timers on unmount
  useEffect(() => {
    const timerMap = timersRef.current;
    return () => {
      timerMap.forEach((timers) => timers.forEach(clearTimeout));
      timerMap.clear();
    };
  }, []);

  // Determine if there is currently a batch pending
  const isBatchLoading = useMemo(() => {
    return Object.values(state.batches).some((b) => !b.revealed);
  }, [state.batches]);

  return {
    pinStatus: state.pinStatus,
    revealedPins: state.revealedPins,
    stragglerPins: state.stragglerPins,
    batches: state.batches,
    isBatchLoading,
    retry,
  };
}
