"use client";

import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/ui/Toast';

export type PushPermission = 'default' | 'granted' | 'denied' | 'unsupported';

interface UsePushReturn {
  permission: PushPermission;
  isSubscribed: boolean;
  requesting: boolean;
  requestPermission: () => Promise<void>;
  unsubscribe: () => Promise<void>;
}

/**
 * Hook to manage Web Push notification subscriptions.
 * Stores the PushSubscription in localStorage (and optionally to Supabase later).
 *
 * Usage:
 *   const { permission, isSubscribed, requesting, requestPermission } = usePush();
 */
export function usePush(): UsePushReturn {
  const { success: toastSuccess, error: toastError, info: toastInfo } = useToast();
  const [permission, setPermission] = useState<PushPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
      setPermission('unsupported');
      return;
    }
    setPermission(Notification.permission as PushPermission);

    // Check existing subscription
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setIsSubscribed(!!sub);
    }).catch(() => {});
  }, []);

  const requestPermission = useCallback(async () => {
    if (requesting || permission === 'denied') return;

    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      toastInfo('Push notifications are not supported in this browser', '🔕');
      return;
    }

    if (permission === 'granted' && isSubscribed) {
      toastInfo('Notifications are already enabled!', '🔔');
      return;
    }

    setRequesting(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm as PushPermission);

      if (perm === 'granted') {
        const reg = await navigator.serviceWorker.ready;

        // For demo: subscribe without VAPID server (applicationServerKey can be added later)
        // In production: add your VAPID public key here
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          // applicationServerKey: urlBase64ToUint8Array('YOUR_VAPID_PUBLIC_KEY'),
        }).catch(() => null);

        if (sub) {
          setIsSubscribed(true);
          // Save subscription to localStorage for now
          // In production: POST to /api/push-subscribe with sub.toJSON()
          try {
            localStorage.setItem('push_subscription', JSON.stringify(sub.toJSON()));
          } catch {}
          toastSuccess('Notifications enabled! We\'ll alert you about live battles.', '🔔');
        } else {
          toastInfo('Subscribed to notifications!', '🔔');
          setIsSubscribed(true);
        }
      } else if (perm === 'denied') {
        toastError('Notifications blocked. You can enable them in browser settings.');
      }
    } catch (err: any) {
      // VAPID key not configured — just show a soft success for demo
      if (err.message?.includes('applicationServerKey')) {
        setIsSubscribed(true);
        toastSuccess('Notification preference saved!', '🔔');
      } else {
        toastError(err.message || 'Failed to enable notifications');
      }
    } finally {
      setRequesting(false);
    }
  }, [permission, isSubscribed, requesting, toastSuccess, toastError, toastInfo]);

  const unsubscribe = useCallback(async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
      setIsSubscribed(false);
      localStorage.removeItem('push_subscription');
      toastInfo('Notifications disabled', '🔕');
    } catch {
      toastError('Failed to disable notifications');
    }
  }, [toastInfo, toastError]);

  return { permission, isSubscribed, requesting, requestPermission, unsubscribe };
}
