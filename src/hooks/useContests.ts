"use client";

import { useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/lib/store';
import { getContests, getContestById, subscribeToContest, unsubscribeFromContest } from '@/services/contestService';
import { setQuery, setSortBy, resetFilters } from '@/features/contests/contestsSlice';

export function useContests() {
  const dispatch = useDispatch();
  const filters = useSelector((state: RootState) => state.contests.filters);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchContests = useCallback(async (customFilters?: any) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await getContests({
        ...filters,
        ...customFilters,
      });
      if (fetchErr) setError(fetchErr);
      return data || [];
    } catch (err: any) {
      setError(err.message || 'Failed to fetch contests');
      return [];
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchContestDetail = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: detailErr } = await getContestById(id);
      if (detailErr) setError(detailErr);
      return data;
    } catch (err: any) {
      setError(err.message || 'Failed to fetch contest detail');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSubscribe = async (contestId: string) => {
    return await subscribeToContest(contestId);
  };

  const handleUnsubscribe = async (contestId: string) => {
    return await unsubscribeFromContest(contestId);
  };

  const updateSearchQuery = (query: string) => {
    dispatch(setQuery(query));
  };

  const updateSort = (sort: 'recent' | 'popular') => {
    dispatch(setSortBy(sort));
  };

  const clearAllFilters = () => {
    dispatch(resetFilters());
  };

  return {
    filters,
    loading,
    error,
    fetchContests,
    fetchContestDetail,
    handleSubscribe,
    handleUnsubscribe,
    updateSearchQuery,
    updateSort,
    clearAllFilters,
  };
}
