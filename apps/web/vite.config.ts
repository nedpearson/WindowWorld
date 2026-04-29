import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import fs from 'fs';

// ── Build identity ──────────────────────────────────────────────────────────
// A unique timestamp is generated ONCE per build and embedded everywhere:
//   • as import.meta.env.VITE_BUILD_TIME  (React code)
//   • as the Workbox cacheId              (service worker cache name)
//   • written to dist/version.json        (polled by the app every 5 min)
// This guarantees every Railway deploy gets a fresh service worker and that
// users automatically hard-reload when a new version is detected.
const BUILD_TIME = Date.now().toString();
const BUILD_VERSION = `ww-${BUILD_TIME}`;

// ── Custom plugin: write dist/version.json after every build ───────────────
function writeVersionPlugin() {
  return {
    name: 'write-version-json',
    closeBundle() {
      const versionData = JSON.stringify({ buildTime: BUILD_TIME, version: BUILD_VERSION }, null, 2);
      const outDir = path.resolve(__dirname, 'dist');
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(path.join(outDir, 'version.json'), versionData);
      console.log(`[version] Wrote dist/version.json → ${BUILD_VERSION}`);
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // 'autoUpdate' = Workbox installs + activates the new SW in the background
      // and the app's version poller triggers a reload to pick it up.
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'sw-push.js'],
      workbox: {
        // !! cacheId changes every build → old caches are automatically deleted !!
        cacheId: BUILD_VERSION,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        cleanupOutdatedCaches: true,
        skipWaiting: true,    // activate new SW immediately — no waiting for tab close
        clientsClaim: true,   // take control of ALL open tabs immediately
        importScripts: ['/sw-push.js'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 },
              networkTimeoutSeconds: 8,
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // version.json: always network-first so the version poller
            // always sees the latest deployed version
            urlPattern: ({ url }) => url.pathname === '/version.json',
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'fonts-cache',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
      manifest: {
        name: 'WindowWorld Sales Platform',
        short_name: 'WindowWorld',
        description: 'AI-first window sales operating system for Louisiana',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'any',
        start_url: '/field',
        scope: '/',
        id: 'windowworld-sales-pwa',
        categories: ['business', 'productivity'],
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
        shortcuts: [
          { name: 'Field App',  short_name: 'Field', description: 'Open field mode',  url: '/field',     icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
          { name: 'Dashboard',  short_name: 'Dash',  description: 'Open dashboard',    url: '/dashboard', icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
        ],
      },
    }),
    writeVersionPlugin(),
  ],

  // ── Inject BUILD_TIME into all client code ─────────────────────────────
  define: {
    'import.meta.env.VITE_BUILD_TIME': JSON.stringify(BUILD_TIME),
    'import.meta.env.VITE_BUILD_VERSION': JSON.stringify(BUILD_VERSION),
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  server: {
    host: '127.0.0.1',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
    },
  },

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            if (id.includes('recharts'))                                   return 'charts';
            if (id.includes('framer-motion'))                              return 'motion';
            if (id.includes('@tanstack/react-query'))                      return 'query';
            if (id.includes('leaflet') || id.includes('react-leaflet'))    return 'maps';
            if (id.includes('react-dom') || id.includes('react-router'))   return 'vendor';
            if (id.includes('jspdf') || id.includes('html2canvas'))        return 'pdf';
          }
        },
      },
    },
  },
});
