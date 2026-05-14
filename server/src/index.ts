import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import { appointmentRoutes } from './routes/appointments.js';
import { customerRoutes } from './routes/customers.js';
import { openingRoutes } from './routes/openings.js';
import { pricingRoutes } from './routes/pricing.js';
import { authRoutes } from './routes/auth.js';
import { exportRoutes } from './routes/exports.js';
import { dashboardRoutes } from './routes/dashboard.js';
import { houseMapRoutes } from './routes/housemap.js';
import { voiceRoutes } from './routes/voice.js';
import { pricingVersionRoutes } from './routes/pricingVersions.js';
import { formsRoutes } from './routes/forms.js';
import { validationRoutes } from './routes/validation.js';
import { sketchRoutes } from './routes/sketches.js';
import { documentRoutes } from './routes/documents.js';
import { mobileRoutes } from './routes/mobile.js';
import { walkthroughRoutes } from './routes/walkthrough.js';
import { rulesRoutes } from './routes/rules.js';
import { commissionRoutes } from './routes/commissions.js';

export const prisma = new PrismaClient();

const app = express();
const PORT = process.env.PORT || 3001;
const IS_PROD = process.env.NODE_ENV === 'production';

// In production: same-origin (frontend served from this server)
// In dev: open CORS for Vite dev server on :5173
app.use(cors({ origin: IS_PROD ? false : true, credentials: true }));
app.use(express.json({ limit: '50mb' }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Network IP — returns machine's LAN IP for QR code
app.get('/api/network-ip', (_req, res) => {
  let lanIp = 'localhost';
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { networkInterfaces } = require('os') as typeof import('os');
    const nets = networkInterfaces();
    
    // First pass: look for a clear physical adapter (Wi-Fi or Ethernet)
    // Ignore virtual adapters like WSL, Hyper-V, VMware, Docker
    for (const [name, iface] of Object.entries(nets)) {
      if (!iface) continue;
      const isVirtual = name.toLowerCase().includes('wsl') || 
                        name.toLowerCase().includes('hyper') || 
                        name.toLowerCase().includes('vbox') || 
                        name.toLowerCase().includes('vmware');
      
      if (isVirtual) continue;

      for (const addr of iface) {
        if (addr.family === 'IPv4' && !addr.internal) { 
          // Prefer 192.168.x.x or 10.x.x.x (standard local subnets)
          if (addr.address.startsWith('192.168.') || addr.address.startsWith('10.')) {
            lanIp = addr.address; 
          }
        }
      }
    }
    
    // If we didn't find one, fallback to the old method (any non-internal IPv4)
    if (lanIp === 'localhost') {
      outer: for (const iface of Object.values(nets)) {
        if (!iface) continue;
        for (const addr of iface) {
          if (addr.family === 'IPv4' && !addr.internal) { lanIp = addr.address; break outer; }
        }
      }
    }
  } catch {}
  res.json({ ip: lanIp });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/openings', openingRoutes);
app.use('/api/pricing', pricingRoutes);
app.use('/api/pricing-versions', pricingVersionRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/forms', formsRoutes);
app.use('/api/exports', exportRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/house-maps', houseMapRoutes);
app.use('/api/validation', validationRoutes);
app.use('/api/sketches', sketchRoutes);
app.use('/api/mobile', mobileRoutes);
app.use('/api/walkthrough', walkthroughRoutes);
app.use('/api/rules', rulesRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/commissions', commissionRoutes);

// ── Production: serve built Vite frontend as PWA ──────────
if (IS_PROD) {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const staticPath = path.join(__dirname, 'public');
  app.use(express.static(staticPath));
  // SPA fallback — all non-API routes → index.html
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      res.sendFile(path.join(staticPath, 'index.html'));
    } else {
      next();
    }
  });
}

app.listen(PORT, () => {
  console.log(`🪟 WindowWorldAssistant on :${PORT} [${IS_PROD ? 'PROD' : 'DEV'}]`);
  console.log('Backend successfully reloaded!');
});
