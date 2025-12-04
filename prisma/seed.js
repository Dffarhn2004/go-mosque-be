require("dotenv").config();

const prisma = require("../src/utils/prisma_client");
const accountService = require("../src/services/account_service");

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

async function main() {
  await seedRoles();
  await seedDefaultCOA();
}

async function seedDefaultCOA() {
  try {
    const result = await accountService.seedDefaultCOA(null);
    console.log(`Default COA seeded. ${result.count} accounts created.`);
  } catch (error) {
    if (error.message?.includes("already exists")) {
      console.log("Default COA already seeded. Skipping.");
      return;
    }
    throw error;
  }
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

