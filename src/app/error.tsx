"use client";

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

function extractReadableError(error: Error): string {
  try {
    const parsed = JSON.parse(error.message);
    if (parsed && typeof parsed.error === 'string') {
      return parsed.error;
    }
  } catch {
    // Plain error message
  }
  return error.message || 'An unexpected error occurred.';
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App error boundary caught:', error);
  }, [error]);

  const readableMessage = extractReadableError(error);

  return (
    <main className="min-h-screen bg-bg text-ink flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md rounded-2xl bg-surface border border-line p-6 sm:p-8 text-center space-y-4 shadow-xl">
        <div className="w-12 h-12 rounded-full bg-danger/15 border border-danger/30 text-danger flex items-center justify-center mx-auto">
          <AlertTriangle size={22} />
        </div>
        <h2 className="text-lg font-bold text-ink font-display">
          Something went wrong
        </h2>
        <p className="text-xs text-muted leading-relaxed break-words">
          {readableMessage}
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-accent-solid hover:bg-accent-hover text-white text-xs font-bold transition-colors"
          >
            <RotateCcw size={14} />
            <span>Try again</span>
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-surface-2 hover:bg-surface border border-line text-ink text-xs font-bold transition-colors"
          >
            <Home size={14} />
            <span>Home</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
