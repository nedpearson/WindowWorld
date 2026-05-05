const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.$executeRawUnsafe('CREATE DATABASE shadow_db_123')
  .then(() => console.log('Created shadow DB'))
  .catch(e => {
    if (e.message.includes('already exists')) {
      console.log('Already exists');
    } else {
      console.error(e.message);
    }
  })
  .finally(() => prisma.$disconnect());
