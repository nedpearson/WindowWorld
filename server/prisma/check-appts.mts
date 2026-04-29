import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const now = new Date();
const futureAppts = await p.appointment.findMany({
  where: { 
    lead: { organizationId: 'f64a568a-10c0-4bc9-9d33-25a1bec1aec0' }, 
    scheduledAt: { gte: now },
    status: { not: 'CANCELLED' as any }
  },
  select: { id: true, title: true, status: true, type: true, scheduledAt: true, leadId: true },
  orderBy: { scheduledAt: 'asc' },
  take: 10
});
console.log('Future non-cancelled appts:', futureAppts.length);
console.log(JSON.stringify(futureAppts.map(a => ({ 
  title: a.title, 
  status: a.status, 
  type: a.type,
  scheduledAt: a.scheduledAt.toISOString(),
  leadId: a.leadId
})), null, 2));
await p.$disconnect();
