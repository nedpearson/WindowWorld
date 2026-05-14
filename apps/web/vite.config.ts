import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,        // bind to 0.0.0.0 — required for LAN access from phone
    port: 5173,
    strictPort: true,  // fail loudly if port taken (keeps QR URL accurate)
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  }
});
