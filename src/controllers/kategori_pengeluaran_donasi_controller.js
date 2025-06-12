const { successResponse, errorResponse } = require("../utils/response");
const kategoriPengeluaranDonasiService = require("../services/kategori_pengeluaran_donasi_service");

// src/controllers/role_controllers.js

// GET /kategoriDonasi - Get all kategoriDonasi
exports.getKategoriPengeluaranDonasi = async (req, res) => {
  try {
    const kategoriDonasi =
      await kategoriPengeluaranDonasiService.getAllKategoriPengeluaranDonasi();
    if (!kategoriDonasi) {
      return errorResponse(res, "No kategoriDonasi found", 404);
    }
    successResponse(res, "kategoriDonasi fetched successfully", kategoriDonasi);
  } catch (err) {
    errorResponse(res, "Failed to fetch kategoriDonasi: " + err.message);
  }
};

// POST /kategoriDonasi - Create a new role
exports.createKategoriPengeluaranDonasi = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return errorResponse(res, "kategoriDonasi name is required", 400);
    }
    const newKategoriDonasi =
      await kategoriPengeluaranDonasiService.createKategoriPengeluaranDonasi(
        name
      );
    successResponse(
      res,
      "kategoriDonasi created successfully",
      newKategoriDonasi,
      201
    );
  } catch (err) {
    errorResponse(res, "Failed to fetch kategoriDonasi: " + err.message);
  }
};
