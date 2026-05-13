import { Router } from 'express';
import { prisma } from '../index.js';

export const dashboardRoutes = Router();

dashboardRoutes.get('/stats', async (_req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      totalAppointments,
      todayAppointments,
      draftCount,
      quotedCount,
      soldCount,
      needsRemeasure,
      totalCustomers,
      totalRevenue
    ] = await Promise.all([
      prisma.appointment.count(),
      prisma.appointment.count({
        where: { appointmentDate: { gte: today, lt: tomorrow } }
      }),
      prisma.appointment.count({ where: { status: 'draft' } }),
      prisma.appointment.count({ where: { status: 'quoted' } }),
      prisma.appointment.count({ where: { status: 'sold' } }),
      prisma.appointment.count({ where: { status: 'needs_remeasure' } }),
      prisma.customer.count(),
      prisma.appointment.aggregate({
        _sum: { totalAmount: true },
        where: { status: 'sold' }
      })
    ]);

    res.json({
      totalAppointments,
      todayAppointments,
      draftCount,
      quotedCount,
      soldCount,
      needsRemeasure,
      totalCustomers,
      totalRevenue: totalRevenue._sum.totalAmount || 0
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Recent activity
dashboardRoutes.get('/recent', async (_req, res) => {
  try {
    const appointments = await prisma.appointment.findMany({
      take: 10,
      orderBy: { updatedAt: 'desc' },
      include: {
        customer: true,
        _count: { select: { openings: true } }
      }
    });
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch recent activity' });
  }
});
