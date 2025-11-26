const { successResponse, errorResponse } = require("../utils/response");
const jurnalService = require("../services/jurnal_service");
const prisma = require("../utils/prisma_client");
const CustomError = require("../utils/custom_error");

/**
 * GET /jurnal - Get all jurnal transactions with filters
 * Query params: tanggalAwal, tanggalAkhir, akunId, tipe
 */
exports.getAllJurnals = async (req, res) => {
  try {
    const { tanggalAwal, tanggalAkhir, akunId, tipe } = req.query;
    const userId = req.user.id;

    // Get user's masjidId
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { masjidId: true },
    });

    if (!user || !user.masjidId) {
      return errorResponse(res, "User does not belong to any masjid", 403);
    }

    const filters = {
      masjidId: user.masjidId,
      tanggalAwal: tanggalAwal || null,
      tanggalAkhir: tanggalAkhir || null,
      akunId: akunId || null,
      tipe: tipe || null,
    };

    const transactions = await jurnalService.getAllJurnalTransactions(filters);

    successResponse(res, "Jurnal transactions fetched successfully", transactions);
  } catch (err) {
    console.error("Error in getAllJurnals:", err);
    if (err instanceof CustomError) {
      return errorResponse(res, err.message, err.statusCode);
    }
    errorResponse(res, "Failed to fetch jurnal transactions: " + err.message);
  }
};

/**
 * GET /jurnal/:id - Get jurnal transaction by ID
 */
exports.getJurnalById = async (req, res) => {
  try {
    const { id } = req.params;
    const transaction = await jurnalService.getJurnalTransactionById(id);

    successResponse(res, "Jurnal transaction fetched successfully", transaction);
  } catch (err) {
    console.error("Error in getJurnalById:", err);
    if (err instanceof CustomError) {
      return errorResponse(res, err.message, err.statusCode);
    }
    errorResponse(res, "Failed to fetch jurnal transaction: " + err.message);
  }
};

/**
 * POST /jurnal - Create new jurnal transaction (double-entry)
 * Body: { tanggal, keterangan, referensi?, entries: [{ akunId, tipe, jumlah }] }
 */
exports.createJurnal = async (req, res) => {
  try {
    const { tanggal, keterangan, referensi, entries } = req.body;
    const userId = req.user.id;

    // Get user's masjidId
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { masjidId: true },
    });

    if (!user || !user.masjidId) {
      return errorResponse(res, "User does not belong to any masjid", 403);
    }

    // Validate entries - minimal 1 entry
    if (!entries || !Array.isArray(entries) || entries.length < 1) {
      return errorResponse(
        res,
        "Entries array with at least 1 entry is required",
        400
      );
    }

    const transaction = await jurnalService.createJurnalTransaction({
      masjidId: user.masjidId,
      tanggal,
      keterangan,
      referensi,
      entries,
    });

    successResponse(res, "Jurnal transaction created successfully", transaction, 201);
  } catch (err) {
    console.error("Error in createJurnal:", err);
    if (err instanceof CustomError) {
      return errorResponse(res, err.message, err.statusCode);
    }
    errorResponse(res, "Failed to create jurnal transaction: " + err.message);
  }
};

/**
 * PUT /jurnal/:id - Update jurnal transaction
 * Body: { tanggal?, keterangan?, referensi?, entries?: [{ akunId, tipe, jumlah }] }
 */
exports.updateJurnal = async (req, res) => {
  try {
    const { id } = req.params;
    const transactionData = req.body;

    // If entries provided, validate - minimal 1 entry
    if (transactionData.entries) {
      if (!Array.isArray(transactionData.entries) || transactionData.entries.length < 1) {
        return errorResponse(
          res,
          "Entries array with at least 1 entry is required",
          400
        );
      }
    }

    const updated = await jurnalService.updateJurnalTransaction(id, transactionData);

    successResponse(res, "Jurnal transaction updated successfully", updated);
  } catch (err) {
    console.error("Error in updateJurnal:", err);
    if (err instanceof CustomError) {
      return errorResponse(res, err.message, err.statusCode);
    }
    errorResponse(res, "Failed to update jurnal transaction: " + err.message);
  }
};

/**
 * DELETE /jurnal/:id - Delete jurnal transaction
 */
exports.deleteJurnal = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await jurnalService.deleteJurnalTransaction(id);

    successResponse(res, "Jurnal transaction deleted successfully", deleted);
  } catch (err) {
    console.error("Error in deleteJurnal:", err);
    if (err instanceof CustomError) {
      return errorResponse(res, err.message, err.statusCode);
    }
    errorResponse(res, "Failed to delete jurnal transaction: " + err.message);
  }
};

/**
 * GET /jurnal/balances - Get account balances
 * Query params: endDate (optional)
 */
exports.getAccountBalances = async (req, res) => {
  try {
    const { endDate } = req.query;
    const userId = req.user.id;

    // Get user's masjidId
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { masjidId: true },
    });

    if (!user || !user.masjidId) {
      return errorResponse(res, "User does not belong to any masjid", 403);
    }

    const balances = await jurnalService.calculateAccountBalances(
      user.masjidId,
      endDate ? new Date(endDate) : null
    );

    successResponse(res, "Account balances calculated successfully", balances);
  } catch (err) {
    console.error("Error in getAccountBalances:", err);
    if (err instanceof CustomError) {
      return errorResponse(res, err.message, err.statusCode);
    }
    errorResponse(res, "Failed to calculate account balances: " + err.message);
  }
};

/**
 * GET /jurnal/public/balances - Get account balances untuk public user
 * Query params: masjidId (required), endDate (optional)
 */
exports.getAccountBalancesPublic = async (req, res) => {
  try {
    const { masjidId, endDate } = req.query;

    if (!masjidId) {
      return errorResponse(res, "masjidId is required", 400);
    }

    const balances = await jurnalService.calculateAccountBalances(
      masjidId,
      endDate ? new Date(endDate) : null
    );

    successResponse(res, "Account balances calculated successfully", balances);
  } catch (err) {
    console.error("Error in getAccountBalancesPublic:", err);
    if (err instanceof CustomError) {
      return errorResponse(res, err.message, err.statusCode);
    }
    errorResponse(res, "Failed to calculate account balances: " + err.message);
  }
};