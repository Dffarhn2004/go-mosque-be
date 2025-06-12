const { successResponse, errorResponse } = require("../utils/response");
const kategoriDonasiService = require("../services/kategori_donasi_service");

// src/controllers/role_controllers.js

// GET /kategoriDonasi - Get all kategoriDonasi
exports.getKategoriDonasi = async (req, res) => {
  try {
    const kategoriDonasi = await kategoriDonasiService.getAllKategoriDonasi();
    if (!kategoriDonasi) {
      return errorResponse(res, "No kategoriDonasi found", 404);
    }
    successResponse(res, "kategoriDonasi fetched successfully", kategoriDonasi);
  } catch (err) {
    errorResponse(res, "Failed to fetch kategoriDonasi: " + err.message);
  }
};

// POST /kategoriDonasi - Create a new role
exports.createKategoriDonasi = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return errorResponse(res, "kategoriDonasi name is required", 400);
    }
    const newKategoriDonasi = await kategoriDonasiService.createKategoriDonasi(name);
    successResponse(res, "kategoriDonasi created successfully", newKategoriDonasi, 201);
  } catch (err) {
    errorResponse(res, "Failed to fetch kategoriDonasi: " + err.message);
  }
};
