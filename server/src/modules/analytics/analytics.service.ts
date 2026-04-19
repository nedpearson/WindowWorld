import { prisma } from '../../shared/services/prisma';

export class AnalyticsService {
  async getRevenueSummary(organizationId: string, periodDays = 30) {
    const since = new Date();
    since.setDate(since.getDate() - periodDays);

    const [invoices, proposals, leads, appointments] = await Promise.all([
      prisma.invoice.findMany({
        where: { lead: { organizationId }, createdAt: { gte: since } },
        include: { payments: true },
      }),
      prisma.proposal.findMany({
        where: { lead: { organizationId }, createdAt: { gte: since } },
        include: { quote: { select: { grandTotal: true } } },
      }),
      prisma.lead.findMany({
        where: { organizationId, createdAt: { gte: since } },
        select: { id: true, status: true, source: true, closeProbability: true, estimatedRevenue: true,
          createdAt: true, assignedToId: true },
      }),
      prisma.appointment.findMany({
        where: { organizationId, scheduledFor: { gte: since } },
        select: { id: true, status: true, outcome: true },
      }),
    ]);

    // Revenue metrics
    const totalInvoiced = invoices.reduce((s, inv) => s + (inv as any).grandTotal, 0);
    const totalCollected = invoices.reduce((s, inv) =>
      s + inv.payments.reduce((ps: number, p: any) => ps + p.amount, 0), 0);
    const paidInvoices = invoices.filter((inv) => inv.status === 'PAID');
    const overdueInvoices = invoices.filter((inv) => inv.isOverdue);

    // Pipeline metrics
    const acceptedProposals = proposals.filter((p) => ['ACCEPTED', 'CONTRACTED'].includes(p.status as string));
    const sentProposals = proposals.filter((p) => p.status === 'SENT');
    const proposalValue = proposals.reduce((s, p) => s + ((p.quote as any)?.grandTotal || 0), 0);
    const closedValue = acceptedProposals.reduce((s, p) => s + ((p.quote as any)?.grandTotal || 0), 0);

    // Lead metrics
    const newLeads = leads.filter((l) => l.status === 'NEW');
    const closedLeads = leads.filter((l) => ['VERBAL_COMMIT', 'CONTRACTED', 'PAID', 'INSTALLED'].includes(l.status as string));
    const closeRate = leads.length > 0 ? closedLeads.length / leads.length : 0;

    // Appointment metrics
    const completedAppts = appointments.filter((a) => a.status === 'COMPLETED');
    const noShows = appointments.filter((a) => a.status === 'NO_SHOW');
    const apptShowRate = appointments.length > 0 ? completedAppts.length / appointments.length : 0;

    return {
      period: { days: periodDays, since },
      revenue: {
        totalInvoiced: Math.round(totalInvoiced * 100) / 100,
        totalCollected: Math.round(totalCollected * 100) / 100,
        outstanding: Math.round((totalInvoiced - totalCollected) * 100) / 100,
        paidInvoiceCount: paidInvoices.length,
        overdueCount: overdueInvoices.length,
        overdueAmount: overdueInvoices.reduce((s, inv) => {
          const paid = inv.payments.reduce((ps: number, p: any) => ps + p.amount, 0);
          return s + ((inv as any).grandTotal - paid);
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
          ? Math.round(leads.reduce((s, l) => s + (l.closeProbability || 0), 0) / leads.length * 100) / 100
          : 0,
        pipelineValue: leads.reduce((s, l) => s + ((l.estimatedRevenue || 0) * (l.closeProbability || 0)), 0),
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
      where: { organizationId, role: { in: ['SALES_REP', 'MANAGER', 'ADMIN'] } },
      select: {
        id: true, firstName: true, lastName: true, role: true,
        _count: { select: { assignedLeads: true } },
      },
    });

    const repStats = await Promise.all(reps.map(async (rep) => {
      const [assignedLeads, proposals, invoices] = await Promise.all([
        prisma.lead.count({
          where: { assignedToId: rep.id, createdAt: { gte: since } },
        }),
        prisma.proposal.count({
          where: { createdById: rep.id, createdAt: { gte: since } },
        }),
        prisma.invoice.findMany({
          where: { createdById: rep.id, createdAt: { gte: since } },
          include: { payments: true },
        }),
      ]);

      const closedLeads = await prisma.lead.count({
        where: {
          assignedToId: rep.id,
          createdAt: { gte: since },
          status: { in: ['VERBAL_COMMIT', 'CONTRACTED', 'PAID', 'INSTALLED'] },
        },
      });

      const revenue = invoices.reduce((s, inv) =>
        s + inv.payments.reduce((ps: number, p: any) => ps + p.amount, 0), 0);

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
      if (['VERBAL_COMMIT', 'CONTRACTED', 'PAID', 'INSTALLED'].includes(lead.status as string)) {
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

    const payments = await prisma.invoicePayment.findMany({
      where: { paidAt: { gte: since }, invoice: { lead: { organizationId } } },
      select: { amount: true, paidAt: true },
      orderBy: { paidAt: 'asc' },
    });

    // Group by week
    const byWeek: Record<string, number> = {};
    payments.forEach((p) => {
      const weekStart = new Date(p.paidAt!);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const key = weekStart.toISOString().split('T')[0];
      byWeek[key] = (byWeek[key] || 0) + p.amount;
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
      { key: 'LEAD_IN', label: 'Leads In', statuses: ['NEW', 'CONTACTED', 'QUALIFIED', 'APPOINTMENT_SET', 'INSPECTED', 'PROPOSAL_SENT', 'NEGOTIATING', 'VERBAL_COMMIT', 'CONTRACTED', 'INSTALLED', 'PAID'] },
      { key: 'APPOINTMENT_SET', label: 'Appt Set', statuses: ['APPOINTMENT_SET', 'INSPECTED', 'PROPOSAL_SENT', 'NEGOTIATING', 'VERBAL_COMMIT', 'CONTRACTED', 'INSTALLED', 'PAID'] },
      { key: 'INSPECTED', label: 'Inspected', statuses: ['INSPECTED', 'PROPOSAL_SENT', 'NEGOTIATING', 'VERBAL_COMMIT', 'CONTRACTED', 'INSTALLED', 'PAID'] },
      { key: 'PROPOSAL_SENT', label: 'Proposal Sent', statuses: ['PROPOSAL_SENT', 'NEGOTIATING', 'VERBAL_COMMIT', 'CONTRACTED', 'INSTALLED', 'PAID'] },
      { key: 'COMMITTED', label: 'Committed', statuses: ['VERBAL_COMMIT', 'CONTRACTED', 'INSTALLED', 'PAID'] },
      { key: 'CLOSED', label: 'Closed', statuses: ['CONTRACTED', 'INSTALLED', 'PAID'] },
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
}

export const analyticsService = new AnalyticsService();
