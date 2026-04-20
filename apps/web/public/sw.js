// WindowWorld Service Worker v1.0
// Cache-first for static assets, network-first for API calls

const CACHE_NAME = 'ww-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// ── Install: pre-cache shell ────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ── Activate: clean old caches ──────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: network-first for /api, cache-first for static ──
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API requests: network-first, no caching
  if (url.pathname.startsWith('/api/') || url.hostname !== self.location.hostname) {
    event.respondWith(fetch(request).catch(() => new Response('{"error":"offline"}', {
      headers: { 'Content-Type': 'application/json' }
    })));
    return;
  }

  // Static: cache-first, fall back to network
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok && request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      }).catch(() =>
        // Offline fallback: return cached index.html for navigation requests
        request.mode === 'navigate'
          ? caches.match('/index.html')
          : new Response('', { status: 503 })
      );
    })
  );
});

// ── Push Notifications ──────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = { title: 'WindowWorld', body: 'You have a new notification', icon: '/icon-192.png', badge: '/icon-192.png' };

  try {
    const payload = event.data?.json();
    data = { ...data, ...payload };
  } catch (e) {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      vibrate: [100, 50, 100],
      data: { url: data.url || '/dashboard' },
      actions: [
        { action: 'open', title: 'Open App' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    })
  );
});

// ── Notification click: navigate to relevant page ───────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      const existing = clients.find((c) => c.url.includes(self.location.origin));
      if (existing) { existing.focus(); existing.navigate(targetUrl); }
      else self.clients.openWindow(targetUrl);
    })
  );
});

// ── Background Sync (offline note saves) ───────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pending-notes') {
    event.waitUntil(syncPendingNotes());
  }
});

async function syncPendingNotes() {
  // In production: pull from IndexedDB and POST to API
  console.log('[SW] Syncing pending notes...');
}
