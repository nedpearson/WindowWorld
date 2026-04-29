import { Prisma, ExpenseCategory, JobExpense } from '@prisma/client';
import { prisma } from '../../shared/services/prisma';
import { logger, sanitizeForLog } from '../../shared/utils/logger';
import { NotFoundError, ForbiddenError } from '../../shared/middleware/errorHandler';
import OpenAI from 'openai';

// ─── Input Types ──────────────────────────────────────────────

export interface CreateExpenseInput {
  leadId: string;
  amount: number;
  category: ExpenseCategory;
  vendor?: string;
  description?: string;
  receiptDate?: string;
  documentId?: string;
  aiParsedData?: Record<string, unknown>;
  aiConfidence?: number;
}

export interface UpdateExpenseInput {
  amount?: number;
  category?: ExpenseCategory;
  vendor?: string;
  description?: string;
  receiptDate?: string;
}

export interface ParsedReceiptResult {
  vendor: string | null;
  totalAmount: number | null;
  receiptDate: string | null;
  lineItems: Array<{ description: string; amount: number }>;
  taxAmount: number | null;
  category: ExpenseCategory;
  confidence: number;
}

export interface JobCostSummaryResult {
  totalExpenses: number;
  expensesByCategory: Record<ExpenseCategory, number>;
  estimatedValue: number | null;
  grossMargin: number | null;
  grossMarginPct: number | null;
  expenseCount: number;
  unverifiedCount: number;
}

// ─── Serialized shapes (Decimal → number so JSON.stringify works) ─

export interface SerializedExpense {
  id: string;
  organizationId: string;
  leadId: string;
  createdById: string;
  verifiedById: string | null;
  documentId: string | null;
  /** Converted from Prisma.Decimal to plain number */
  amount: number;
  category: ExpenseCategory;
  vendor: string | null;
  description: string | null;
  receiptDate: Date | null;
  aiParsedData: Prisma.JsonValue;
  aiConfidence: number | null;
  verifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  // Included relations (optional — present on list/create responses)
  createdBy?: { id: string; firstName: string; lastName: string };
  document?: { id: string; url: string | null; filename: string } | null;
}

function serializeExpense(e: JobExpense & {
  createdBy?: { id: string; firstName: string; lastName: string };
  document?: { id: string; url: string | null; filename: string } | null;
}): SerializedExpense {
  return {
    ...e,
    amount: Number(e.amount),   // Prisma.Decimal → number (JSON-safe)
  };
}

// ─── OpenAI client: uses same lazy-init pattern as AiService ──
// NOTE: We call OpenAI's image_url feature directly because AiService.analyzeImage
// only accepts base64 strings. The URL variant requires the native OpenAI SDK call.
// Provider config (OPENAI_API_KEY, AI_VISION_MODEL) stays consistent with the rest of the app.

let _openAIClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!_openAIClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured. Set it in Railway environment variables.');
    }
    _openAIClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openAIClient;
}

const RECEIPT_PROMPT = `You are a receipt parser. Extract from this receipt image:
vendor (string), totalAmount (number, USD), receiptDate (ISO string or null),
lineItems (array of {description, amount}), taxAmount (number or null),
category (one of: MATERIALS, PERMITS, DISPOSAL, LABOR, TRAVEL, EQUIPMENT, OTHER).
Respond ONLY with valid JSON matching this schema. If a field cannot be determined, use null.`;

// ─── Service ──────────────────────────────────────────────────

export class JobExpensesService {

  // 1. Create a new expense record
  async createExpense(
    data: CreateExpenseInput,
    userId: string,
    orgId: string,
  ): Promise<SerializedExpense> {
    // Validate lead belongs to org
    const lead = await prisma.lead.findFirst({
      where: { id: data.leadId, organizationId: orgId },
      select: { id: true },
    });
    if (!lead) throw new NotFoundError('Lead');

    const expense = await prisma.jobExpense.create({
      data: {
        organizationId: orgId,
        leadId: data.leadId,
        createdById: userId,
        amount: new Prisma.Decimal(data.amount),
        category: data.category,
        vendor: data.vendor,
        description: data.description,
        receiptDate: data.receiptDate ? new Date(data.receiptDate) : undefined,
        documentId: data.documentId,
        aiParsedData: data.aiParsedData as Prisma.InputJsonValue,
        aiConfidence: data.aiConfidence,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        entityType: 'JOB_EXPENSE',
        entityId: expense.id,
        action: 'CREATE',
        newValues: {
          leadId: data.leadId,
          amount: data.amount,
          category: data.category,
          vendor: data.vendor,
        } as Prisma.InputJsonValue,
      },
    });

    return serializeExpense(expense);
  }

  // 2. Parse receipt image with GPT-4o vision
  async parseReceiptWithAI(
    imageUrl: string,
    leadId: string,
    orgId: string,
  ): Promise<ParsedReceiptResult> {
    const startMs = Date.now();
    let rawOutput = '';

    try {
      const client = getOpenAIClient();
      const response = await client.chat.completions.create({
        model: process.env.AI_VISION_MODEL || 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: imageUrl, detail: 'high' },
              },
              { type: 'text', text: RECEIPT_PROMPT },
            ],
          },
        ],
        max_tokens: 1024,
      });

      rawOutput = response.choices[0]?.message?.content || '{}';
      const parsed = JSON.parse(rawOutput.replace(/```json\n?|\n?```/g, '').trim()) as {
        vendor: string | null;
        totalAmount: number | null;
        receiptDate: string | null;
        lineItems: Array<{ description: string; amount: number }>;
        taxAmount: number | null;
        category: string | null;
      };

      // Confidence scoring: 0.9 if all key fields present, 0.6 if partial, 0.3 if minimal
      const keyFields = [parsed.vendor, parsed.totalAmount, parsed.receiptDate, parsed.category];
      const presentCount = keyFields.filter((f) => f !== null && f !== undefined).length;
      const confidence = presentCount === 4 ? 0.9 : presentCount >= 2 ? 0.6 : 0.3;

      // Validate category against enum — fall back to OTHER if unknown
      const validCategories: ExpenseCategory[] = [
        'MATERIALS', 'PERMITS', 'DISPOSAL', 'LABOR', 'TRAVEL', 'EQUIPMENT', 'OTHER',
      ];
      const category: ExpenseCategory =
        parsed.category && validCategories.includes(parsed.category as ExpenseCategory)
          ? (parsed.category as ExpenseCategory)
          : 'OTHER';

      const result: ParsedReceiptResult = {
        vendor: parsed.vendor ?? null,
        totalAmount: typeof parsed.totalAmount === 'number' ? parsed.totalAmount : null,
        receiptDate: parsed.receiptDate ?? null,
        lineItems: Array.isArray(parsed.lineItems) ? parsed.lineItems : [],
        taxAmount: typeof parsed.taxAmount === 'number' ? parsed.taxAmount : null,
        category,
        confidence,
      };

      // Persist to AiAnalysis for audit trail
      await prisma.aiAnalysis.create({
        data: {
          leadId,
          analysisType: 'receipt-parse',
          provider: 'openai',
          model: process.env.AI_VISION_MODEL || 'gpt-4o',
          rawResponse: parsed as Prisma.InputJsonValue,
          confidenceScore: confidence,
          status: 'COMPLETED',
          processingMs: Date.now() - startMs,
        },
      });

      return result;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[JobExpenses] parseReceiptWithAI failed:', { message: sanitizeForLog(message), imageUrl, leadId });

      // Save failed analysis record (non-blocking)
      try {
        await prisma.aiAnalysis.create({
          data: {
            leadId,
            analysisType: 'receipt-parse',
            provider: 'openai',
            model: process.env.AI_VISION_MODEL || 'gpt-4o',
            rawResponse: rawOutput ? ({ raw: rawOutput } as Prisma.InputJsonValue) : Prisma.JsonNull,
            status: 'FAILED',
            errorMessage: message,
            processingMs: Date.now() - startMs,
          },
        });
      } catch (dbErr) {
        logger.warn('[JobExpenses] Could not save failed AI analysis:', dbErr);
      }

      // AI parse failures are non-blocking — return minimal result
      return {
        vendor: null,
        totalAmount: null,
        receiptDate: null,
        lineItems: [],
        taxAmount: null,
        category: 'OTHER',
        confidence: 0.0,
      };
    }
  }

  // 3. List all expenses for a lead
  async listExpensesByLead(leadId: string, orgId: string): Promise<SerializedExpense[]> {
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, organizationId: orgId },
      select: { id: true },
    });
    if (!lead) throw new NotFoundError('Lead');

    const expenses = await prisma.jobExpense.findMany({
      where: { leadId, organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        document: { select: { id: true, url: true, filename: true } },
      },
    });

    // Serialize all Decimal fields before returning (Decimal is not JSON-serializable)
    return expenses.map((e) => serializeExpense(e));
  }

  // 4. Update an expense
  async updateExpense(
    expenseId: string,
    data: UpdateExpenseInput,
    userId: string,
    orgId: string,
  ): Promise<SerializedExpense> {
    const existing = await prisma.jobExpense.findFirst({
      where: { id: expenseId, organizationId: orgId },
    });
    if (!existing) throw new NotFoundError('JobExpense');

    const updated = await prisma.jobExpense.update({
      where: { id: expenseId },
      data: {
        ...(data.amount !== undefined && { amount: new Prisma.Decimal(data.amount) }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.vendor !== undefined && { vendor: data.vendor }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.receiptDate !== undefined && {
          receiptDate: data.receiptDate ? new Date(data.receiptDate) : null,
        }),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        entityType: 'JOB_EXPENSE',
        entityId: expenseId,
        action: 'UPDATE',
        oldValues: {
          amount: existing.amount.toString(),
          category: existing.category,
          vendor: existing.vendor,
        } as Prisma.InputJsonValue,
        newValues: data as Prisma.InputJsonValue,
      },
    });

    return serializeExpense(updated);
  }

  // 5. Verify an expense (SALES_MANAGER or above only — enforced at route level)
  async verifyExpense(expenseId: string, userId: string, orgId: string): Promise<SerializedExpense> {
    const existing = await prisma.jobExpense.findFirst({
      where: { id: expenseId, organizationId: orgId },
    });
    if (!existing) throw new NotFoundError('JobExpense');

    const updated = await prisma.jobExpense.update({
      where: { id: expenseId },
      data: {
        verifiedAt: new Date(),
        verifiedById: userId,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        entityType: 'JOB_EXPENSE',
        entityId: expenseId,
        action: 'VERIFY',
        newValues: { verifiedAt: updated.verifiedAt?.toISOString(), verifiedById: userId } as Prisma.InputJsonValue,
      },
    });

    return serializeExpense(updated);
  }

  // 6. Delete an expense — creator or manager only (role guard at route level)
  async deleteExpense(
    expenseId: string,
    userId: string,
    orgId: string,
    userRole: string,
  ): Promise<void> {
    const existing = await prisma.jobExpense.findFirst({
      where: { id: expenseId, organizationId: orgId },
    });
    if (!existing) throw new NotFoundError('JobExpense');

    const isOwner = existing.createdById === userId;
    const isManager = ['SUPER_ADMIN', 'SALES_MANAGER'].includes(userRole);
    if (!isOwner && !isManager) {
      throw new ForbiddenError('Only the expense creator or a manager can delete this expense.');
    }

    await prisma.jobExpense.delete({ where: { id: expenseId } });

    await prisma.auditLog.create({
      data: {
        userId,
        entityType: 'JOB_EXPENSE',
        entityId: expenseId,
        action: 'DELETE',
        oldValues: {
          amount: existing.amount.toString(),
          category: existing.category,
          vendor: existing.vendor,
          leadId: existing.leadId,
        } as Prisma.InputJsonValue,
      },
    });
  }

  // 7. Get job cost summary for a lead
  async getJobCostSummary(leadId: string, orgId: string): Promise<JobCostSummaryResult> {
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, organizationId: orgId },
      select: { id: true },
    });
    if (!lead) throw new NotFoundError('Lead');

    const expenses = await prisma.jobExpense.findMany({
      where: { leadId, organizationId: orgId },
      select: {
        amount: true,
        category: true,
        verifiedAt: true,
      },
    });

    // Latest accepted quote for estimated value
    const latestQuote = await prisma.quote.findFirst({
      where: { leadId, status: 'accepted' },
      orderBy: { createdAt: 'desc' },
      select: { total: true },
    });

    // Aggregate using Number() to safely convert Prisma Decimal → number
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

    const expensesByCategory = Object.fromEntries(
      (['MATERIALS', 'PERMITS', 'DISPOSAL', 'LABOR', 'TRAVEL', 'EQUIPMENT', 'OTHER'] as ExpenseCategory[]).map(
        (cat) => [
          cat,
          expenses
            .filter((e) => e.category === cat)
            .reduce((s, e) => s + Number(e.amount), 0),
        ],
      ),
    ) as Record<ExpenseCategory, number>;

    const estimatedValue = latestQuote ? latestQuote.total : null;
    const grossMargin = estimatedValue !== null ? estimatedValue - totalExpenses : null;
    const grossMarginPct =
      estimatedValue !== null && estimatedValue > 0
        ? (grossMargin! / estimatedValue) * 100
        : null;

    return {
      totalExpenses,
      expensesByCategory,
      estimatedValue,
      grossMargin,
      grossMarginPct,
      expenseCount: expenses.length,
      unverifiedCount: expenses.filter((e) => !e.verifiedAt).length,
    };
  }
}

export const jobExpensesService = new JobExpensesService();
