"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leadService = exports.LeadService = void 0;
const prisma_1 = require("../../shared/services/prisma");
const errorHandler_1 = require("../../shared/middleware/errorHandler");
const audit_service_1 = require("../admin/audit.service");
const ai_service_1 = require("../ai-analysis/ai.service");
const logger_1 = require("../../shared/utils/logger");
class LeadService {
    async list(options) {
        const { organizationId, page, limit, status, search, parish, zip, assignedRepId, territoryId, isStormLead, minScore, maxScore, source, sortBy = 'createdAt', sortDir = 'desc', restrictToRepId, } = options;
        const where = {
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
        const orderBy = {
            [sortBy]: sortDir,
        };
        const [total, data] = await Promise.all([
            prisma_1.prisma.lead.count({ where }),
            prisma_1.prisma.lead.findMany({
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
    async getById(id, organizationId) {
        const lead = await prisma_1.prisma.lead.findFirst({
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
                    },
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
        if (!lead)
            throw new errorHandler_1.NotFoundError('Lead');
        return lead;
    }
    async create(data) {
        const { createdById, ...leadData } = data;
        // Check for duplicates before creating
        const potentialDuplicates = await this.findDuplicates(data);
        const lead = await prisma_1.prisma.lead.create({
            data: {
                ...leadData,
                state: leadData.state || 'Louisiana',
            },
        });
        // Log audit
        await audit_service_1.auditService.log({
            userId: createdById,
            entityType: 'lead',
            entityId: lead.id,
            action: 'create',
            newValues: lead,
        });
        // Log activity
        await prisma_1.prisma.activity.create({
            data: {
                leadId: lead.id,
                userId: createdById,
                type: 'SYSTEM_AUTO',
                title: 'Lead created',
                description: `Lead created from source: ${lead.source || 'manual'}`,
                isAutomatic: true,
            },
        });
        // Trigger background AI lead scoring
        // In production this would go through BullMQ
        logger_1.logger.info(`Lead created: ${lead.id} â€” queuing AI score`);
        return lead;
    }
    async update(id, organizationId, data, userId) {
        const existing = await this.getById(id, organizationId);
        const updated = await prisma_1.prisma.lead.update({
            where: { id },
            data: {
                ...data,
                updatedAt: new Date(),
            },
        });
        await audit_service_1.auditService.log({
            userId,
            entityType: 'lead',
            entityId: id,
            action: 'update',
            oldValues: existing,
            newValues: updated,
        });
        return updated;
    }
    async updateStatus(id, organizationId, status, reason, userId) {
        const existing = await this.getById(id, organizationId);
        const updated = await prisma_1.prisma.lead.update({
            where: { id },
            data: {
                status,
                ...(status === 'LOST' && reason && { lostReason: reason }),
                updatedAt: new Date(),
            },
        });
        // Log status change activity
        await prisma_1.prisma.activity.create({
            data: {
                leadId: id,
                userId,
                type: 'STATUS_CHANGE',
                title: `Status changed to ${status.replace(/_/g, ' ')}`,
                description: reason || undefined,
                isAutomatic: false,
            },
        });
        await audit_service_1.auditService.log({
            userId,
            entityType: 'lead',
            entityId: id,
            action: 'status-change',
            oldValues: { status: existing.status },
            newValues: { status, reason },
        });
        return updated;
    }
    async assign(id, organizationId, repId, managerId) {
        const lead = await prisma_1.prisma.lead.update({
            where: { id },
            data: { assignedRepId: repId },
            include: {
                assignedRep: { select: { id: true, firstName: true, lastName: true } },
            },
        });
        await prisma_1.prisma.activity.create({
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
    async getMapData(options) {
        const { organizationId, parish, zip, status, isStormLead } = options;
        return prisma_1.prisma.lead.findMany({
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
    async getBestLeadsToday(options) {
        const { organizationId, repId } = options;
        return prisma_1.prisma.lead.findMany({
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
    async getStormFollowUpLeads(options) {
        return prisma_1.prisma.lead.findMany({
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
    async getPipelineView(options) {
        const { organizationId, repId } = options;
        const stages = [
            'NEW_LEAD', 'ATTEMPTING_CONTACT', 'CONTACTED', 'QUALIFIED',
            'APPOINTMENT_SET', 'INSPECTION_COMPLETE', 'MEASURING_COMPLETE',
            'PROPOSAL_SENT', 'FOLLOW_UP', 'VERBAL_COMMIT', 'SOLD',
            'AWAITING_VERIFICATION', 'ORDER_READY', 'ORDERED',
        ];
        const leads = await prisma_1.prisma.lead.findMany({
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
        const pipeline = {};
        stages.forEach((stage) => {
            pipeline[stage] = leads.filter((l) => l.status === stage);
        });
        return pipeline;
    }
    async getActivities(leadId, organizationId) {
        // Verify lead belongs to org
        await this.getById(leadId, organizationId);
        return prisma_1.prisma.activity.findMany({
            where: { leadId },
            orderBy: { occurredAt: 'desc' },
            include: {
                user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
            },
        });
    }
    async logActivity(data) {
        await this.getById(data.leadId, data.organizationId);
        const activity = await prisma_1.prisma.activity.create({
            data: {
                leadId: data.leadId,
                userId: data.userId,
                type: data.type,
                title: data.title,
                description: data.description,
                outcome: data.outcome,
                contactMethod: data.contactMethod,
                duration: data.duration,
            },
            include: {
                user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
            },
        });
        // Update last contacted
        await prisma_1.prisma.lead.update({
            where: { id: data.leadId },
            data: {
                lastContactedAt: new Date(),
                followUpCount: { increment: 1 },
            },
        });
        return activity;
    }
    async getNotes(leadId, organizationId) {
        await this.getById(leadId, organizationId);
        return prisma_1.prisma.note.findMany({
            where: { leadId },
            orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        });
    }
    async addNote(data) {
        await this.getById(data.leadId, data.organizationId);
        return prisma_1.prisma.note.create({
            data: {
                leadId: data.leadId,
                authorId: data.authorId,
                content: data.content,
                isInternal: data.isInternal,
                isPinned: data.isPinned,
            },
        });
    }
    async getAiSummary(leadId, organizationId) {
        const lead = await this.getById(leadId, organizationId);
        // Check for cached recent AI analysis
        const recentAnalysis = await prisma_1.prisma.aiAnalysis.findFirst({
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
        const result = await ai_service_1.aiService.generateLeadPitch(lead);
        return { cached: false, analysis: result };
    }
    async checkForDuplicates(leadId, organizationId) {
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
    async findDuplicates(data) {
        const orConditions = [];
        if (data.email)
            orConditions.push({ email: data.email });
        if (data.phone)
            orConditions.push({ phone: data.phone });
        if (data.phone)
            orConditions.push({ phone2: data.phone });
        if (data.address && data.zip) {
            orConditions.push({
                address: { contains: data.address.split(' ').slice(0, 3).join(' '), mode: 'insensitive' },
                zip: data.zip,
            });
        }
        if (orConditions.length === 0)
            return [];
        return prisma_1.prisma.lead.findMany({
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
    async softDelete(id, organizationId, userId) {
        await this.getById(id, organizationId);
        await prisma_1.prisma.lead.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
        await audit_service_1.auditService.log({
            userId,
            entityType: 'lead',
            entityId: id,
            action: 'delete',
        });
    }
}
exports.LeadService = LeadService;
exports.leadService = new LeadService();
//# sourceMappingURL=leads.service.js.map