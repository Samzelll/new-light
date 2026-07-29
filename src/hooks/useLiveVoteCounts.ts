"use client";

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/services/supabase';

interface LiveVoteCount {
  contestId: string;
  count: number;
  delta: number; // votes added in last minute
}

/**
 * Subscribe to live vote counts for a list of contest IDs.
 * Returns a map of contestId → { count, delta }.
 * 
 * Uses Supabase Realtime on the `votes` table.
 * Falls back gracefully if realtime is unavailable.
 */
export function useLiveVoteCounts(contestIds: string[]): Record<string, LiveVoteCount> {
  const [counts, setCounts] = useState<Record<string, LiveVoteCount>>({});
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const recentVoteTimestamps = useRef<Record<string, number[]>>({});

  useEffect(() => {
    if (contestIds.length === 0) return;

    // Initial load — get current vote counts for all contests
    async function loadInitialCounts() {
      try {
        const { data } = await supabase
          .from('votes')
          .select('contest_id')
          .in('contest_id', contestIds);

        if (!data) return;

        const countMap: Record<string, number> = {};
        for (const row of data) {
          countMap[row.contest_id] = (countMap[row.contest_id] || 0) + 1;
        }

        setCounts((prev) => {
          const next = { ...prev };
          for (const id of contestIds) {
            next[id] = {
              contestId: id,
              count: countMap[id] || 0,
              delta: prev[id]?.delta || 0,
            };
          }
          return next;
        });
      } catch {
        // Realtime unavailable — graceful fallback
      }
    }

    loadInitialCounts();

    // Subscribe to new votes
    const channelName = `live-votes-${contestIds.slice(0, 3).join('-')}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'votes',
        },
        (payload: any) => {
          const contestId = payload.new?.contest_id;
          if (!contestId || !contestIds.includes(contestId)) return;

          const now = Date.now();

          // Track recent votes for delta calculation
          if (!recentVoteTimestamps.current[contestId]) {
            recentVoteTimestamps.current[contestId] = [];
          }
          recentVoteTimestamps.current[contestId].push(now);

          // Keep only votes from the last 60 seconds
          const oneMinuteAgo = now - 60_000;
          recentVoteTimestamps.current[contestId] = recentVoteTimestamps.current[contestId].filter(
            (t) => t > oneMinuteAgo
          );

          const delta = recentVoteTimestamps.current[contestId].length;

          setCounts((prev) => ({
            ...prev,
            [contestId]: {
              contestId,
              count: (prev[contestId]?.count || 0) + 1,
              delta,
            },
          }));
        }
      )
      .subscribe();

    channelRef.current = channel;

    // Clean up delta every 30s
    const deltaInterval = setInterval(() => {
      const now = Date.now();
      const oneMinuteAgo = now - 60_000;

      setCounts((prev) => {
        const next = { ...prev };
        for (const id of contestIds) {
          if (!next[id]) continue;
          if (recentVoteTimestamps.current[id]) {
            recentVoteTimestamps.current[id] = recentVoteTimestamps.current[id].filter(
              (t) => t > oneMinuteAgo
            );
          }
          next[id] = {
            ...next[id],
            delta: recentVoteTimestamps.current[id]?.length || 0,
          };
        }
        return next;
      });
    }, 30_000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(deltaInterval);
    };
  }, [contestIds.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  return counts;
}
