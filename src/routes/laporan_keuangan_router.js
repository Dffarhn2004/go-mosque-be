const express = require("express");
const multer = require("multer");

const laporanKeuanganController = require("../controllers/laporan_keuangan_controllers");
const authenticateJWT = require("../middleware/jwt/jwt.middleware");

const laporanKeuanganRouter = express.Router();

// Configure multer inline to accept only Excel files
const storage = multer.memoryStorage();
const excelMimeTypes = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.ms-excel", // .xls
];
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (excelMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only Excel files are allowed (.xls, .xlsx)"));
    }
  },
});

// Public routes untuk laporan keuangan (tidak perlu authentication, masjidId dari query params)
// GET /laporan-keuangan/public/jurnal/posisi-keuangan - Generate Neraca untuk public user
laporanKeuanganRouter.get(
  "/public/jurnal/posisi-keuangan",
  laporanKeuanganController.generateNeracaFromJurnalPublic
);

// GET /laporan-keuangan/public/jurnal/penghasilan-komprehensif - Generate Laba Rugi untuk public user
laporanKeuanganRouter.get(
  "/public/jurnal/penghasilan-komprehensif",
  laporanKeuanganController.generateLabaRugiFromJurnalPublic
);

// GET /laporan-keuangan/public/jurnal/perubahan-aset-neto - Generate Perubahan Ekuitas untuk public user
laporanKeuanganRouter.get(
  "/public/jurnal/perubahan-aset-neto",
  laporanKeuanganController.generatePerubahanEkuitasFromJurnalPublic
);

// Jurnal-based laporan keuangan endpoints (must be before /:id route)
laporanKeuanganRouter.use(authenticateJWT);

// GET /laporan-keuangan/jurnal/posisi-keuangan - Generate Neraca
laporanKeuanganRouter.get(
  "/jurnal/posisi-keuangan",
  laporanKeuanganController.generateNeracaFromJurnal
);

// GET /laporan-keuangan/jurnal/penghasilan-komprehensif - Generate Laba Rugi
laporanKeuanganRouter.get(
  "/jurnal/penghasilan-komprehensif",
  laporanKeuanganController.generateLabaRugiFromJurnal
);

// GET /laporan-keuangan/jurnal/perubahan-aset-neto - Generate Perubahan Ekuitas
laporanKeuanganRouter.get(
  "/jurnal/perubahan-aset-neto",
  laporanKeuanganController.generatePerubahanEkuitasFromJurnal
);

// GET /laporan-keuangan/jurnal/arus-kas - Generate Arus Kas
laporanKeuanganRouter.get(
  "/jurnal/arus-kas",
  laporanKeuanganController.generateArusKasFromJurnal
);

// Existing routes
laporanKeuanganRouter.get(
  "/:idLaporanKeuangan",
  laporanKeuanganController.getLaporanMasjid
);

laporanKeuanganRouter.post(
  "/",
  authenticateJWT,
  upload.single("laporanExcel"), // Adjust this to match your frontend field name
  laporanKeuanganController.createDonasi
);

module.exports = laporanKeuanganRouter;
