const { successResponse, errorResponse } = require("../utils/response");
const donasiService = require("../services/donasi_service");
const prisma = require("../utils/prisma_client");
// src/controllers/role_controllers.js

// GET /roles - Get all roles
exports.getAllDonasi = async (req, res) => {
  try {
    const donasiMasjids = await donasiService.getAllDonasi(req.user.id);
    if (!donasiMasjids) {
      return errorResponse(res, "No Donasi Masjid found", 404);
    }
    successResponse(res, "Donasi Masjid fetched successfully", donasiMasjids);
  } catch (err) {
    console.error("Error fetching all donasi masjid:", err);
    errorResponse(res, "Failed to fetch Donasi Masjid: " + err.message);
  }
};

exports.getAllDonaturMasjid = async (req, res) => {
  try {
    // const userId = req.user.id;
    const donasiMasjids = await donasiService.getAllDonaturTakmir(req.user.id);
    if (!donasiMasjids) {
      return errorResponse(res, "No Donasi Masjid found", 404);
    }
    successResponse(res, "Donasi Masjid fetched successfully", donasiMasjids);
  } catch (err) {
    console.error("Error fetching all donatur masjid:", err);
    errorResponse(res, "Failed to fetch Donasi Masjid: " + err.message);
  }
};

// GET /roles - Get all roles
exports.getDonasi = async (req, res) => {
  try {
    const idDonasi = req.params.idDonasi;

    const donasi = await donasiService.getDonasi(idDonasi);
    if (!donasiMasjid) {
      return errorResponse(res, "No roles found", 404);
    }
    successResponse(res, "Roles fetched successfully", donasiMasjid);
  } catch (err) {
    errorResponse(res, "Failed to fetch roles: " + err.message);
  }
};

// POST /roles - Create a new role
exports.createDonasi = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      return errorResponse("User not found", 404);
    }

    const payload = req.body;
    payload.id_user = user.id;

    // Ambil file dari req.files (karena pakai upload.fields)

    const newDonasi = await donasiService.createDonasi(payload);

    successResponse(res, "Donasi masjid created successfully", newDonasi, 201);
  } catch (err) {
    errorResponse(res, "Failed to create donasi masjid: " + err.message);
  }
};

exports.updateJurnalApproval = async (req, res) => {
  try {
    const { donationId } = req.params;
    const { status, reason, jurnalTransactionId } = req.body;

    const updatedDonasi = await donasiService.updateDonasiJurnalApproval({
      donationId,
      takmirUserId: req.user.id,
      status,
      reason,
      jurnalTransactionId,
    });

    successResponse(res, "Status approval jurnal donasi berhasil diperbarui", updatedDonasi);
  } catch (err) {
    console.error("Error updating donation jurnal approval:", err);
    if (err.statusCode) {
      return errorResponse(res, err.message, err.statusCode);
    }
    errorResponse(res, "Failed to update donation jurnal approval: " + err.message);
  }
};
