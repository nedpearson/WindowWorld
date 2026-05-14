import { Router } from 'express';
import { prisma } from '../index.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';

export const dashboardRoutes = Router();
dashboardRoutes.use(requireAuth);

dashboardRoutes.get('/stats', async (req: AuthRequest, res) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

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
      prisma.appointment.count({ where: { userId } }),
      prisma.appointment.count({
        where: { userId, appointmentDate: { gte: today, lt: tomorrow } }
      }),
      prisma.appointment.count({ where: { userId, status: 'draft' } }),
      prisma.appointment.count({ where: { userId, status: 'quoted' } }),
      prisma.appointment.count({ where: { userId, status: 'sold' } }),
      prisma.appointment.count({ where: { userId, status: 'needs_remeasure' } }),
      // For customers, ideally we filter by those who have an appointment with this user
      prisma.customer.count({
        where: { appointments: { some: { userId } } }
      }),
      prisma.appointment.aggregate({
        _sum: { totalAmount: true },
        where: { userId, status: 'sold' }
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
dashboardRoutes.get('/recent', async (req: AuthRequest, res) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const appointments = await prisma.appointment.findMany({
      where: { userId },
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
