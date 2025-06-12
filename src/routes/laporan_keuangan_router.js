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
