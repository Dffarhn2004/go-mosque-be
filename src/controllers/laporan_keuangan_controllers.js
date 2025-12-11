const { successResponse, errorResponse } = require("../utils/response");
const laporanKeuanganService = require("../services/laporan_keuangan_service");
const prisma = require("../utils/prisma_client");
const CustomError = require("../utils/custom_error");

exports.getLaporanMasjid = async (req, res) => {
  try {
    const { idLaporanKeuangan } = req.params;
    const laporan = await laporanKeuanganService.getLaporanKeuanganForDownload(
      idLaporanKeuangan
    );

    if (!laporan) return errorResponse(res, "Not found", 404);

    // Redirect to Firebase URL
    res.redirect(laporan.fileUrl);
  } catch (err) {
    errorResponse(res, "Failed to get laporan: " + err.message);
  }
};

exports.createDonasi = async (req, res) => {
  try {
    const { type } = req.query;
    const userId = req.user.id;
    const file = req.file;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return errorResponse(res, "User not found", 404);
    }
    const idMasjid = user.masjidId;

    const validTypes = [
      "POSISI_KEUANGAN",
      "PENGHASILAN_KOMP",
      "PERUBAHAN_ASET_NETO",
      "ARUS_KAS",
      "CATATAN",
      "KEUANGAN_BULANAN",
      "KEUANGAN_TAHUNAN",
    ];

    if (!validTypes.includes(type)) {
      return errorResponse(res, "Invalid laporan type", 400);
    }

    const uploadResult =
      await laporanKeuanganService.uploadLaporanKeuanganMasjid({
        idMasjid,
        type,
        file,
      });

    successResponse(res, `Laporan uploaded`, uploadResult, 201);
  } catch (err) {
    errorResponse(res, "Upload failed: " + err.message);
  }
};

/**
 * GET /laporan-keuangan/jurnal/posisi-keuangan - Generate Neraca dari jurnal
 * Query params: tanggal (required)
 */
exports.generateNeracaFromJurnal = async (req, res) => {
  try {
    const { tanggal } = req.query;
    const userId = req.user.id;

    if (!tanggal) {
      return errorResponse(res, "tanggal is required", 400);
    }

    // Get user's masjidId
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { masjidId: true },
    });

    if (!user || !user.masjidId) {
      return errorResponse(res, "User does not belong to any masjid", 403);
    }

    const neraca = await laporanKeuanganService.generateNeracaFromJurnal(
      user.masjidId,
      new Date(tanggal)
    );

    successResponse(res, "Neraca generated successfully", neraca);
  } catch (err) {
    console.error("Error in generateNeracaFromJurnal:", err);
    if (err instanceof CustomError) {
      return errorResponse(res, err.message, err.statusCode);
    }
    errorResponse(res, "Failed to generate neraca: " + err.message);
  }
};

/**
 * GET /laporan-keuangan/jurnal/penghasilan-komprehensif - Generate Laba Rugi dari jurnal
 * Query params: tanggalAwal (required), tanggalAkhir (required)
 */
exports.generateLabaRugiFromJurnal = async (req, res) => {
  try {
    const { tanggalAwal, tanggalAkhir } = req.query;
    const userId = req.user.id;

    if (!tanggalAwal || !tanggalAkhir) {
      return errorResponse(
        res,
        "tanggalAwal and tanggalAkhir are required",
        400
      );
    }

    // Get user's masjidId
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { masjidId: true },
    });

    if (!user || !user.masjidId) {
      return errorResponse(res, "User does not belong to any masjid", 403);
    }

    const labaRugi = await laporanKeuanganService.generateLabaRugiFromJurnal(
      user.masjidId,
      new Date(tanggalAwal),
      new Date(tanggalAkhir)
    );

    successResponse(res, "Laba Rugi generated successfully", labaRugi);
  } catch (err) {
    console.error("Error in generateLabaRugiFromJurnal:", err);
    if (err instanceof CustomError) {
      return errorResponse(res, err.message, err.statusCode);
    }
    errorResponse(res, "Failed to generate laba rugi: " + err.message);
  }
};

/**
 * GET /laporan-keuangan/jurnal/perubahan-aset-neto - Generate Perubahan Ekuitas dari jurnal
 * Query params: tahun (required, YYYY)
 */
exports.generatePerubahanEkuitasFromJurnal = async (req, res) => {
  try {
    const { tahun } = req.query;
    const userId = req.user.id;

    const yearNumber = Number(tahun);
    if (!tahun || Number.isNaN(yearNumber) || `${yearNumber}`.length !== 4) {
      return errorResponse(res, "tahun (YYYY) is required", 400);
    }

    // Get user's masjidId
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { masjidId: true },
    });

    if (!user || !user.masjidId) {
      return errorResponse(res, "User does not belong to any masjid", 403);
    }

    const tanggalAwal = new Date(`${yearNumber}-01-01T00:00:00.000Z`);
    const tanggalAkhir = new Date(`${yearNumber}-12-31T23:59:59.999Z`);

    const perubahanEkuitas =
      await laporanKeuanganService.generatePerubahanEkuitasFromJurnal(
        user.masjidId,
        tanggalAwal,
        tanggalAkhir
      );

    successResponse(
      res,
      "Perubahan Ekuitas generated successfully",
      perubahanEkuitas
    );
  } catch (err) {
    console.error("Error in generatePerubahanEkuitasFromJurnal:", err);
    if (err instanceof CustomError) {
      return errorResponse(res, err.message, err.statusCode);
    }
    errorResponse(
      res,
      "Failed to generate perubahan ekuitas: " + err.message
    );
  }
};

/**
 * GET /laporan-keuangan/jurnal/arus-kas - Generate Arus Kas dari jurnal
 * Query params: tanggalAwal (required), tanggalAkhir (required)
 */
exports.generateArusKasFromJurnal = async (req, res) => {
  try {
    const { tanggalAwal, tanggalAkhir } = req.query;
    const userId = req.user.id;

    if (!tanggalAwal || !tanggalAkhir) {
      return errorResponse(
        res,
        "tanggalAwal and tanggalAkhir are required",
        400
      );
    }

    // Get user's masjidId
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { masjidId: true },
    });

    if (!user || !user.masjidId) {
      return errorResponse(res, "User does not belong to any masjid", 403);
    }

    const arusKas = await laporanKeuanganService.generateArusKasFromJurnal(
      user.masjidId,
      new Date(tanggalAwal),
      new Date(tanggalAkhir)
    );

    successResponse(res, "Arus Kas generated successfully", arusKas);
  } catch (err) {
    console.error("Error in generateArusKasFromJurnal:", err);
    if (err instanceof CustomError) {
      return errorResponse(res, err.message, err.statusCode);
    }
    errorResponse(res, "Failed to generate arus kas: " + err.message);
  }
};

/**
 * GET /laporan-keuangan/public/jurnal/posisi-keuangan - Generate Neraca untuk public user
 * Query params: masjidId (required), tanggal (required)
 */
exports.generateNeracaFromJurnalPublic = async (req, res) => {
  try {
    const { masjidId, tanggal } = req.query;

    if (!masjidId || !tanggal) {
      return errorResponse(res, "masjidId and tanggal are required", 400);
    }

    const neraca = await laporanKeuanganService.generateNeracaFromJurnal(
      masjidId,
      new Date(tanggal)
    );

    successResponse(res, "Neraca generated successfully", neraca);
  } catch (err) {
    console.error("Error in generateNeracaFromJurnalPublic:", err);
    if (err instanceof CustomError) {
      return errorResponse(res, err.message, err.statusCode);
    }
    errorResponse(res, "Failed to generate neraca: " + err.message);
  }
};

/**
 * GET /laporan-keuangan/public/jurnal/penghasilan-komprehensif - Generate Laba Rugi untuk public user
 * Query params: masjidId (required), tanggalAwal (required), tanggalAkhir (required)
 */
exports.generateLabaRugiFromJurnalPublic = async (req, res) => {
  try {
    const { masjidId, tanggalAwal, tanggalAkhir } = req.query;

    if (!masjidId || !tanggalAwal || !tanggalAkhir) {
      return errorResponse(
        res,
        "masjidId, tanggalAwal and tanggalAkhir are required",
        400
      );
    }

    const labaRugi = await laporanKeuanganService.generateLabaRugiFromJurnal(
      masjidId,
      new Date(tanggalAwal),
      new Date(tanggalAkhir)
    );

    successResponse(res, "Laba Rugi generated successfully", labaRugi);
  } catch (err) {
    console.error("Error in generateLabaRugiFromJurnalPublic:", err);
    if (err instanceof CustomError) {
      return errorResponse(res, err.message, err.statusCode);
    }
    errorResponse(res, "Failed to generate laba rugi: " + err.message);
  }
};

/**
 * GET /laporan-keuangan/public/jurnal/perubahan-aset-neto - Generate Perubahan Ekuitas untuk public user
 * Query params: masjidId (required), tahun (required, YYYY)
 */
exports.generatePerubahanEkuitasFromJurnalPublic = async (req, res) => {
  try {
    const { masjidId, tahun } = req.query;

    const yearNumber = Number(tahun);
    if (
      !masjidId ||
      !tahun ||
      Number.isNaN(yearNumber) ||
      `${yearNumber}`.length !== 4
    ) {
      return errorResponse(res, "masjidId and tahun (YYYY) are required", 400);
    }

    const tanggalAwal = new Date(`${yearNumber}-01-01T00:00:00.000Z`);
    const tanggalAkhir = new Date(`${yearNumber}-12-31T23:59:59.999Z`);

    const perubahanEkuitas =
      await laporanKeuanganService.generatePerubahanEkuitasFromJurnal(
        masjidId,
        tanggalAwal,
        tanggalAkhir
      );

    successResponse(
      res,
      "Perubahan Ekuitas generated successfully",
      perubahanEkuitas
    );
  } catch (err) {
    console.error("Error in generatePerubahanEkuitasFromJurnalPublic:", err);
    if (err instanceof CustomError) {
      return errorResponse(res, err.message, err.statusCode);
    }
    errorResponse(
      res,
      "Failed to generate perubahan ekuitas: " + err.message
    );
  }
};