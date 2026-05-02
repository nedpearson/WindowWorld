import { useState, useEffect, useCallback } from 'react';

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
}

// ─── Hook ─────────────────────────────────────────────────────
export function usePWA(): PWAState {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);

  // Detect iOS
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

  // Detect standalone (already installed)
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;

  const isInstalled = isStandalone;

  useEffect(() => {
    // Install prompt handler
    const handleInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    // Online/offline handlers
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    // Service worker update detection
    const handleSWUpdate = () => setIsUpdateAvailable(true);

    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('swUpdateAvailable', handleSWUpdate);

    // Check if SW has pending update
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg?.waiting) setIsUpdateAvailable(true);
        reg?.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          newWorker?.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setIsUpdateAvailable(true);
            }
          });
        });
      });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('swUpdateAvailable', handleSWUpdate);
    };
  }, []);

  const install = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setIsInstallable(false);
    return outcome === 'accepted';
  }, [deferredPrompt]);

  // Reactive dismissed state — sessionStorage alone doesn't re-render React on iOS
  // (isInstallable stays false on iOS since beforeinstallprompt never fires,
  //  so dismissInstall's setIsInstallable(false) was a no-op and the banner persisted)
  const [dismissed, setDismissed] = useState(
    () => !!sessionStorage.getItem('pwa-install-dismissed')
  );

  const dismissInstall = useCallback(() => {
    setIsInstallable(false);
    setDeferredPrompt(null);
    setDismissed(true);
    sessionStorage.setItem('pwa-install-dismissed', '1');
  }, []);

  return {
    // Show banner when: native prompt available OR iOS (manual share), but only if not
    // already installed as a standalone app AND user hasn't dismissed this session
    isInstallable: (isInstallable || isIOS) && !isStandalone && !dismissed,
    isInstalled,
    isOnline,
    isUpdateAvailable,
    isIOS,
    isStandalone,
    install,
    dismissInstall,
  };
}
