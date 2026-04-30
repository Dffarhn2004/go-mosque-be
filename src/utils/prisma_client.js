const { PrismaClient } = require('../generated/prisma_runtime');
const prisma = new PrismaClient();

module.exports = prisma;
