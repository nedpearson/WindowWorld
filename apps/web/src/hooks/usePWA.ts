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

// How long (ms) to suppress the update banner after the user taps "Update Now".
// Prevents the banner from immediately reappearing while the new SW is settling.
const UPDATE_COOLDOWN_MS = 45_000; // 45 seconds
const COOLDOWN_KEY = 'pwa-update-applied-at';

function isInUpdateCooldown(): boolean {
  const ts = sessionStorage.getItem(COOLDOWN_KEY);
  if (!ts) return false;
  return Date.now() - parseInt(ts, 10) < UPDATE_COOLDOWN_MS;
}

// iOS-compatible hard reload. window.location.reload() in standalone PWA mode
// can silently reload from the SW cache instead of the network.
// Appending a cache-bust query param forces the SW to re-fetch the shell.
function hardReload() {
  const url = new URL(window.location.href);
  url.searchParams.set('_sw', Date.now().toString());
  window.location.replace(url.toString());
}

// ─── Hook ─────────────────────────────────────────────────────
export function usePWA(): PWAState {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable]   = useState(false);
  const [isOnline, setIsOnline]             = useState(navigator.onLine);

  // Suppress banner if we just applied an update
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const cooldownActive = useRef(isInUpdateCooldown());

  const markUpdateAvailable = useCallback(() => {
    if (cooldownActive.current) return; // don't show banner during cooldown
    setIsUpdateAvailable(true);
  }, []);

  // Reactive dismissed state — sessionStorage alone doesn't re-render on iOS
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
  const reloadScheduled = useRef(false);

  // ── SW version poller: checks /version.json every 60s ────────────────────
  const currentVersion = useRef<string | null>(
    (import.meta as any).env?.VITE_BUILD_VERSION ?? null
  );

  const checkForNewVersion = useCallback(async () => {
    if (cooldownActive.current) return; // skip polling during cooldown
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
    const handleSWUpdate = () => markUpdateAvailable();

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

        // Only show the banner for a waiting SW if we're NOT in the post-update
        // cooldown period. Without this guard the banner re-appears immediately
        // after every reload because the just-activated SW is briefly "waiting".
        if (reg.waiting && !cooldownActive.current) {
          setIsUpdateAvailable(true);
        }

        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          newWorker?.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              markUpdateAvailable();
            }
          });
        });

        // Trigger an immediate check in case SW is stale
        reg.update().catch(() => {});
      });

      // When the active SW changes (skipWaiting completed), reload the page.
      // Debounced with a flag so rapid activations don't fire multiple reloads.
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (reloadScheduled.current) return;
        reloadScheduled.current = true;
        // Small delay lets the new SW claim all clients before we reload
        setTimeout(() => hardReload(), 300);
      });
    }

    // ── Version poller every 60 seconds ────────────────────────
    checkForNewVersion();
    const pollInterval = setInterval(checkForNewVersion, 60_000);

    // ── Expire the cooldown flag after UPDATE_COOLDOWN_MS ──────
    const cooldownTs = sessionStorage.getItem(COOLDOWN_KEY);
    if (cooldownTs) {
      const remaining = UPDATE_COOLDOWN_MS - (Date.now() - parseInt(cooldownTs, 10));
      if (remaining > 0) {
        const cooldownTimer = setTimeout(() => {
          cooldownActive.current = false;
          sessionStorage.removeItem(COOLDOWN_KEY);
        }, remaining);
        return () => {
          clearTimeout(cooldownTimer);
          window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
          window.removeEventListener('online',  handleOnline);
          window.removeEventListener('offline', handleOffline);
          document.removeEventListener('swUpdateAvailable', handleSWUpdate);
          document.removeEventListener('visibilitychange', handleVisibility);
          clearInterval(pollInterval);
        };
      } else {
        // Cooldown already expired — clear it and proceed normally
        cooldownActive.current = false;
        sessionStorage.removeItem(COOLDOWN_KEY);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('swUpdateAvailable', handleSWUpdate);
      document.removeEventListener('visibilitychange', handleVisibility);
      clearInterval(pollInterval);
    };
  }, [checkForNewVersion, markUpdateAvailable]);

  // ── Install (Android native prompt) ────────────────────────────────────────
  const install = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setIsInstallable(false);
    return outcome === 'accepted';
  }, [deferredPrompt]);

  // ── Dismiss install banner ──────────────────────────────────────────────────
  const dismissInstall = useCallback(() => {
    setIsInstallable(false);
    setDeferredPrompt(null);
    setDismissed(true);
    sessionStorage.setItem('pwa-install-dismissed', '1');
  }, []);

  // ── Force update: tell waiting SW to skip waiting ──────────────────────────
  const forceUpdate = useCallback(() => {
    // Record the timestamp BEFORE the reload so the new page load sees it
    sessionStorage.setItem(COOLDOWN_KEY, Date.now().toString());
    cooldownActive.current = true;
    setIsUpdateAvailable(false);

    const reg = swRegRef.current;
    if (reg?.waiting) {
      // Posting SKIP_WAITING activates the waiting SW → triggers controllerchange
      // → our listener calls hardReload() after 300ms
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    } else {
      // No waiting SW — just hard reload bypassing cache
      hardReload();
    }
  }, []);

  return {
    isInstallable: isInstallable && !isStandalone && !dismissed,
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
