import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Window World Assistant',
        short_name: 'WWA Field',
        description: 'Window World sales rep field app — works offline',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/mobile',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // Cache all static assets (JS, CSS, fonts, images)
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Runtime caching strategy for API calls
        runtimeCaching: [
          {
            // Appointments + openings: cache-first with network update in background
            urlPattern: /\/api\/(appointments|openings|customers)/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-appointments',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 }, // 7 days
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Pricing + rules: cache for 24h
            urlPattern: /\/api\/(pricing|rules|measurement-rules)/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-config',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Dashboard + quality scores: network-first but fall back to cache
            urlPattern: /\/api\/(dashboard|mobile)/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-dashboard',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Forms auto-fill: cache so order form loads offline
            urlPattern: /\/api\/forms/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-forms',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 3 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Voice/parse: network-only (requires AI, graceful offline fail)
            urlPattern: /\/api\/(voice|exports)/,
            handler: 'NetworkOnly',
          },
        ],
        // Navigate to index.html for all SPA routes
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/],
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        enabled: false, // don't run SW in dev mode (causes confusion)
      },
    }),
  ],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  }
});
