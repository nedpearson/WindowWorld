import { prisma } from '../../shared/services/prisma';
import { NotFoundError } from '../../shared/middleware/errorHandler';
import { auditService } from '../admin/audit.service';

export class MeasurementsService {
  async getByOpening(openingId: string) {
    return prisma.measurement.findUnique({
      where: { openingId },
      include: { history: { orderBy: { changedAt: 'desc' } } },
    });
  }

  async upsert(data: {
    openingId?: string; // Made optional to support standalone / on-the-fly measurements
    inspectionId?: string;
    roomLabel?: string;
    roughWidth?: number;
    roughHeight?: number;
    finalWidth?: number;
    finalHeight?: number;
    depth?: number;
    unitOfMeasure?: string;
    measurementMethod?: string;
    isAiEstimated?: boolean;
    aiConfidenceScore?: number;
    status?: string;
    notes?: string;
    measuredById: string;
  }) {
    let { openingId, inspectionId, roomLabel, measuredById, leadId, ...measureData } = data as any;

    // If no openingId is provided (standalone measurement), create a new Opening on the fly
    if (!openingId) {
      const newOpening = await prisma.opening.create({
        data: {
          inspectionId: inspectionId || null,
          roomLabel: roomLabel || 'Standalone Measurement',
          windowType: 'UNKNOWN',
          frameMaterial: 'UNKNOWN',
        } as any,
      });
      openingId = newOpening.id;
    }

    // Verify opening exists
    const opening = await prisma.opening.findUnique({ where: { id: openingId } });
    if (!opening) throw new NotFoundError('Opening');

    // Get current measurement for history
    const existing = await prisma.measurement.findUnique({ where: { openingId } });

    // Validate: never allow AI-estimated to be saved as APPROVED_FOR_ORDER
    if (measureData.status === 'APPROVED_FOR_ORDER' && measureData.isAiEstimated) {
      throw new Error('Cannot approve AI-estimated measurements for order. Onsite verification required.');
    }

    const measurement = await prisma.measurement.upsert({
      where: { openingId },
      create: {
        openingId,
        measuredById,
        ...measureData,
        status: measureData.status || 'ESTIMATED',
      } as any,
      update: {
        measuredById,
        ...measureData,
        updatedAt: new Date(),
      } as any,
    });

    // Write history record if updating
    if (existing) {
      await prisma.measurementHistory.create({
        data: {
          measurementId: measurement.id,
          changedById: measuredById,
          oldWidth: existing.finalWidth,
          oldHeight: existing.finalHeight,
          newWidth: measureData.finalWidth ?? existing.finalWidth,
          newHeight: measureData.finalHeight ?? existing.finalHeight,
          oldStatus: existing.status,
          newStatus: measureData.status ?? existing.status,
          changeReason: measureData.notes ?? 'Updated',
        } as any,
      });
    }

    await auditService.log({
      userId: measuredById,
      entityType: 'measurement',
      entityId: measurement.id,
      action: existing ? 'update' : 'create',
      oldValues: existing as any,
      newValues: measurement as any,
    });

    // Update opening status
    await prisma.opening.update({
      where: { id: openingId },
      data: { status: measureData.status === 'APPROVED_FOR_ORDER' ? 'ORDER_READY' : 'MEASURED' } as any,
    });

    return measurement;
  }

  async verify(openingId: string, userId: string, finalWidth: number, finalHeight: number) {
    return this.upsert({
      openingId,
      finalWidth,
      finalHeight,
      status: 'VERIFIED_ONSITE',
      isAiEstimated: false,
      measuredById: userId,
      notes: 'Verified onsite by field technician',
    });
  }

  async approveForOrder(openingId: string, userId: string) {
    const existing = await prisma.measurement.findUnique({ where: { openingId } });
    if (!existing) throw new NotFoundError('Measurement');
    if (existing.status !== 'VERIFIED_ONSITE') {
      throw new Error(`Cannot approve for order: measurement status is "${existing.status}". Must be VERIFIED_ONSITE first.`);
    }
    if ((existing as any).isAiEstimated) {
      throw new Error('Cannot approve AI-estimated measurements for order. Onsite verification required.');
    }

    return this.upsert({
      openingId,
      status: 'APPROVED_FOR_ORDER',
      measuredById: userId,
      notes: 'Approved for order',
    });
  }

  async getPropertySummary(propertyId: string) {
    const openings = await prisma.opening.findMany({
      where: { propertyId },
      include: { measurement: true },
    });

    const total = openings.length;
    const withMeasurements = openings.filter((o) => o.measurement).length;
    const aiEstimated = openings.filter((o) => (o.measurement as any)?.isAiEstimated).length;
    const verified = openings.filter((o) => o.measurement?.status === 'VERIFIED_ONSITE').length;
    const approvedForOrder = openings.filter((o) => o.measurement?.status === 'APPROVED_FOR_ORDER').length;

    return {
      total,
      withMeasurements,
      aiEstimated,
      verified,
      approvedForOrder,
      unmeasured: total - withMeasurements,
      isOrderReady: total > 0 && approvedForOrder === total,
      readinessPct: total > 0 ? Math.round((approvedForOrder / total) * 100) : 0,
      aiDisclaimerRequired: aiEstimated > 0,
    };
  }
}

export const measurementsService = new MeasurementsService();
