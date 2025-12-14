const express = require("express");

const masjidController = require("../controllers/masjid_controllers");
const authenticateJWT = require("../middleware/jwt/jwt.middleware");
const { default: upload } = require("../utils/multer");

const masjidRoute = express.Router();

// Routes
// Public endpoint - harus ditempatkan sebelum route /:id
masjidRoute.get("/", masjidController.getMasjidList);
masjidRoute.get("/takmir", authenticateJWT, masjidController.getMasjid);
masjidRoute.get("/:id", masjidController.getMasjidUser);
masjidRoute.patch(
  "/",
  authenticateJWT,
  upload.fields([
    { name: "FotoLuarMasjid", maxCount: 4 },
    { name: "FotoDalamMasjid", maxCount: 4 },
    { name: "SuratIzinMasjid", maxCount: 1 },
    { name: "SuratPengantar", maxCount: 1 },
    { name: "PenghargaanMasjid", maxCount: 1 },
    { name: "FotoKegiatan", maxCount: 4 },
  ]),
  masjidController.updateMasjid
);

module.exports = masjidRoute;
