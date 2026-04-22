import { Prisma, LeadStatus } from '@prisma/client';
import { prisma } from '../../shared/services/prisma';
import { NotFoundError, AppError } from '../../shared/middleware/errorHandler';
import { auditService } from '../admin/audit.service';
import { aiService } from '../ai-analysis/ai.service';
import { logger, sanitizeForLog } from '../../shared/utils/logger';
import { leadScoringQueue } from '../../jobs';

interface ListLeadsOptions {
  organizationId: string;
  page: number;
  limit: number;
  status?: LeadStatus;
  search?: string;
  parish?: string;
  zip?: string;
  assignedRepId?: string;
  territoryId?: string;
  isStormLead?: boolean;
  minScore?: number;
  maxScore?: number;
  source?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  restrictToRepId?: string;
}

export class LeadService {
  async list(options: ListLeadsOptions) {
    const {
      organizationId, page, limit, status, search, parish, zip,
      assignedRepId, territoryId, isStormLead, minScore, maxScore,
      source, sortBy = 'createdAt', sortDir = 'desc', restrictToRepId,
    } = options;

    const where: Prisma.LeadWhereInput = {
      organizationId,
      deletedAt: null,
      ...(status && { status }),
      ...(parish && { parish: { contains: parish, mode: 'insensitive' } }),
      ...(zip && { zip }),
      ...(assignedRepId && { assignedRepId }),
      ...(territoryId && { territoryId }),
      ...(isStormLead && { isStormLead: true }),
      ...(source && { source }),
      ...(restrictToRepId && { assignedRepId: restrictToRepId }),
      ...(minScore !== undefined && { leadScore: { gte: minScore } }),
      ...(maxScore !== undefined && { leadScore: { lte: maxScore } }),
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { address: { contains: search, mode: 'insensitive' } },
          { city: { contains: search, mode: 'insensitive' } },
          { zip: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    // Allowlist sortBy to prevent remote property injection (CodeQL: js/remote-property-injection)
    const ALLOWED_SORT_FIELDS = new Set([
      'createdAt', 'updatedAt', 'firstName', 'lastName', 'leadScore',
      'urgencyScore', 'lastContactedAt', 'nextFollowUpAt', 'status', 'source',
    ]);
    const safeSortBy = ALLOWED_SORT_FIELDS.has(sortBy) ? sortBy : 'createdAt';

    const orderBy: Prisma.LeadOrderByWithRelationInput = {
      [safeSortBy]: sortDir,
    };


    const [total, data] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          assignedRep: {
            select: { id: true, firstName: true, lastName: true, avatarUrl: true },
          },
          territory: { select: { id: true, name: true } },
          _count: {
            select: { appointments: true, proposals: true, activities: true },
          },
        },
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  async getById(id: string, organizationId: string) {
    const lead = await prisma.lead.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: {
        assignedRep: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true, phone: true, email: true },
        },
        territory: true,
        campaign: { select: { id: true, name: true, type: true } },
        contacts: { orderBy: { isPrimary: 'desc' } },
        properties: {
          include: {
            openings: {
              include: { measurement: true },
              orderBy: [{ floorLevel: 'asc' }, { sortOrder: 'asc' }],
            },
          },
        },
        leadScores: { orderBy: { scoredAt: 'desc' }, take: 1 },
        appointments: {
          orderBy: { scheduledAt: 'desc' },
          take: 5,
          include: {
            createdBy: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        proposals: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true, status: true, sentAt: true, createdAt: true, pdfUrl: true,
          } as any,
        },
        quotes: {
          orderBy: { createdAt: 'desc' },
          take: 3,
          select: {
            id: true, status: true, total: true, createdAt: true,
          },
        },
        _count: {
          select: {
            activities: true,
            notes_rel: true,
            tasks: true,
            documents: true,
            proposals: true,
          },
        },
      },
    });

    if (!lead) throw new NotFoundError('Lead');
    return lead;
  }

  async create(data: {
    organizationId: string;
    assignedRepId?: string;
    createdById: string;
    [key: string]: any;
  }) {
    const { createdById, ...leadData } = data;

    // Check for duplicates before creating
    const potentialDuplicates = await this.findDuplicates(data);

    const lead = await prisma.lead.create({
      data: {
        ...leadData,
        state: leadData.state || 'Louisiana',
      },
    });

    // Log audit
    await auditService.log({
      userId: createdById,
      entityType: 'lead',
      entityId: lead.id,
      action: 'create',
      newValues: lead as any,
    });

    // Log activity
    await prisma.activity.create({
      data: {
        leadId: lead.id,
        userId: createdById,
        type: 'SYSTEM_AUTO',
        title: 'Lead created',
        description: `Lead created from source: ${lead.source || 'manual'}`,
        isAutomatic: true,
      },
    });

    // Trigger background AI lead scoring via BullMQ (runs GPT-4 Vision scoring)
    await leadScoringQueue.add('score-new-lead', { leadId: lead.id }, {
      delay: 3000, // 3s delay so all related data is committed first
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });
    logger.info(`[leads] Created ${lead.id} — AI scoring job enqueued`);

    // Auto-enroll in status-matched campaigns (e.g. new-lead-welcome)
    try {
      const { campaignsService } = await import('../campaigns/campaigns.service');
      await campaignsService.triggerForStatus(lead.id, 'NEW', createdById);
    } catch (err: any) {
      logger.warn(`[leads] Campaign auto-enroll failed for ${lead.id}: ${err.message}`);
    }

    return lead;
  }

  async update(id: string, organizationId: string, data: any, userId: string) {
    const existing = await this.getById(id, organizationId);

    const updated = await prisma.lead.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    await auditService.log({
      userId,
      entityType: 'lead',
      entityId: id,
      action: 'update',
      oldValues: existing as any,
      newValues: updated as any,
    });

    return updated;
  }

  async updateStatus(
    id: string,
    organizationId: string,
    status: LeadStatus,
    reason: string | undefined,
    userId: string
  ) {
    const existing = await this.getById(id, organizationId);

    const updated = await prisma.lead.update({
      where: { id },
      data: {
        status,
        ...(status === 'LOST' && reason && { lostReason: reason }),
        updatedAt: new Date(),
      },
    });

    // Log status change activity
    await prisma.activity.create({
      data: {
        leadId: id,
        userId,
        type: 'STATUS_CHANGE',
        title: `Status changed to ${status.replace(/_/g, ' ')}`,
        description: reason || undefined,
        isAutomatic: false,
      },
    });

    await auditService.log({
      userId,
      entityType: 'lead',
      entityId: id,
      action: 'status-change',
      oldValues: { status: existing.status } as any,
      newValues: { status, reason } as any,
    });

    // Re-score with AI on meaningful status transitions (async, non-blocking)
    const scoringStatuses: LeadStatus[] = ['CONTACTED', 'QUALIFIED', 'PROPOSAL_SENT', 'VERBAL_COMMIT', 'SOLD', 'LOST'];
    if (scoringStatuses.includes(status)) {
      await leadScoringQueue.add('rescore-on-status', { leadId: id }, {
        delay: 1000,
        attempts: 2,
        backoff: { type: 'fixed', delay: 10000 },
      });
    }

    // Auto-enroll in status-matched campaigns (fire and forget)
    try {
      const { campaignsService } = await import('../campaigns/campaigns.service');
      await campaignsService.triggerForStatus(id, status, userId);
    } catch (err: any) {
      logger.warn(`[leads] Campaign trigger failed for ${id}/${status}: ${err.message}`);
    }

    // Broadcast status change to all org members via WebSocket
    try {
      const { wsService } = await import('../../shared/services/websocket.service');
      wsService.notifyOrganization(existing.organizationId, 'lead:status-changed', {
        leadId: id,
        oldStatus: existing.status,
        newStatus: status,
        updatedBy: userId,
      });
    } catch { /* non-fatal */ }

    return updated;
  }

  async assign(id: string, organizationId: string, repId: string, managerId: string) {
    const lead = await prisma.lead.update({
      where: { id },
      data: { assignedRepId: repId },
      include: {
        assignedRep: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    await prisma.activity.create({
      data: {
        leadId: id,
        userId: managerId,
        type: 'SYSTEM_AUTO',
        title: `Lead assigned to ${lead.assignedRep?.firstName} ${lead.assignedRep?.lastName}`,
        isAutomatic: false,
      },
    });

    return lead;
  }

  async getMapData(options: {
    organizationId: string;
    parish?: string;
    zip?: string;
    status?: LeadStatus;
    isStormLead?: boolean;
  }) {
    const { organizationId, parish, zip, status, isStormLead } = options;

    return prisma.lead.findMany({
      where: {
        organizationId,
        deletedAt: null,
        lat: { not: null },
        lng: { not: null },
        ...(parish && { parish }),
        ...(zip && { zip }),
        ...(status && { status }),
        ...(isStormLead && { isStormLead: true }),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        address: true,
        city: true,
        zip: true,
        parish: true,
        lat: true,
        lng: true,
        status: true,
        leadScore: true,
        urgencyScore: true,
        isStormLead: true,
        assignedRepId: true,
      },
    });
  }

  async getBestLeadsToday(options: { organizationId: string; repId: string }) {
    const { organizationId, repId } = options;

    return prisma.lead.findMany({
      where: {
        organizationId,
        assignedRepId: repId,
        deletedAt: null,
        status: {
          notIn: ['SOLD', 'LOST', 'INSTALLED', 'PAID', 'ORDERED'],
        },
        leadScore: { gte: 50 },
      },
      orderBy: [
        { urgencyScore: 'desc' },
        { leadScore: 'desc' },
        { nextFollowUpAt: 'asc' },
      ],
      take: 10,
      include: {
        leadScores: {
          orderBy: { scoredAt: 'desc' },
          take: 1,
          select: {
            recommendedPitchAngle: true,
            closeProbability: true,
            estimatedRevenueBand: true,
          },
        },
      },
    });
  }

  async getStormFollowUpLeads(options: { organizationId: string }) {
    return prisma.lead.findMany({
      where: {
        organizationId: options.organizationId,
        isStormLead: true,
        deletedAt: null,
        status: {
          in: ['NEW_LEAD', 'ATTEMPTING_CONTACT', 'CONTACTED', 'QUALIFIED'],
        },
      },
      orderBy: [
        { urgencyScore: 'desc' },
        { leadScore: 'desc' },
        { createdAt: 'desc' },
      ],
      take: 50,
      include: {
        assignedRep: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
  }

  async getPipelineView(options: { organizationId: string; repId?: string }) {
    const { organizationId, repId } = options;

    const stages: LeadStatus[] = [
      'NEW_LEAD', 'ATTEMPTING_CONTACT', 'CONTACTED', 'QUALIFIED',
      'APPOINTMENT_SET', 'INSPECTION_COMPLETE', 'MEASURING_COMPLETE',
      'PROPOSAL_SENT', 'FOLLOW_UP', 'VERBAL_COMMIT', 'SOLD',
      'AWAITING_VERIFICATION', 'ORDER_READY', 'ORDERED',
    ];

    const leads = await prisma.lead.findMany({
      where: {
        organizationId,
        deletedAt: null,
        status: { in: stages },
        ...(repId && { assignedRepId: repId }),
      },
      include: {
        assignedRep: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        _count: { select: { proposals: true } },
      },
      orderBy: { leadScore: 'desc' },
    });

    // Group by status
    const pipeline: Record<string, any[]> = {};
    stages.forEach((stage) => {
      pipeline[stage] = leads.filter((l) => l.status === stage);
    });

    return pipeline;
  }

  async getActivities(leadId: string, organizationId: string) {
    // Verify lead belongs to org
    await this.getById(leadId, organizationId);

    return prisma.activity.findMany({
      where: { leadId },
      orderBy: { occurredAt: 'desc' },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });
  }

  async logActivity(data: {
    leadId: string;
    organizationId: string;
    userId: string;
    type: string;
    title?: string;
    description?: string;
    outcome?: string;
    contactMethod?: string;
    duration?: number;
  }) {
    await this.getById(data.leadId, data.organizationId);

    const activity = await prisma.activity.create({
      data: {
        leadId: data.leadId,
        userId: data.userId,
        type: data.type as any,
        title: data.title,
        description: data.description,
        outcome: data.outcome,
        contactMethod: data.contactMethod as any,
        duration: data.duration,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });

    // Update last contacted
    await prisma.lead.update({
      where: { id: data.leadId },
      data: {
        lastContactedAt: new Date(),
        followUpCount: { increment: 1 },
      },
    });

    return activity;
  }

  async getNotes(leadId: string, organizationId: string) {
    await this.getById(leadId, organizationId);

    return prisma.note.findMany({
      where: { leadId },
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async addNote(data: {
    leadId: string;
    organizationId: string;
    authorId: string;
    content: string;
    isInternal: boolean;
    isPinned: boolean;
  }) {
    await this.getById(data.leadId, data.organizationId);

    return prisma.note.create({
      data: {
        leadId: data.leadId,
        authorId: data.authorId,
        content: data.content,
        isInternal: data.isInternal,
        isPinned: data.isPinned,
      },
    });
  }

  async getAiSummary(leadId: string, organizationId: string) {
    const lead = await this.getById(leadId, organizationId);

    // Check for cached recent AI analysis
    const recentAnalysis = await prisma.aiAnalysis.findFirst({
      where: {
        leadId,
        analysisType: 'pitch',
        status: 'COMPLETED',
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // within 24h
      },
      orderBy: { createdAt: 'desc' },
    });

    if (recentAnalysis) {
      return {
        cached: true,
        analysis: recentAnalysis,
      };
    }

    // Generate fresh AI analysis
    const result = await aiService.generateLeadPitch(lead as any);
    return { cached: false, analysis: result };
  }

  async checkForDuplicates(leadId: string, organizationId: string) {
    const lead = await this.getById(leadId, organizationId);

    const duplicates = await this.findDuplicates({
      organizationId,
      email: lead.email || undefined,
      phone: lead.phone || undefined,
      address: lead.address || undefined,
      zip: lead.zip || undefined,
      excludeId: lead.id,
    });

    return duplicates;
  }

  async findDuplicates(data: {
    organizationId: string;
    email?: string;
    phone?: string;
    address?: string;
    zip?: string;
    excludeId?: string;
  }) {
    const orConditions: Prisma.LeadWhereInput[] = [];

    if (data.email) orConditions.push({ email: data.email });
    if (data.phone) orConditions.push({ phone: data.phone });
    if (data.phone) orConditions.push({ phone2: data.phone });
    if (data.address && data.zip) {
      orConditions.push({
        address: { contains: data.address.split(' ').slice(0, 3).join(' '), mode: 'insensitive' },
        zip: data.zip,
      });
    }

    if (orConditions.length === 0) return [];

    return prisma.lead.findMany({
      where: {
        organizationId: data.organizationId,
        deletedAt: null,
        OR: orConditions,
        ...(data.excludeId && { id: { not: data.excludeId } }),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        zip: true,
        status: true,
        createdAt: true,
      },
    });
  }

  async softDelete(id: string, organizationId: string, userId: string) {
    await this.getById(id, organizationId);

    await prisma.lead.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await auditService.log({
      userId,
      entityType: 'lead',
      entityId: id,
      action: 'delete',
    });
  }
}

export const leadService = new LeadService();

