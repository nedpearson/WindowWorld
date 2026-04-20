"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.appointmentsService = exports.AppointmentsService = void 0;
const prisma_1 = require("../../shared/services/prisma");
const errorHandler_1 = require("../../shared/middleware/errorHandler");
const logger_1 = require("../../shared/utils/logger");
class AppointmentsService {
    async list(options) {
        const { organizationId, repId, date, week, status, leadId, page, limit } = options;
        let startDate;
        let endDate;
        if (date) {
            startDate = new Date(date);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(date);
            endDate.setHours(23, 59, 59, 999);
        }
        else if (week) {
            startDate = new Date(week);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(week);
            endDate.setDate(endDate.getDate() + 6);
            endDate.setHours(23, 59, 59, 999);
        }
        const where = {
            lead: { organizationId },
            ...(repId && { createdById: repId }),
            ...(status && { status }),
            ...(leadId && { leadId }),
            ...(startDate && endDate && {
                scheduledAt: { gte: startDate, lte: endDate },
            }),
        };
        const [total, data] = await Promise.all([
            prisma_1.prisma.appointment.count({ where }),
            prisma_1.prisma.appointment.findMany({
                where,
                orderBy: { scheduledAt: 'asc' },
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    lead: {
                        select: {
                            id: true, firstName: true, lastName: true,
                            phone: true, address: true, city: true, zip: true,
                            lat: true, lng: true,
                            assignedRep: { select: { id: true, firstName: true, lastName: true, phone: true } },
                        },
                    },
                    createdBy: { select: { id: true, firstName: true, lastName: true } },
                    _count: { select: { inspections: true } },
                },
            }),
        ]);
        return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
    }
    async getById(id) {
        const apt = await prisma_1.prisma.appointment.findUnique({
            where: { id },
            include: {
                lead: {
                    include: {
                        contacts: { orderBy: { isPrimary: 'desc' } },
                        properties: { include: { openings: { include: { measurement: true } } } },
                        leadScores: { orderBy: { scoredAt: 'desc' }, take: 1 },
                    },
                },
                createdBy: { select: { id: true, firstName: true, lastName: true, phone: true } },
                inspections: {
                    include: { _count: { select: { openings: true } } },
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
        if (!apt)
            throw new errorHandler_1.NotFoundError('Appointment');
        return apt;
    }
    async create(data) {
        const apt = await prisma_1.prisma.appointment.create({
            data: {
                ...data,
                scheduledAt: new Date(data.scheduledAt),
                endAt: data.endAt ? new Date(data.endAt) : undefined,
            },
            include: {
                lead: { select: { id: true, firstName: true, lastName: true, phone: true, address: true } },
                createdBy: { select: { id: true, firstName: true, lastName: true } },
            },
        });
        // Log status change activity on lead
        await prisma_1.prisma.activity.create({
            data: {
                leadId: data.leadId,
                userId: data.createdById,
                type: 'APPOINTMENT_SET',
                title: `Appointment set: ${data.title}`,
                description: `Scheduled for ${new Date(data.scheduledAt).toLocaleString()}`,
                appointmentId: apt.id,
            },
        });
        // Auto-advance lead status to APPOINTMENT_SET if it's earlier in funnel
        const lead = await prisma_1.prisma.lead.findUnique({ where: { id: data.leadId }, select: { status: true, email: true } });
        const earlyStatuses = ['NEW_LEAD', 'ATTEMPTING_CONTACT', 'CONTACTED', 'QUALIFIED'];
        if (lead && earlyStatuses.includes(lead.status)) {
            await prisma_1.prisma.lead.update({
                where: { id: data.leadId },
                data: { status: 'APPOINTMENT_SET' },
            });
        }
        // Send confirmation email if lead has email on file
        if (lead?.email) {
            try {
                const { sendAppointmentConfirmation } = await Promise.resolve().then(() => __importStar(require('../../shared/services/email.service')));
                const scheduledDate = new Date(data.scheduledAt);
                await sendAppointmentConfirmation({
                    to: lead.email,
                    customerName: `${apt.lead?.firstName || ''} ${apt.lead?.lastName || ''}`.trim(),
                    repName: `${apt.createdBy?.firstName || ''} ${apt.createdBy?.lastName || ''}`.trim(),
                    repPhone: apt.createdBy?.phone,
                    appointmentDate: scheduledDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
                    appointmentTime: scheduledDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
                    address: data.address,
                    duration: data.duration,
                });
            }
            catch (err) {
                // Non-fatal
                logger_1.logger.warn(`[appointments] Email confirmation failed for apt ${apt.id}: ${err.message}`);
            }
        }
        return apt;
    }
    async update(id, data, userId) {
        const updated = await prisma_1.prisma.appointment.update({
            where: { id },
            data: {
                ...data,
                scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
                endAt: data.endAt ? new Date(data.endAt) : undefined,
            },
        });
        return updated;
    }
    async updateStatus(id, status, outcome, userId) {
        const apt = await this.getById(id);
        const updated = await prisma_1.prisma.appointment.update({
            where: { id },
            data: { status, outcome },
        });
        // When appointment completes, advance lead status
        if (status === 'COMPLETED') {
            await prisma_1.prisma.lead.update({
                where: { id: apt.leadId },
                data: { status: 'INSPECTION_COMPLETE' },
            });
            await prisma_1.prisma.activity.create({
                data: {
                    leadId: apt.leadId,
                    userId,
                    type: 'MEETING',
                    title: 'Appointment completed',
                    description: outcome,
                    appointmentId: id,
                },
            });
        }
        return updated;
    }
    async getTodayRoute(repId, organizationId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const end = new Date(today);
        end.setHours(23, 59, 59, 999);
        const appointments = await prisma_1.prisma.appointment.findMany({
            where: {
                createdById: repId,
                lead: { organizationId },
                scheduledAt: { gte: today, lte: end },
                status: { in: ['SCHEDULED', 'CONFIRMED'] },
            },
            orderBy: { scheduledAt: 'asc' },
            include: {
                lead: {
                    select: {
                        id: true, firstName: true, lastName: true, phone: true,
                        address: true, city: true, zip: true, lat: true, lng: true,
                        status: true, leadScore: true,
                        contacts: { where: { isPrimary: true }, take: 1 },
                    },
                },
            },
        });
        // Simple nearest-neighbor route optimization
        const optimized = this.optimizeRoute(appointments);
        return {
            date: today.toISOString().split('T')[0],
            total: appointments.length,
            appointments: optimized,
            estimatedMiles: this.estimateMiles(optimized),
        };
    }
    optimizeRoute(appointments) {
        // Simple greedy nearest-neighbor from first appointment
        if (appointments.length <= 2)
            return appointments;
        const result = [appointments[0]];
        const remaining = appointments.slice(1);
        while (remaining.length > 0) {
            const last = result[result.length - 1];
            const lastLat = last.lead?.lat || last.lat || 30.4515; // Default BR
            const lastLng = last.lead?.lng || last.lng || -91.1871;
            let nearestIdx = 0;
            let nearestDist = Infinity;
            remaining.forEach((apt, idx) => {
                const lat = apt.lead?.lat || apt.lat;
                const lng = apt.lead?.lng || apt.lng;
                if (!lat || !lng)
                    return;
                const dist = Math.sqrt(Math.pow(lat - lastLat, 2) + Math.pow(lng - lastLng, 2));
                if (dist < nearestDist) {
                    nearestDist = dist;
                    nearestIdx = idx;
                }
            });
            result.push(remaining[nearestIdx]);
            remaining.splice(nearestIdx, 1);
        }
        return result;
    }
    estimateMiles(appointments) {
        if (appointments.length < 2)
            return 0;
        let total = 0;
        for (let i = 1; i < appointments.length; i++) {
            const prev = appointments[i - 1];
            const curr = appointments[i];
            const lat1 = prev.lead?.lat, lng1 = prev.lead?.lng;
            const lat2 = curr.lead?.lat, lng2 = curr.lead?.lng;
            if (!lat1 || !lat2)
                continue;
            // Haversine approx
            const R = 3958.8;
            const dLat = ((lat2 - lat1) * Math.PI) / 180;
            const dLng = ((lng2 - lng1) * Math.PI) / 180;
            const a = Math.sin(dLat / 2) ** 2 +
                Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
            total += R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        }
        return Math.round(total * 10) / 10;
    }
    async getCalendar(repId, organizationId, startDate, endDate) {
        return prisma_1.prisma.appointment.findMany({
            where: {
                lead: { organizationId },
                ...(repId && { createdById: repId }),
                scheduledAt: {
                    gte: new Date(startDate),
                    lte: new Date(endDate),
                },
                status: { not: 'CANCELLED' },
            },
            orderBy: { scheduledAt: 'asc' },
            include: {
                lead: { select: { id: true, firstName: true, lastName: true, address: true, city: true } },
                createdBy: { select: { id: true, firstName: true, lastName: true } },
            },
        });
    }
}
exports.AppointmentsService = AppointmentsService;
exports.appointmentsService = new AppointmentsService();
//# sourceMappingURL=appointments.service.js.map