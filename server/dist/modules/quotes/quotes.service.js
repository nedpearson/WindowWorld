"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.quotesService = exports.QuotesService = void 0;
const prisma_1 = require("../../shared/services/prisma");
const errorHandler_1 = require("../../shared/middleware/errorHandler");
const products_service_1 = require("../products/products.service");
const audit_service_1 = require("../admin/audit.service");
class QuotesService {
    async list(options) {
        const where = {
            lead: { organizationId: options.organizationId },
            ...(options.leadId && { leadId: options.leadId }),
            ...(options.status && { status: options.status }),
        };
        const [total, data] = await Promise.all([
            prisma_1.prisma.quote.count({ where }),
            prisma_1.prisma.quote.findMany({
                where,
                skip: (options.page - 1) * options.limit,
                take: options.limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    lead: { select: { id: true, firstName: true, lastName: true, address: true } },
                },
            }),
        ]);
        return { data, meta: { total, page: options.page, limit: options.limit, totalPages: Math.ceil(total / options.limit) } };
    }
    async getById(id) {
        const quote = await prisma_1.prisma.quote.findUnique({
            where: { id },
            include: {
                lead: { select: { id: true, firstName: true, lastName: true, address: true, city: true, zip: true } },
            },
        });
        if (!quote)
            throw new errorHandler_1.NotFoundError('Quote');
        return quote;
    }
    async listForLead(leadId) {
        return prisma_1.prisma.quote.findMany({
            where: { leadId },
            orderBy: { createdAt: 'desc' },
            include: {},
        });
    }
    async buildFromOpenings(params) {
        const { leadId, propertyId, productSeriesId, globalOptions = [], discountPct = 0, financingOptionId: _financingOptionId, createdById: _createdById, organizationId: _organizationId, notes: _notes } = params;
        // Load all approved/verified openings for the property
        const openings = await prisma_1.prisma.opening.findMany({
            where: { propertyId },
            include: { measurement: true },
        });
        const lineItems = [];
        for (const opening of openings) {
            const meas = opening.measurement;
            const width = meas?.finalWidth || 36;
            const height = meas?.finalHeight || 48;
            const priceCalc = products_service_1.productsService.calculateWindowPrice({
                seriesId: productSeriesId,
                widthInches: width,
                heightInches: height,
                options: globalOptions,
                quantity: 1,
            });
            lineItems.push({
                openingId: opening.id,
                roomLabel: (opening.roomLabel ?? opening.id ?? 'Window'),
                windowType: opening.windowType || 'DOUBLE_HUNG',
                productSeriesId,
                productName: priceCalc.seriesName,
                widthInches: width,
                heightInches: height,
                quantity: 1,
                unitPrice: priceCalc.unitPrice,
                optionTotal: priceCalc.optionTotal,
                lineTotal: priceCalc.lineTotal,
                options: globalOptions,
                notes: meas?.status === 'ESTIMATED' ? 'âš ï¸ AI-estimated dimensions â€” verify before ordering' : undefined,
            });
        }
        return this.calculateTotals(lineItems, discountPct);
    }
    calculateTotals(lineItems, discountPct = 0) {
        const subtotal = lineItems.reduce((s, l) => s + l.lineTotal, 0);
        const discountAmount = Math.round(subtotal * (discountPct / 100) * 100) / 100;
        const afterDiscount = subtotal - discountAmount;
        // Louisiana: no sales tax on services/installation, but materials may vary by parish
        const taxRate = 0.0; // 0% â€” WindowWorld typically bundles; update per parish
        const taxAmount = Math.round(afterDiscount * taxRate * 100) / 100;
        const grandTotal = afterDiscount + taxAmount;
        const totalWindows = lineItems.reduce((s, l) => s + l.quantity, 0);
        // Financing options
        const financingOptions = ['SAME_AS_CASH_12', 'SAME_AS_CASH_18', 'FIXED_60', 'FIXED_120'].map((id) => products_service_1.productsService.calculateMonthlyPayment(grandTotal, id));
        return {
            lineItems,
            totals: {
                subtotal: Math.round(subtotal * 100) / 100,
                discountAmount,
                discountPct,
                taxRate,
                taxAmount,
                installationTotal: lineItems.reduce((s, l) => s + l.quantity * 75, 0), // $75/window install
                grandTotal: Math.round(grandTotal * 100) / 100,
                totalWindows,
                avgPricePerWindow: totalWindows > 0 ? Math.round((grandTotal / totalWindows) * 100) / 100 : 0,
            },
            financingOptions,
        };
    }
    async create(data) {
        const { lineItems, discountPct = 0 } = data;
        const { totals } = this.calculateTotals(lineItems, discountPct);
        const quote = await prisma_1.prisma.quote.create({
            data: {
                leadId: data.leadId,
                propertyId: data.propertyId,
                lineItems: lineItems,
                subtotal: totals.subtotal,
                discountPct: totals.discountPct,
                discountAmount: totals.discountAmount,
                taxAmount: totals.taxAmount,
                grandTotal: totals.grandTotal,
                totalWindows: totals.totalWindows,
                financingOptionId: data.financingOptionId,
                notes: data.notes,
                status: 'DRAFT',
                createdById: data.createdById,
            },
            include: {},
        });
        await audit_service_1.auditService.log({
            userId: data.createdById,
            entityType: 'quote',
            entityId: quote.id,
            action: 'create',
            newValues: { grandTotal: totals.grandTotal, windows: totals.totalWindows },
        });
        return quote;
    }
    async update(id, data, userId) {
        const existing = await this.getById(id);
        const lineItems = data.lineItems || existing.lineItems;
        const discountPct = data.discountPct ?? existing.discountPct ?? 0;
        const { totals } = this.calculateTotals(lineItems, discountPct);
        return prisma_1.prisma.quote.update({
            where: { id },
            data: {
                lineItems: lineItems,
                subtotal: totals.subtotal,
                discountPct: totals.discountPct,
                discountAmount: totals.discountAmount,
                taxAmount: totals.taxAmount,
                grandTotal: totals.grandTotal,
                totalWindows: totals.totalWindows,
                financingOptionId: data.financingOptionId,
                notes: data.notes,
                status: data.status,
            },
        });
    }
    async delete(id, userId) {
        await this.getById(id);
        await prisma_1.prisma.quote.delete({ where: { id } });
    }
}
exports.QuotesService = QuotesService;
exports.quotesService = new QuotesService();
//# sourceMappingURL=quotes.service.js.map