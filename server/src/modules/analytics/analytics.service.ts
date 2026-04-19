import { Prisma } from '@prisma/client';
import { prisma } from '../../shared/services/prisma';

export class AnalyticsService {
  async getDashboard(organizationId: string, repId?: string) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());

    const repFilter: Prisma.LeadWhereInput = repId ? { assignedRepId: repId } : {};
    const orgLeadFilter: Prisma.LeadWhereInput = { organizationId, deletedAt: null, ...repFilter };

    const [
      totalLeads, newLeadsToday, newLeadsWeek,
      activeLeads, soldMonth, proposalsSent,
      appointmentsToday, stormLeads,
      pipelineAgg, revenueMonth,
    ] = await Promise.all([
      // Total active leads
      prisma.lead.count({ where: { ...orgLeadFilter, status: { notIn: ['LOST', 'PAID', 'INSTALLED'] } } }),

      // New today
      prisma.lead.count({
        where: { ...orgLeadFilter, createdAt: { gte: new Date(now.setHours(0,0,0,0)) } }
      }),

      // New this week
      prisma.lead.count({ where: { ...orgLeadFilter, createdAt: { gte: weekStart } } }),

      // Active in funnel
      prisma.lead.count({ where: { ...orgLeadFilter, status: { in: ['APPOINTMENT_SET', 'INSPECTION_COMPLETE', 'MEASURING_COMPLETE', 'PROPOSAL_SENT', 'FOLLOW_UP', 'VERBAL_COMMIT'] } } }),

      // Sold this month
      prisma.lead.count({ where: { ...orgLeadFilter, status: { in: ['SOLD', 'ORDERED', 'INSTALLED', 'PAID'] }, updatedAt: { gte: monthStart } } }),

      // Proposals sent this month
      prisma.proposal.count({ where: { lead: { organizationId }, sentAt: { gte: monthStart } } }),

      // Appointments today
      prisma.appointment.count({
        where: {
          lead: { organizationId },
          scheduledAt: { gte: new Date(new Date().setHours(0,0,0,0)), lte: new Date(new Date().setHours(23,59,59,999)) },
          status: { in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'] },
        },
      }),

      // Storm leads active
      prisma.lead.count({ where: { ...orgLeadFilter, isStormLead: true, status: { notIn: ['SOLD', 'LOST', 'PAID'] } } }),

      // Pipeline value aggregate
      prisma.lead.aggregate({
        where: { ...orgLeadFilter, status: { notIn: ['LOST', 'PAID', 'INSTALLED'] }, estimatedRevenue: { not: null } },
        _sum: { estimatedRevenue: true },
        _avg: { leadScore: true },
      }),

      // Revenue this month (from sold leads Est revenue)
      prisma.lead.aggregate({
        where: { ...orgLeadFilter, status: { in: ['SOLD', 'ORDERED', 'INSTALLED', 'PAID'] }, updatedAt: { gte: monthStart } },
        _sum: { estimatedRevenue: true },
      }),
    ]);

    // Pipeline by stage
    const stageLeads = await prisma.lead.groupBy({
      by: ['status'],
      where: { ...orgLeadFilter, status: { notIn: ['LOST', 'PAID', 'INSTALLED', 'ORDERED', 'NEW_LEAD', 'ATTEMPTING_CONTACT', 'CONTACTED', 'NURTURE'] } },
      _count: { id: true },
      _sum: { estimatedRevenue: true },
    });

    // Lead sources breakdown
    const bySources = await prisma.lead.groupBy({
      by: ['source'],
      where: { organizationId, deletedAt: null, createdAt: { gte: new Date(now.getFullYear(), now.getMonth() - 2, 1) } },
      _count: { id: true },
    });

    // Close rate
    const closedTotal = await prisma.lead.count({ where: { ...orgLeadFilter, status: { in: ['SOLD', 'ORDERED', 'INSTALLED', 'PAID'] } } });
    const lostTotal = await prisma.lead.count({ where: { ...orgLeadFilter, status: 'LOST' } });
    const closeRate = closedTotal + lostTotal > 0 ? closedTotal / (closedTotal + lostTotal) : 0;

    return {
      kpis: {
        totalLeads,
        newLeadsToday,
        newLeadsWeek,
        activeLeads,
        soldMonth,
        proposalsSent,
        appointmentsToday,
        stormLeads,
        pipelineValue: pipelineAgg._sum.estimatedRevenue || 0,
        revenueMonth: revenueMonth._sum.estimatedRevenue || 0,
        avgLeadScore: Math.round(pipelineAgg._avg.leadScore || 0),
        closeRate: Math.round(closeRate * 100),
        avgTicket: closedTotal > 0 ? Math.round((revenueMonth._sum.estimatedRevenue || 0) / Math.max(soldMonth, 1)) : 0,
      },
      pipelineByStage: stageLeads.map((s) => ({
        stage: s.status,
        count: s._count.id,
        value: s._sum.estimatedRevenue || 0,
      })),
      leadsBySource: bySources.map((s) => ({
        source: s.source || 'unknown',
        count: s._count.id,
      })),
    };
  }

  async getRepPerformance(organizationId: string, period: 'week' | 'month' | 'quarter' = 'month') {
    const now = new Date();
    let startDate = new Date();
    if (period === 'week') startDate.setDate(now.getDate() - 7);
    else if (period === 'month') startDate.setMonth(now.getMonth() - 1);
    else startDate.setMonth(now.getMonth() - 3);

    const reps = await prisma.user.findMany({
      where: { organizationId, role: { in: ['SALES_REP', 'SALES_MANAGER'] }, isActive: true },
      select: {
        id: true, firstName: true, lastName: true, avatarUrl: true,
        assignedLeads: {
          where: { deletedAt: null },
          select: { id: true, status: true, estimatedRevenue: true, createdAt: true, updatedAt: true },
        },
      },
    });

    return reps.map((rep) => {
      const leads = rep.assignedLeads;
      const closed = leads.filter((l) => ['SOLD', 'ORDERED', 'INSTALLED', 'PAID'].includes(l.status) && l.updatedAt >= startDate);
      const lost = leads.filter((l) => l.status === 'LOST' && l.updatedAt >= startDate);
      const new_ = leads.filter((l) => l.createdAt >= startDate);
      const revenue = closed.reduce((sum, l) => sum + (l.estimatedRevenue || 0), 0);

      return {
        repId: rep.id,
        name: `${rep.firstName} ${rep.lastName}`,
        avatarUrl: rep.avatarUrl,
        newLeads: new_.length,
        closedDeals: closed.length,
        lostDeals: lost.length,
        revenue,
        closeRate: closed.length + lost.length > 0 ? Math.round((closed.length / (closed.length + lost.length)) * 100) : 0,
        avgTicket: closed.length > 0 ? Math.round(revenue / closed.length) : 0,
        totalActive: leads.filter((l) => !['LOST', 'PAID', 'INSTALLED'].includes(l.status)).length,
      };
    }).sort((a, b) => b.revenue - a.revenue);
  }

  async getRevenueChart(organizationId: string, months: number = 6) {
    const result: { month: string; revenue: number; deals: number }[] = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

      const agg = await prisma.lead.aggregate({
        where: {
          organizationId,
          deletedAt: null,
          status: { in: ['SOLD', 'ORDERED', 'INSTALLED', 'PAID'] },
          updatedAt: { gte: start, lte: end },
        },
        _sum: { estimatedRevenue: true },
        _count: { id: true },
      });

      result.push({
        month: start.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        revenue: agg._sum.estimatedRevenue || 0,
        deals: agg._count.id,
      });
    }

    return result;
  }

  async getParishLeaderboard(organizationId: string) {
    const leads = await prisma.lead.findMany({
      where: { organizationId, deletedAt: null, parish: { not: null } },
      select: { parish: true, status: true, estimatedRevenue: true, leadScore: true },
    });

    const byParish: Record<string, { parish: string; total: number; closed: number; revenue: number; avgScore: number; scores: number[] }> = {};

    leads.forEach((lead) => {
      const p = lead.parish!;
      if (!byParish[p]) byParish[p] = { parish: p, total: 0, closed: 0, revenue: 0, avgScore: 0, scores: [] };
      byParish[p].total++;
      if (['SOLD', 'ORDERED', 'INSTALLED', 'PAID'].includes(lead.status)) {
        byParish[p].closed++;
        byParish[p].revenue += lead.estimatedRevenue || 0;
      }
      if (lead.leadScore) byParish[p].scores.push(lead.leadScore);
    });

    return Object.values(byParish).map((p) => ({
      parish: p.parish,
      totalLeads: p.total,
      closedDeals: p.closed,
      totalRevenue: p.revenue,
      closeRate: p.total > 0 ? Math.round((p.closed / p.total) * 100) : 0,
      avgLeadScore: p.scores.length > 0 ? Math.round(p.scores.reduce((a, b) => a + b, 0) / p.scores.length) : 0,
    })).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }

  async getPipelineAging(organizationId: string) {
    const leads = await prisma.lead.findMany({
      where: {
        organizationId,
        deletedAt: null,
        status: { notIn: ['SOLD', 'LOST', 'PAID', 'INSTALLED', 'ORDERED'] },
      },
      select: { id: true, status: true, updatedAt: true, estimatedRevenue: true, firstName: true, lastName: true },
    });

    const now = Date.now();
    return leads.map((lead) => {
      const daysSinceUpdate = Math.floor((now - lead.updatedAt.getTime()) / (1000 * 60 * 60 * 24));
      return {
        ...lead,
        daysInStage: daysSinceUpdate,
        agingFlag: daysSinceUpdate > 30 ? 'critical' : daysSinceUpdate > 14 ? 'warning' : 'ok',
      };
    }).sort((a, b) => b.daysInStage - a.daysInStage);
  }
}

export const analyticsService = new AnalyticsService();
