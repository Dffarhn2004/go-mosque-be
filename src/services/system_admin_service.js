const bcrypt = require("bcrypt");
const prisma = require("../utils/prisma_client");
const CustomError = require("../utils/custom_error");
const accountService = require("./account_service");
const { createAuditLog } = require("./audit_log_service");

const TAKMIR_ROLE_NAME = "Takmir";
const ADMIN_ROLE_NAME = "Admin";

async function getRoleByName(roleName) {
  const role = await prisma.role.findFirst({
    where: { Nama: roleName },
  });

  if (!role) {
    throw new CustomError(`${roleName} role not found`, 500);
  }

  return role;
}

async function listUsers({ search, roleId, isActive }) {
  const where = {};

  if (search) {
    where.OR = [
      { NamaLengkap: { contains: search, mode: "insensitive" } },
      { Email: { contains: search, mode: "insensitive" } },
    ];
  }

  if (roleId) {
    where.roleId = roleId;
  }

  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  return prisma.user.findMany({
    where,
    include: {
      role: true,
      masjid: true,
    },
    orderBy: { CreatedAt: "desc" },
  });
}

async function getUserById(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: true,
      masjid: true,
    },
  });

  if (!user) {
    throw new CustomError("User not found", 404);
  }

  return user;
}

async function updateUserRole({ actorId, userId, roleId }) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user) throw new CustomError("User not found", 404);

  const role = await prisma.role.findUnique({
    where: { id: roleId },
  });
  if (!role) throw new CustomError("Role not found", 404);

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { roleId },
    include: {
      role: true,
      masjid: true,
    },
  });

  await createAuditLog({
    userId: actorId,
    action: "USER_ROLE_UPDATED",
    entityType: "User",
    entityId: updated.id,
    entityName: updated.Email,
    metadata: {
      roleId,
      roleName: role.Nama,
    },
  });

  return updated;
}

async function updateUserStatus({ actorId, userId, isActive }) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!user) throw new CustomError("User not found", 404);

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { isActive },
    include: {
      role: true,
      masjid: true,
    },
  });

  await createAuditLog({
    userId: actorId,
    action: isActive ? "USER_ACTIVATED" : "USER_DEACTIVATED",
    entityType: "User",
    entityId: updated.id,
    entityName: updated.Email,
    metadata: { isActive },
  });

  return updated;
}

async function createTakmirUser({
  actorId,
  username,
  email,
  password,
  nama_masjid,
  alamat,
  nomor_telfon,
}) {
  const existingUser = await prisma.user.findUnique({
    where: { Email: email },
  });
  if (existingUser) {
    throw new CustomError("Email is already in use", 400);
  }

  const takmirRole = await getRoleByName(TAKMIR_ROLE_NAME);

  const hashedPassword = await bcrypt.hash(password, 10);

  const result = await prisma.$transaction(async (tx) => {
    const masjid = await tx.masjid.create({
      data: {
        Nama: nama_masjid || "Masjid Baru",
        Alamat: alamat || "-",
        NomorTelepon: nomor_telfon || "-",
      },
    });

    const user = await tx.user.create({
      data: {
        NamaLengkap: username,
        Email: email,
        Password: hashedPassword,
        roleId: takmirRole.id,
        masjidId: masjid.id,
      },
      include: {
        role: true,
        masjid: true,
      },
    });

    return { user, masjid };
  });

  await createAuditLog({
    userId: actorId,
    action: "TAKMIR_CREATED",
    entityType: "User",
    entityId: result.user.id,
    entityName: result.user.Email,
    metadata: {
      masjidId: result.masjid.id,
      masjidNama: result.masjid.Nama,
    },
  });

  return result;
}

async function createAdminUser({ actorId, username, email, password }) {
  const existingUser = await prisma.user.findUnique({
    where: { Email: email },
  });
  if (existingUser) {
    throw new CustomError("Email is already in use", 400);
  }

  const adminRole = await getRoleByName(ADMIN_ROLE_NAME);
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      NamaLengkap: username,
      Email: email,
      Password: hashedPassword,
      roleId: adminRole.id,
    },
    include: {
      role: true,
      masjid: true,
    },
  });

  if (actorId) {
    await createAuditLog({
      userId: actorId,
      action: "ADMIN_CREATED",
      entityType: "User",
      entityId: user.id,
      entityName: user.Email,
      metadata: {
        roleId: adminRole.id,
        roleName: adminRole.Nama,
      },
    });
  }

  return user;
}

async function seedInitialAdmin({ username, email, password }) {
  const existingUser = await prisma.user.findUnique({
    where: { Email: email },
    include: {
      role: true,
      masjid: true,
    },
  });

  if (existingUser) {
    return {
      user: existingUser,
      created: false,
    };
  }

  const user = await createAdminUser({
    actorId: null,
    username,
    email,
    password,
  });

  return {
    user,
    created: true,
  };
}

async function listMasjidsAdmin({ search, isActive }) {
  const where = {};

  if (search) {
    where.OR = [
      { Nama: { contains: search, mode: "insensitive" } },
      { Alamat: { contains: search, mode: "insensitive" } },
      { Deskripsi: { contains: search, mode: "insensitive" } },
    ];
  }

  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  return prisma.masjid.findMany({
    where,
    include: {
      users: {
        include: { role: true },
      },
      fasilitasMasjid: true,
      kegiatanMasjid: true,
      laporanMasjid: true,
    },
    orderBy: { Nama: "asc" },
  });
}

async function getMasjidAdminById(id) {
  const masjid = await prisma.masjid.findUnique({
    where: { id },
    include: {
      users: {
        include: { role: true },
      },
      fasilitasMasjid: true,
      kegiatanMasjid: true,
      laporanMasjid: true,
      donasi_masjid: {
        include: { kategori_donasi: true },
      },
    },
  });

  if (!masjid) {
    throw new CustomError("Masjid not found", 404);
  }

  return masjid;
}

async function updateMasjidAdmin({ actorId, masjidId, data }) {
  const masjid = await prisma.masjid.findUnique({ where: { id: masjidId } });
  if (!masjid) throw new CustomError("Masjid not found", 404);

  const updated = await prisma.masjid.update({
    where: { id: masjidId },
    data,
  });

  await createAuditLog({
    userId: actorId,
    action: "MASJID_UPDATED",
    entityType: "Masjid",
    entityId: updated.id,
    entityName: updated.Nama,
    metadata: data,
  });

  return updated;
}

async function updateMasjidStatus({ actorId, masjidId, isActive }) {
  const masjid = await prisma.masjid.findUnique({ where: { id: masjidId } });
  if (!masjid) throw new CustomError("Masjid not found", 404);

  const updated = await prisma.masjid.update({
    where: { id: masjidId },
    data: { isActive },
  });

  await createAuditLog({
    userId: actorId,
    action: isActive ? "MASJID_ACTIVATED" : "MASJID_DEACTIVATED",
    entityType: "Masjid",
    entityId: updated.id,
    entityName: updated.Nama,
    metadata: { isActive },
  });

  return updated;
}

async function listDonationCategories({ includeInactive = true }) {
  return prisma.kategori_Donasi.findMany({
    where: includeInactive ? {} : { isActive: true },
    orderBy: { Nama: "asc" },
  });
}

async function createDonationCategory({ actorId, nama }) {
  const existing = await prisma.kategori_Donasi.findFirst({
    where: { Nama: nama },
  });
  if (existing) throw new CustomError("Donation category already exists", 400);

  const created = await prisma.kategori_Donasi.create({
    data: { Nama: nama },
  });

  await createAuditLog({
    userId: actorId,
    action: "DONATION_CATEGORY_CREATED",
    entityType: "Kategori_Donasi",
    entityId: created.id,
    entityName: created.Nama,
  });

  return created;
}

async function updateDonationCategory({ actorId, id, data }) {
  const existing = await prisma.kategori_Donasi.findUnique({ where: { id } });
  if (!existing) throw new CustomError("Donation category not found", 404);

  const updated = await prisma.kategori_Donasi.update({
    where: { id },
    data,
  });

  await createAuditLog({
    userId: actorId,
    action: "DONATION_CATEGORY_UPDATED",
    entityType: "Kategori_Donasi",
    entityId: updated.id,
    entityName: updated.Nama,
    metadata: data,
  });

  return updated;
}

async function listExpenseCategories({ includeInactive = true }) {
  return prisma.kategori_Pengeluaran.findMany({
    where: includeInactive ? {} : { isActive: true },
    orderBy: { Nama: "asc" },
  });
}

async function createExpenseCategory({ actorId, nama }) {
  const existing = await prisma.kategori_Pengeluaran.findFirst({
    where: { Nama: nama },
  });
  if (existing) throw new CustomError("Expense category already exists", 400);

  const created = await prisma.kategori_Pengeluaran.create({
    data: { Nama: nama },
  });

  await createAuditLog({
    userId: actorId,
    action: "EXPENSE_CATEGORY_CREATED",
    entityType: "Kategori_Pengeluaran",
    entityId: created.id,
    entityName: created.Nama,
  });

  return created;
}

async function updateExpenseCategory({ actorId, id, data }) {
  const existing = await prisma.kategori_Pengeluaran.findUnique({ where: { id } });
  if (!existing) throw new CustomError("Expense category not found", 404);

  const updated = await prisma.kategori_Pengeluaran.update({
    where: { id },
    data,
  });

  await createAuditLog({
    userId: actorId,
    action: "EXPENSE_CATEGORY_UPDATED",
    entityType: "Kategori_Pengeluaran",
    entityId: updated.id,
    entityName: updated.Nama,
    metadata: data,
  });

  return updated;
}

async function listDefaultAccounts({ includeInactive = true }) {
  return accountService.getAllAccounts(null, includeInactive);
}

async function createDefaultAccount({ actorId, data }) {
  const created = await accountService.createAccount({
    ...data,
    masjidId: null,
  });

  await createAuditLog({
    userId: actorId,
    action: "DEFAULT_COA_CREATED",
    entityType: "Account",
    entityId: created.id,
    entityName: created.name,
    metadata: data,
  });

  return created;
}

async function updateDefaultAccount({ actorId, id, data }) {
  const updated = await accountService.updateAccount(id, data);

  await createAuditLog({
    userId: actorId,
    action: "DEFAULT_COA_UPDATED",
    entityType: "Account",
    entityId: updated.id,
    entityName: updated.name,
    metadata: data,
  });

  return updated;
}

async function deactivateDefaultAccount({ actorId, id }) {
  const deleted = await accountService.deleteAccount(id);

  await createAuditLog({
    userId: actorId,
    action: "DEFAULT_COA_DEACTIVATED",
    entityType: "Account",
    entityId: deleted.id,
    entityName: deleted.name,
  });

  return deleted;
}

async function reseedDefaultAccounts({ actorId }) {
  const existingCount = await prisma.account.count({
    where: { masjidId: null },
  });

  if (existingCount > 0) {
    throw new CustomError("Default COA already exists. Reset is not automatic.", 400);
  }

  const result = await accountService.seedDefaultCOA(null);

  await createAuditLog({
    userId: actorId,
    action: "DEFAULT_COA_RESEEDED",
    entityType: "Account",
    entityName: "Default COA",
    metadata: { count: result.count },
  });

  return result;
}

async function listDonationCampaigns({ masjidId, categoryId, search }) {
  const where = {};
  if (masjidId) where.id_masjid = masjidId;
  if (categoryId) where.id_kategori_donasi = categoryId;
  if (search) {
    where.OR = [
      { Nama: { contains: search, mode: "insensitive" } },
      { Deskripsi: { contains: search, mode: "insensitive" } },
    ];
  }

  return prisma.donasi_Masjid.findMany({
    where,
    include: {
      masjid: true,
      kategori_donasi: true,
      donasi: true,
      pengeluaran_donasi_masjid: true,
    },
    orderBy: { CreatedAt: "desc" },
  });
}

async function getDonationCampaignById(id) {
  const donation = await prisma.donasi_Masjid.findUnique({
    where: { id },
    include: {
      masjid: true,
      kategori_donasi: true,
      donasi: {
        include: { user: true },
      },
      pengeluaran_donasi_masjid: {
        include: {
          kategori_pengeluaran: true,
          Masjid: true,
        },
      },
    },
  });

  if (!donation) throw new CustomError("Donation campaign not found", 404);
  return donation;
}

async function listExpenseRecords({ masjidId, categoryId, donationId }) {
  const where = {};
  if (masjidId) where.masjidId = masjidId;
  if (categoryId) where.id_kategori_pengeluaran = categoryId;
  if (donationId) where.id_donasi_masjid = donationId;

  return prisma.pengeluaran_Donasi_Masjid.findMany({
    where,
    include: {
      donasi_masjid: true,
      kategori_pengeluaran: true,
      Masjid: true,
      Kategori_Donasi: true,
    },
    orderBy: { CreatedAt: "desc" },
  });
}

async function getMonitoringSummary() {
  const [campaignCount, donationAggregate, expenseAggregate, activeMasjidCount] =
    await Promise.all([
      prisma.donasi_Masjid.count(),
      prisma.donasi.aggregate({
        _sum: {
          JumlahDonasi: true,
        },
      }),
      prisma.pengeluaran_Donasi_Masjid.aggregate({
        _sum: {
          UangPengeluaran: true,
        },
      }),
      prisma.masjid.count({
        where: { isActive: true },
      }),
    ]);

  return {
    campaignCount,
    activeMasjidCount,
    totalDonations: Number(donationAggregate._sum.JumlahDonasi || 0),
    totalExpenses: Number(expenseAggregate._sum.UangPengeluaran || 0),
  };
}

async function listAuditLogs({ userId, entityType, action, limit = 100 }) {
  const where = {};
  if (userId) where.userId = userId;
  if (entityType) where.entityType = entityType;
  if (action) where.action = action;

  return prisma.auditLog.findMany({
    where,
    include: {
      user: {
        include: { role: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: Number(limit),
  });
}

async function listSystemConfigs() {
  return prisma.systemConfig.findMany({
    include: {
      updatedByUser: {
        include: { role: true },
      },
    },
    orderBy: { key: "asc" },
  });
}

async function upsertSystemConfig({ actorId, key, value, description }) {
  const config = await prisma.systemConfig.upsert({
    where: { key },
    update: {
      value,
      description,
      updatedByUserId: actorId,
    },
    create: {
      key,
      value,
      description,
      updatedByUserId: actorId,
    },
    include: {
      updatedByUser: {
        include: { role: true },
      },
    },
  });

  await createAuditLog({
    userId: actorId,
    action: "SYSTEM_CONFIG_UPDATED",
    entityType: "SystemConfig",
    entityId: config.id,
    entityName: config.key,
    metadata: {
      key,
      value,
      description,
    },
  });

  return config;
}

async function seedDefaultSystemConfigs() {
  const defaults = [
    {
      key: "storage.bucket",
      value: { name: process.env.SUPABASE_STORAGE_BUCKET || "goqu-files" },
      description: "Default storage bucket for uploaded files",
    },
    {
      key: "storage.public",
      value: { enabled: process.env.SUPABASE_STORAGE_PUBLIC === "true" },
      description: "Whether public URLs are used for storage objects",
    },
    {
      key: "uploads.maxFileSizeMB",
      value: { value: 10 },
      description: "Maximum upload file size in MB",
    },
  ];

  for (const item of defaults) {
    await prisma.systemConfig.upsert({
      where: { key: item.key },
      update: {
        value: item.value,
        description: item.description,
      },
      create: item,
    });
  }
}

module.exports = {
  listUsers,
  getUserById,
  updateUserRole,
  updateUserStatus,
  createTakmirUser,
  createAdminUser,
  listMasjidsAdmin,
  getMasjidAdminById,
  updateMasjidAdmin,
  updateMasjidStatus,
  listDonationCategories,
  createDonationCategory,
  updateDonationCategory,
  listExpenseCategories,
  createExpenseCategory,
  updateExpenseCategory,
  listDefaultAccounts,
  createDefaultAccount,
  updateDefaultAccount,
  deactivateDefaultAccount,
  reseedDefaultAccounts,
  listDonationCampaigns,
  getDonationCampaignById,
  listExpenseRecords,
  getMonitoringSummary,
  listAuditLogs,
  listSystemConfigs,
  upsertSystemConfig,
  seedDefaultSystemConfigs,
  seedInitialAdmin,
};
