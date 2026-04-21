import { prisma } from '../../shared/services/prisma';
import { NotFoundError } from '../../shared/middleware/errorHandler';

export class AutomationService {
  async list(organizationId: string) {
    return prisma.automation.findMany({
      where: { organizationId },
      include: {
        runs: {
          orderBy: { triggeredAt: 'desc' },
          take: 1,
          select: { status: true, triggeredAt: true, completedAt: true, errorMessage: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getById(id: string, organizationId: string) {
    const automation = await prisma.automation.findFirst({
      where: { id, organizationId },
      include: {
        runs: {
          orderBy: { triggeredAt: 'desc' },
          take: 10,
        },
      },
    });
    if (!automation) throw new NotFoundError('Automation');
    return automation;
  }

  async create(organizationId: string, data: {
    name: string;
    description?: string;
    trigger: string;
    conditions?: any;
    actions: any;
    delayMinutes?: number;
  }) {
    return prisma.automation.create({
      data: {
        organizationId,
        name: data.name,
        description: data.description,
        trigger: data.trigger as any,
        conditions: data.conditions,
        actions: data.actions,
        delayMinutes: data.delayMinutes,
        isActive: true,
      },
    });
  }

  async update(id: string, organizationId: string, data: Partial<{
    name: string;
    description: string;
    isActive: boolean;
    conditions: any;
    actions: any;
    delayMinutes: number;
  }>) {
    const existing = await prisma.automation.findFirst({ where: { id, organizationId } });
    if (!existing) throw new NotFoundError('Automation');
    return prisma.automation.update({ where: { id }, data });
  }

  async toggle(id: string, organizationId: string) {
    const existing = await prisma.automation.findFirst({ where: { id, organizationId } });
    if (!existing) throw new NotFoundError('Automation');
    return prisma.automation.update({
      where: { id },
      data: { isActive: !existing.isActive },
    });
  }

  async getRuns(automationId: string, organizationId: string, limit = 20) {
    const automation = await prisma.automation.findFirst({ where: { id: automationId, organizationId } });
    if (!automation) throw new NotFoundError('Automation');
    return prisma.automationRun.findMany({
      where: { automationId },
      orderBy: { triggeredAt: 'desc' },
      take: limit,
    });
  }
}

export const automationService = new AutomationService();
