const prisma = require("../utils/prisma_client");

async function createAuditLog({
  userId = null,
  action,
  entityType,
  entityId = null,
  entityName = null,
  metadata = null,
}) {
  return prisma.auditLog.create({
    data: {
      userId,
      action,
      entityType,
      entityId,
      entityName,
      metadata,
    },
  });
}

module.exports = {
  createAuditLog,
};
