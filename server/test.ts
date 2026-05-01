import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.user.findUnique({where: {email: 'nedpearson@gmail.com'}}).then(u => console.log(u)).catch(console.error).finally(() => prisma.$disconnect());
