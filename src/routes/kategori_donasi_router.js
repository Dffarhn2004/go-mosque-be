const express = require("express");
const kategoriDonasiController = require("../controllers/kategori_donasi_controller");

const kategoriDonasiRoute = express.Router();

// Routes
kategoriDonasiRoute.get("/", kategoriDonasiController.getKategoriDonasi);
kategoriDonasiRoute.post("/", kategoriDonasiController.createKategoriDonasi);

module.exports = kategoriDonasiRoute;
