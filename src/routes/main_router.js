const express = require("express");
const authRouter = require("./auth_router");
// const merchantRouter = require('./routers/merchants_router');
// const productRouter = require('./routers/product_router');
const roleRouter = require("./role_router"); // Import router role
const masjidRoute = require("./masjid_router");
const donasiRouter = require("./donasi_route"); // Import router donasi
const kategoriPengeluaranDonasiRouter = require("./kategori_pengeluaran_donasi_route"); // Import router kategori pengeluaran donasi
const pengeluaranDonasiRouter = require("./pengeluaran_donasi_router"); // Import controller pengeluaran donasi
const donasiMasjidRouter = require("./donasi_masjid_router"); // Import router donasi masjid
const kategoriDonasiRouter = require("./kategori_donasi_router"); // Import router kategori donasi
const laporanKeuanganRouter = require("./laporan_keuangan_router")
const statistikRouter = require("./statistik_route")
const accountRouter = require("./account_router")
const jurnalRouter = require("./jurnal_router")
const systemAdminRouter = require("./system_admin_router")

const router = express.Router(); // Buat instance router Express

// Definisikan route utama di sini
router.use("/role", roleRouter);

router.use("/auth", authRouter);
router.use("/masjid", masjidRoute);
router.use("/kategori-donasi", kategoriDonasiRouter); // Gunakan router kategori donasi
router.use('/kategori-pengeluaran-donasi', kategoriPengeluaranDonasiRouter); // Uncomment if you have a kategori pengeluaran donasi router
router.use("/donasi-masjid", donasiMasjidRouter);
router.use("/pengeluaran-donasi", pengeluaranDonasiRouter); // Gunakan router pengeluaran donasi
router.use('/donasi', donasiRouter); // Uncomment if you have a donasi router
router.use("/laporan-keuangan",laporanKeuanganRouter)
router.use('/statistik', statistikRouter)
router.use("/coa", accountRouter) // Chart of Accounts routes
router.use("/jurnal", jurnalRouter) // Jurnal routes
router.use("/system-admin", systemAdminRouter)
// router.use('/product',productRouter)

// Export router untuk digunakan di main.js
module.exports = router;
