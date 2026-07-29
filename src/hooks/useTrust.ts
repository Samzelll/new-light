"use client";

import { useState, useEffect, useCallback } from 'react';
import { getMyTrust, UserTrust } from '@/services/trustService';
import { getTrustLevel } from '@/utils/trustCalculator';

export function useTrust() {
  const [trustData, setTrustData] = useState<UserTrust | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMyTrust = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: trustErr } = await getMyTrust();
      if (trustErr) {
        setError(trustErr);
      } else {
        setTrustData(data);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred loading trust info');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyTrust();
  }, [fetchMyTrust]);

  const levelInfo = trustData ? getTrustLevel(Number(trustData.score)) : null;

  return {
    trustData,
    levelInfo,
    loading,
    error,
    refreshTrust: fetchMyTrust,
  };
}
