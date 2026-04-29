import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster, toast } from 'sonner';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';
import { v4 as uuidv4 } from 'uuid';

// Ensure device ID exists for mobile sync
if (!localStorage.getItem('ww_device_id')) {
  localStorage.setItem('ww_device_id', uuidv4());
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,      // 30 seconds
      gcTime: 5 * 60 * 1000,     // 5 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID === 'dummy-client-id') {
  console.warn('[Auth] VITE_GOOGLE_CLIENT_ID is not configured — Google Sign-In will not work.');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID || 'unconfigured'}>
        <BrowserRouter>
          <QueryClientProvider client={queryClient}>
            <App />
            <Toaster
              position="top-right"
              theme="dark"
              toastOptions={{
                style: {
                  background: '#1e293b',
                  border: '1px solid rgba(148,163,184,0.1)',
                  color: '#f1f5f9',
                },
              }}
            />
          </QueryClientProvider>
        </BrowserRouter>
      </GoogleOAuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
);


// ── Permanent Auto-Update System ──────────────────────────────────────────
// The Vite PWA plugin (vite.config.ts) generates a Workbox service worker
// with cacheId = `ww-${BUILD_TIME}` — a unique value per deploy.
// This means every Railway push busts the old cache automatically.
//
// Additionally, we poll /version.json every 5 min and auto-reload if the
// deployed buildTime differs from what this bundle was compiled with.
// Users always get fresh code within 5 minutes of any deploy — no manual
// cache clearing, no "Rep Coaching" ghosts, ever again.
if (import.meta.env.PROD) {
  const CURRENT_BUILD = import.meta.env.VITE_BUILD_TIME as string;

  async function checkForUpdate() {
    try {
      const res = await fetch(`/version.json?_=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) return;
      const { buildTime } = await res.json() as { buildTime: string };
      if (buildTime && buildTime !== CURRENT_BUILD) {
        console.info(`[update] New build ${buildTime} > current ${CURRENT_BUILD}. Reloading.`);
        window.location.reload();
      }
    } catch { /* offline — skip silently */ }
  }

  // First check after 30s (let the app settle), then every 5 minutes
  setTimeout(checkForUpdate, 30_000);
  setInterval(checkForUpdate, 5 * 60 * 1000);

  // Also trigger when the user switches back to this tab
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkForUpdate();
  });
}
