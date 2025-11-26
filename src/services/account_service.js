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

async function seedDefaultCOA(masjidId = null) {
  try {
    // COA Template Masjid (hierarchical) dengan normalBalance
    // Format: 111001 → 1.1.1.001 (dengan titik untuk konsistensi database)
    const defaultAccounts = [
      // ============================================
      // 1. ASET (ASSET) - Normal Balance: DEBIT
      // ============================================
      { code: "1", name: "Aset", type: "ASSET", normalBalance: "DEBIT", isGroup: true, parentId: null },
      
      // 1.1 ASET LANCAR
      { code: "1.1", name: "Aset Lancar", type: "ASSET", normalBalance: "DEBIT", isGroup: true, parentCode: "1" },
      
      // 1.1.1 Kas dan Setara Kas (111001-111002)
      { code: "1.1.1", name: "Kas dan Setara Kas", type: "ASSET", normalBalance: "DEBIT", isGroup: true, parentCode: "1.1" },
      { code: "1.1.1.001", name: "Kas Tunai", type: "ASSET", normalBalance: "DEBIT", isGroup: false, parentCode: "1.1.1" },
      { code: "1.1.1.002", name: "Kas Bank BSI", type: "ASSET", normalBalance: "DEBIT", isGroup: false, parentCode: "1.1.1" },
      
      // 1.1.2 Investasi Jangka Pendek (112001) - jika ada
      { code: "1.1.2", name: "Investasi Jangka Pendek", type: "ASSET", normalBalance: "DEBIT", isGroup: true, parentCode: "1.1" },
      { code: "1.1.2.001", name: "Investasi Jangka Pendek", type: "ASSET", normalBalance: "DEBIT", isGroup: false, parentCode: "1.1.2" },
      
      // 1.1.3 Piutang (113001-113099)
      { code: "1.1.3", name: "Piutang", type: "ASSET", normalBalance: "DEBIT", isGroup: true, parentCode: "1.1" },
      { code: "1.1.3.001", name: "Piutang uang pangkal", type: "ASSET", normalBalance: "DEBIT", isGroup: false, parentCode: "1.1.3" },
      { code: "1.1.3.002", name: "Piutang SPP", type: "ASSET", normalBalance: "DEBIT", isGroup: false, parentCode: "1.1.3" },
      { code: "1.1.3.003", name: "Piutang lainnya", type: "ASSET", normalBalance: "DEBIT", isGroup: false, parentCode: "1.1.3" },
      
      // 1.1.4 Persediaan (114001-114005)
      { code: "1.1.4", name: "Persediaan", type: "ASSET", normalBalance: "DEBIT", isGroup: true, parentCode: "1.1" },
      { code: "1.1.4.001", name: "Persediaan", type: "ASSET", normalBalance: "DEBIT", isGroup: false, parentCode: "1.1.4" },
      
      // 1.1.5 Perlengkapan (115001)
      { code: "1.1.5", name: "Perlengkapan", type: "ASSET", normalBalance: "DEBIT", isGroup: true, parentCode: "1.1" },
      { code: "1.1.5.001", name: "Perlengkapan", type: "ASSET", normalBalance: "DEBIT", isGroup: false, parentCode: "1.1.5" },
      
      // 1.1.6 Beban Dibayar Dimuka (116001)
      { code: "1.1.6", name: "Beban Dibayar Dimuka", type: "ASSET", normalBalance: "DEBIT", isGroup: true, parentCode: "1.1" },
      { code: "1.1.6.001", name: "Beban Dibayar Dimuka", type: "ASSET", normalBalance: "DEBIT", isGroup: false, parentCode: "1.1.6" },
      
      // 1.1.7 Uang Muka (117001-117003)
      { code: "1.1.7", name: "Uang Muka", type: "ASSET", normalBalance: "DEBIT", isGroup: true, parentCode: "1.1" },
      { code: "1.1.7.001", name: "Uang Muka Kerja", type: "ASSET", normalBalance: "DEBIT", isGroup: false, parentCode: "1.1.7" },
      { code: "1.1.7.002", name: "Uang Muka lainnya", type: "ASSET", normalBalance: "DEBIT", isGroup: false, parentCode: "1.1.7" },
      
      // 1.2 ASET TIDAK LANCAR
      { code: "1.2", name: "Aset Tidak Lancar", type: "ASSET", normalBalance: "DEBIT", isGroup: true, parentCode: "1" },
      
      // 1.2.1 Aset Tetap (121001-121037)
      { code: "1.2.1", name: "Aset Tetap", type: "ASSET", normalBalance: "DEBIT", isGroup: true, parentCode: "1.2" },
      { code: "1.2.1.001", name: "Tanah Masjid", type: "ASSET", normalBalance: "DEBIT", isGroup: false, parentCode: "1.2.1" },
      { code: "1.2.1.002", name: "Bangunan", type: "ASSET", normalBalance: "DEBIT", isGroup: false, parentCode: "1.2.1" },
      { code: "1.2.1.003", name: "Mobil", type: "ASSET", normalBalance: "DEBIT", isGroup: false, parentCode: "1.2.1" },
      { code: "1.2.1.004", name: "Motor", type: "ASSET", normalBalance: "DEBIT", isGroup: false, parentCode: "1.2.1" },
      { code: "1.2.1.005", name: "Inventaris", type: "ASSET", normalBalance: "DEBIT", isGroup: false, parentCode: "1.2.1" },
      { code: "1.2.1.006", name: "Peralatan Elektronik", type: "ASSET", normalBalance: "DEBIT", isGroup: false, parentCode: "1.2.1" },
      { code: "1.2.1.007", name: "Alat Peraga Pendidikan", type: "ASSET", normalBalance: "DEBIT", isGroup: false, parentCode: "1.2.1" },
      { code: "1.2.1.008", name: "Peralatan Musik", type: "ASSET", normalBalance: "DEBIT", isGroup: false, parentCode: "1.2.1" },
      { code: "1.2.1.009", name: "Peralatan Drumband", type: "ASSET", normalBalance: "DEBIT", isGroup: false, parentCode: "1.2.1" },
      { code: "1.2.1.010", name: "Buku-buku", type: "ASSET", normalBalance: "DEBIT", isGroup: false, parentCode: "1.2.1" },
      { code: "1.2.1.011", name: "Karpet", type: "ASSET", normalBalance: "DEBIT", isGroup: false, parentCode: "1.2.1" },
      { code: "1.2.1.012", name: "Gordyn", type: "ASSET", normalBalance: "DEBIT", isGroup: false, parentCode: "1.2.1" },
      { code: "1.2.1.013", name: "Terpal", type: "ASSET", normalBalance: "DEBIT", isGroup: false, parentCode: "1.2.1" },
      { code: "1.2.1.014", name: "Tenda Set", type: "ASSET", normalBalance: "DEBIT", isGroup: false, parentCode: "1.2.1" },
      { code: "1.2.1.015", name: "Aset Tetap Lainnya", type: "ASSET", normalBalance: "DEBIT", isGroup: false, parentCode: "1.2.1" },
      
      // 1.2.2 Aset Tidak Lancar Lainnya (122001)
      { code: "1.2.2", name: "Aset Tidak Lancar Lainnya", type: "ASSET", normalBalance: "DEBIT", isGroup: true, parentCode: "1.2" },
      { code: "1.2.2.001", name: "Aset Tidak Lancar Lainnya", type: "ASSET", normalBalance: "DEBIT", isGroup: false, parentCode: "1.2.2" },
      
      // 1.2.9 Akumulasi Penyusutan (129003-129008, normalBalance: KREDIT)
      { code: "1.2.9", name: "Akumulasi Penyusutan", type: "ASSET", normalBalance: "KREDIT", isGroup: true, parentCode: "1.2" },
      { code: "1.2.9.003", name: "Akum. Penyusutan Bangunan", type: "ASSET", normalBalance: "KREDIT", isGroup: false, parentCode: "1.2.9" },
      { code: "1.2.9.004", name: "Akum. Penyusutan Kendaraan", type: "ASSET", normalBalance: "KREDIT", isGroup: false, parentCode: "1.2.9" },
      { code: "1.2.9.005", name: "Akum. Penyusutan Inventaris", type: "ASSET", normalBalance: "KREDIT", isGroup: false, parentCode: "1.2.9" },
      { code: "1.2.9.006", name: "Akum. Penyusutan Peralatan Elektronik", type: "ASSET", normalBalance: "KREDIT", isGroup: false, parentCode: "1.2.9" },
      { code: "1.2.9.007", name: "Akum. Penyusutan Alat Peraga Pendidikan", type: "ASSET", normalBalance: "KREDIT", isGroup: false, parentCode: "1.2.9" },
      { code: "1.2.9.008", name: "Akum. Penyusutan Peralatan Musik", type: "ASSET", normalBalance: "KREDIT", isGroup: false, parentCode: "1.2.9" },
      
      // 1.2.10 RK Pusat (129001) - jika ada
      { code: "1.2.10", name: "RK Pusat", type: "ASSET", normalBalance: "DEBIT", isGroup: true, parentCode: "1.2" },
      { code: "1.2.10.001", name: "RK Pusat", type: "ASSET", normalBalance: "DEBIT", isGroup: false, parentCode: "1.2.10" },
      
      // ============================================
      // 2. KEWAJIBAN (LIABILITY) - Normal: KREDIT
      // ============================================
      { code: "2", name: "Liabilitas", type: "LIABILITY", normalBalance: "KREDIT", isGroup: true, parentId: null },
      
      // 2.1 LIABILITAS JANGKA PENDEK (211001-217001)
      { code: "2.1", name: "Liabilitas Jangka Pendek", type: "LIABILITY", normalBalance: "KREDIT", isGroup: true, parentCode: "2" },
      { code: "2.1.1", name: "Utang Usaha", type: "LIABILITY", normalBalance: "KREDIT", isGroup: true, parentCode: "2.1" },
      { code: "2.1.1.001", name: "Utang Pusat", type: "LIABILITY", normalBalance: "KREDIT", isGroup: false, parentCode: "2.1.1" },
      { code: "2.1.2", name: "Utang Lembaga Keuangan", type: "LIABILITY", normalBalance: "KREDIT", isGroup: true, parentCode: "2.1" },
      { code: "2.1.2.001", name: "Utang Lembaga Keuangan", type: "LIABILITY", normalBalance: "KREDIT", isGroup: false, parentCode: "2.1.2" },
      { code: "2.1.3", name: "Utang Pajak", type: "LIABILITY", normalBalance: "KREDIT", isGroup: true, parentCode: "2.1" },
      { code: "2.1.3.001", name: "Utang PPh", type: "LIABILITY", normalBalance: "KREDIT", isGroup: false, parentCode: "2.1.3" },
      { code: "2.1.4", name: "Uang Titipan", type: "LIABILITY", normalBalance: "KREDIT", isGroup: true, parentCode: "2.1" },
      { code: "2.1.4.001", name: "Uang Titipan", type: "LIABILITY", normalBalance: "KREDIT", isGroup: false, parentCode: "2.1.4" },
      { code: "2.1.5", name: "Pendapatan Diterima Di Muka", type: "LIABILITY", normalBalance: "KREDIT", isGroup: true, parentCode: "2.1" },
      { code: "2.1.5.001", name: "Pendapatan Diterima Di Muka", type: "LIABILITY", normalBalance: "KREDIT", isGroup: false, parentCode: "2.1.5" },
      { code: "2.1.6", name: "Beban Yang Masih Harus Dibayar", type: "LIABILITY", normalBalance: "KREDIT", isGroup: true, parentCode: "2.1" },
      { code: "2.1.6.001", name: "Beban Yang Masih Harus Dibayar", type: "LIABILITY", normalBalance: "KREDIT", isGroup: false, parentCode: "2.1.6" },
      { code: "2.1.7", name: "Utang Jangka Pendek Lainnya", type: "LIABILITY", normalBalance: "KREDIT", isGroup: true, parentCode: "2.1" },
      { code: "2.1.7.001", name: "Utang Jangka Pendek Lainnya", type: "LIABILITY", normalBalance: "KREDIT", isGroup: false, parentCode: "2.1.7" },
      
      // 2.2 LIABILITAS JANGKA PANJANG (221001-229001)
      { code: "2.2", name: "Liabilitas Jangka Panjang", type: "LIABILITY", normalBalance: "KREDIT", isGroup: true, parentCode: "2" },
      { code: "2.2.1", name: "Utang Jangka Panjang Lembaga Keuangan", type: "LIABILITY", normalBalance: "KREDIT", isGroup: true, parentCode: "2.2" },
      { code: "2.2.1.001", name: "Utang Jangka Panjang Lembaga Keuangan", type: "LIABILITY", normalBalance: "KREDIT", isGroup: false, parentCode: "2.2.1" },
      { code: "2.2.8", name: "Utang Jangka Panjang Lainnya", type: "LIABILITY", normalBalance: "KREDIT", isGroup: true, parentCode: "2.2" },
      { code: "2.2.8.001", name: "Utang Jangka Panjang Lainnya", type: "LIABILITY", normalBalance: "KREDIT", isGroup: false, parentCode: "2.2.8" },
      { code: "2.2.9", name: "RK Unit", type: "LIABILITY", normalBalance: "KREDIT", isGroup: true, parentCode: "2.2" },
      { code: "2.2.9.001", name: "RK Unit", type: "LIABILITY", normalBalance: "KREDIT", isGroup: false, parentCode: "2.2.9" },
      
      // ============================================
      // 3. ASET NETO (EQUITY) - Normal: KREDIT
      // ============================================
      { code: "3", name: "Aset Neto", type: "EQUITY", normalBalance: "KREDIT", isGroup: true, parentId: null },
      
      // Akun ekuitas langsung di bawah parent 3
      // Routing "Tanpa Pembatasan" vs "Dengan Pembatasan" berdasarkan hasRestriction flag di entry jurnal
      { code: "3.1", name: "Aset Neto Tahun Lalu", type: "EQUITY", normalBalance: "KREDIT", isGroup: false, parentCode: "3" },
      { code: "3.2", name: "Aset Neto Tahun Berjalan", type: "EQUITY", normalBalance: "KREDIT", isGroup: false, parentCode: "3" },
      
      // ============================================
      // 4. PENDAPATAN (REVENUE) - Normal: KREDIT
      // ============================================
      { code: "4", name: "Pendapatan", type: "REVENUE", normalBalance: "KREDIT", isGroup: true, parentId: null },
      
      // 4.1 Penerimaan ZISWAF (411001-418039)
      { code: "4.1", name: "Penerimaan ZISWAF", type: "REVENUE", normalBalance: "KREDIT", isGroup: true, parentCode: "4" },
      { code: "4.1.1", name: "Penerimaan Zakat", type: "REVENUE", normalBalance: "KREDIT", isGroup: false, parentCode: "4.1" },
      { code: "4.1.2", name: "Penerimaan Infaq/Maal", type: "REVENUE", normalBalance: "KREDIT", isGroup: false, parentCode: "4.1" },
      { code: "4.1.3", name: "Penerimaan Shodaqoh", type: "REVENUE", normalBalance: "KREDIT", isGroup: false, parentCode: "4.1" },
      { code: "4.1.4", name: "Penerimaan Wakaf", type: "REVENUE", normalBalance: "KREDIT", isGroup: false, parentCode: "4.1" },
      { code: "4.1.5", name: "Penerimaan Fidyah", type: "REVENUE", normalBalance: "KREDIT", isGroup: false, parentCode: "4.1" },
      
      // 4.2 Penerimaan Qurban (421001-421005)
      { code: "4.2", name: "Penerimaan Qurban", type: "REVENUE", normalBalance: "KREDIT", isGroup: true, parentCode: "4" },
      { code: "4.2.1", name: "Penerimaan Mustahiq", type: "REVENUE", normalBalance: "KREDIT", isGroup: false, parentCode: "4.2" },
      { code: "4.2.2", name: "Penerimaan Qurban", type: "REVENUE", normalBalance: "KREDIT", isGroup: false, parentCode: "4.2" },
      { code: "4.2.3", name: "Penerimaan Lainnya", type: "REVENUE", normalBalance: "KREDIT", isGroup: false, parentCode: "4.2" },
      
      // 4.3 Penerimaan Pendidikan (431001-431019)
      { code: "4.3", name: "Penerimaan Pendidikan", type: "REVENUE", normalBalance: "KREDIT", isGroup: true, parentCode: "4" },
      { code: "4.3.1", name: "Uang Pangkal", type: "REVENUE", normalBalance: "KREDIT", isGroup: false, parentCode: "4.3" },
      { code: "4.3.2", name: "SPP", type: "REVENUE", normalBalance: "KREDIT", isGroup: false, parentCode: "4.3" },
      { code: "4.3.3", name: "SPP lainnya", type: "REVENUE", normalBalance: "KREDIT", isGroup: false, parentCode: "4.3" },
      
      // 4.4 Penerimaan Lainnya (441001-442001)
      { code: "4.4", name: "Penerimaan Lainnya", type: "REVENUE", normalBalance: "KREDIT", isGroup: true, parentCode: "4" },
      { code: "4.4.1", name: "Bagi Hasil Bank", type: "REVENUE", normalBalance: "KREDIT", isGroup: false, parentCode: "4.4" },
      { code: "4.4.2", name: "Penerimaan Lain-Lain", type: "REVENUE", normalBalance: "KREDIT", isGroup: false, parentCode: "4.4" },
      
      // 4.9 Aset Neto Yang Berakhir Pembatasannya (491001-493001)
      { code: "4.9", name: "Aset Neto Yang Berakhir Pembatasannya", type: "REVENUE", normalBalance: "KREDIT", isGroup: true, parentCode: "4" },
      { code: "4.9.1", name: "Pemenuhan Program Pembatasan", type: "REVENUE", normalBalance: "KREDIT", isGroup: false, parentCode: "4.9" },
      { code: "4.9.2", name: "Pemenuhan Pembatasan Pemerolehan Aset Tetap", type: "REVENUE", normalBalance: "KREDIT", isGroup: false, parentCode: "4.9" },
      { code: "4.9.3", name: "Berakhirnya Pembatasan Waktu", type: "REVENUE", normalBalance: "KREDIT", isGroup: false, parentCode: "4.9" },
      
      // ============================================
      // 5. BEBAN (EXPENSE) - Normal: DEBIT
      // ============================================
      { code: "5", name: "Beban", type: "EXPENSE", normalBalance: "DEBIT", isGroup: true, parentId: null },
      
      // 5.1 Penyaluran ZISWAF (511001-511016)
      { code: "5.1", name: "Penyaluran ZISWAF", type: "EXPENSE", normalBalance: "DEBIT", isGroup: true, parentCode: "5" },
      { code: "5.1.1", name: "Penyaluran Zakat", type: "EXPENSE", normalBalance: "DEBIT", isGroup: true, parentCode: "5.1" },
      { code: "5.1.1.001", name: "Fakir", type: "EXPENSE", normalBalance: "DEBIT", isGroup: false, parentCode: "5.1.1" },
      { code: "5.1.1.002", name: "Miskin", type: "EXPENSE", normalBalance: "DEBIT", isGroup: false, parentCode: "5.1.1" },
      { code: "5.1.1.003", name: "Amil", type: "EXPENSE", normalBalance: "DEBIT", isGroup: false, parentCode: "5.1.1" },
      { code: "5.1.1.004", name: "Muallaf", type: "EXPENSE", normalBalance: "DEBIT", isGroup: false, parentCode: "5.1.1" },
      { code: "5.1.1.005", name: "Riqab", type: "EXPENSE", normalBalance: "DEBIT", isGroup: false, parentCode: "5.1.1" },
      { code: "5.1.1.006", name: "Gharimin", type: "EXPENSE", normalBalance: "DEBIT", isGroup: false, parentCode: "5.1.1" },
      { code: "5.1.1.007", name: "Fi Sabilillah", type: "EXPENSE", normalBalance: "DEBIT", isGroup: false, parentCode: "5.1.1" },
      { code: "5.1.1.008", name: "Ibnus Sabil", type: "EXPENSE", normalBalance: "DEBIT", isGroup: false, parentCode: "5.1.1" },
      { code: "5.1.2", name: "Penyaluran Infaq", type: "EXPENSE", normalBalance: "DEBIT", isGroup: true, parentCode: "5.1" },
      { code: "5.1.2.001", name: "Penyaluran Infaq", type: "EXPENSE", normalBalance: "DEBIT", isGroup: false, parentCode: "5.1.2" },
      { code: "5.1.3", name: "Penyaluran Shodaqoh", type: "EXPENSE", normalBalance: "DEBIT", isGroup: true, parentCode: "5.1" },
      { code: "5.1.3.001", name: "Penyaluran Shodaqoh", type: "EXPENSE", normalBalance: "DEBIT", isGroup: false, parentCode: "5.1.3" },
      { code: "5.1.4", name: "Beban Wakaf", type: "EXPENSE", normalBalance: "DEBIT", isGroup: true, parentCode: "5.1" },
      { code: "5.1.4.001", name: "Beban Wakaf", type: "EXPENSE", normalBalance: "DEBIT", isGroup: false, parentCode: "5.1.4" },
      
      // 5.2 Penyaluran Qurban (521001)
      { code: "5.2", name: "Penyaluran Qurban", type: "EXPENSE", normalBalance: "DEBIT", isGroup: true, parentCode: "5" },
      { code: "5.2.1", name: "Penyaluran Qurban", type: "EXPENSE", normalBalance: "DEBIT", isGroup: false, parentCode: "5.2" },
      
      // 5.3 Infaq (531001-532001)
      { code: "5.3", name: "Infaq", type: "EXPENSE", normalBalance: "DEBIT", isGroup: true, parentCode: "5" },
      { code: "5.3.1", name: "Infaq Khotib/Imam/Penceramah", type: "EXPENSE", normalBalance: "DEBIT", isGroup: false, parentCode: "5.3" },
      { code: "5.3.2", name: "Infaq Marbot Masjid", type: "EXPENSE", normalBalance: "DEBIT", isGroup: false, parentCode: "5.3" },
      
      // 5.4 Beban Umum dan Administrasi (541001-549001)
      { code: "5.4", name: "Beban Umum dan Administrasi", type: "EXPENSE", normalBalance: "DEBIT", isGroup: true, parentCode: "5" },
      { code: "5.4.1", name: "Beban Umum", type: "EXPENSE", normalBalance: "DEBIT", isGroup: true, parentCode: "5.4" },
      { code: "5.4.1.001", name: "Beban ATK", type: "EXPENSE", normalBalance: "DEBIT", isGroup: false, parentCode: "5.4.1" },
      { code: "5.4.1.002", name: "Foto Copy", type: "EXPENSE", normalBalance: "DEBIT", isGroup: false, parentCode: "5.4.1" },
      { code: "5.4.1.003", name: "Tinta/Toner", type: "EXPENSE", normalBalance: "DEBIT", isGroup: false, parentCode: "5.4.1" },
      { code: "5.4.1.004", name: "Transport", type: "EXPENSE", normalBalance: "DEBIT", isGroup: false, parentCode: "5.4.1" },
      { code: "5.4.1.005", name: "Parkir dan Tol", type: "EXPENSE", normalBalance: "DEBIT", isGroup: false, parentCode: "5.4.1" },
      { code: "5.4.1.006", name: "Listrik", type: "EXPENSE", normalBalance: "DEBIT", isGroup: false, parentCode: "5.4.1" },
      { code: "5.4.1.007", name: "Telepon/Internet", type: "EXPENSE", normalBalance: "DEBIT", isGroup: false, parentCode: "5.4.1" },
      { code: "5.4.1.008", name: "Pulsa", type: "EXPENSE", normalBalance: "DEBIT", isGroup: false, parentCode: "5.4.1" },
      { code: "5.4.1.009", name: "Koran/Majalah/Buletin", type: "EXPENSE", normalBalance: "DEBIT", isGroup: false, parentCode: "5.4.1" },
      { code: "5.4.1.010", name: "Pos/Kurir", type: "EXPENSE", normalBalance: "DEBIT", isGroup: false, parentCode: "5.4.1" },
      { code: "5.4.1.011", name: "Konsumsi", type: "EXPENSE", normalBalance: "DEBIT", isGroup: false, parentCode: "5.4.1" },
      { code: "5.4.1.012", name: "Perlengkapan Kebersihan", type: "EXPENSE", normalBalance: "DEBIT", isGroup: false, parentCode: "5.4.1" },
      { code: "5.4.1.013", name: "Air dan Melawar", type: "EXPENSE", normalBalance: "DEBIT", isGroup: false, parentCode: "5.4.1" },
      { code: "5.4.1.014", name: "Bank", type: "EXPENSE", normalBalance: "DEBIT", isGroup: false, parentCode: "5.4.1" },
      { code: "5.4.1.015", name: "Kebutuhan Rumah Tangga", type: "EXPENSE", normalBalance: "DEBIT", isGroup: false, parentCode: "5.4.1" },
      { code: "5.4.1.016", name: "Asuransi", type: "EXPENSE", normalBalance: "DEBIT", isGroup: false, parentCode: "5.4.1" },
      { code: "5.4.1.017", name: "Langganan PAN", type: "EXPENSE", normalBalance: "DEBIT", isGroup: false, parentCode: "5.4.1" },
      { code: "5.4.1.018", name: "Seminar, Workshop, dan Diklat", type: "EXPENSE", normalBalance: "DEBIT", isGroup: false, parentCode: "5.4.1" },
      { code: "5.4.1.019", name: "Umum dan Administrasi Lainnya", type: "EXPENSE", normalBalance: "DEBIT", isGroup: false, parentCode: "5.4.1" },
      { code: "5.4.2", name: "Beban Humas", type: "EXPENSE", normalBalance: "DEBIT", isGroup: true, parentCode: "5.4" },
      { code: "5.4.2.001", name: "Cetak/Jilid", type: "EXPENSE", normalBalance: "DEBIT", isGroup: false, parentCode: "5.4.2" },
      { code: "5.4.2.002", name: "Sumbangan", type: "EXPENSE", normalBalance: "DEBIT", isGroup: false, parentCode: "5.4.2" },
      { code: "5.4.2.003", name: "Kunjungan/Studi Banding", type: "EXPENSE", normalBalance: "DEBIT", isGroup: false, parentCode: "5.4.2" },
      { code: "5.4.2.004", name: "Web/Portal", type: "EXPENSE", normalBalance: "DEBIT", isGroup: false, parentCode: "5.4.2" },
      { code: "5.4.2.005", name: "Konsultan", type: "EXPENSE", normalBalance: "DEBIT", isGroup: false, parentCode: "5.4.2" },
      { code: "5.4.2.006", name: "Kehumasan Lainnya", type: "EXPENSE", normalBalance: "DEBIT", isGroup: false, parentCode: "5.4.2" },
      { code: "5.4.3", name: "Beban Pemeliharaan", type: "EXPENSE", normalBalance: "DEBIT", isGroup: true, parentCode: "5.4" },
      { code: "5.4.3.001", name: "Beban Pemeliharaan Bangunan", type: "EXPENSE", normalBalance: "DEBIT", isGroup: false, parentCode: "5.4.3" },
      { code: "5.4.3.002", name: "Beban Pemeliharaan Kendaraan", type: "EXPENSE", normalBalance: "DEBIT", isGroup: false, parentCode: "5.4.3" },
      { code: "5.4.3.003", name: "Beban Pemeliharaan Peralatan", type: "EXPENSE", normalBalance: "DEBIT", isGroup: false, parentCode: "5.4.3" },
      { code: "5.4.3.004", name: "Beban Pemeliharaan Lainnya", type: "EXPENSE", normalBalance: "DEBIT", isGroup: false, parentCode: "5.4.3" },
      { code: "5.4.4", name: "Beban Penyusutan", type: "EXPENSE", normalBalance: "DEBIT", isGroup: true, parentCode: "5.4" },
      { code: "5.4.4.001", name: "Beban Penyusutan Bangunan", type: "EXPENSE", normalBalance: "DEBIT", isGroup: false, parentCode: "5.4.4" },
      { code: "5.4.4.002", name: "Beban Penyusutan Kendaraan", type: "EXPENSE", normalBalance: "DEBIT", isGroup: false, parentCode: "5.4.4" },
      { code: "5.4.4.003", name: "Beban Penyusutan Inventaris", type: "EXPENSE", normalBalance: "DEBIT", isGroup: false, parentCode: "5.4.4" },
      { code: "5.4.4.004", name: "Beban Penyusutan Peralatan Elektronik", type: "EXPENSE", normalBalance: "DEBIT", isGroup: false, parentCode: "5.4.4" },
      { code: "5.4.4.005", name: "Beban Penyusutan Alat Peraga Pendidikan", type: "EXPENSE", normalBalance: "DEBIT", isGroup: false, parentCode: "5.4.4" },
      { code: "5.4.4.006", name: "Beban Penyusutan Peralatan Musik", type: "EXPENSE", normalBalance: "DEBIT", isGroup: false, parentCode: "5.4.4" },
      { code: "5.4.9", name: "Beban Lain-Lain", type: "EXPENSE", normalBalance: "DEBIT", isGroup: true, parentCode: "5.4" },
      { code: "5.4.9.001", name: "Beban Lain-lain", type: "EXPENSE", normalBalance: "DEBIT", isGroup: false, parentCode: "5.4.9" },
      
      // 5.5 Kerugian Akibat Kebakaran (551001)
      { code: "5.5", name: "Kerugian", type: "EXPENSE", normalBalance: "DEBIT", isGroup: true, parentCode: "5" },
      { code: "5.5.1", name: "Kerugian Akibat Kebakaran", type: "EXPENSE", normalBalance: "DEBIT", isGroup: true, parentCode: "5.5" },
      { code: "5.5.1.001", name: "Kerugian akibat kebakaran", type: "EXPENSE", normalBalance: "DEBIT", isGroup: false, parentCode: "5.5.1" },
      
      // 5.6 Kerugian Aktuarial (561001)
      { code: "5.6", name: "Kerugian Aktuarial", type: "EXPENSE", normalBalance: "DEBIT", isGroup: true, parentCode: "5" },
      { code: "5.6.1", name: "Kerugian Aktuarial Dan Kewajiban Tahunan", type: "EXPENSE", normalBalance: "DEBIT", isGroup: true, parentCode: "5.6" },
      { code: "5.6.1.001", name: "Kerugian aktuarial dan kewajiban lainnya", type: "EXPENSE", normalBalance: "DEBIT", isGroup: false, parentCode: "5.6.1" },
      
      // ============================================
      // 6. PENGHASILAN KOMPREHENSIF LAIN (REVENUE) - Normal: KREDIT
      // ============================================
      { code: "6", name: "Penghasilan Komprehensif Lain", type: "REVENUE", normalBalance: "KREDIT", isGroup: true, parentId: null },
      { code: "6.1", name: "Penghasilan Komprehensif Lain", type: "REVENUE", normalBalance: "KREDIT", isGroup: true, parentCode: "6" },
      { code: "6.1.1", name: "Penghasilan Komprehensif Lain", type: "REVENUE", normalBalance: "KREDIT", isGroup: false, parentCode: "6.1" },
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
          },
        });

        accountMap.set(accData.code, account);
        createdAccounts.push(account);
      }

      return createdAccounts;
    });

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

