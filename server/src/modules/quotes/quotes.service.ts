import { prisma } from '../../shared/services/prisma';
import { NotFoundError } from '../../shared/middleware/errorHandler';
import { productsService } from '../products/products.service';
import { auditService } from '../admin/audit.service';

export interface QuoteLineItem {
  openingId?: string;
  roomLabel: string;
  windowType: string;
  productSeriesId: string;
  productName: string;
  widthInches: number;
  heightInches: number;
  quantity: number;
  unitPrice: number;
  optionTotal: number;
  lineTotal: number;
  options: string[];
  notes?: string;
}

export interface QuoteTotals {
  subtotal: number;
  discountAmount: number;
  discountPct: number;
  taxRate: number;
  taxAmount: number;
  installationTotal: number;
  grandTotal: number;
  totalWindows: number;
  avgPricePerWindow: number;
}

export class QuotesService {
  async list(options: {
    organizationId: string;
    leadId?: string;
    status?: string;
    page: number;
    limit: number;
  }) {
    const where: any = {
      lead: { organizationId: options.organizationId },
      ...(options.leadId && { leadId: options.leadId }),
      ...(options.status && { status: options.status }),
    };
    const [total, data] = await Promise.all([
      prisma.quote.count({ where }),
      prisma.quote.findMany({
        where,
        skip: (options.page - 1) * options.limit,
        take: options.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          lead: { select: { id: true, firstName: true, lastName: true, address: true } },
        } as any,
      }),
    ]);
    return { data, meta: { total, page: options.page, limit: options.limit, totalPages: Math.ceil(total / options.limit) } };
  }

  async getById(id: string) {
    const quote = await prisma.quote.findUnique({
      where: { id },
      include: {
        lead: { select: { id: true, firstName: true, lastName: true, address: true, city: true, zip: true } },
      } as any,
    });
    if (!quote) throw new NotFoundError('Quote');
    return quote;
  }

  async listForLead(leadId: string) {
    return prisma.quote.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
      include: {} as any,
    });
  }

  async buildFromOpenings(params: {
    leadId: string;
    propertyId: string;
    productSeriesId: string;
    globalOptions?: string[];
    discountPct?: number;
    financingOptionId?: string;
    createdById: string;
    organizationId: string;
    notes?: string;
  }) {
    const { leadId, propertyId, productSeriesId, globalOptions = [], discountPct = 0,
      financingOptionId: _financingOptionId, createdById: _createdById, organizationId: _organizationId, notes: _notes } = params;

    // Load all approved/verified openings for the property
    const openings = await prisma.opening.findMany({
      where: { propertyId },
      include: { measurement: true },
    });

    const lineItems: QuoteLineItem[] = [];

    for (const opening of openings) {
      const meas = opening.measurement;
      const width = meas?.finalWidth || 36;
      const height = meas?.finalHeight || 48;

      const priceCalc = productsService.calculateWindowPrice({
        seriesId: productSeriesId,
        widthInches: width,
        heightInches: height,
        options: globalOptions,
        quantity: 1,
      });

      lineItems.push({
        openingId: opening.id,
        roomLabel: (opening.roomLabel ?? opening.id ?? 'Window') as string,
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

  calculateTotals(lineItems: QuoteLineItem[], discountPct = 0): {
    lineItems: QuoteLineItem[];
    totals: QuoteTotals;
    financingOptions: any[];
  } {
    const subtotal = lineItems.reduce((s, l) => s + l.lineTotal, 0);
    const discountAmount = Math.round(subtotal * (discountPct / 100) * 100) / 100;
    const afterDiscount = subtotal - discountAmount;
    // Louisiana: no sales tax on services/installation, but materials may vary by parish
    const taxRate = 0.0; // 0% â€” WindowWorld typically bundles; update per parish
    const taxAmount = Math.round(afterDiscount * taxRate * 100) / 100;
    const grandTotal = afterDiscount + taxAmount;
    const totalWindows = lineItems.reduce((s, l) => s + l.quantity, 0);

    // Financing options
    const financingOptions = ['SAME_AS_CASH_12', 'SAME_AS_CASH_18', 'FIXED_60', 'FIXED_120'].map((id) =>
      productsService.calculateMonthlyPayment(grandTotal, id)
    );

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

  async create(data: {
    leadId: string;
    propertyId?: string;
    lineItems: QuoteLineItem[];
    discountPct?: number;
    financingOptionId?: string;
    notes?: string;
    createdById: string;
  }) {
    const { lineItems, discountPct = 0 } = data;
    const { totals } = this.calculateTotals(lineItems, discountPct);

    const quote = await prisma.quote.create({
      data: {
        leadId: data.leadId,
        propertyId: data.propertyId,
        lineItems: lineItems as any,
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
      } as any,
      include: {} as any,
    });

    await auditService.log({
      userId: data.createdById,
      entityType: 'quote',
      entityId: quote.id,
      action: 'create',
      newValues: { grandTotal: totals.grandTotal, windows: totals.totalWindows } as any,
    });

    return quote;
  }

  async update(id: string, data: Partial<{
    lineItems: QuoteLineItem[];
    discountPct: number;
    financingOptionId: string;
    notes: string;
    status: string;
  }>, userId: string) {
    const existing = await this.getById(id);
    const lineItems = data.lineItems || (existing as any).lineItems as QuoteLineItem[];
    const discountPct = data.discountPct ?? (existing as any).discountPct ?? 0;
    const { totals } = this.calculateTotals(lineItems, discountPct);

    return prisma.quote.update({
      where: { id },
      data: {
        lineItems: lineItems as any,
        subtotal: totals.subtotal,
        discountPct: totals.discountPct,
        discountAmount: totals.discountAmount,
        taxAmount: totals.taxAmount,
        grandTotal: totals.grandTotal,
        totalWindows: totals.totalWindows,
        financingOptionId: data.financingOptionId,
        notes: data.notes,
        status: data.status,
      } as any,
    });
  }

  async delete(id: string, userId: string) {
    await this.getById(id);
    await prisma.quote.delete({ where: { id } });
  }
}

export const quotesService = new QuotesService();
