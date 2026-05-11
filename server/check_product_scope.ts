import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const c = await prisma.topicCluster.findMany({ distinct: ['productScope'], select: { productScope: true } });
  const o = await prisma.messagingOpportunity.findMany({ distinct: ['productScope'], select: { productScope: true } });
  const p = await prisma.socialCreativePattern.findMany({ distinct: ['productFocus'], select: { productFocus: true } });
  const obj = await prisma.objectionPattern.findMany({ distinct: ['productFocus'], select: { productFocus: true } });
  console.log("TopicCluster productScope:", c.map(x => x.productScope));
  console.log("MessagingOpportunity productScope:", o.map(x => x.productScope));
  console.log("SocialCreativePattern productFocus:", p.map(x => x.productFocus));
  console.log("ObjectionPattern productFocus:", obj.map(x => x.productFocus));
  process.exit(0);
}
run();
