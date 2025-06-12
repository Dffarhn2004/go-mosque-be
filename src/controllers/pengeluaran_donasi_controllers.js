const { successResponse, errorResponse } = require("../utils/response");
const pengeluaranDonasiMasjidService = require("../services/pengeluran_donasi_service");
const prisma = require("../utils/prisma_client");
// src/controllers/role_controllers.js

// GET /roles - Get all roles
exports.getAllPengeluaranDonasiMasjid = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      return errorResponse("User not found", 404);
    }
    const idMasjid = req.params.idDonasiMasjid;

    console.log("ID Masjid:", idMasjid);

    const donasiMasjids =
      await pengeluaranDonasiMasjidService.getAllPengeluaranDonasiMasjid(
        idMasjid
      );
    if (!donasiMasjids) {
      return errorResponse(res, "No Donasi Masjid found", 404);
    }
    successResponse(res, "Donasi Masjid fetched successfully", donasiMasjids);
  } catch (err) {
    errorResponse(res, "Failed to fetch Donasi Masjid: " + err.message);
  }
};

// // GET /roles - Get all roles
// exports.getDonasiMasjid = async (req, res) => {
//   try {
//     const idDonasiMasjid = req.params.idDonasiMasjid;

//     const donasiMasjid = await pengeluaranDonasiMasjidService.getDonasiMasjid(
//       idDonasiMasjid
//     );
//     if (!donasiMasjid) {
//       return errorResponse(res, "No roles found", 404);
//     }
//     successResponse(res, "Roles fetched successfully", donasiMasjid);
//   } catch (err) {
//     errorResponse(res, "Failed to fetch roles: " + err.message);
//   }
// };

// POST /roles - Create a new role
exports.createPengeluranDonasiMasjid = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      return errorResponse("User not found", 404);
    }

    const payload = req.body;

    if (payload.masjidId !== user.masjidId) {
      console.error(
        "User masjidId does not match payload masjidId",
        user.masjidId,
        payload.masjidId
      );
      return errorResponse(
        res,
        "You are not allowed to create pengeluaran for this masjid",
        403
      );
    }

    // Ambil file dari req.files (karena pakai upload.fields)
    const foto = req.files?.FotoBuktiPengeluaran?.[0] || null;

    if (!foto) {
      return errorResponse(res, "Foto bukti pengeluaran is required", 400);
    }

    const newDonasi =
      await pengeluaranDonasiMasjidService.createPengeluaranDonasiMasjid(
        payload,
        foto
      );

    successResponse(res, "Donasi masjid created successfully", newDonasi, 201);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return errorResponse(
      res,
      error.message || "Internal server error",
      statusCode,
      {
        error: error.message,
      }
    );
  }
};
