const express = require("express");

const pengeluaranDonasiController = require("../controllers/pengeluaran_donasi_controllers");

const authenticateJWT = require("../middleware/jwt/jwt.middleware");
const { default: upload } = require("../utils/multer");

const pengeluaranDonasiRoute = express.Router();

pengeluaranDonasiRoute.get(
  "/:idDonasiMasjid",
  authenticateJWT,
  pengeluaranDonasiController.getAllPengeluaranDonasiMasjid
);

// pengeluaranDonasiRoute.get(
//   "/:idDonasiMasjid",
//   authenticateJWT,
//   pengeluaranDonasiController.getDonasi
// );

pengeluaranDonasiRoute.post(
  "/",
  upload.fields([{ name: "FotoBuktiPengeluaran", maxCount: 1 }]),
  authenticateJWT,
  pengeluaranDonasiController.createPengeluranDonasiMasjid
);

module.exports = pengeluaranDonasiRoute;
