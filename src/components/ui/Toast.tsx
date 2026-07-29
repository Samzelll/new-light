"use client";

import { createContext, useCallback, useContext, useRef, useState } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────
export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  emoji?: string;
  duration?: number;
}

interface ToastContextValue {
  showToast: (opts: Omit<Toast, 'id'>) => void;
  success: (message: string, emoji?: string) => void;
  error: (message: string) => void;
  info: (message: string, emoji?: string) => void;
}

// ── Context ─────────────────────────────────────────────────────────────────
const ToastContext = createContext<ToastContextValue | null>(null);

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

// ── Individual Toast component ───────────────────────────────────────────────
function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const colorMap: Record<ToastType, { bg: string; border: string; icon: string }> = {
    success: {
      bg: 'rgba(0, 229, 160, 0.12)',
      border: 'rgba(0, 229, 160, 0.3)',
      icon: '✓',
    },
    error: {
      bg: 'rgba(255, 87, 87, 0.12)',
      border: 'rgba(255, 87, 87, 0.3)',
      icon: '✕',
    },
    info: {
      bg: 'rgba(56, 97, 255, 0.12)',
      border: 'rgba(56, 97, 255, 0.3)',
      icon: 'ℹ',
    },
    warning: {
      bg: 'rgba(255, 200, 87, 0.12)',
      border: 'rgba(255, 200, 87, 0.3)',
      icon: '⚠',
    },
  };

  const textColorMap: Record<ToastType, string> = {
    success: 'var(--color-accent-green)',
    error: 'var(--color-accent-red)',
    info: 'var(--color-brand-400)',
    warning: 'var(--color-accent-yellow)',
  };

  const style = colorMap[toast.type];
  const textColor = textColorMap[toast.type];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        borderRadius: '16px',
        background: style.bg,
        border: `1px solid ${style.border}`,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        maxWidth: '340px',
        width: '100%',
        animation: 'toastIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both',
        cursor: 'pointer',
        userSelect: 'none',
      }}
      onClick={() => onRemove(toast.id)}
    >
      <div
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '10px',
          background: style.border,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '14px',
          fontWeight: '800',
          color: textColor,
          flexShrink: 0,
        }}
      >
        {toast.emoji || style.icon}
      </div>
      <p
        style={{
          fontSize: '14px',
          fontWeight: '600',
          color: 'white',
          margin: 0,
          lineHeight: '1.4',
          flex: 1,
        }}
      >
        {toast.message}
      </p>
    </div>
  );
}

// ── Provider ─────────────────────────────────────────────────────────────────
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (opts: Omit<Toast, 'id'>) => {
      const id = `toast-${++counterRef.current}`;
      const toast: Toast = { id, duration: 3000, ...opts };
      setToasts((prev) => [...prev.slice(-4), toast]); // max 5 toasts
      setTimeout(() => removeToast(id), toast.duration);
    },
    [removeToast]
  );

  const success = useCallback(
    (message: string, emoji?: string) => showToast({ type: 'success', message, emoji }),
    [showToast]
  );
  const error = useCallback(
    (message: string) => showToast({ type: 'error', message }),
    [showToast]
  );
  const info = useCallback(
    (message: string, emoji?: string) => showToast({ type: 'info', message, emoji }),
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, success, error, info }}>
      {children}

      {/* Toast container */}
      <div
        style={{
          position: 'fixed',
          bottom: '90px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          alignItems: 'center',
          pointerEvents: 'none',
          width: '100%',
          padding: '0 16px',
        }}
      >
        {toasts.map((toast) => (
          <div key={toast.id} style={{ pointerEvents: 'auto', width: '100%', maxWidth: '340px' }}>
            <ToastItem toast={toast} onRemove={removeToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
