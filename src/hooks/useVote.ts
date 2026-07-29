"use client";

import { useState } from 'react';
import { castVote as apiCastVote, castEternalVote as apiCastEternal, getMyVoteForGroup } from '@/services/voteService';

export function useVote() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const voteInGroup = async (
    contestId: string,
    stageId: string,
    groupId: string,
    participantId: string,
    trustWeight: number
  ) => {
    setLoading(true);
    setError(null);
    try {
      const { error: voteErr } = await apiCastVote({
        contestId,
        stageId,
        groupId,
        participantId,
        trustWeight,
      });
      if (voteErr) setError(voteErr);
      return { error: voteErr };
    } catch (err: any) {
      setError(err.message || 'An error occurred while voting');
      return { error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const voteEternal = async (contestId: string, participantId: string, trustWeight: number) => {
    setLoading(true);
    setError(null);
    try {
      const { error: voteErr } = await apiCastEternal(contestId, participantId, trustWeight);
      if (voteErr) setError(voteErr);
      return { error: voteErr };
    } catch (err: any) {
      setError(err.message || 'An error occurred while voting');
      return { error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const checkMyVote = async (stageId: string, groupId: string) => {
    setLoading(true);
    try {
      const { participantId, error: checkErr } = await getMyVoteForGroup(stageId, groupId);
      return { participantId, error: checkErr };
    } catch (err: any) {
      return { participantId: null, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    voteInGroup,
    voteEternal,
    checkMyVote,
  };
}
