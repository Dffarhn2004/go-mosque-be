const masjidService = require("../services/masjid_service");
const prisma = require("../utils/prisma_client");
const { errorResponse, successResponse } = require("../utils/response");

const posisiFoto = ["depan", "belakang", "kanan", "kiri"];

// Get Masjid by ID
exports.getMasjid = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      return errorResponse("User not found", 404);
    }

    if (!user.masjidId) {
      return errorResponse(res, "User does not belong to any masjid", 403);
    }

    const idMasjid = user.masjidId;

    console.log("Fetching masjid with ID:", idMasjid);

    const masjid = await masjidService.getMasjidById(idMasjid);
    if (!masjid) {
      return errorResponse(res, "Masjid not found", 404);
    }
    successResponse(res, "Masjid found", masjid);
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
exports.getMasjidUser = async (req, res) => {
  try {
    const masjid = await masjidService.getMasjidById(req.params.id);
    if (!masjid) {
      return errorResponse(res, "Masjid not found", 404);
    }
    successResponse(res, "Masjid found", masjid);
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

// Update Masjid by ID
exports.updateMasjid = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      return errorResponse(res, "User not found", 404);
    }

    const idMasjid = user.masjidId;

    // Try-parse JSON safely
    const safeJSONParse = (value) => {
      try {
        return value ? JSON.parse(value) : undefined;
      } catch {
        return undefined;
      }
    };

    const penghargaan = safeJSONParse(req.body.penghargaanMasjid);
    const kegiatanPayload = safeJSONParse(req.body.kegiatanMasjid);
    const fasilitasPayload = safeJSONParse(req.body.fasilitasMasjid);

    const payload = {};

    // Basic fields (opsional)
    const optionalFields = [
      "Nama",
      "Alamat",
      "NomorTelepon",
      "TanggalBerdiri",
      "StatusKepemilikan",
      "LuasTanah",
      "Kapasitas_Jamaah",
      "Deskripsi",
      "Visi",
      "Misi",
    ];

    optionalFields.forEach((key) => {
      if (req.body[key] != null) {
        payload[key] = req.body[key];
      }
    });

    // File fields - Pass files to service for handling
    const fileFields = {};

    if (req.files?.["FotoLuarMasjid"]) {
      fileFields.FotoLuarMasjid = req.files["FotoLuarMasjid"]; // Pass file objects
    }

    if (req.files?.["FotoDalamMasjid"]) {
      fileFields.FotoDalamMasjid = req.files["FotoDalamMasjid"]; // Pass file objects
    }

    if (req.files?.["SuratIzinMasjid"]?.[0]) {
      fileFields.SuratIzinMasjid = req.files["SuratIzinMasjid"][0]; // Single file
    }

    if (req.files?.["SuratPengantar"]?.[0]) {
      fileFields.SuratPengantar = req.files["SuratPengantar"][0]; // Single file
    }
    if (req.files?.["PenghargaanMasjid"]?.[0]) {
      fileFields.PenghargaanMasjid = req.files["PenghargaanMasjid"][0]; // Single file
    }

    // kegiatanMasjid (opsional)
    if (Array.isArray(kegiatanPayload)) {
      payload.kegiatanMasjid = kegiatanPayload.map((keg, idx) => ({
        nama: keg.nama,
        dokumentasiUrls: req.files?.["FotoKegiatan"]?.[idx]
          ? [req.files["FotoKegiatan"][idx].path]
          : [],
      }));
    }

    // fasilitasMasjid (opsional)
    if (Array.isArray(fasilitasPayload)) {
      // Transform the payload to match expected format
      payload.fasilitasMasjid = fasilitasPayload.map((fasilitas) => ({
        Nama: fasilitas.nama || fasilitas.Nama,
        Kondisi: fasilitas.kondisi || fasilitas.Kondisi,
      }));
    }

    const updated = await masjidService.updateMasjidFull(
      idMasjid,
      payload,
      fileFields
    );

    return successResponse(res, "Masjid updated successfully", updated);
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
