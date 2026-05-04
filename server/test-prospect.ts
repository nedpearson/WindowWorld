import { PrismaClient } from '@prisma/client';
import { leadProspectingService } from './src/modules/leads/prospecting.service';

const prisma = new PrismaClient();

async function test() {
  const user = await prisma.user.findFirst({ where: { email: 'nedpearson@gmail.com' } });
  if (!user) throw new Error('User not found');
  console.log('Testing prospecting for org:', user.organizationId);
  
  const leads = await leadProspectingService.prospect(user.organizationId, user.id, 'Baton Rouge, Louisiana', 'Property Management and HOAs');
  console.log('Leads found:', leads);
}

test().catch(console.error).finally(() => prisma.$disconnect());
