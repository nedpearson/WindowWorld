import { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client';

// ─── Types ──────────────────────────────────────────────────
type PushPermission = 'default' | 'granted' | 'denied' | 'unsupported';

interface UsePushNotificationsReturn {
  permission: PushPermission;
  isSubscribed: boolean;
  isLoading: boolean;
  isSupported: boolean;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<void>;
  sendTest: () => Promise<void>;
}

// ─── Helpers ─────────────────────────────────────────────────
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// ─── Hook ────────────────────────────────────────────────────
export function usePushNotifications(): UsePushNotificationsReturn {
  const [permission, setPermission] = useState<PushPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentSub, setCurrentSub] = useState<PushSubscription | null>(null);

  const isSupported =
    'serviceWorker' in navigator &&
    'PushManager'   in window    &&
    'Notification'  in window;

  // Sync state from current SW subscription
  useEffect(() => {
    if (!isSupported) return;
    setPermission(Notification.permission as PushPermission);

    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        if (sub) {
          setIsSubscribed(true);
          setCurrentSub(sub);
        }
      });
    });
  }, [isSupported]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;
    setIsLoading(true);

    try {
      // 1. Request permission
      const perm = await Notification.requestPermission();
      setPermission(perm as PushPermission);
      if (perm !== 'granted') return false;

      // 2. Fetch VAPID public key from our server
      const { data } = await apiClient.get('/push/vapid-public-key') as any;
      if (!data?.publicKey) {
        console.warn('[Push] Server has no VAPID key configured');
        return false;
      }

      // 3. Subscribe via Service Worker PushManager
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.publicKey) as any,
      });

      // 4. Send subscription to our server
      const subJson = sub.toJSON() as {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };
      await apiClient.post('/push/subscribe', {
        ...subJson,
        userAgent: navigator.userAgent,
      });

      setCurrentSub(sub);
      setIsSubscribed(true);
      return true;
    } catch (err) {
      console.error('[Push] Subscribe failed:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  const unsubscribe = useCallback(async () => {
    if (!currentSub) return;
    setIsLoading(true);
    try {
      const endpoint = currentSub.endpoint;
      await currentSub.unsubscribe();
      await apiClient.delete('/push/unsubscribe', { data: { endpoint } });
      setCurrentSub(null);
      setIsSubscribed(false);
    } finally {
      setIsLoading(false);
    }
  }, [currentSub]);

  const sendTest = useCallback(async () => {
    await apiClient.post('/push/test', {});
  }, []);

  return { permission, isSubscribed, isLoading, isSupported, subscribe, unsubscribe, sendTest };
}
