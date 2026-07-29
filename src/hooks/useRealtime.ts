"use client";

import { useEffect, useRef } from 'react';
import { supabase } from '@/services/supabase';

export function useRealtime(
  table: string,
  filter: string,
  onEvent: (payload: any) => void
) {
  const callbackRef = useRef(onEvent);
  callbackRef.current = onEvent;

  useEffect(() => {
    const channelName = `realtime:${table}:${filter}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: table,
          filter: filter,
        },
        (payload: any) => {
          callbackRef.current(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, filter]);
}
