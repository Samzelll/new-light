// src/perf/PerfInit.tsx
'use client';

import { useEffect } from 'react';
import { initWebVitals } from './metrics';

export function PerfInit() {
  useEffect(() => {
    initWebVitals();
  }, []);
  return null;
}
