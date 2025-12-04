const prisma = require("../utils/prisma_client");
const CustomError = require("../utils/custom_error");
const {
  generatePathCode,
  validateHierarchy,
  buildAccountTree,
  getDescendantIds,
} = require("../utils/account_utils");

/**
 * Get all accounts dengan filter masjidId
 * @param {string|null} masjidId - Masjid ID (null untuk default/global accounts saja, atau string untuk default + custom accounts masjid)
 * @param {boolean} includeInactive - Include inactive accounts
 * @returns {Promise<Array>} Array of accounts
 * 
 * Catatan: Jika masjidId diberikan (bukan null), akan mengambil:
 * - Default accounts (masjidId: null) - accounts yang bisa digunakan semua masjid
 * - Custom accounts untuk masjid tersebut (masjidId: masjidId)
 */
async function getAllAccounts(masjidId = null, includeInactive = false) {
  try {
    const where = {
      // Jika masjidId diberikan, ambil default accounts (null) + custom accounts masjid
      // Jika masjidId null, ambil hanya default accounts
      ...(masjidId
        ? {
            OR: [
              { masjidId: null }, // Default/global accounts - bisa digunakan semua masjid
              { masjidId }, // Custom accounts untuk masjid ini
            ],
          }
        : { masjidId: null }), // Hanya default accounts jika masjidId null
    };

    if (!includeInactive) {
      where.isActive = true;
    }

    const accounts = await prisma.account.findMany({
      where,
      include: {
        parent: {
          select: {
            id: true,
            code: true,
            name: true,
            pathCode: true,
          },
        },
        children: {
          select: {
            id: true,
            code: true,
            name: true,
            pathCode: true,
          },
        },
      },
      orderBy: [{ pathCode: "asc" }],
    });

    return accounts;
  } catch (error) {
    console.error("Error fetching accounts:", error);
    throw new Error("Failed to fetch accounts");
  }
}

/**
 * Get account by ID
 * @param {string} id - Account ID
 * @returns {Promise<Object>} Account object
 */
async function getAccountById(id) {
  try {
    const account = await prisma.account.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
        masjid: {
          select: {
            id: true,
            Nama: true,
          },
        },
      },
    });

    if (!account) {
      throw new CustomError("Account not found", 404);
    }

    return account;
  } catch (error) {
    console.error("Error fetching account by ID:", error);
    if (error instanceof CustomError) throw error;
    throw new Error("Failed to fetch account");
  }
}

/**
 * Get account tree (hierarchical structure)
 * @param {string|null} masjidId - Masjid ID (null untuk default/global)
 * @returns {Promise<Array>} Tree structure
 */
async function getAccountTree(masjidId = null) {
  try {
    const accounts = await getAllAccounts(masjidId, false);
    return buildAccountTree(accounts);
  } catch (error) {
    console.error("Error building account tree:", error);
    throw new Error("Failed to build account tree");
  }
}

/**
 * Create new account
 * @param {Object} accountData - Account data
 * @returns {Promise<Object>} Created account
 */
async function createAccount(accountData) {
  try {
    let { code, name, parentId, type, isGroup, masjidId } = accountData;

    // Validate: hanya bisa create non-group account (isGroup: false)
    if (isGroup === true) {
      throw new CustomError(
        "Cannot create group account. Only non-group accounts can be created.",
        400
      );
    }
    isGroup = false; // Force to false

    // Validate required fields
    if (!name || !type) {
      throw new CustomError("Name and type are required", 400);
    }

    // Validate field baru untuk detail account (isGroup = false)
    if (!isGroup && accountData.restriction && accountData.report && accountData.category) {
      // Field baru sudah diisi, validasi enum values
      const validRestrictions = ["TANPA_PEMBATASAN", "DENGAN_PEMBATASAN"];
      const validReports = ["NERACA", "LAPORAN_PENGHASILAN_KOMPREHENSIF"];
      const validCategories = [
        "ASET_LANCAR", "ASET_TIDAK_LANCAR", "HUTANG_JANGKA_PENDEK",
        "HUTANG_JANGKA_PANJANG", "ASET_NETO", "PENDAPATAN", "BEBAN",
        "PENGHASILAN_KOMPREHENSIF_LAIN"
      ];

      if (!validRestrictions.includes(accountData.restriction)) {
        throw new CustomError("Invalid restriction value", 400);
      }
      if (!validReports.includes(accountData.report)) {
        throw new CustomError("Invalid report value", 400);
      }
      if (!validCategories.includes(accountData.category)) {
        throw new CustomError("Invalid category value", 400);
      }
    }

    // Validate: parentId is required for creating new accounts
    if (!parentId) {
      throw new CustomError("Parent account is required", 400);
    }

    // Get parent if exists
    let parent = null;
    parent = await prisma.account.findUnique({
      where: { id: parentId },
    });

    if (!parent) {
      throw new CustomError("Parent account not found", 404);
    }

    if (!parent.isGroup) {
      throw new CustomError("Parent must be a group account", 400);
    }

    // Auto-generate code if not provided or empty
    if (!code || code.trim() === "") {
      code = await getNextAccountCode(parentId, masjidId);
    }

    // Validate hierarchy
    const validation = validateHierarchy({ ...accountData, isGroup }, parent);
    if (!validation.valid) {
      throw new CustomError(validation.error, 400);
    }

    // Generate pathCode - gunakan parent.pathCode jika ada, jika tidak gunakan parent.code
    const parentPathCode = parent.pathCode || parent.code;
    const pathCode = generatePathCode(code, parentPathCode);

    // Check if code already exists for this masjidId
    const existing = await prisma.account.findUnique({
      where: {
        code_masjidId: {
          code,
          masjidId: masjidId || null,
        },
      },
    });

    if (existing) {
      throw new CustomError(
        `Account with code ${code} already exists for this masjid`,
        400
      );
    }

    // Determine normalBalance based on type
    const normalBalance = getDefaultNormalBalance(type);

    // Create account
    const account = await prisma.account.create({
      data: {
        code,
        name,
        parentId: parentId,
        type,
        isGroup: false, // Always false for new accounts
        normalBalance, // Auto-determined from type
        pathCode,
        masjidId: masjidId || null,
        isActive: true,
        // Field baru untuk detail account
        restriction: accountData.restriction || null,
        report: accountData.report || null,
        category: accountData.category || null,
      },
      include: {
        parent: true,
        children: true,
      },
    });

    return account;
  } catch (error) {
    console.error("Error creating account:", error);
    if (error instanceof CustomError) throw error;
    if (error.code === "P2002") {
      throw new CustomError("Account code already exists", 400);
    }
    throw new Error("Failed to create account");
  }
}

/**
 * Get next available account code based on parent and masjidId
 * @param {string} parentId - Parent account ID
 * @param {string|null} masjidId - Masjid ID (null for default accounts)
 * @returns {Promise<string>} Next available code (e.g., "1.1.1.003")
 */
async function getNextAccountCode(parentId, masjidId) {
  try {
    // 1. Get parent account
    const parent = await prisma.account.findUnique({
      where: { id: parentId },
    });

    if (!parent) {
      throw new CustomError("Parent account not found", 404);
    }

    if (!parent.isGroup) {
      throw new CustomError("Parent must be a group account", 400);
    }

    // 2. Get all siblings (children of parent) untuk masjidId ini
    // Include both default (masjidId: null) and custom (masjidId: masjidId)
    const siblings = await prisma.account.findMany({
      where: {
        parentId: parent.id,
        OR: [
          { masjidId: null }, // Default accounts
          { masjidId: masjidId }, // Custom accounts untuk masjid ini
        ],
        isGroup: false, // Hanya non-group siblings
      },
      orderBy: { code: "asc" },
    });

    // 3. Extract sequential numbers dari codes
    const parentCodePrefix = parent.code + ".";
    const numbers = siblings
      .map((sibling) => {
        if (sibling.code.startsWith(parentCodePrefix)) {
          const numStr = sibling.code.substring(parentCodePrefix.length);
          const num = parseInt(numStr, 10);
          return isNaN(num) ? 0 : num;
        }
        return 0;
      })
      .filter((n) => n > 0)
      .sort((a, b) => b - a);

    // 4. Generate next number (3 digit, zero-padded)
    const nextNum = numbers.length > 0 ? numbers[0] + 1 : 1;
    if (nextNum > 999) {
      throw new CustomError(
        "Maximum accounts per parent reached (999)",
        400
      );
    }

    return `${parent.code}.${String(nextNum).padStart(3, "0")}`;
  } catch (error) {
    console.error("Error getting next account code:", error);
    if (error instanceof CustomError) throw error;
    throw new Error("Failed to get next account code");
  }
}

/**
 * Update account
 * @param {string} id - Account ID
 * @param {Object} accountData - Updated account data
 * @returns {Promise<Object>} Updated account
 */
async function updateAccount(id, accountData) {
  try {
    // Get existing account
    const existing = await prisma.account.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
      },
    });

    if (!existing) {
      throw new CustomError("Account not found", 404);
    }

    // Check if account has jurnal entries (cannot change type if has transactions)
    if (accountData.type && accountData.type !== existing.type) {
      const jurnalCount = await prisma.jurnalEntry.count({
        where: { akunId: id },
      });

      if (jurnalCount > 0) {
        throw new CustomError(
          "Cannot change account type when it has journal entries",
          400
        );
      }
    }

    // Validate parent change
    if (accountData.parentId !== undefined) {
      let parent = null;
      if (accountData.parentId) {
        parent = await prisma.account.findUnique({
          where: { id: accountData.parentId },
        });

        if (!parent) {
          throw new CustomError("Parent account not found", 404);
        }

        // Cannot set parent to self or descendant
        const descendants = getDescendantIds(id, [existing]);
        if (accountData.parentId === id || descendants.includes(accountData.parentId)) {
          throw new CustomError(
            "Cannot set parent to self or descendant",
            400
          );
        }

        const validation = validateHierarchy(
          { ...existing, ...accountData },
          parent
        );
        if (!validation.valid) {
          throw new CustomError(validation.error, 400);
        }
      }

      // Regenerate pathCode if parent changed
      if (accountData.parentId !== existing.parentId) {
        const parentPathCode = parent ? parent.pathCode : null;
        accountData.pathCode = generatePathCode(
          accountData.code || existing.code,
          parentPathCode
        );
      }
    }

    // Update account
    const updated = await prisma.account.update({
      where: { id },
      data: accountData,
      include: {
        parent: true,
        children: true,
      },
    });

    return updated;
  } catch (error) {
    console.error("Error updating account:", error);
    if (error instanceof CustomError) throw error;
    throw new Error("Failed to update account");
  }
}

/**
 * Soft delete account (set isActive = false)
 * @param {string} id - Account ID
 * @returns {Promise<Object>} Updated account
 */
async function deleteAccount(id) {
  try {
    // Check if account exists
    const account = await prisma.account.findUnique({
      where: { id },
    });

    if (!account) {
      throw new CustomError("Account not found", 404);
    }

    // Check if account has jurnal entries
    const jurnalCount = await prisma.jurnalEntry.count({
      where: { akunId: id },
    });

    if (jurnalCount > 0) {
      throw new CustomError(
        "Cannot delete account that has journal entries. Use soft delete (set isActive = false) instead.",
        400
      );
    }

    // Check if account has children
    const childrenCount = await prisma.account.count({
      where: { parentId: id },
    });

    if (childrenCount > 0) {
      throw new CustomError(
        "Cannot delete account that has child accounts",
        400
      );
    }

    // Soft delete
    const deleted = await prisma.account.update({
      where: { id },
      data: { isActive: false },
    });

    return deleted;
  } catch (error) {
    console.error("Error deleting account:", error);
    if (error instanceof CustomError) throw error;
    throw new Error("Failed to delete account");
  }
}

/**
 * Seed default COA untuk masjid
 * @param {string|null} masjidId - Masjid ID (null untuk global/default COA yang bisa digunakan semua masjid)
 * @returns {Promise<Object>} Result dengan count of seeded accounts
 * 
 * Catatan:
 * - Jika masjidId = null: Membuat default/global COA yang bisa digunakan oleh semua masjid
 * - Jika masjidId = string: Membuat custom COA khusus untuk masjid tersebut
 * - Default accounts (masjidId: null) akan ter-query bersama custom accounts saat masjid menggunakan COA
 */
/**
 * Helper function untuk menentukan normal balance default berdasarkan type
 * @param {string} type - AccountType
 * @returns {string} "DEBIT" atau "KREDIT"
 */
function getDefaultNormalBalance(type) {
  // Default: ASSET & EXPENSE = DEBIT, lainnya = KREDIT
  if (type === "ASSET" || type === "EXPENSE") {
    return "DEBIT";
  }
  return "KREDIT";
}

/**
 * Helper untuk auto-fill normal balance jika tidak di-specify
 * @param {Object} accountData - Account data
 * @returns {Object} Account data dengan normalBalance
 */
function prepareAccountData(accountData) {
  return {
    ...accountData,
    normalBalance: accountData.normalBalance || getDefaultNormalBalance(accountData.type),
  };
}

/**
 * Mapping helper untuk menentukan type dari kategori dan laporan
 */
function getAccountTypeFromCategory(category, report) {
  if (category === "ASET_LANCAR" || category === "ASET_TIDAK_LANCAR") {
    return "ASSET";
  }
  if (category === "HUTANG_JANGKA_PENDEK" || category === "HUTANG_JANGKA_PANJANG") {
    return "LIABILITY";
  }
  if (category === "ASET_NETO") {
    return "EQUITY";
  }
  if (category === "PENDAPATAN") {
    return "REVENUE";
  }
  if (category === "BEBAN") {
    return "EXPENSE";
  }
  if (category === "PENGHASILAN_KOMPREHENSIF_LAIN") {
    return "REVENUE"; // Penghasilan komprehensif lain masuk ke REVENUE
  }
  return "ASSET"; // Default fallback
}

async function seedDefaultCOA(masjidId = null) {
  try {
    // COA FINAL dengan struktur parent + leaf
    // Parent menggunakan kode hierarkis (1, 1.1, 1.1.1, dst)
    // Leaf menggunakan kode 6 digit dari FINALAKUN.md (111101, 111102, dst)
    const defaultAccounts = [
      // ============================================
      // PARENT ACCOUNTS (GROUP) - Level 1
      // ============================================
      { code: "1", name: "Aset", type: "ASSET", normalBalance: "DEBIT", isGroup: true, parentId: null },
      { code: "2", name: "Hutang", type: "LIABILITY", normalBalance: "KREDIT", isGroup: true, parentId: null },
      { code: "3", name: "Aset Neto", type: "EQUITY", normalBalance: "KREDIT", isGroup: true, parentId: null },
      { code: "4", name: "Pendapatan", type: "REVENUE", normalBalance: "KREDIT", isGroup: true, parentId: null },
      { code: "5", name: "Beban", type: "EXPENSE", normalBalance: "DEBIT", isGroup: true, parentId: null },
      { code: "6", name: "Penghasilan Komprehensif Lain", type: "REVENUE", normalBalance: "KREDIT", isGroup: true, parentId: null },

      // ============================================
      // PARENT ACCOUNTS (GROUP) - Level 2
      // ============================================
      { code: "1.1", name: "Aset Lancar", type: "ASSET", normalBalance: "DEBIT", isGroup: true, parentCode: "1" },
      { code: "1.2", name: "Aset Tidak Lancar", type: "ASSET", normalBalance: "DEBIT", isGroup: true, parentCode: "1" },
      { code: "2.1", name: "Hutang Jangka Pendek", type: "LIABILITY", normalBalance: "KREDIT", isGroup: true, parentCode: "2" },
      { code: "2.2", name: "Hutang Jangka Panjang", type: "LIABILITY", normalBalance: "KREDIT", isGroup: true, parentCode: "2" },
      { code: "3.1", name: "Aset Neto Tanpa Pembatasan", type: "EQUITY", normalBalance: "KREDIT", isGroup: true, parentCode: "3" },
      { code: "3.2", name: "Aset Neto Dengan Pembatasan", type: "EQUITY", normalBalance: "KREDIT", isGroup: true, parentCode: "3" },
      { code: "4.1", name: "Penerimaan ZISWAF", type: "REVENUE", normalBalance: "KREDIT", isGroup: true, parentCode: "4" },
      { code: "4.2", name: "Penerimaan Qurban", type: "REVENUE", normalBalance: "KREDIT", isGroup: true, parentCode: "4" },
      { code: "4.3", name: "Penerimaan Buku/Kitab", type: "REVENUE", normalBalance: "KREDIT", isGroup: true, parentCode: "4" },
      { code: "4.4", name: "Penerimaan Lainnya", type: "REVENUE", normalBalance: "KREDIT", isGroup: true, parentCode: "4" },
      { code: "5.1", name: "Penyaluran ZISWAF", type: "EXPENSE", normalBalance: "DEBIT", isGroup: true, parentCode: "5" },
      { code: "5.2", name: "Penyaluran Qurban", type: "EXPENSE", normalBalance: "DEBIT", isGroup: true, parentCode: "5" },
      { code: "5.3", name: "Beban Kegiatan", type: "EXPENSE", normalBalance: "DEBIT", isGroup: true, parentCode: "5" },
      { code: "5.4", name: "Beban Operasional", type: "EXPENSE", normalBalance: "DEBIT", isGroup: true, parentCode: "5" },
      { code: "5.5", name: "Kerugian", type: "EXPENSE", normalBalance: "DEBIT", isGroup: true, parentCode: "5" },
      { code: "6.1", name: "Penghasilan Komprehensif Lain", type: "REVENUE", normalBalance: "KREDIT", isGroup: true, parentCode: "6" },

      // ============================================
      // PARENT ACCOUNTS (GROUP) - Level 3
      // ============================================
      { code: "1.1.1", name: "Kas dan Setara Kas", type: "ASSET", normalBalance: "DEBIT", isGroup: true, parentCode: "1.1" },
      { code: "1.1.3", name: "Piutang", type: "ASSET", normalBalance: "DEBIT", isGroup: true, parentCode: "1.1" },
      { code: "1.1.4", name: "Persediaan", type: "ASSET", normalBalance: "DEBIT", isGroup: true, parentCode: "1.1" },
      { code: "1.1.6", name: "Beban Dibayar Dimuka", type: "ASSET", normalBalance: "DEBIT", isGroup: true, parentCode: "1.1" },
      { code: "1.1.7", name: "Uang Muka", type: "ASSET", normalBalance: "DEBIT", isGroup: true, parentCode: "1.1" },
      { code: "1.2.1", name: "Tanah", type: "ASSET", normalBalance: "DEBIT", isGroup: true, parentCode: "1.2" },
      { code: "1.2.2", name: "Bangunan", type: "ASSET", normalBalance: "DEBIT", isGroup: true, parentCode: "1.2" },
      { code: "1.2.3", name: "Kendaraan", type: "ASSET", normalBalance: "DEBIT", isGroup: true, parentCode: "1.2" },
      { code: "1.2.5", name: "Peralatan", type: "ASSET", normalBalance: "DEBIT", isGroup: true, parentCode: "1.2" },
      { code: "3.1.1", name: "Aset Neto Tanpa Pembatasan Tahun Lalu", type: "EQUITY", normalBalance: "KREDIT", isGroup: true, parentCode: "3.1" },
      { code: "3.1.2", name: "Aset Neto Tanpa Pembatasan Tahun Berjalan", type: "EQUITY", normalBalance: "KREDIT", isGroup: true, parentCode: "3.1" },
      { code: "3.2.1", name: "Aset Neto Dengan Pembatasan Tahun Lalu", type: "EQUITY", normalBalance: "KREDIT", isGroup: true, parentCode: "3.2" },
      { code: "3.2.2", name: "Aset Neto Dengan Pembatasan Tahun Berjalan", type: "EQUITY", normalBalance: "KREDIT", isGroup: true, parentCode: "3.2" },
      { code: "4.1.1", name: "Penerimaan Zakat", type: "REVENUE", normalBalance: "KREDIT", isGroup: true, parentCode: "4.1" },
      { code: "4.1.2", name: "Penerimaan Infaq dan Shodaqoh", type: "REVENUE", normalBalance: "KREDIT", isGroup: true, parentCode: "4.1" },
      { code: "4.1.4", name: "Penerimaan Waqaf", type: "REVENUE", normalBalance: "KREDIT", isGroup: true, parentCode: "4.1" },
      { code: "4.1.5", name: "Penerimaan Fidyah", type: "REVENUE", normalBalance: "KREDIT", isGroup: true, parentCode: "4.1" },
      { code: "4.1.6", name: "Penerimaan Hibah/Donasi", type: "REVENUE", normalBalance: "KREDIT", isGroup: true, parentCode: "4.1" },
      { code: "5.1.1", name: "Penyaluran Dana Zakat", type: "EXPENSE", normalBalance: "DEBIT", isGroup: true, parentCode: "5.1" },
      { code: "5.1.2", name: "Penyaluran Infaq dan Sodaqoh", type: "EXPENSE", normalBalance: "DEBIT", isGroup: true, parentCode: "5.1" },
      { code: "5.3.1", name: "Beban Kegiatan", type: "EXPENSE", normalBalance: "DEBIT", isGroup: true, parentCode: "5.3" },
      { code: "5.3.2", name: "Honor dan Gaji", type: "EXPENSE", normalBalance: "DEBIT", isGroup: true, parentCode: "5.3" },
      { code: "5.4.1", name: "Beban Umum", type: "EXPENSE", normalBalance: "DEBIT", isGroup: true, parentCode: "5.4" },
      { code: "5.4.3", name: "Beban Pemeliharaan", type: "EXPENSE", normalBalance: "DEBIT", isGroup: true, parentCode: "5.4" },
      { code: "5.4.9", name: "Beban Lain-lain", type: "EXPENSE", normalBalance: "DEBIT", isGroup: true, parentCode: "5.4" },
      { code: "5.5.1", name: "Kerugian", type: "EXPENSE", normalBalance: "DEBIT", isGroup: true, parentCode: "5.5" },

      // ============================================
      // LEAF ACCOUNTS (DETAIL) - Dari FINALAKUN.md
      // ============================================
      // ASET LANCAR - Kas dan Setara Kas
      { code: "111101", name: "Kas Tunai", type: "ASSET", normalBalance: "DEBIT", isGroup: false, parentCode: "1.1.1", restriction: "TANPA_PEMBATASAN", report: "NERACA", category: "ASET_LANCAR" },
      { code: "111102", name: "Kas Tunai Dengan Pembatasan", type: "ASSET", normalBalance: "DEBIT", isGroup: false, parentCode: "1.1.1", restriction: "DENGAN_PEMBATASAN", report: "NERACA", category: "ASET_LANCAR" },
      { code: "111201", name: "Kas Bank", type: "ASSET", normalBalance: "DEBIT", isGroup: false, parentCode: "1.1.1", restriction: "TANPA_PEMBATASAN", report: "NERACA", category: "ASET_LANCAR" },
      { code: "111202", name: "Kas Bank Dengan Pembatasan", type: "ASSET", normalBalance: "DEBIT", isGroup: false, parentCode: "1.1.1", restriction: "DENGAN_PEMBATASAN", report: "NERACA", category: "ASET_LANCAR" },
      // ASET LANCAR - Piutang
      { code: "113101", name: "Piutang Jamaah", type: "ASSET", normalBalance: "DEBIT", isGroup: false, parentCode: "1.1.3", restriction: "TANPA_PEMBATASAN", report: "NERACA", category: "ASET_LANCAR" },
      { code: "113102", name: "Piutang Lainnya", type: "ASSET", normalBalance: "DEBIT", isGroup: false, parentCode: "1.1.3", restriction: "TANPA_PEMBATASAN", report: "NERACA", category: "ASET_LANCAR" },
      // ASET LANCAR - Persediaan
      { code: "114101", name: "ATK", type: "ASSET", normalBalance: "DEBIT", isGroup: false, parentCode: "1.1.4", restriction: "TANPA_PEMBATASAN", report: "NERACA", category: "ASET_LANCAR" },
      { code: "114102", name: "Perlengkapan Rumah Tangga", type: "ASSET", normalBalance: "DEBIT", isGroup: false, parentCode: "1.1.4", restriction: "TANPA_PEMBATASAN", report: "NERACA", category: "ASET_LANCAR" },
      // ASET LANCAR - Beban Dibayar Dimuka
      { code: "116101", name: "Beban Dibayar Dimuka", type: "ASSET", normalBalance: "DEBIT", isGroup: false, parentCode: "1.1.6", restriction: "TANPA_PEMBATASAN", report: "NERACA", category: "ASET_LANCAR" },
      // ASET LANCAR - Uang Muka
      { code: "117102", name: "Uang Muka Pembelian", type: "ASSET", normalBalance: "DEBIT", isGroup: false, parentCode: "1.1.7", restriction: "TANPA_PEMBATASAN", report: "NERACA", category: "ASET_LANCAR" },
      { code: "117199", name: "Uang Muka Lainnya", type: "ASSET", normalBalance: "DEBIT", isGroup: false, parentCode: "1.1.7", restriction: "TANPA_PEMBATASAN", report: "NERACA", category: "ASET_LANCAR" },
      // ASET TIDAK LANCAR - Tanah
      { code: "121101", name: "Tanah Masjid", type: "ASSET", normalBalance: "DEBIT", isGroup: false, parentCode: "1.2.1", restriction: "DENGAN_PEMBATASAN", report: "NERACA", category: "ASET_TIDAK_LANCAR" },
      { code: "121199", name: "Tanah Lainnya", type: "ASSET", normalBalance: "DEBIT", isGroup: false, parentCode: "1.2.1", restriction: "TANPA_PEMBATASAN", report: "NERACA", category: "ASET_TIDAK_LANCAR" },
      // ASET TIDAK LANCAR - Bangunan
      { code: "121201", name: "Bangunan Masjid", type: "ASSET", normalBalance: "DEBIT", isGroup: false, parentCode: "1.2.2", restriction: "DENGAN_PEMBATASAN", report: "NERACA", category: "ASET_TIDAK_LANCAR" },
      { code: "121203", name: "Bangunan Lainnya", type: "ASSET", normalBalance: "DEBIT", isGroup: false, parentCode: "1.2.2", restriction: "TANPA_PEMBATASAN", report: "NERACA", category: "ASET_TIDAK_LANCAR" },
      // ASET TIDAK LANCAR - Kendaraan
      { code: "121303", name: "Kendaraan Operasional", type: "ASSET", normalBalance: "DEBIT", isGroup: false, parentCode: "1.2.3", restriction: "TANPA_PEMBATASAN", report: "NERACA", category: "ASET_TIDAK_LANCAR" },
      // ASET TIDAK LANCAR - Peralatan
      { code: "121501", name: "Peralatan Sound System", type: "ASSET", normalBalance: "DEBIT", isGroup: false, parentCode: "1.2.5", restriction: "TANPA_PEMBATASAN", report: "NERACA", category: "ASET_TIDAK_LANCAR" },
      { code: "121502", name: "Peralatan Komputer/Laptop", type: "ASSET", normalBalance: "DEBIT", isGroup: false, parentCode: "1.2.5", restriction: "TANPA_PEMBATASAN", report: "NERACA", category: "ASET_TIDAK_LANCAR" },
      { code: "121503", name: "Peralatan Rumah Tangga", type: "ASSET", normalBalance: "DEBIT", isGroup: false, parentCode: "1.2.5", restriction: "TANPA_PEMBATASAN", report: "NERACA", category: "ASET_TIDAK_LANCAR" },
      { code: "121504", name: "Peralatan Lainnya", type: "ASSET", normalBalance: "DEBIT", isGroup: false, parentCode: "1.2.5", restriction: "TANPA_PEMBATASAN", report: "NERACA", category: "ASET_TIDAK_LANCAR" },
      // HUTANG JANGKA PENDEK
      { code: "217101", name: "Utang Jangka Pendek", type: "LIABILITY", normalBalance: "KREDIT", isGroup: false, parentCode: "2.1", restriction: "TANPA_PEMBATASAN", report: "NERACA", category: "HUTANG_JANGKA_PENDEK" },
      // HUTANG JANGKA PANJANG
      { code: "228199", name: "Utang Jangka Panjang", type: "LIABILITY", normalBalance: "KREDIT", isGroup: false, parentCode: "2.2", restriction: "TANPA_PEMBATASAN", report: "NERACA", category: "HUTANG_JANGKA_PANJANG" },
      // ASET NETO - Tanpa Pembatasan
      { code: "311101", name: "Aset Neto Tanpa Pembatasan Tahun Lalu", type: "EQUITY", normalBalance: "KREDIT", isGroup: false, parentCode: "3.1.1", restriction: "TANPA_PEMBATASAN", report: "NERACA", category: "ASET_NETO" },
      { code: "312101", name: "Aset Neto Tanpa Pembatasan Tahun Berjalan", type: "EQUITY", normalBalance: "KREDIT", isGroup: false, parentCode: "3.1.2", restriction: "TANPA_PEMBATASAN", report: "NERACA", category: "ASET_NETO" },
      // ASET NETO - Dengan Pembatasan
      { code: "321101", name: "Aset Neto Dengan Pembatasan Tahun Lalu", type: "EQUITY", normalBalance: "KREDIT", isGroup: false, parentCode: "3.2.1", restriction: "DENGAN_PEMBATASAN", report: "NERACA", category: "ASET_NETO" },
      { code: "322101", name: "Aset Neto Dengan Pembatasan Tahun Berjalan", type: "EQUITY", normalBalance: "KREDIT", isGroup: false, parentCode: "3.2.2", restriction: "DENGAN_PEMBATASAN", report: "NERACA", category: "ASET_NETO" },
      // PENDAPATAN - Zakat
      { code: "411101", name: "Penerimaan Zakat", type: "REVENUE", normalBalance: "KREDIT", isGroup: false, parentCode: "4.1.1", restriction: "DENGAN_PEMBATASAN", report: "LAPORAN_PENGHASILAN_KOMPREHENSIF", category: "PENDAPATAN" },
      // PENDAPATAN - Infaq dan Shodaqoh
      { code: "412101", name: "Penerimaan Infaq dan Shodaqoh", type: "REVENUE", normalBalance: "KREDIT", isGroup: false, parentCode: "4.1.2", restriction: "TANPA_PEMBATASAN", report: "LAPORAN_PENGHASILAN_KOMPREHENSIF", category: "PENDAPATAN" },
      { code: "412999", name: "Penerimaan Infaq Lainnya", type: "REVENUE", normalBalance: "KREDIT", isGroup: false, parentCode: "4.1.2", restriction: "TANPA_PEMBATASAN", report: "LAPORAN_PENGHASILAN_KOMPREHENSIF", category: "PENDAPATAN" },
      // PENDAPATAN - Waqaf
      { code: "414101", name: "Penerimaan Waqaf", type: "REVENUE", normalBalance: "KREDIT", isGroup: false, parentCode: "4.1.4", restriction: "DENGAN_PEMBATASAN", report: "LAPORAN_PENGHASILAN_KOMPREHENSIF", category: "PENDAPATAN" },
      // PENDAPATAN - Fidyah
      { code: "415101", name: "Penerimaan Fidyah", type: "REVENUE", normalBalance: "KREDIT", isGroup: false, parentCode: "4.1.5", restriction: "DENGAN_PEMBATASAN", report: "LAPORAN_PENGHASILAN_KOMPREHENSIF", category: "PENDAPATAN" },
      // PENDAPATAN - Hibah/Donasi
      { code: "416101", name: "Penerimaan Hibah / Donasi", type: "REVENUE", normalBalance: "KREDIT", isGroup: false, parentCode: "4.1.6", restriction: "TANPA_PEMBATASAN", report: "LAPORAN_PENGHASILAN_KOMPREHENSIF", category: "PENDAPATAN" },
      // PENDAPATAN - Qurban
      { code: "421101", name: "Penerimaan Qurban", type: "REVENUE", normalBalance: "KREDIT", isGroup: false, parentCode: "4.2", restriction: "DENGAN_PEMBATASAN", report: "LAPORAN_PENGHASILAN_KOMPREHENSIF", category: "PENDAPATAN" },
      // PENDAPATAN - Buku/Kitab
      { code: "431701", name: "Penerimaan Buku / Kitab", type: "REVENUE", normalBalance: "KREDIT", isGroup: false, parentCode: "4.3", restriction: "TANPA_PEMBATASAN", report: "LAPORAN_PENGHASILAN_KOMPREHENSIF", category: "PENDAPATAN" },
      { code: "431702", name: "Pembelian Buku / Kitab", type: "REVENUE", normalBalance: "KREDIT", isGroup: false, parentCode: "4.3", restriction: "TANPA_PEMBATASAN", report: "LAPORAN_PENGHASILAN_KOMPREHENSIF", category: "PENDAPATAN" },
      // PENDAPATAN - Lainnya
      { code: "441101", name: "Bagi Hasil Bank", type: "REVENUE", normalBalance: "KREDIT", isGroup: false, parentCode: "4.4", restriction: "TANPA_PEMBATASAN", report: "LAPORAN_PENGHASILAN_KOMPREHENSIF", category: "PENDAPATAN" },
      { code: "441202", name: "Penerimaan Lain-lain", type: "REVENUE", normalBalance: "KREDIT", isGroup: false, parentCode: "4.4", restriction: "TANPA_PEMBATASAN", report: "LAPORAN_PENGHASILAN_KOMPREHENSIF", category: "PENDAPATAN" },
      // BEBAN - Penyaluran Zakat
      { code: "511101", name: "Penyaluran Dana Zakat", type: "EXPENSE", normalBalance: "DEBIT", isGroup: false, parentCode: "5.1.1", restriction: "DENGAN_PEMBATASAN", report: "LAPORAN_PENGHASILAN_KOMPREHENSIF", category: "BEBAN" },
      // BEBAN - Penyaluran Infaq dan Sodaqoh
      { code: "511201", name: "Penyaluran Infaq dan Sodaqoh", type: "EXPENSE", normalBalance: "DEBIT", isGroup: false, parentCode: "5.1.2", restriction: "TANPA_PEMBATASAN", report: "LAPORAN_PENGHASILAN_KOMPREHENSIF", category: "BEBAN" },
      // BEBAN - Penyaluran Qurban (ada duplikasi kode 511101 di FINALAKUN.md, saya gunakan 521101)
      { code: "521101", name: "Penyaluran Qurban", type: "EXPENSE", normalBalance: "DEBIT", isGroup: false, parentCode: "5.2", restriction: "TANPA_PEMBATASAN", report: "LAPORAN_PENGHASILAN_KOMPREHENSIF", category: "BEBAN" },
      // BEBAN - Kegiatan
      { code: "531101", name: "Beban Khatib dan Narasumber", type: "EXPENSE", normalBalance: "DEBIT", isGroup: false, parentCode: "5.3.1", restriction: "TANPA_PEMBATASAN", report: "LAPORAN_PENGHASILAN_KOMPREHENSIF", category: "BEBAN" },
      { code: "531102", name: "Beban Kegiatan Ramadhan", type: "EXPENSE", normalBalance: "DEBIT", isGroup: false, parentCode: "5.3.1", restriction: "DENGAN_PEMBATASAN", report: "LAPORAN_PENGHASILAN_KOMPREHENSIF", category: "BEBAN" },
      // BEBAN - Honor dan Gaji
      { code: "532101", name: "Honor Marbot Masjid", type: "EXPENSE", normalBalance: "DEBIT", isGroup: false, parentCode: "5.3.2", restriction: "TANPA_PEMBATASAN", report: "LAPORAN_PENGHASILAN_KOMPREHENSIF", category: "BEBAN" },
      { code: "532103", name: "Gaji Guru / Pengajar", type: "EXPENSE", normalBalance: "DEBIT", isGroup: false, parentCode: "5.3.2", restriction: "TANPA_PEMBATASAN", report: "LAPORAN_PENGHASILAN_KOMPREHENSIF", category: "BEBAN" },
      { code: "532114", name: "Parsel Lebaran", type: "EXPENSE", normalBalance: "DEBIT", isGroup: false, parentCode: "5.3.2", restriction: "TANPA_PEMBATASAN", report: "LAPORAN_PENGHASILAN_KOMPREHENSIF", category: "BEBAN" },
      { code: "532115", name: "Dana Sosial", type: "EXPENSE", normalBalance: "DEBIT", isGroup: false, parentCode: "5.3.2", restriction: "TANPA_PEMBATASAN", report: "LAPORAN_PENGHASILAN_KOMPREHENSIF", category: "BEBAN" },
      { code: "532199", name: "Gaji/Honor/Tunjangan Lainnya", type: "EXPENSE", normalBalance: "DEBIT", isGroup: false, parentCode: "5.3.2", restriction: "TANPA_PEMBATASAN", report: "LAPORAN_PENGHASILAN_KOMPREHENSIF", category: "BEBAN" },
      // BEBAN - Umum
      { code: "541106", name: "Beban Listrik / Air", type: "EXPENSE", normalBalance: "DEBIT", isGroup: false, parentCode: "5.4.1", restriction: "TANPA_PEMBATASAN", report: "LAPORAN_PENGHASILAN_KOMPREHENSIF", category: "BEBAN" },
      { code: "541107", name: "Beban Telepon/Internet", type: "EXPENSE", normalBalance: "DEBIT", isGroup: false, parentCode: "5.4.1", restriction: "TANPA_PEMBATASAN", report: "LAPORAN_PENGHASILAN_KOMPREHENSIF", category: "BEBAN" },
      { code: "541111", name: "Beban Konsumsi", type: "EXPENSE", normalBalance: "DEBIT", isGroup: false, parentCode: "5.4.1", restriction: "TANPA_PEMBATASAN", report: "LAPORAN_PENGHASILAN_KOMPREHENSIF", category: "BEBAN" },
      { code: "541112", name: "Beban Perlengkapan Kebersihan", type: "EXPENSE", normalBalance: "DEBIT", isGroup: false, parentCode: "5.4.1", restriction: "TANPA_PEMBATASAN", report: "LAPORAN_PENGHASILAN_KOMPREHENSIF", category: "BEBAN" },
      { code: "541114", name: "Beban Bank", type: "EXPENSE", normalBalance: "DEBIT", isGroup: false, parentCode: "5.4.1", restriction: "TANPA_PEMBATASAN", report: "LAPORAN_PENGHASILAN_KOMPREHENSIF", category: "BEBAN" },
      { code: "541115", name: "Kebutuhan Rumah Tangga", type: "EXPENSE", normalBalance: "DEBIT", isGroup: false, parentCode: "5.4.1", restriction: "TANPA_PEMBATASAN", report: "LAPORAN_PENGHASILAN_KOMPREHENSIF", category: "BEBAN" },
      // BEBAN - Pemeliharaan
      { code: "543101", name: "Beban Pemeliharaan Bangunan", type: "EXPENSE", normalBalance: "DEBIT", isGroup: false, parentCode: "5.4.3", restriction: "TANPA_PEMBATASAN", report: "LAPORAN_PENGHASILAN_KOMPREHENSIF", category: "BEBAN" },
      { code: "543102", name: "Beban Pemeliharaan Kendaraan Bermotor", type: "EXPENSE", normalBalance: "DEBIT", isGroup: false, parentCode: "5.4.3", restriction: "TANPA_PEMBATASAN", report: "LAPORAN_PENGHASILAN_KOMPREHENSIF", category: "BEBAN" },
      { code: "543104", name: "Beban Pemeliharaan Peralatan Elektronik", type: "EXPENSE", normalBalance: "DEBIT", isGroup: false, parentCode: "5.4.3", restriction: "TANPA_PEMBATASAN", report: "LAPORAN_PENGHASILAN_KOMPREHENSIF", category: "BEBAN" },
      { code: "543199", name: "Beban Pemeliharaan Lainnya", type: "EXPENSE", normalBalance: "DEBIT", isGroup: false, parentCode: "5.4.3", restriction: "TANPA_PEMBATASAN", report: "LAPORAN_PENGHASILAN_KOMPREHENSIF", category: "BEBAN" },
      // BEBAN - Lain-lain
      { code: "549199", name: "Beban Lain-lain", type: "EXPENSE", normalBalance: "DEBIT", isGroup: false, parentCode: "5.4.9", restriction: "TANPA_PEMBATASAN", report: "LAPORAN_PENGHASILAN_KOMPREHENSIF", category: "BEBAN" },
      // BEBAN - Kerugian
      { code: "551101", name: "Kerugian Penjualan Aset", type: "EXPENSE", normalBalance: "DEBIT", isGroup: false, parentCode: "5.5.1", restriction: "TANPA_PEMBATASAN", report: "LAPORAN_PENGHASILAN_KOMPREHENSIF", category: "BEBAN" },
      // PENGHASILAN KOMPREHENSIF LAIN
      { code: "611101", name: "Penghasilan Komprehensif Lain", type: "REVENUE", normalBalance: "KREDIT", isGroup: false, parentCode: "6.1", restriction: "TANPA_PEMBATASAN", report: "LAPORAN_PENGHASILAN_KOMPREHENSIF", category: "PENGHASILAN_KOMPREHENSIF_LAIN" },
      { code: "611102", name: "Keuntungan Penjualan Aset", type: "REVENUE", normalBalance: "KREDIT", isGroup: false, parentCode: "6.1", restriction: "TANPA_PEMBATASAN", report: "LAPORAN_PENGHASILAN_KOMPREHENSIF", category: "PENGHASILAN_KOMPREHENSIF_LAIN" },
    ];

    // Check if already seeded
    const existingCount = await prisma.account.count({
      where: { masjidId: masjidId || null },
    });

    if (existingCount > 0) {
      const errorMessage = masjidId
        ? "Default COA already exists for this masjid. Use update instead."
        : "General/default COA already exists. Use update instead.";
      throw new CustomError(errorMessage, 400);
    }

    // Create accounts in transaction
    const result = await prisma.$transaction(async (tx) => {
      const createdAccounts = [];
      const accountMap = new Map(); // Map untuk menyimpan created accounts by code

      // Sort by code length to ensure parents are created first
      const sortedAccounts = defaultAccounts.sort((a, b) => {
        return a.code.split(".").length - b.code.split(".").length;
      });

      for (const accData of sortedAccounts) {
        let parentId = null;
        if (accData.parentCode) {
          const parent = accountMap.get(accData.parentCode);
          if (parent) {
            parentId = parent.id;
          }
        } else if (accData.parentId) {
          parentId = accData.parentId;
        }

        // Get parent for pathCode generation
        let parentPathCode = null;
        if (parentId && accData.parentCode) {
          const parentAccount = accountMap.get(accData.parentCode);
          if (parentAccount) {
            parentPathCode = parentAccount.pathCode;
          }
        }

        const pathCode = generatePathCode(accData.code, parentPathCode);

        // Prepare account data dengan auto-fill normalBalance jika tidak ada
        const preparedData = prepareAccountData(accData);

        const account = await tx.account.create({
          data: {
            code: preparedData.code,
            name: preparedData.name,
            parentId,
            type: preparedData.type,
            normalBalance: preparedData.normalBalance,
            isGroup: preparedData.isGroup,
            pathCode,
            masjidId: masjidId || null,
            isActive: true,
            // Field baru untuk COA FINAL - hanya untuk detail account (isGroup = false)
            restriction: preparedData.isGroup ? null : (preparedData.restriction || null),
            report: preparedData.isGroup ? null : (preparedData.report || null),
            category: preparedData.isGroup ? null : (preparedData.category || null),
          },
        });

        accountMap.set(accData.code, account);
        createdAccounts.push(account);
      }

      return createdAccounts;
    }, { timeout: 120000, maxWait: 10000 });

    return {
      success: true,
      count: result.length,
      accounts: result,
    };
  } catch (error) {
    console.error("Error seeding default COA:", error);
    if (error instanceof CustomError) throw error;
    throw new Error("Failed to seed default COA");
  }
}

module.exports = {
  getAllAccounts,
  getAccountById,
  getAccountTree,
  createAccount,
  updateAccount,
  deleteAccount,
  seedDefaultCOA,
  getNextAccountCode,
};

