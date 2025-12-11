const prisma = require("../utils/prisma_client");
const { FBuploadFiles } = require("../utils/upload_service");
const jurnalService = require("./jurnal_service");
const {
  getAllAccounts,
} = require("./account_service");
// jurnal_utils no longer needed - using jurnalService instead

async function uploadLaporanKeuanganMasjid({ idMasjid, type, file }) {
  if (!file) throw new Error("No file uploaded");

  // Upload to Firebase Storage
  const [uploadedFile] = await FBuploadFiles(
    [file],
    `masjid/${idMasjid}/laporan-keuangan/${type}`
  );

  // Save metadata to database
  const created = await prisma.laporanKeuanganMasjid.create({
    data: {
      masjid: {
        connect: { id: idMasjid },
      },
      jenis: type,
      fileUrl: uploadedFile.url,
      fileSizeKB: Math.ceil(file.size / 1024),
    },
  });

  return created;
}

async function getLaporanKeuanganForDownload(id) {
  return await prisma.laporanKeuanganMasjid.findUnique({
    where: { id },
  });
}

/**
 * Generate Laporan Posisi Keuangan (Neraca) dari jurnal
 * @param {string} masjidId - Masjid ID
 * @param {Date} tanggal - Tanggal laporan
 * @returns {Promise<Object>} Neraca data
 */
async function generateNeracaFromJurnal(masjidId, tanggal) {
  try {
    if (!masjidId || !tanggal) {
      throw new Error("masjidId and tanggal are required");
    }

    // Get all accounts (default + custom untuk masjid) - include groups for kategori lookup
    const allAccounts = await prisma.account.findMany({
      where: {
        OR: [
          { masjidId: null }, // Default accounts
          { masjidId }, // Custom accounts for masjid
        ],
        isActive: true,
      },
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        normalBalance: true,
        restriction: true,
        report: true,
        category: true,
        pathCode: true,
        parentId: true,
        isGroup: true,
      },
    });

    // Filter only detail accounts for balance calculation
    const accounts = allAccounts.filter((acc) => !acc.isGroup);

    // Calculate balances separated by restriction
    const tanggalDate = new Date(tanggal);
    // Set ke akhir hari untuk memastikan semua transaksi pada tanggal tersebut terhitung
    tanggalDate.setUTCHours(23, 59, 59, 999);
    
    const balances = await jurnalService.calculateAccountBalancesByRestriction(
      masjidId,
      tanggalDate
    );
    
    // Debug: log untuk melihat total DEBIT dan KREDIT
    console.log('DEBUG - Neraca Calculation:');
    console.log('  - Tanggal laporan:', tanggal);
    console.log('  - Tanggal dengan timezone:', tanggalDate.toISOString());
    console.log('  - Jumlah akun dengan saldo:', Object.keys(balances).filter(key => balances[key].saldo !== 0).length);

    // Group by type and kategori, separated by restriction
    const aset = {};
    const kewajiban = {};
    const ekuitas = {};

    // Track subtotal per kategori
    const subtotalAset = {};
    const subtotalKewajiban = {};
    const subtotalEkuitas = {};

    let totalAsetTanpa = 0;
    let totalAsetDengan = 0;
    let totalKewajibanTanpa = 0;
    let totalKewajibanDengan = 0;
    let totalEkuitasTanpa = 0;
    let totalEkuitasDengan = 0;

    Object.values(balances).forEach(({ account, tanpaPembatasan, denganPembatasan, saldo }) => {
      if (saldo === 0) return; // Skip zero balance

      // Filter hanya akun dengan report = NERACA
      if (account.report !== "NERACA") return;

      const accountData = {
        id: account.id,
        kodeAkun: account.code,
        namaAkun: account.name,
        tanpaPembatasan: Number(tanpaPembatasan),
        denganPembatasan: Number(denganPembatasan),
        saldo: Number(saldo),
      };

      // Get kategori dari field category di Account, fallback ke parent name
      let kategoriName = account.category 
        ? getCategoryDisplayName(account.category)
        : getKategoriName(account, allAccounts);

      if (account.type === "ASSET") {
        if (!aset[kategoriName]) {
          aset[kategoriName] = [];
          subtotalAset[kategoriName] = {
            tanpaPembatasan: 0,
            denganPembatasan: 0,
            saldo: 0,
          };
        }
        aset[kategoriName].push(accountData);
        subtotalAset[kategoriName].tanpaPembatasan += Number(tanpaPembatasan);
        subtotalAset[kategoriName].denganPembatasan += Number(denganPembatasan);
        subtotalAset[kategoriName].saldo += Number(saldo);
        totalAsetTanpa += Number(tanpaPembatasan);
        totalAsetDengan += Number(denganPembatasan);
      } else if (account.type === "LIABILITY") {
        if (!kewajiban[kategoriName]) {
          kewajiban[kategoriName] = [];
          subtotalKewajiban[kategoriName] = {
            tanpaPembatasan: 0,
            denganPembatasan: 0,
            saldo: 0,
          };
        }
        kewajiban[kategoriName].push(accountData);
        subtotalKewajiban[kategoriName].tanpaPembatasan += Number(tanpaPembatasan);
        subtotalKewajiban[kategoriName].denganPembatasan += Number(denganPembatasan);
        subtotalKewajiban[kategoriName].saldo += Number(saldo);
        totalKewajibanTanpa += Number(tanpaPembatasan);
        totalKewajibanDengan += Number(denganPembatasan);
      } else if (account.type === "EQUITY") {
        // Untuk ekuitas, mapping berdasarkan hasRestriction flag (bukan parent name)
        // Akun ekuitas langsung di bawah parent 3, routing berdasarkan hasRestriction
        // Entry dengan hasRestriction = false → "Tanpa Pembatasan"
        // Entry dengan hasRestriction = true → "Dengan Pembatasan"
        // Karena balance sudah terpisah berdasarkan hasRestriction, kita perlu split ke 2 kategori
        
        // Kategori "Tanpa Pembatasan" - hanya ambil tanpaPembatasan
        const kategoriTanpa = "Tanpa Pembatasan dari Pemberi Sumber Daya";
        if (!ekuitas[kategoriTanpa]) {
          ekuitas[kategoriTanpa] = [];
          subtotalEkuitas[kategoriTanpa] = {
            tanpaPembatasan: 0,
            denganPembatasan: 0,
            saldo: 0,
          };
        }
        if (Number(tanpaPembatasan) !== 0) {
          ekuitas[kategoriTanpa].push({
            ...accountData,
            tanpaPembatasan: Number(tanpaPembatasan),
            denganPembatasan: 0,
            saldo: Number(tanpaPembatasan),
          });
          subtotalEkuitas[kategoriTanpa].tanpaPembatasan += Number(tanpaPembatasan);
          subtotalEkuitas[kategoriTanpa].saldo += Number(tanpaPembatasan);
        }
        
        // Kategori "Dengan Pembatasan" - hanya ambil denganPembatasan
        const kategoriDengan = "Dengan Pembatasan dari Pemberi Sumber Daya";
        if (!ekuitas[kategoriDengan]) {
          ekuitas[kategoriDengan] = [];
          subtotalEkuitas[kategoriDengan] = {
            tanpaPembatasan: 0,
            denganPembatasan: 0,
            saldo: 0,
          };
        }
        if (Number(denganPembatasan) !== 0) {
          ekuitas[kategoriDengan].push({
            ...accountData,
            tanpaPembatasan: 0,
            denganPembatasan: Number(denganPembatasan),
            saldo: Number(denganPembatasan),
          });
          subtotalEkuitas[kategoriDengan].denganPembatasan += Number(denganPembatasan);
          subtotalEkuitas[kategoriDengan].saldo += Number(denganPembatasan);
        }
        
        totalEkuitasTanpa += Number(tanpaPembatasan);
        totalEkuitasDengan += Number(denganPembatasan);
      }
    });

    const totalAset = totalAsetTanpa + totalAsetDengan;
    const totalKewajiban = totalKewajibanTanpa + totalKewajibanDengan;
    const totalEkuitas = totalEkuitasTanpa + totalEkuitasDengan;
    const totalKewajibanDanEkuitas = totalKewajiban + totalEkuitas;
    
    // Validasi: Aset harus sama dengan Kewajiban + Ekuitas
    const selisih = totalAset - totalKewajibanDanEkuitas;
    const isBalance = Math.abs(selisih) < 0.01; // Toleransi 0.01 untuk floating point
    
    if (!isBalance) {
      console.warn('⚠️ WARNING: Neraca tidak balance!');
      console.warn(`  - Total Aset: ${totalAset}`);
      console.warn(`  - Total Kewajiban: ${totalKewajiban}`);
      console.warn(`  - Total Ekuitas: ${totalEkuitas}`);
      console.warn(`  - Total Kewajiban + Ekuitas: ${totalKewajibanDanEkuitas}`);
      console.warn(`  - Selisih: ${selisih}`);
      console.warn('  - Kemungkinan: Ada transaksi jurnal yang tidak balance (Total DEBIT ≠ Total KREDIT)');
    }

    return {
      aset,
      kewajiban,
      ekuitas,
      subtotalAset,
      subtotalKewajiban,
      subtotalEkuitas,
      totalAsetTanpa: totalAsetTanpa,
      totalAsetDengan: totalAsetDengan,
      totalAset: totalAset,
      totalKewajibanTanpa: totalKewajibanTanpa,
      totalKewajibanDengan: totalKewajibanDengan,
      totalKewajiban: totalKewajiban,
      totalEkuitasTanpa: totalEkuitasTanpa,
      totalEkuitasDengan: totalEkuitasDengan,
      totalEkuitas: totalEkuitas,
      // Tambahkan field untuk validasi
      totalKewajibanDanEkuitas: totalKewajibanDanEkuitas,
      selisih: selisih,
      isBalance: isBalance,
    };
  } catch (error) {
    console.error("Error generating neraca:", error);
    throw new Error("Failed to generate neraca");
  }
}

/**
 * Generate Laporan Penghasilan Komprehensif (Laba Rugi) dari jurnal
 * @param {string} masjidId - Masjid ID
 * @param {Date} tanggalAwal - Start date
 * @param {Date} tanggalAkhir - End date
 * @returns {Promise<Object>} Laba Rugi data
 */
async function generateLabaRugiFromJurnal(masjidId, tanggalAwal, tanggalAkhir) {
  try {
    if (!masjidId || !tanggalAwal || !tanggalAkhir) {
      throw new Error("masjidId, tanggalAwal, and tanggalAkhir are required");
    }

    // Get all accounts (include groups for kategori lookup)
    const allAccounts = await prisma.account.findMany({
      where: {
        OR: [
          { masjidId: null },
          { masjidId },
        ],
        isActive: true,
      },
    });

    // Filter only detail accounts for balance calculation
    const accounts = allAccounts.filter(
      (acc) => !acc.isGroup && (acc.type === "REVENUE" || acc.type === "EXPENSE")
    );

    // Calculate balances for date range using jurnal service
    const balancesAwal = await jurnalService.calculateAccountBalances(
      masjidId,
      new Date(tanggalAwal)
    );
    const balancesAkhir = await jurnalService.calculateAccountBalances(
      masjidId,
      new Date(tanggalAkhir)
    );

    // Calculate period balances (akhir - awal) separated by restriction
    const balancesAwalByRestriction = await jurnalService.calculateAccountBalancesByRestriction(
      masjidId,
      new Date(tanggalAwal)
    );
    const balancesAkhirByRestriction = await jurnalService.calculateAccountBalancesByRestriction(
      masjidId,
      new Date(tanggalAkhir)
    );

    const balances = {};
    Object.keys(balancesAkhirByRestriction).forEach((accountId) => {
      const awalTanpa = balancesAwalByRestriction[accountId]?.tanpaPembatasan || 0;
      const awalDengan = balancesAwalByRestriction[accountId]?.denganPembatasan || 0;
      const akhirTanpa = balancesAkhirByRestriction[accountId]?.tanpaPembatasan || 0;
      const akhirDengan = balancesAkhirByRestriction[accountId]?.denganPembatasan || 0;
      
      balances[accountId] = {
        account: balancesAkhirByRestriction[accountId].account,
        tanpaPembatasan: akhirTanpa - awalTanpa,
        denganPembatasan: akhirDengan - awalDengan,
        saldo: (akhirTanpa - awalTanpa) + (akhirDengan - awalDengan),
      };
    });

    // Group by type and kategori, separated by restriction
    const pendapatan = {};
    const beban = {};

    // Track subtotal per kategori
    const subtotalPendapatan = {};
    const subtotalBeban = {};

    let totalPendapatanTanpa = 0;
    let totalPendapatanDengan = 0;
    let totalBebanTanpa = 0;
    let totalBebanDengan = 0;

    Object.values(balances).forEach(({ account, tanpaPembatasan, denganPembatasan, saldo }) => {
      // Filter hanya akun dengan report = LAPORAN_PENGHASILAN_KOMPREHENSIF
      if (account.report !== "LAPORAN_PENGHASILAN_KOMPREHENSIF") return;

      const accountData = {
        id: account.id,
        kodeAkun: account.code,
        namaAkun: account.name,
        tanpaPembatasan: Number(tanpaPembatasan),
        denganPembatasan: Number(denganPembatasan),
        saldo: Number(saldo),
      };

      // Get kategori dari field category di Account, fallback ke parent name
      const kategoriName = account.category 
        ? getCategoryDisplayName(account.category)
        : getKategoriName(account, allAccounts);

      if (account.type === "REVENUE") {
        if (!pendapatan[kategoriName]) {
          pendapatan[kategoriName] = [];
          subtotalPendapatan[kategoriName] = {
            tanpaPembatasan: 0,
            denganPembatasan: 0,
            saldo: 0,
          };
        }
        pendapatan[kategoriName].push(accountData);
        subtotalPendapatan[kategoriName].tanpaPembatasan += Number(tanpaPembatasan);
        subtotalPendapatan[kategoriName].denganPembatasan += Number(denganPembatasan);
        subtotalPendapatan[kategoriName].saldo += Number(saldo);
        totalPendapatanTanpa += Number(tanpaPembatasan);
        totalPendapatanDengan += Number(denganPembatasan);
      } else if (account.type === "EXPENSE") {
        if (!beban[kategoriName]) {
          beban[kategoriName] = [];
          subtotalBeban[kategoriName] = {
            tanpaPembatasan: 0,
            denganPembatasan: 0,
            saldo: 0,
          };
        }
        beban[kategoriName].push(accountData);
        subtotalBeban[kategoriName].tanpaPembatasan += Number(tanpaPembatasan);
        subtotalBeban[kategoriName].denganPembatasan += Number(denganPembatasan);
        subtotalBeban[kategoriName].saldo += Number(saldo);
        totalBebanTanpa += Number(tanpaPembatasan);
        totalBebanDengan += Number(denganPembatasan);
      }
    });

    const labaRugiTanpa = totalPendapatanTanpa - totalBebanTanpa;
    const labaRugiDengan = totalPendapatanDengan - totalBebanDengan;
    const labaRugi = labaRugiTanpa + labaRugiDengan;

    return {
      pendapatan,
      beban,
      subtotalPendapatan,
      subtotalBeban,
      totalPendapatanTanpa,
      totalPendapatanDengan,
      totalPendapatan: totalPendapatanTanpa + totalPendapatanDengan,
      totalBebanTanpa,
      totalBebanDengan,
      totalBeban: totalBebanTanpa + totalBebanDengan,
      labaRugiTanpa,
      labaRugiDengan,
      labaRugi,
    };
  } catch (error) {
    console.error("Error generating laba rugi:", error);
    throw new Error("Failed to generate laba rugi");
  }
}

/**
 * Generate Laporan Perubahan Aset Neto (Perubahan Ekuitas) dari jurnal
 * @param {string} masjidId - Masjid ID
 * @param {Date} tanggalAwal - Start date
 * @param {Date} tanggalAkhir - End date
 * @returns {Promise<Object>} Perubahan Ekuitas data
 */
async function generatePerubahanEkuitasFromJurnal(
  masjidId,
  tanggalAwal,
  tanggalAkhir
) {
  try {
    if (!masjidId || !tanggalAwal || !tanggalAkhir) {
      throw new Error("masjidId, tanggalAwal, and tanggalAkhir are required");
    }

    // Get all accounts untuk lookup parent
    const allAccounts = await prisma.account.findMany({
      where: {
        OR: [{ masjidId: null }, { masjidId }],
        isActive: true,
      },
    });

    // Get ekuitas accounts
    const ekuitasAccounts = await prisma.account.findMany({
      where: {
        OR: [{ masjidId: null }, { masjidId }],
        isActive: true,
        isGroup: false,
        type: "EQUITY",
      },
    });

    // Calculate saldo awal ekuitas (sampai sebelum tanggalAwal) separated by restriction
    // Saldo awal = saldo sampai sebelum tanggalAwal (tidak termasuk transaksi pada tanggalAwal)
    const tanggalAwalDate = new Date(tanggalAwal);
    // Set ke akhir hari sebelumnya (bukan awal hari tanggalAwal)
    // Gunakan UTC untuk menghindari masalah timezone
    tanggalAwalDate.setUTCDate(tanggalAwalDate.getUTCDate() - 1);
    tanggalAwalDate.setUTCHours(23, 59, 59, 999); // Set ke akhir hari sebelumnya dalam UTC
    
    const balancesAwal = await jurnalService.calculateAccountBalancesByRestriction(
      masjidId,
      tanggalAwalDate
    );
    // Tambahkan laba rugi kumulatif (OCI) sampai sebelum periode berjalan
    const labaRugiKumulatif = await generateLabaRugiFromJurnal(
      masjidId,
      new Date("1900-01-01"),
      tanggalAwalDate
    );
    
    // Debug: log untuk memastikan perhitungan saldo awal
    console.log('DEBUG - Perhitungan Saldo Awal Ekuitas:');
    console.log('  - tanggalAwal (input):', tanggalAwal);
    console.log('  - tanggalAwalDate (endDate untuk saldo awal):', tanggalAwalDate.toISOString());
    console.log('  - Jumlah akun ekuitas:', ekuitasAccounts.length);
    console.log('  - balancesAwal keys:', Object.keys(balancesAwal));
    
    // Tambahkan log untuk setiap akun ekuitas
    ekuitasAccounts.forEach((acc) => {
      const balance = balancesAwal[acc.id];
      console.log(`  - Akun ${acc.code} (${acc.name}):`, {
        tanpaPembatasan: balance?.tanpaPembatasan || 0,
        denganPembatasan: balance?.denganPembatasan || 0,
        saldo: balance?.saldo || 0,
      });
    });
    
    const saldoAwalEkuitasTanpa =
      ekuitasAccounts.reduce((total, acc) => {
        const balance = balancesAwal[acc.id];
        const value = Number(balance?.tanpaPembatasan) || 0;
        return total + value;
      }, 0) + (labaRugiKumulatif.labaRugiTanpa || 0);

    const saldoAwalEkuitasDengan =
      ekuitasAccounts.reduce((total, acc) => {
        const balance = balancesAwal[acc.id];
        const value = Number(balance?.denganPembatasan) || 0;
        return total + value;
      }, 0) + (labaRugiKumulatif.labaRugiDengan || 0);

    const saldoAwalEkuitas = saldoAwalEkuitasTanpa + saldoAwalEkuitasDengan;
    
    console.log('  - saldoAwalEkuitasTanpa:', saldoAwalEkuitasTanpa);
    console.log('  - saldoAwalEkuitasDengan:', saldoAwalEkuitasDengan);
    console.log('  - saldoAwalEkuitas:', saldoAwalEkuitas);

    // Calculate laba rugi dalam periode
    const labaRugiData = await generateLabaRugiFromJurnal(
      masjidId,
      tanggalAwal,
      tanggalAkhir
    );
    const labaRugiTanpa = labaRugiData.labaRugiTanpa || 0;
    const labaRugiDengan = labaRugiData.labaRugiDengan || 0;
    const labaRugi = labaRugiData.labaRugi || 0;

    // Calculate saldo akhir ekuitas (sampai tanggalAkhir) separated by restriction
    const tanggalAkhirDate = new Date(tanggalAkhir);
    // Gunakan UTC untuk menghindari masalah timezone
    tanggalAkhirDate.setUTCHours(23, 59, 59, 999); // Set ke akhir hari tanggalAkhir dalam UTC untuk memastikan semua transaksi pada tanggalAkhir terhitung
    
    const balancesAkhir = await jurnalService.calculateAccountBalancesByRestriction(
      masjidId,
      tanggalAkhirDate
    );
    // Opsi 2: auto-roll laba/OCI ke saldo akhir tanpa perlu jurnal penutup
    const saldoAkhirEkuitasTanpa = saldoAwalEkuitasTanpa + labaRugiTanpa;
    const saldoAkhirEkuitasDengan = saldoAwalEkuitasDengan + labaRugiDengan;
    const saldoAkhirEkuitas = saldoAkhirEkuitasTanpa + saldoAkhirEkuitasDengan;
    
    // Tidak ada perubahan modal eksplisit; nilai di-roll dari laba rugi
    const perubahanModalTanpa = 0;
    const perubahanModalDengan = 0;
    const perubahanModal = 0;

    return {
      saldoAwalEkuitasTanpa,
      saldoAwalEkuitasDengan,
      saldoAwalEkuitas,
      labaRugiTanpa,
      labaRugiDengan,
      labaRugi,
      perubahanModalTanpa,
      perubahanModalDengan,
      perubahanModal,
      saldoAkhirEkuitasTanpa,
      saldoAkhirEkuitasDengan,
      saldoAkhirEkuitas,
    };
  } catch (error) {
    console.error("Error generating perubahan ekuitas:", error);
    throw new Error("Failed to generate perubahan ekuitas");
  }
}

/**
 * Generate Laporan Arus Kas dari jurnal
 * @param {string} masjidId - Masjid ID
 * @param {Date} tanggalAwal - Start date
 * @param {Date} tanggalAkhir - End date
 * @returns {Promise<Object>} Arus Kas data
 */
async function generateArusKasFromJurnal(masjidId, tanggalAwal, tanggalAkhir) {
  try {
    if (!masjidId || !tanggalAwal || !tanggalAkhir) {
      throw new Error("masjidId, tanggalAwal, and tanggalAkhir are required");
    }

    // Get kas dan bank accounts
    const kasBankAccounts = await prisma.account.findMany({
      where: {
        AND: [
          {
            OR: [{ masjidId: null }, { masjidId }],
          },
          {
            isActive: true,
            isGroup: false,
            type: "ASSET",
          },
          {
            OR: [
              { code: { contains: "1.1.1" } }, // Kas
              { code: { contains: "1.1.2" } }, // Bank
            ],
          },
        ],
      },
    });

    // Get transactions in date range
    const transactions = await jurnalService.getAllJurnalTransactions({
      masjidId,
      tanggalAwal: new Date(tanggalAwal),
      tanggalAkhir: new Date(tanggalAkhir),
    });

    // Calculate saldo awal
    const balancesAwal = await jurnalService.calculateAccountBalances(
      masjidId,
      new Date(tanggalAwal)
    );
    const saldoAwal = kasBankAccounts.reduce(
      (total, acc) => total + (Number(balancesAwal[acc.id]?.saldo) || 0),
      0
    );

    // Categorize cash flows from entries
    let operasionalMasuk = 0;
    let operasionalKeluar = 0;
    let investasiMasuk = 0;
    let investasiKeluar = 0;
    let pendanaanMasuk = 0;
    let pendanaanKeluar = 0;

    transactions.forEach((transaction) => {
      transaction.entries.forEach((entry) => {
        // Only process entries for kas/bank accounts
        if (!kasBankAccounts.some((acc) => acc.id === entry.akunId)) return;

        const amount = Number(entry.jumlah);
        const isDebit = entry.tipe === "DEBIT";

        // Simple categorization based on transaction description
        // This is a simplified version - can be enhanced with more sophisticated logic
        const keterangan = (transaction.keterangan || "").toLowerCase();
        if (
          keterangan.includes("donasi") ||
          keterangan.includes("pendapatan")
        ) {
          // Operasional
          if (isDebit) operasionalMasuk += amount;
          else operasionalKeluar += amount;
        } else if (
          keterangan.includes("aset") ||
          keterangan.includes("investasi")
        ) {
          // Investasi
          if (isDebit) investasiMasuk += amount;
          else investasiKeluar += amount;
        } else if (
          keterangan.includes("modal") ||
          keterangan.includes("ekuitas")
        ) {
          // Pendanaan
          if (isDebit) pendanaanMasuk += amount;
          else pendanaanKeluar += amount;
        } else {
          // Default to operasional
          if (isDebit) operasionalMasuk += amount;
          else operasionalKeluar += amount;
        }
      });
    });

    const operasional = {
      masuk: operasionalMasuk,
      keluar: operasionalKeluar,
      netto: operasionalMasuk - operasionalKeluar,
    };

    const investasi = {
      masuk: investasiMasuk,
      keluar: investasiKeluar,
      netto: investasiMasuk - investasiKeluar,
    };

    const pendanaan = {
      masuk: pendanaanMasuk,
      keluar: pendanaanKeluar,
      netto: pendanaanMasuk - pendanaanKeluar,
    };

    const saldoAkhir =
      saldoAwal + operasional.netto + investasi.netto + pendanaan.netto;

    return {
      operasional,
      investasi,
      pendanaan,
      saldoAwal,
      saldoAkhir,
    };
  } catch (error) {
    console.error("Error generating arus kas:", error);
    throw new Error("Failed to generate arus kas");
  }
}

/**
 * Helper function to get kategori display name from category enum
 */
function getCategoryDisplayName(category) {
  const categoryMap = {
    ASET_LANCAR: "Aset Lancar",
    ASET_TIDAK_LANCAR: "Aset Tidak Lancar",
    HUTANG_JANGKA_PENDEK: "Hutang Jangka Pendek",
    HUTANG_JANGKA_PANJANG: "Hutang Jangka Panjang",
    ASET_NETO: "Aset Neto",
    PENDAPATAN: "Pendapatan",
    BEBAN: "Beban",
    PENGHASILAN_KOMPREHENSIF_LAIN: "Penghasilan Komprehensif Lain",
  };
  return categoryMap[category] || category;
}

/**
 * Helper function to get kategori name from account (fallback)
 */
function getKategoriName(account, allAccounts) {
  // Jika account punya category field, gunakan itu
  if (account.category) {
    return getCategoryDisplayName(account.category);
  }

  // Try to find parent group account
  if (account.parentId) {
    const parent = allAccounts.find((a) => a.id === account.parentId);
    if (parent) {
      return parent.name;
    }
  }

  // Fallback to pathCode based kategori
  const pathParts = account.pathCode.split(".");
  if (pathParts.length >= 2) {
    const parentCode = pathParts.slice(0, -1).join(".");
    const parent = allAccounts.find((a) => a.code === parentCode);
    if (parent) {
      return parent.name;
    }
  }

  return "Lainnya";
}

module.exports = {
  uploadLaporanKeuanganMasjid,
  getLaporanKeuanganForDownload,
  generateNeracaFromJurnal,
  generateLabaRugiFromJurnal,
  generatePerubahanEkuitasFromJurnal,
  generateArusKasFromJurnal,
};
