const { successResponse, errorResponse } = require("../utils/response");
const donasiMasjidService = require("../services/donasi_masjid_service");
const prisma = require("../utils/prisma_client");
// src/controllers/role_controllers.js

// GET /roles - Get all roles
exports.getAllDonasiMasjid = async (req, res) => {
  try {

    const donasiMasjidLimit = parseInt(req.query.limit); // Default limit to 10 if not provided
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      return errorResponse(res, "User not found", 404);
    }

    if (!user.masjidId) {
      return errorResponse(res, "User does not belong to any masjid", 403);
    }

    const idMasjid = user.masjidId;

    const donasiMasjids = await donasiMasjidService.getAllDonasiMasjid(
      idMasjid, donasiMasjidLimit
    );
    if (!donasiMasjids) {
      return errorResponse(res, "No Donasi Masjid found", 404);
    }
    successResponse(res, "Donasi Masjid fetched successfully", donasiMasjids);
  } catch (err) {
    console.error("Error fetching all donasi masjid:", err);
    errorResponse(res, "Failed to fetch Donasi Masjid: " + err.message);
  }
};

exports.getAllDonasiMasjidUser = async (req, res) => {
  try {

    const donasiMasjidLimit = parseInt(req.query.limit) || 10; // Default limit to 10 if not provided

    const donasiMasjids = await donasiMasjidService.getAllDonasiMasjidUser(donasiMasjidLimit);
    if (!donasiMasjids) {
      return errorResponse(res, "No Donasi Masjid found", 404);
    }
    successResponse(res, "Donasi Masjid fetched successfully", donasiMasjids);
  } catch (err) {
    console.error("Error fetching all donasi masjid:", err);
    errorResponse(res, "Failed to fetch Donasi Masjid: " + err.message);
  }
};

// GET /roles - Get all roles
exports.getDonasiMasjid = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      return errorResponse(res, "User not found", 404);
    }

    if (!user.masjidId) {
      return errorResponse(res, "User does not belong to any masjid", 403);
    }

    const idMasjid = user.masjidId;

    const idDonasiMasjid = req.params.idDonasiMasjid;

    const donasiMasjid = await donasiMasjidService.getDonasiMasjid(
      idDonasiMasjid,
      idMasjid
    );
    if (!donasiMasjid) {
      return errorResponse(res, "No roles found", 404);
    }
    successResponse(res, "Roles fetched successfully", donasiMasjid);
  } catch (err) {
    errorResponse(res, "Failed to fetch roles: " + err.message);
  }
};

exports.getDonasiMasjidUser = async (req, res) => {
  try {
    const idDonasiMasjid = req.params.idDonasiMasjid;

    const donasiMasjid = await donasiMasjidService.getDonasiMasjidUser(
      idDonasiMasjid
    );
    if (!donasiMasjid) {
      return errorResponse(res, "No roles found", 404);
    }
    successResponse(res, "Roles fetched successfully", donasiMasjid);
  } catch (err) {
    errorResponse(res, "Failed to fetch roles: " + err.message);
  }
};

// POST /roles - Create a new role
exports.createDonasiMasjid = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      return errorResponse(res, "User not found", 404);
    }

    if (!user.masjidId) {
      return errorResponse(res, "User does not belong to any masjid", 403);
    }

    const payload = req.body;
    payload.id_masjid = user.masjidId;

    // Ambil file dari req.files (karena pakai upload.fields)
    const foto = req.files?.FotoThumbnailDonasi?.[0] || null;

    const newDonasi = await donasiMasjidService.createDonasiMasjid(
      payload,
      foto
    );

    successResponse(res, "Donasi masjid created successfully", newDonasi, 201);
  } catch (err) {
    errorResponse(res, "Failed to create donasi masjid: " + err.message);
  }
};
