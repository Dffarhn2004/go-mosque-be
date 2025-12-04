const prisma = require("../utils/prisma_client");
const CustomError = require("../utils/custom_error");
const {
  getAllAccountBalances,
  getAllAccountBalancesByRestriction,
} = require("../utils/jurnal_utils");

/**
 * Get all jurnal transactions dengan filter
 * @param {Object} filters - Filter options
 * @param {string} filters.masjidId - Masjid ID (required)
 * @param {Date} filters.tanggalAwal - Start date (optional)
 * @param {Date} filters.tanggalAkhir - End date (optional)
 * @param {string} filters.akunId - Account ID (optional)
 * @param {string} filters.tipe - DEBIT atau KREDIT (optional)
 * @returns {Promise<Array>} Array of jurnal transactions with entries
 */
async function getAllJurnalTransactions(filters = {}) {
  try {
    const { masjidId, tanggalAwal, tanggalAkhir, akunId, tipe } = filters;

    if (!masjidId) {
      throw new CustomError("masjidId is required", 400);
    }

    const where = {
      masjidId,
    };

    // Filter by date range
    if (tanggalAwal || tanggalAkhir) {
      where.tanggal = {};
      if (tanggalAwal) {
        where.tanggal.gte = new Date(tanggalAwal);
      }
      if (tanggalAkhir) {
        where.tanggal.lte = new Date(tanggalAkhir);
      }
    }

    // Filter by account (through entries)
    if (akunId) {
      where.entries = {
        some: {
          akunId: akunId,
        },
      };
    }

    // Filter by tipe (through entries)
    if (tipe) {
      where.entries = {
        ...where.entries,
        some: {
          ...where.entries?.some,
          tipe: tipe,
        },
      };
    }

    const transactions = await prisma.jurnalTransaction.findMany({
      where,
      include: {
        entries: {
          include: {
            akun: {
              select: {
                id: true,
                code: true,
                name: true,
                type: true,
                pathCode: true,
                normalBalance: true,
                restriction: true,
                report: true,
                category: true,
              },
            },
          },
          orderBy: [
            { tipe: "asc" }, // DEBIT first, then KREDIT
            { createdAt: "asc" },
          ],
        },
        masjid: {
          select: {
            id: true,
            Nama: true,
          },
        },
      },
      orderBy: [{ tanggal: "desc" }, { createdAt: "desc" }],
    });

    return transactions;
  } catch (error) {
    console.error("Error fetching jurnal transactions:", error);
    if (error instanceof CustomError) throw error;
    throw new Error("Failed to fetch jurnal transactions");
  }
}

/**
 * Get jurnal transaction by ID
 * @param {string} id - Transaction ID
 * @returns {Promise<Object>} Transaction object with entries
 */
async function getJurnalTransactionById(id) {
  try {
    const transaction = await prisma.jurnalTransaction.findUnique({
      where: { id },
      include: {
        entries: {
          include: {
            akun: {
              select: {
                id: true,
                code: true,
                name: true,
                type: true,
                pathCode: true,
                normalBalance: true,
                restriction: true,
                report: true,
                category: true,
              },
            },
          },
          orderBy: [
            { tipe: "asc" },
            { createdAt: "asc" },
          ],
        },
        masjid: {
          select: {
            id: true,
            Nama: true,
          },
        },
      },
    });

    if (!transaction) {
      throw new CustomError("Jurnal transaction not found", 404);
    }

    return transaction;
  } catch (error) {
    console.error("Error fetching jurnal transaction by ID:", error);
    if (error instanceof CustomError) throw error;
    throw new Error("Failed to fetch jurnal transaction");
  }
}

/**
 * Create new jurnal transaction dengan entries (double-entry)
 * @param {Object} transactionData - Transaction data
 * @param {string} transactionData.masjidId - Masjid ID
 * @param {Date} transactionData.tanggal - Transaction date
 * @param {string} transactionData.keterangan - Description
 * @param {string} transactionData.referensi - Reference (optional)
 * @param {Array} transactionData.entries - Array of entries [{ akunId, tipe, jumlah }]
 * @returns {Promise<Object>} Created transaction with entries
 */
async function createJurnalTransaction(transactionData) {
  try {
    const { masjidId, tanggal, keterangan, referensi, entries } = transactionData;

    // Validate required fields - keterangan sekarang optional (di level entry)
    if (!masjidId || !tanggal || !entries || !Array.isArray(entries)) {
      throw new CustomError(
        "masjidId, tanggal, and entries (array) are required",
        400
      );
    }

    // Validate entries - minimal 1 entry, tidak perlu harus DEBIT dan KREDIT
    if (entries.length < 1) {
      throw new CustomError("Transaction must have at least 1 entry", 400);
    }

    for (const entry of entries) {
      if (!entry.akunId || !entry.tipe || !entry.jumlah) {
        throw new CustomError("Each entry must have akunId, tipe, and jumlah", 400);
      }

      if (entry.tipe !== "DEBIT" && entry.tipe !== "KREDIT") {
        throw new CustomError("Entry tipe must be DEBIT or KREDIT", 400);
      }

      if (Number(entry.jumlah) <= 0) {
        throw new CustomError("Entry jumlah must be greater than 0", 400);
      }
    }

    // Tidak perlu validasi balance - tidak balance itu tidak apa-apa
    // Tidak perlu validasi harus ada DEBIT dan KREDIT - bisa nyicil bertahap

    // Check if masjid exists
    const masjid = await prisma.masjid.findUnique({
      where: { id: masjidId },
    });

    if (!masjid) {
      throw new CustomError("Masjid not found", 404);
    }

    // Validate all accounts
    const accountIds = entries.map((e) => e.akunId);
    const accounts = await prisma.account.findMany({
      where: {
        id: { in: accountIds },
      },
    });

    if (accounts.length !== accountIds.length) {
      throw new CustomError("One or more accounts not found", 404);
    }

    // Create map for quick lookup
    const accountMap = new Map(accounts.map((acc) => [acc.id, acc]));

    // Check all accounts are valid
    for (const account of accounts) {
      if (!account.isActive) {
        throw new CustomError(`Account ${account.name} is not active`, 400);
      }

      if (account.isGroup) {
        throw new CustomError(`Cannot use group account ${account.name} for jurnal`, 400);
      }
    }

    // Set default hasRestriction dari Account.restriction jika tidak diisi
    entries.forEach((entry) => {
      if (entry.hasRestriction === undefined || entry.hasRestriction === null) {
        const account = accountMap.get(entry.akunId);
        if (account && account.restriction) {
          entry.hasRestriction = account.restriction === "DENGAN_PEMBATASAN";
        } else {
          entry.hasRestriction = false; // Default
        }
      }
    });

    // Create transaction with entries in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create transaction
      const transaction = await tx.jurnalTransaction.create({
        data: {
          masjidId,
          tanggal: new Date(tanggal),
          keterangan: keterangan || "", // Keterangan di transaction level (opsional)
          referensi: referensi || null,
        },
      });

      // Create entries
      const createdEntries = await Promise.all(
        entries.map((entry) =>
          tx.jurnalEntry.create({
            data: {
              transactionId: transaction.id,
              akunId: entry.akunId,
              tipe: entry.tipe,
              jumlah: Number(entry.jumlah),
              hasRestriction: entry.hasRestriction || false,
              keterangan: entry.keterangan || null,
            },
            include: {
              akun: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  type: true,
                  pathCode: true,
                },
              },
            },
          })
        )
      );

      return {
        ...transaction,
        entries: createdEntries,
      };
    });

    // Fetch full transaction with relations
    return await getJurnalTransactionById(result.id);
  } catch (error) {
    console.error("Error creating jurnal transaction:", error);
    if (error instanceof CustomError) throw error;
    throw new Error("Failed to create jurnal transaction");
  }
}

/**
 * Update jurnal transaction
 * @param {string} id - Transaction ID
 * @param {Object} transactionData - Updated transaction data
 * @returns {Promise<Object>} Updated transaction
 */
async function updateJurnalTransaction(id, transactionData) {
  try {
    // Check if transaction exists
    const existing = await prisma.jurnalTransaction.findUnique({
      where: { id },
      include: {
        entries: true,
      },
    });

    if (!existing) {
      throw new CustomError("Jurnal transaction not found", 404);
    }

    // If entries are provided, validate entries - minimal 1 entry, tidak perlu harus DEBIT dan KREDIT
    if (transactionData.entries && Array.isArray(transactionData.entries)) {
      if (transactionData.entries.length < 1) {
        throw new CustomError("Transaction must have at least 1 entry", 400);
      }

      for (const entry of transactionData.entries) {
        if (!entry.akunId || !entry.tipe || !entry.jumlah) {
          throw new CustomError("Each entry must have akunId, tipe, and jumlah", 400);
        }

        if (entry.tipe !== "DEBIT" && entry.tipe !== "KREDIT") {
          throw new CustomError("Entry tipe must be DEBIT or KREDIT", 400);
        }

        if (Number(entry.jumlah) <= 0) {
          throw new CustomError("Entry jumlah must be greater than 0", 400);
        }
      }

      // Tidak perlu validasi balance - tidak balance itu tidak apa-apa

      // Validate accounts
      const accountIds = transactionData.entries.map((e) => e.akunId);
      const accounts = await prisma.account.findMany({
        where: {
          id: { in: accountIds },
        },
      });

      if (accounts.length !== accountIds.length) {
        throw new CustomError("One or more accounts not found", 404);
      }

      // Create map for quick lookup
      const accountMap = new Map(accounts.map((acc) => [acc.id, acc]));

      for (const account of accounts) {
        if (!account.isActive) {
          throw new CustomError(`Account ${account.name} is not active`, 400);
        }

        if (account.isGroup) {
          throw new CustomError(`Cannot use group account ${account.name} for jurnal`, 400);
        }
      }

      // Set default hasRestriction dari Account.restriction jika tidak diisi
      transactionData.entries.forEach((entry) => {
        if (entry.hasRestriction === undefined || entry.hasRestriction === null) {
          const account = accountMap.get(entry.akunId);
          if (account && account.restriction) {
            entry.hasRestriction = account.restriction === "DENGAN_PEMBATASAN";
          } else {
            entry.hasRestriction = false; // Default
          }
        }
      });
    }

    // Update transaction and entries in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update transaction header
      const updateData = {};
      if (transactionData.tanggal) updateData.tanggal = new Date(transactionData.tanggal);
      if (transactionData.keterangan !== undefined) updateData.keterangan = transactionData.keterangan;
      if (transactionData.referensi !== undefined) updateData.referensi = transactionData.referensi;

      const transaction = await tx.jurnalTransaction.update({
        where: { id },
        data: updateData,
      });

      // If entries are provided, replace all entries
      if (transactionData.entries) {
        // Delete existing entries
        await tx.jurnalEntry.deleteMany({
          where: { transactionId: id },
        });

        // Create new entries
        await Promise.all(
          transactionData.entries.map((entry) =>
            tx.jurnalEntry.create({
              data: {
                transactionId: id,
                akunId: entry.akunId,
                tipe: entry.tipe,
                jumlah: Number(entry.jumlah),
                hasRestriction: entry.hasRestriction || false,
                keterangan: entry.keterangan || null,
              },
            })
          )
        );
      }

      return transaction;
    });

    // Fetch full transaction with relations
    return await getJurnalTransactionById(result.id);
  } catch (error) {
    console.error("Error updating jurnal transaction:", error);
    if (error instanceof CustomError) throw error;
    throw new Error("Failed to update jurnal transaction");
  }
}

/**
 * Delete jurnal transaction (entries will be cascade deleted)
 * @param {string} id - Transaction ID
 * @returns {Promise<Object>} Deleted transaction
 */
async function deleteJurnalTransaction(id) {
  try {
    // Check if transaction exists
    const transaction = await prisma.jurnalTransaction.findUnique({
      where: { id },
    });

    if (!transaction) {
      throw new CustomError("Jurnal transaction not found", 404);
    }

    // Delete transaction (entries will be cascade deleted)
    const deleted = await prisma.jurnalTransaction.delete({
      where: { id },
    });

    return deleted;
  } catch (error) {
    console.error("Error deleting jurnal transaction:", error);
    if (error instanceof CustomError) throw error;
    throw new Error("Failed to delete jurnal transaction");
  }
}

/**
 * Calculate account balances untuk semua akun
 * @param {string} masjidId - Masjid ID
 * @param {Date} endDate - End date untuk filter (optional, default: now)
 * @returns {Promise<Object>} Object dengan account balances
 */
async function calculateAccountBalances(masjidId, endDate = null) {
  try {
    if (!masjidId) {
      throw new CustomError("masjidId is required", 400);
    }

    // Get all active accounts (default + custom untuk masjid)
    const accounts = await prisma.account.findMany({
      where: {
        OR: [
          { masjidId: null }, // Default accounts
          { masjidId }, // Custom accounts for masjid
        ],
        isActive: true,
        isGroup: false, // Only detail accounts
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
      },
    });

    // Get all jurnal entries until endDate
    const entryFilters = {
      transaction: {
        masjidId: masjidId,
      },
    };

    if (endDate) {
      entryFilters.transaction.tanggal = {
        lte: new Date(endDate),
      };
    }

    const entries = await prisma.jurnalEntry.findMany({
      where: entryFilters,
      include: {
        akun: true,
        transaction: {
          select: {
            id: true,
            tanggal: true,
          },
        },
      },
    });

    // Calculate balances
    const balances = getAllAccountBalances(accounts, entries, endDate);

    return balances;
  } catch (error) {
    console.error("Error calculating account balances:", error);
    if (error instanceof CustomError) throw error;
    throw new Error("Failed to calculate account balances");
  }
}

/**
 * Calculate account balances separated by restriction untuk semua akun
 * @param {string} masjidId - Masjid ID
 * @param {Date} endDate - End date untuk filter (optional, default: now)
 * @returns {Promise<Object>} Object dengan account balances separated by restriction
 */
async function calculateAccountBalancesByRestriction(masjidId, endDate = null) {
  try {
    if (!masjidId) {
      throw new CustomError("masjidId is required", 400);
    }

    // Get all active accounts (default + custom untuk masjid)
    const accounts = await prisma.account.findMany({
      where: {
        OR: [
          { masjidId: null }, // Default accounts
          { masjidId }, // Custom accounts for masjid
        ],
        isActive: true,
        isGroup: false, // Only detail accounts
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
      },
    });

    // Get all jurnal entries until endDate
    const entryFilters = {
      transaction: {
        masjidId: masjidId,
      },
    };

    if (endDate) {
      // Pastikan endDate adalah Date object dan set ke akhir hari untuk memastikan semua transaksi pada hari tersebut terhitung
      const endDateObj = new Date(endDate);
      // Jika endDate sudah di-set ke 23:59:59.999, gunakan langsung
      // Jika belum, set ke akhir hari
      if (endDateObj.getHours() === 0 && endDateObj.getMinutes() === 0 && endDateObj.getSeconds() === 0) {
        endDateObj.setHours(23, 59, 59, 999);
      }
      
      entryFilters.transaction.tanggal = {
        lte: endDateObj,
      };
    }

    const entries = await prisma.jurnalEntry.findMany({
      where: entryFilters,
      include: {
        akun: true,
        transaction: {
          select: {
            id: true,
            tanggal: true,
          },
        },
      },
    });

    // Debug: log untuk melihat transaksi yang terambil
    if (endDate) {
      console.log('DEBUG - calculateAccountBalancesByRestriction:');
      console.log('  - endDate:', endDate);
      console.log('  - endDate ISO:', new Date(endDate).toISOString());
      console.log('  - Jumlah entries terambil:', entries.length);
      if (entries.length > 0) {
        console.log('  - Sample entries (first 5):');
        entries.slice(0, 5).forEach((entry, idx) => {
          console.log(`    ${idx + 1}. Akun: ${entry.akun.code} (${entry.akun.name}), Tipe: ${entry.tipe}, Jumlah: ${entry.jumlah}, Tanggal: ${entry.transaction.tanggal.toISOString()}`);
        });
      }
    }

    // Calculate balances by restriction
    // Pass endDate yang sudah di-normalize untuk filter di getAllAccountBalancesByRestriction
    const balances = getAllAccountBalancesByRestriction(accounts, entries, endDate);

    return balances;
  } catch (error) {
    console.error("Error calculating account balances by restriction:", error);
    if (error instanceof CustomError) throw error;
    throw new Error("Failed to calculate account balances by restriction");
  }
}

// Backward compatibility: keep old function names that map to new ones
const getAllJurnals = getAllJurnalTransactions;
const getJurnalById = getJurnalTransactionById;
const createJurnal = createJurnalTransaction;
const updateJurnal = updateJurnalTransaction;
const deleteJurnal = deleteJurnalTransaction;

module.exports = {
  // New function names
  getAllJurnalTransactions,
  getJurnalTransactionById,
  createJurnalTransaction,
  updateJurnalTransaction,
  deleteJurnalTransaction,
  calculateAccountBalances,
  calculateAccountBalancesByRestriction,
  // Backward compatibility
  getAllJurnals,
  getJurnalById,
  createJurnal,
  updateJurnal,
  deleteJurnal,
};
