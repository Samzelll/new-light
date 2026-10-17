"use client";

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEYS = {
  CLEAN_MODE: 'photobattle_clean_mode',
  SEEN_TIPS: 'photobattle_seen_tips',
  PINCH_ZOOM_TIP_SEEN: 'photobattle_pinch_tip_seen',
};

export interface UiPreferences {
  cleanMode: boolean;
  toggleCleanMode: () => void;
  setCleanMode: (value: boolean) => void;
  hasSeenTips: boolean;
  markTipsSeen: () => void;
  hasSeenPinchTip: boolean;
  markPinchTipSeen: () => void;
}

export function useUiPreferences(): UiPreferences {
  // Clean mode disabled for now per user instruction, kept for future activation
  const [cleanMode] = useState(false);
  const [hasSeenTips, setHasSeenTips] = useState(true); // default true to avoid flash on SSR
  const [hasSeenPinchTip, setHasSeenPinchTip] = useState(true);

  useEffect(() => {
    try {
      const storedTips = localStorage.getItem(STORAGE_KEYS.SEEN_TIPS);
      setHasSeenTips(storedTips === 'true');

      const storedPinch = localStorage.getItem(STORAGE_KEYS.PINCH_ZOOM_TIP_SEEN);
      setHasSeenPinchTip(storedPinch === 'true');
    } catch {
      // LocalStorage unavailable in private mode or SSR
    }
  }, []);

  const toggleCleanMode = useCallback(() => {
    // Disabled for now per user instruction; ready for future activation
  }, []);

  const setCleanMode = useCallback((_val: boolean) => {
    // Disabled for now per user instruction; ready for future activation
  }, []);

  const markTipsSeen = useCallback(() => {
    setHasSeenTips(true);
    try {
      localStorage.setItem(STORAGE_KEYS.SEEN_TIPS, 'true');
    } catch {}
  }, []);

  const markPinchTipSeen = useCallback(() => {
    setHasSeenPinchTip(true);
    try {
      localStorage.setItem(STORAGE_KEYS.PINCH_ZOOM_TIP_SEEN, 'true');
    } catch {}
  }, []);

  return {
    cleanMode,
    toggleCleanMode,
    setCleanMode,
    hasSeenTips,
    markTipsSeen,
    hasSeenPinchTip,
    markPinchTipSeen,
  };
}
