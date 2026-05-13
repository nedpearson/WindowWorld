import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { appointmentRoutes } from './routes/appointments.js';
import { customerRoutes } from './routes/customers.js';
import { openingRoutes } from './routes/openings.js';
import { pricingRoutes } from './routes/pricing.js';
import { authRoutes } from './routes/auth.js';
import { exportRoutes } from './routes/exports.js';
import { dashboardRoutes } from './routes/dashboard.js';
import { houseMapRoutes } from './routes/housemap.js';

export const prisma = new PrismaClient();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/openings', openingRoutes);
app.use('/api/pricing', pricingRoutes);
app.use('/api/exports', exportRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/house-maps', houseMapRoutes);

app.listen(PORT, () => {
  console.log(`🪟 Window World Assistant API running on port ${PORT}`);
});
