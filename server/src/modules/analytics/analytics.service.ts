import { prisma } from '../../shared/services/prisma';

export class AnalyticsService {
  async getRevenueSummary(organizationId: string, periodDays = 30) {
    const since = new Date();
    since.setDate(since.getDate() - periodDays);

    const [invoices, proposals, leads, appointments] = await Promise.all([
      prisma.invoice.findMany({
        where: { organizationId, createdAt: { gte: since } } as any,
        include: { payments: true } as any,
      }),
      prisma.proposal.findMany({
        where: { lead: { organizationId }, createdAt: { gte: since } } as any,
        include: { quote: { select: { total: true } } } as any,
      }),
      prisma.lead.findMany({
        where: { organizationId, createdAt: { gte: since } },
        select: { id: true, status: true, source: true, closeProbability: true, estimatedRevenue: true,
          createdAt: true, assignedRepId: true } as any,
      }),
      prisma.appointment.findMany({
        where: { organizationId: organizationId as any, scheduledFor: { gte: since } } as any,
        select: { id: true, status: true, outcome: true },
      }),
    ]);

    // Revenue metrics
    const totalInvoiced = invoices.reduce((s: number, inv: any) => s + (inv.total || inv.grandTotal || 0), 0);
    const totalCollected = invoices.reduce((s: number, inv: any) =>
      s + ((inv.payments || []).reduce((ps: number, p: any) => ps + (p.amount || 0), 0)), 0);
    const paidInvoices = invoices.filter((inv: any) => inv.status === 'PAID');
    const overdueInvoices = invoices.filter((inv: any) => inv.status === 'OVERDUE' || inv.isOverdue);

    // Pipeline metrics
    const acceptedProposals = proposals.filter((p: any) => ['ACCEPTED', 'CONTRACTED'].includes(p.status));
    const sentProposals = proposals.filter((p: any) => p.status === 'SENT');
    const proposalValue = proposals.reduce((s: number, p: any) => s + ((p.quote as any)?.total || (p.quote as any)?.grandTotal || 0), 0);
    const closedValue = acceptedProposals.reduce((s: number, p: any) => s + ((p.quote as any)?.total || (p.quote as any)?.grandTotal || 0), 0);

    // Lead metrics
    const newLeads = leads.filter((l: any) => l.status === 'NEW_LEAD' || l.status === 'ATTEMPTING_CONTACT' || l.status === 'CONTACTED');
    const closedLeads = leads.filter((l: any) => ['VERBAL_COMMIT', 'SOLD', 'PAID', 'INSTALLED'].includes(l.status as string));
    const closeRate = leads.length > 0 ? closedLeads.length / leads.length : 0;

    // Appointment metrics
    const completedAppts = appointments.filter((a: any) => a.status === 'COMPLETED');
    const noShows = appointments.filter((a: any) => a.status === 'NO_SHOW');
    const apptShowRate = appointments.length > 0 ? completedAppts.length / appointments.length : 0;

    return {
      period: { days: periodDays, since },
      revenue: {
        totalInvoiced: Math.round(totalInvoiced * 100) / 100,
        totalCollected: Math.round(totalCollected * 100) / 100,
        outstanding: Math.round((totalInvoiced - totalCollected) * 100) / 100,
        paidInvoiceCount: paidInvoices.length,
        overdueCount: overdueInvoices.length,
        overdueAmount: overdueInvoices.reduce((s: number, inv: any) => {
          const paid = (inv.payments || []).reduce((ps: number, p: any) => ps + (p.amount || 0), 0);
          return s + ((inv.total || inv.grandTotal || 0) - paid);
        }, 0),
      },
      pipeline: {
        proposalValue: Math.round(proposalValue * 100) / 100,
        closedValue: Math.round(closedValue * 100) / 100,
        closeRate: Math.round(closeRate * 100) / 100,
        sentCount: sentProposals.length,
        acceptedCount: acceptedProposals.length,
        totalProposals: proposals.length,
      },
      leads: {
        total: leads.length,
        new: newLeads.length,
        closed: closedLeads.length,
        closeRate: Math.round(closeRate * 10000) / 100,
        avgCloseProb: leads.length > 0
          ? Math.round(leads.reduce((s: number, l: any) => s + (l.closeProbability || 0), 0) / leads.length * 100) / 100
          : 0,
        pipelineValue: leads.reduce((s: number, l: any) => s + ((l.estimatedRevenue || 0) * (l.closeProbability || 0)), 0),
      },
      appointments: {
        total: appointments.length,
        completed: completedAppts.length,
        noShows: noShows.length,
        showRate: Math.round(apptShowRate * 10000) / 100,
      },
    };
  }

  async getRepPerformance(organizationId: string, periodDays = 30) {
    const since = new Date();
    since.setDate(since.getDate() - periodDays);

    const reps = await prisma.user.findMany({
      where: { organizationId, role: { in: ['SALES_REP', 'SALES_MANAGER', 'SUPER_ADMIN'] as any[] } },
      select: {
        id: true, firstName: true, lastName: true, role: true,
        _count: { select: { assignedLeads: true } },
      },
    });

    const repStats = await Promise.all(reps.map(async (rep) => {
      const [assignedLeads, proposals, invoices] = await Promise.all([
        prisma.lead.count({
          where: { assignedRepId: rep.id, createdAt: { gte: since } } as any,
        }),
        prisma.proposal.count({
          where: { createdById: rep.id, createdAt: { gte: since } },
        }),
        prisma.invoice.findMany({
          where: { createdById: rep.id, createdAt: { gte: since } },
          include: { payments: true } as any,
        }),
      ]);

      const closedLeads = await prisma.lead.count({
        where: {
          assignedRepId: rep.id,
          createdAt: { gte: since },
          status: { in: ['VERBAL_COMMIT', 'SOLD', 'PAID', 'INSTALLED'] as any[] },
        } as any,
      });

      const revenue = (invoices as any[]).reduce((s: number, inv: any) =>
        s + ((inv.payments || []).reduce((ps: number, p: any) => ps + (p.amount || 0), 0)), 0);

      return {
        id: rep.id,
        name: `${rep.firstName} ${rep.lastName}`,
        role: rep.role,
        metrics: {
          leadsAssigned: assignedLeads,
          proposalsSent: proposals,
          dealsClosed: closedLeads,
          revenue: Math.round(revenue * 100) / 100,
          closeRate: assignedLeads > 0 ? Math.round((closedLeads / assignedLeads) * 10000) / 100 : 0,
          avgDealSize: closedLeads > 0 ? Math.round((revenue / closedLeads) * 100) / 100 : 0,
        },
      };
    }));

    return repStats.sort((a, b) => b.metrics.revenue - a.metrics.revenue);
  }

  async getLeadSourceBreakdown(organizationId: string, periodDays = 30) {
    const since = new Date();
    since.setDate(since.getDate() - periodDays);

    const leads = await prisma.lead.findMany({
      where: { organizationId, createdAt: { gte: since } },
      select: { source: true, status: true, estimatedRevenue: true },
    });

    const bySource = leads.reduce((acc: Record<string, any>, lead) => {
      const src = lead.source || 'UNKNOWN';
      if (!acc[src]) acc[src] = { source: src, count: 0, closed: 0, revenue: 0 };
      acc[src].count++;
      if (['VERBAL_COMMIT', 'SOLD', 'PAID', 'INSTALLED'].includes(lead.status as string)) {
        acc[src].closed++;
        acc[src].revenue += lead.estimatedRevenue || 0;
      }
      return acc;
    }, {});

    return Object.values(bySource).map((s: any) => ({
      ...s,
      closeRate: s.count > 0 ? Math.round((s.closed / s.count) * 10000) / 100 : 0,
    })).sort((a: any, b: any) => b.count - a.count);
  }

  async getRevenueTrend(organizationId: string, periodDays = 90) {
    const since = new Date();
    since.setDate(since.getDate() - periodDays);

    // Use invoices as a proxy for revenue trend when InvoicePayment model isn't available
    const invoices = await prisma.invoice.findMany({
      where: { organizationId, status: 'PAID', updatedAt: { gte: since } } as any,
      select: { total: true, updatedAt: true },
      orderBy: { updatedAt: 'asc' },
    });

    // Group by week
    const byWeek: Record<string, number> = {};
    (invoices as any[]).forEach((inv: any) => {
      const weekStart = new Date(inv.updatedAt);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const key = weekStart.toISOString().split('T')[0];
      byWeek[key] = (byWeek[key] || 0) + (inv.total || 0);
    });

    return Object.entries(byWeek).map(([week, amount]) => ({
      week,
      amount: Math.round(amount * 100) / 100,
    }));
  }

  async getConversionFunnel(organizationId: string, periodDays = 30) {
    const since = new Date();
    since.setDate(since.getDate() - periodDays);

    const statuses = [
      { key: 'LEAD_IN',          label: 'Leads In',       statuses: ['NEW_LEAD', 'ATTEMPTING_CONTACT', 'CONTACTED', 'QUALIFIED', 'APPOINTMENT_SET', 'INSPECTION_COMPLETE', 'MEASURING_COMPLETE', 'PROPOSAL_SENT', 'FOLLOW_UP', 'VERBAL_COMMIT', 'SOLD', 'AWAITING_VERIFICATION', 'ORDER_READY', 'ORDERED', 'INSTALLED', 'PAID'] },
      { key: 'APPOINTMENT_SET',  label: 'Appt Set',       statuses: ['APPOINTMENT_SET', 'INSPECTION_COMPLETE', 'MEASURING_COMPLETE', 'PROPOSAL_SENT', 'FOLLOW_UP', 'VERBAL_COMMIT', 'SOLD', 'ORDER_READY', 'ORDERED', 'INSTALLED', 'PAID'] },
      { key: 'INSPECTED',        label: 'Inspected',       statuses: ['INSPECTION_COMPLETE', 'MEASURING_COMPLETE', 'PROPOSAL_SENT', 'FOLLOW_UP', 'VERBAL_COMMIT', 'SOLD', 'ORDER_READY', 'ORDERED', 'INSTALLED', 'PAID'] },
      { key: 'PROPOSAL_SENT',    label: 'Proposal Sent',   statuses: ['PROPOSAL_SENT', 'FOLLOW_UP', 'VERBAL_COMMIT', 'SOLD', 'ORDER_READY', 'ORDERED', 'INSTALLED', 'PAID'] },
      { key: 'COMMITTED',        label: 'Committed',       statuses: ['VERBAL_COMMIT', 'SOLD', 'ORDER_READY', 'ORDERED', 'INSTALLED', 'PAID'] },
      { key: 'CLOSED',           label: 'Closed',          statuses: ['SOLD', 'ORDER_READY', 'ORDERED', 'INSTALLED', 'PAID'] },
    ];

    const counts = await Promise.all(statuses.map(async (s) => ({
      key: s.key,
      label: s.label,
      count: await prisma.lead.count({
        where: { organizationId, createdAt: { gte: since }, status: { in: s.statuses as any[] } },
      }),
    })));

    const total = counts[0].count || 1;
    return counts.map((s) => ({
      ...s,
      pct: Math.round((s.count / total) * 100),
    }));
  }

  async getCommissions(organizationId: string) {
    const now = new Date();
    const mtdStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const ytdStart = new Date(now.getFullYear(), 0, 1);
    // Valid closed/active statuses aligned to Prisma LeadStatus enum
    const CLOSED = ['VERBAL_COMMIT', 'SOLD', 'AWAITING_VERIFICATION', 'ORDER_READY', 'ORDERED', 'INSTALLED', 'PAID'] as any[];
    const ACTIVE  = ['NEW_LEAD', 'ATTEMPTING_CONTACT', 'CONTACTED', 'QUALIFIED', 'APPOINTMENT_SET',
                     'MEASURING_COMPLETE', 'INSPECTION_COMPLETE', 'PROPOSAL_SENT', 'FOLLOW_UP'] as any[];

    const reps = await prisma.user.findMany({
      where: { organizationId, role: { in: ['SALES_REP', 'SALES_MANAGER'] as any[] } },
      select: { id: true, firstName: true, lastName: true },
    });

    const repData = await Promise.all(reps.map(async (rep) => {
      const [mtdLeads, ytdLeads, pipelineLeads] = await Promise.all([
        prisma.lead.findMany({
          where: { assignedRepId: rep.id, status: { in: CLOSED }, updatedAt: { gte: mtdStart } } as any,
          include: { quote: { select: { grandTotal: true, total: true } } } as any,
          orderBy: { updatedAt: 'desc' }, take: 10,
        }),
        prisma.lead.findMany({
          where: { assignedRepId: rep.id, status: { in: CLOSED }, updatedAt: { gte: ytdStart } } as any,
          select: { estimatedValue: true, estimatedRevenue: true, quote: { select: { grandTotal: true, total: true } } } as any,
        }),
        prisma.lead.findMany({
          where: { assignedRepId: rep.id, status: { in: ACTIVE } } as any,
          select: { estimatedValue: true, estimatedRevenue: true } as any,
        }),
      ]);

      const val = (l: any) => Number((l as any).quote?.grandTotal || (l as any).quote?.total
        || (l as any).estimatedValue || (l as any).estimatedRevenue || 0);

      const mtdRevenue   = mtdLeads.reduce((s: number, l: any) => s + val(l), 0);
      const ytdRevenue   = ytdLeads.reduce((s: number, l: any) => s + val(l), 0);
      const openPipeline = pipelineLeads.reduce((s: number, l: any) => s + val(l), 0);

      const deals = (mtdLeads as any[]).map((l: any) => ({
        id: l.id,
        customer: `${l.firstName || ''} ${l.lastName || ''}`.trim() || 'Lead',
        amount: val(l),
        closedAt: new Date(l.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        repId: rep.id,
        status: ['INSTALLED', 'SOLD'].includes(l.status) ? 'PAID' : 'PENDING',
        series: (l as any).quote?.series || 'WindowWorld',
      }));

      return {
        id: rep.id,
        name: `${rep.firstName} ${rep.lastName}`,
        avatar: `${rep.firstName[0]}${rep.lastName[0]}`,
        mtdRevenue:   Math.round(mtdRevenue   * 100) / 100,
        ytdRevenue:   Math.round(ytdRevenue   * 100) / 100,
        openPipeline: Math.round(openPipeline  * 100) / 100,
        deals,
      };
    }));

    return repData.sort((a, b) => b.mtdRevenue - a.mtdRevenue);
  }

  async getInstalledLeads(organizationId: string, limit = 60) {
    return prisma.lead.findMany({
      where: { organizationId, status: { in: ['INSTALLED', 'SOLD'] as any[] } } as any,
      include: {
        assignedRep: { select: { id: true, firstName: true, lastName: true } },
        contacts: { where: { isPrimary: true }, take: 1 },
        quote: { select: { grandTotal: true, total: true, totalWindows: true } } as any,
      } as any,
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });
  }

  async getMapData(organizationId: string, periodDays = 90) {
    const since = new Date();
    since.setDate(since.getDate() - periodDays);

    const leads = await prisma.lead.findMany({
      where: { organizationId, createdAt: { gte: since } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        address: true,
        city: true,
        state: true,
        zip: true,
        lat: true,
        lng: true,
        status: true,
        source: true,
        leadScore: true,
        estimatedRevenue: true,
        assignedRepId: true,
        createdAt: true,
      } as any,
    });

    // Group by zip code for heatmap overlay
    const byZip = leads.reduce((acc: Record<string, any>, lead: any) => {
      const zip = lead.zip || 'UNKNOWN';
      if (!acc[zip]) acc[zip] = { zip, count: 0, closed: 0, leads: [] };
      acc[zip].count++;
      if (['VERBAL_COMMIT', 'SOLD', 'INSTALLED', 'PAID'].includes(lead.status)) {
        acc[zip].closed++;
      }
      // Only include first 5 leads per zip for performance
      if (acc[zip].leads.length < 5) acc[zip].leads.push(lead);
      return acc;
    }, {});

    return {
      leads: leads.filter((l: any) => l.lat && l.lng), // only those with geocoords
      zipSummary: Object.values(byZip).sort((a: any, b: any) => b.count - a.count),
      total: leads.length,
      period: { days: periodDays, since },
    };
  }

  async getWeatherCorrelation(organizationId: string, periodDays = 90) {
    const since = new Date();
    since.setDate(since.getDate() - periodDays);

    const [stormEvents, leads] = await Promise.all([
      (prisma as any).stormEvent?.findMany({
        where: { organizationId, occurredAt: { gte: since } },
        orderBy: { occurredAt: 'asc' },
      }).catch(() => [] as any[]) ?? [],
      prisma.lead.findMany({
        where: { organizationId, createdAt: { gte: since } },
        select: { id: true, createdAt: true, source: true, status: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    // Group leads by week
    const leadsByWeek: Record<string, number> = {};
    (leads as any[]).forEach((l) => {
      const weekStart = new Date(l.createdAt);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const key = weekStart.toISOString().split('T')[0];
      leadsByWeek[key] = (leadsByWeek[key] || 0) + 1;
    });

    // Storm-sourced leads
    const stormSourced = (leads as any[]).filter((l) =>
      ['STORM', 'HAIL', 'WIND_DAMAGE', 'INSURANCE_CLAIM'].includes(l.source)
    ).length;

    return {
      weeklyLeadCounts: Object.entries(leadsByWeek).map(([week, count]) => ({ week, count })),
      stormEvents: stormEvents || [],
      stormSourcedLeads: stormSourced,
      stormSourceRate: leads.length > 0 ? Math.round((stormSourced / leads.length) * 10000) / 100 : 0,
      period: { days: periodDays, since },
    };
  }
}

export const analyticsService = new AnalyticsService();
