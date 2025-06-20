const statistikService = require("../services/statistik_service");
const { errorResponse, successResponse } = require("../utils/response");

// GET /roles - Get all roles
exports.getStatistik = async (req, res) => {
  try {
    const { id } = req.params;
    const statistik = await statistikService.getAllStatistik(id);
    if (!statistik) {
      return errorResponse(res, "No statistik found", 404);
    }
    successResponse(res, "Statistik fetched successfully", statistik);
  } catch (err) {
    errorResponse(res, "Failed to fetch Statistik: " + err.message);
  }
};
