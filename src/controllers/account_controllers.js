const { successResponse, errorResponse } = require("../utils/response");
const accountService = require("../services/account_service");
const prisma = require("../utils/prisma_client");
const CustomError = require("../utils/custom_error");

/**
 * GET /coa - Get all accounts
 * Query params: masjidId (optional), includeInactive (optional)
 */
exports.getAllAccounts = async (req, res) => {
  try {
    const { masjidId, includeInactive } = req.query;
    const userId = req.user.id;

    // Get user's masjidId if not provided
    let targetMasjidId = masjidId;
    if (!targetMasjidId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { masjidId: true },
      });
      targetMasjidId = user?.masjidId || null;
    }

    const accounts = await accountService.getAllAccounts(
      targetMasjidId || null,
      includeInactive === "true"
    );

    successResponse(res, "Accounts fetched successfully", accounts);
  } catch (err) {
    console.error("Error in getAllAccounts:", err);
    if (err instanceof CustomError) {
      return errorResponse(res, err.message, err.statusCode);
    }
    errorResponse(res, "Failed to fetch accounts: " + err.message);
  }
};

/**
 * GET /coa/public - Get all accounts untuk public user
 * Query params: masjidId (required), includeInactive (optional)
 */
exports.getAllAccountsPublic = async (req, res) => {
  try {
    const { masjidId, includeInactive } = req.query;

    if (!masjidId) {
      return errorResponse(res, "masjidId is required", 400);
    }

    const accounts = await accountService.getAllAccounts(
      masjidId,
      includeInactive === "true"
    );

    successResponse(res, "Accounts fetched successfully", accounts);
  } catch (err) {
    console.error("Error in getAllAccountsPublic:", err);
    if (err instanceof CustomError) {
      return errorResponse(res, err.message, err.statusCode);
    }
    errorResponse(res, "Failed to fetch accounts: " + err.message);
  }
};

/**
 * GET /coa/tree - Get accounts in tree structure
 * Query params: masjidId (optional)
 */
exports.getAccountTree = async (req, res) => {
  try {
    const { masjidId } = req.query;
    const userId = req.user.id;

    // Get user's masjidId if not provided
    let targetMasjidId = masjidId;
    if (!targetMasjidId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { masjidId: true },
      });
      targetMasjidId = user?.masjidId || null;
    }

    const tree = await accountService.getAccountTree(targetMasjidId || null);

    successResponse(res, "Account tree fetched successfully", tree);
  } catch (err) {
    console.error("Error in getAccountTree:", err);
    if (err instanceof CustomError) {
      return errorResponse(res, err.message, err.statusCode);
    }
    errorResponse(res, "Failed to fetch account tree: " + err.message);
  }
};

/**
 * GET /coa/:id - Get account by ID
 */
exports.getAccountById = async (req, res) => {
  try {
    const { id } = req.params;
    const account = await accountService.getAccountById(id);

    successResponse(res, "Account fetched successfully", account);
  } catch (err) {
    console.error("Error in getAccountById:", err);
    if (err instanceof CustomError) {
      return errorResponse(res, err.message, err.statusCode);
    }
    errorResponse(res, "Failed to fetch account: " + err.message);
  }
};

/**
 * GET /coa/next-code - Get next available account code for a parent
 */
exports.getNextAccountCode = async (req, res) => {
  try {
    const { parentId } = req.query;
    const userId = req.user.id;

    if (!parentId) {
      return errorResponse(res, "parentId is required", 400);
    }

    // Get user's masjidId
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { masjidId: true },
    });
    const masjidId = user?.masjidId || null;

    const nextCode = await accountService.getNextAccountCode(parentId, masjidId);
    successResponse(res, "Next code generated successfully", { code: nextCode });
  } catch (err) {
    console.error("Error in getNextAccountCode:", err);
    if (err instanceof CustomError) {
      return errorResponse(res, err.message, err.statusCode);
    }
    errorResponse(res, "Failed to get next account code: " + err.message);
  }
};

/**
 * POST /coa - Create new account
 */
exports.createAccount = async (req, res) => {
  try {
    const { code, name, parentId, type, isGroup, masjidId } = req.body;
    const userId = req.user.id;

    // Get user's masjidId if not provided
    let targetMasjidId = masjidId;
    if (!targetMasjidId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { masjidId: true },
      });
      targetMasjidId = user?.masjidId || null;
    }

    const account = await accountService.createAccount({
      code,
      name,
      parentId,
      type,
      isGroup,
      masjidId: targetMasjidId,
    });

    successResponse(res, "Account created successfully", account, 201);
  } catch (err) {
    console.error("Error in createAccount:", err);
    if (err instanceof CustomError) {
      return errorResponse(res, err.message, err.statusCode);
    }
    errorResponse(res, "Failed to create account: " + err.message);
  }
};

/**
 * PUT /coa/:id - Update account
 */
exports.updateAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const accountData = req.body;

    const updated = await accountService.updateAccount(id, accountData);

    successResponse(res, "Account updated successfully", updated);
  } catch (err) {
    console.error("Error in updateAccount:", err);
    if (err instanceof CustomError) {
      return errorResponse(res, err.message, err.statusCode);
    }
    errorResponse(res, "Failed to update account: " + err.message);
  }
};

/**
 * DELETE /coa/:id - Soft delete account (set isActive = false)
 */
exports.deleteAccount = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await accountService.deleteAccount(id);

    successResponse(res, "Account deleted successfully", deleted);
  } catch (err) {
    console.error("Error in deleteAccount:", err);
    if (err instanceof CustomError) {
      return errorResponse(res, err.message, err.statusCode);
    }
    errorResponse(res, "Failed to delete account: " + err.message);
  }
};

