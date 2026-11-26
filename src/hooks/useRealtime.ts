"use client";

import { useEffect, useRef } from 'react';
import {
  collection,
  onSnapshot,
  query,
  where,
  type QueryConstraint,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

function parseEqFilters(filter: string): QueryConstraint[] {
  if (!filter) return [];
  const constraints: QueryConstraint[] = [];
  for (const part of filter.split(',')) {
    const match = part.trim().match(/^([^=]+)=eq\.(.+)$/);
    if (match) {
      constraints.push(where(match[1].trim(), '==', match[2].trim()));
    }
  }
  return constraints;
}

export function useRealtime(
  table: string,
  filter: string,
  onEvent: (payload: { new: any; old: any }) => void
) {
  const callbackRef = useRef(onEvent);
  callbackRef.current = onEvent;

  useEffect(() => {
    if (!table) return;

    const constraints = parseEqFilters(filter);
    const q = query(collection(db, table), ...constraints);
    let isFirstSnapshot = true;

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (isFirstSnapshot) {
          isFirstSnapshot = false;
          return;
        }
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            callbackRef.current({ new: change.doc.data(), old: null });
          }
        });
      },
      (err) => {
        console.warn(`Firestore realtime listener warning (${table}):`, err?.message || err);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [table, filter]);
}
