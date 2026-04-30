const prisma = require("../../utils/prisma_client");
const { unauthorizedResponse } = require("../../utils/response");

const ADMIN_ROLE_NAME = "Admin";

async function requireAdmin(req, res, next) {
  try {
    if (!req.user?.id) {
      return unauthorizedResponse(res, "Unauthorized", 401);
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        role: true,
        masjid: true,
      },
    });

    if (!currentUser || currentUser.isActive === false) {
      return unauthorizedResponse(res, "User account is inactive", 403);
    }

    if (currentUser.role?.Nama !== ADMIN_ROLE_NAME) {
      return unauthorizedResponse(res, "Admin access required", 403);
    }

    req.currentUser = currentUser;
    next();
  } catch (error) {
    console.error("Admin middleware error:", error);
    return unauthorizedResponse(res, "Failed to verify admin access", 500);
  }
}

module.exports = requireAdmin;
