require("dotenv").config();

const prisma = require("../src/utils/prisma_client");
const accountService = require("../src/services/account_service");
const systemAdminService = require("../src/services/system_admin_service");

const DEFAULT_ROLES = [
  {
    id: "cmb6vlo570001vgzgsq1p0c40",
    Nama: "Takmir",
  },
  {
    id: "cmb6vlo570001vgzgsq1p0c41",
    Nama: "Admin",
  },
  {
    id: "cmb6vlo570001vgzgsq1p0c42",
    Nama: "Donatur",
  },
];

const DEFAULT_KATEGORI_DONASI = [
  "Pembangunan",
  "Renovasi",
  "Operasional",
  "Pendidikan",
  "Sosial",
  "Kegiatan Ibadah",
];

const DEFAULT_KATEGORI_PENGELUARAN = [
  "Material Bangunan",
  "Peralatan",
  "Pemeliharaan",
  "Operasional Harian",
  "Konsumsi",
  "Dokumentasi",
];

const INITIAL_ADMIN = {
  username: "Daffa Raihan",
  email: "daffaraihan2004.work@gmail.com",
  password: "daffa123",
};

async function seedRoles() {
  for (const role of DEFAULT_ROLES) {
    await prisma.role.upsert({
      where: { id: role.id },
      update: { Nama: role.Nama },
      create: role,
    });
  }
  console.log("Roles seeded/updated:", DEFAULT_ROLES.map((r) => r.Nama).join(", "));
}

async function seedKategoriDonasi() {
  for (const nama of DEFAULT_KATEGORI_DONASI) {
    const existing = await prisma.kategori_Donasi.findFirst({
      where: { Nama: nama },
    });

    if (!existing) {
      await prisma.kategori_Donasi.create({
        data: { Nama: nama },
      });
    }
  }

  console.log(
    "Kategori donasi seeded/verified:",
    DEFAULT_KATEGORI_DONASI.join(", ")
  );
}

async function seedKategoriPengeluaran() {
  for (const nama of DEFAULT_KATEGORI_PENGELUARAN) {
    const existing = await prisma.kategori_Pengeluaran.findFirst({
      where: { Nama: nama },
    });

    if (!existing) {
      await prisma.kategori_Pengeluaran.create({
        data: { Nama: nama },
      });
    }
  }

  console.log(
    "Kategori pengeluaran seeded/verified:",
    DEFAULT_KATEGORI_PENGELUARAN.join(", ")
  );
}

async function main() {
  await seedRoles();
  await seedInitialAdmin();
  await seedKategoriDonasi();
  await seedKategoriPengeluaran();
  await seedDefaultCOA();
  await systemAdminService.seedDefaultSystemConfigs();
}

async function seedInitialAdmin() {
  const result = await systemAdminService.seedInitialAdmin(INITIAL_ADMIN);
  console.log(
    result.created
      ? `Initial admin seeded: ${result.user.Email}`
      : `Initial admin already exists: ${result.user.Email}`
  );
}

async function seedDefaultCOA() {
  const existingCount = await prisma.account.count({
    where: { masjidId: null },
  });

  if (existingCount > 0) {
    console.log("Default COA already seeded. Skipping.");
    return;
  }

  const result = await accountService.seedDefaultCOA(null);
  console.log(`Default COA seeded. ${result.count} accounts created.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("Seeding failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });

