const express = require("express");
const kategoriPengeluaranDonasiController = require("../controllers/kategori_pengeluaran_donasi_controller");

const kategoriDonasiRoute = express.Router();

// Routes
kategoriDonasiRoute.get(
  "/",
  kategoriPengeluaranDonasiController.getKategoriPengeluaranDonasi
);
kategoriDonasiRoute.post(
  "/",
  kategoriPengeluaranDonasiController.createKategoriPengeluaranDonasi
);

module.exports = kategoriDonasiRoute;
