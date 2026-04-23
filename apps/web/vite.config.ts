import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'sw-push.js'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        cleanupOutdatedCaches: true,
        skipWaiting: true,        // activate new SW immediately on deploy
        clientsClaim: true,       // take control of all open tabs immediately
        // Inject push handler into the generated service worker
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
          { name: 'Field App', short_name: 'Field', description: 'Open field mode', url: '/field', icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
          { name: 'Dashboard', short_name: 'Dash', description: 'Open dashboard', url: '/dashboard', icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: '../../server/public',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // manualChunks as a function splits vendor chunks for optimal caching
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            if (id.includes('recharts')) return 'charts';
            if (id.includes('framer-motion')) return 'motion';
            if (id.includes('@tanstack/react-query')) return 'query';
            if (id.includes('leaflet') || id.includes('react-leaflet')) return 'maps';
            if (id.includes('react-dom') || id.includes('react-router')) return 'vendor';
            if (id.includes('jspdf') || id.includes('html2canvas')) return 'pdf';
          }
        },
      },
    },
  },
});
