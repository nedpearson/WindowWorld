// WindowWorld Service Worker — Push & Background Sync handler
// This file is picked up by vite-plugin-pwa as additionalManifestEntries
// and injected into the generated SW via injectManifest mode.
// For simplicity with workbox generateSW, we hook into the SW lifecycle via messaging.

// Push notification handler — fires when a push arrives from server
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'WindowWorld', body: event.data.text() };
  }

  const {
    title  = 'WindowWorld',
    body   = '',
    icon   = '/icon-192.png',
    badge  = '/icon-192.png',
    url    = '/field',
    tag    = 'ww-notification',
    data   = {},
  } = payload;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      tag,
      data: { url, ...data },
      requireInteraction: false,
      vibrate: [100, 50, 100],
    })
  );
});

// Notification click — opens/focuses the app and navigates to the linked URL
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url ?? '/field';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If app is already open, focus it and navigate
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.postMessage({ type: 'PUSH_NAVIGATE', url: targetUrl });
          return;
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Background sync — retry queued offline actions when connectivity returns
self.addEventListener('sync', (event) => {
  if (event.tag === 'ww-offline-queue') {
    event.waitUntil(
      // Post a message to any open client to trigger the queue flush
      clients.matchAll({ type: 'window' }).then((clientList) => {
        clientList.forEach((client) => {
          client.postMessage({ type: 'SYNC_OFFLINE_QUEUE' });
        });
      })
    );
  }
});
