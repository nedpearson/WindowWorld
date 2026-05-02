import { useState, useEffect, useCallback, useRef } from 'react';

// ─── Types ────────────────────────────────────────────────────
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

interface PWAState {
  isInstallable: boolean;
  isInstalled: boolean;
  isOnline: boolean;
  isUpdateAvailable: boolean;
  isIOS: boolean;
  isStandalone: boolean;
  install: () => Promise<boolean>;
  dismissInstall: () => void;
  forceUpdate: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────
export function usePWA(): PWAState {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable]   = useState(false);
  const [isOnline, setIsOnline]             = useState(navigator.onLine);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);

  // Reactive dismissed state — sessionStorage alone doesn't re-render on iOS
  // (isInstallable is always false on iOS so setIsInstallable(false) is a no-op)
  const [dismissed, setDismissed] = useState(
    () => !!sessionStorage.getItem('pwa-install-dismissed')
  );

  // Detect iOS
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

  // Detect standalone (already installed as PWA)
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;

  const isInstalled = isStandalone;

  // Keep a ref to the registration so forceUpdate can access it
  const swRegRef = useRef<ServiceWorkerRegistration | null>(null);

  // ── SW version poller: checks /version.json every 60s ────────────────────
  const currentVersion = useRef<string | null>(
    (import.meta as any).env?.VITE_BUILD_VERSION ?? null
  );

  const checkForNewVersion = useCallback(async () => {
    try {
      const res = await fetch('/version.json?t=' + Date.now(), { cache: 'no-store' });
      if (!res.ok) return;
      const { version } = await res.json();
      if (currentVersion.current && version && version !== currentVersion.current) {
        setIsUpdateAvailable(true);
      }
    } catch {
      // offline — skip
    }
  }, []);

  useEffect(() => {
    // ── Event listeners ────────────────────────────────────────
    const handleInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };
    const handleOnline  = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleSWUpdate = () => setIsUpdateAvailable(true);

    // Check for updates when the tab regains focus
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkForNewVersion();
        // Also ask the SW to check for its own update
        swRegRef.current?.update().catch(() => {});
      }
    };

    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('swUpdateAvailable', handleSWUpdate);
    document.addEventListener('visibilitychange', handleVisibility);

    // ── Service worker registration + update detection ─────────
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (!reg) return;
        swRegRef.current = reg;

        // If a new SW is already waiting, mark update available immediately
        if (reg.waiting) setIsUpdateAvailable(true);

        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          newWorker?.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setIsUpdateAvailable(true);
            }
          });
        });

        // Trigger an immediate check in case SW is stale
        reg.update().catch(() => {});
      });

      // When the active SW changes (skipWaiting completed), reload the page
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    }

    // ── Version poller every 60 seconds ────────────────────────
    checkForNewVersion();
    const pollInterval = setInterval(checkForNewVersion, 60_000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('swUpdateAvailable', handleSWUpdate);
      document.removeEventListener('visibilitychange', handleVisibility);
      clearInterval(pollInterval);
    };
  }, [checkForNewVersion]);

  // ── Install (Android native prompt) ────────────────────────────────────────
  const install = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setIsInstallable(false);
    return outcome === 'accepted';
  }, [deferredPrompt]);

  // ── Dismiss install banner (reactive — fixes iOS X doing nothing) ──────────
  const dismissInstall = useCallback(() => {
    setIsInstallable(false);
    setDeferredPrompt(null);
    setDismissed(true);
    sessionStorage.setItem('pwa-install-dismissed', '1');
  }, []);

  // ── Force update: tell waiting SW to skip waiting, then reload ─────────────
  // This works even if the `controllerchange` event already fired:
  // posting SKIP_WAITING to the waiting SW activates it, which triggers
  // `controllerchange`, which triggers window.location.reload() above.
  const forceUpdate = useCallback(() => {
    const reg = swRegRef.current;
    if (reg?.waiting) {
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    } else {
      // No waiting SW — just hard reload bypassing cache
      window.location.reload();
    }
  }, []);

  return {
    // Show banner when: native prompt available OR iOS manual share,
    // but NOT if already installed as standalone OR user dismissed
    isInstallable: (isInstallable || isIOS) && !isStandalone && !dismissed,
    isInstalled,
    isOnline,
    isUpdateAvailable,
    isIOS,
    isStandalone,
    install,
    dismissInstall,
    forceUpdate,
  };
}
