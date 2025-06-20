const { successResponse, errorResponse } = require("../utils/response");
const laporanKeuanganService = require("../services/laporan_keuangan_service");
const prisma = require("../utils/prisma_client");

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
