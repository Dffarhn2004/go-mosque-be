/**
 * Calculate account balance berdasarkan jurnal entries
 * @param {Array} entries - Array of jurnal entries untuk akun tertentu
 * @param {string} normalBalance - Normal balance akun (DEBIT atau KREDIT)
 * @param {string} accountType - Tipe akun (ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE) - fallback jika normalBalance tidak ada
 * @returns {number} Saldo akun
 */
function calculateAccountBalance(entries, normalBalance, accountType = null) {
  let balance = 0;

  // Jika normalBalance tidak ada, gunakan accountType sebagai fallback
  let effectiveNormalBalance = normalBalance;
  if (!effectiveNormalBalance && accountType) {
    // Fallback ke logic lama
    effectiveNormalBalance = (accountType === "ASSET" || accountType === "EXPENSE") ? "DEBIT" : "KREDIT";
  }

  entries.forEach((entry) => {
    if (effectiveNormalBalance === "DEBIT") {
      // DEBIT menambah, KREDIT mengurangi
      if (entry.tipe === "DEBIT") {
        balance += Number(entry.jumlah);
      } else {
        balance -= Number(entry.jumlah);
      }
    } else {
      // KREDIT menambah, DEBIT mengurangi
      if (entry.tipe === "KREDIT") {
        balance += Number(entry.jumlah);
      } else {
        balance -= Number(entry.jumlah);
      }
    }
  });

  return balance;
}

/**
 * Calculate account balance separated by restriction
 * @param {Array} entries - Array of jurnal entries untuk akun tertentu
 * @param {string} normalBalance - Normal balance akun (DEBIT atau KREDIT)
 * @param {string} accountType - Tipe akun (ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE) - fallback jika normalBalance tidak ada
 * @returns {Object} { tanpaPembatasan: number, denganPembatasan: number }
 */
function calculateAccountBalanceByRestriction(entries, normalBalance, accountType = null) {
  let tanpaPembatasan = 0;
  let denganPembatasan = 0;

  // Jika normalBalance tidak ada, gunakan accountType sebagai fallback
  let effectiveNormalBalance = normalBalance;
  if (!effectiveNormalBalance && accountType) {
    // Fallback ke logic lama
    effectiveNormalBalance = (accountType === "ASSET" || accountType === "EXPENSE") ? "DEBIT" : "KREDIT";
  }

  entries.forEach((entry) => {
    const amount = Number(entry.jumlah);
    let adjustment = 0;

    if (effectiveNormalBalance === "DEBIT") {
      // DEBIT menambah, KREDIT mengurangi
      if (entry.tipe === "DEBIT") {
        adjustment = amount;
      } else {
        adjustment = -amount;
      }
    } else {
      // KREDIT menambah, DEBIT mengurangi
      if (entry.tipe === "KREDIT") {
        adjustment = amount;
      } else {
        adjustment = -amount;
      }
    }

    if (entry.hasRestriction) {
      denganPembatasan += adjustment;
    } else {
      tanpaPembatasan += adjustment;
    }
  });

  return { tanpaPembatasan, denganPembatasan };
}

/**
 * Filter jurnal entries by date range
 * @param {Array} entries - Array of jurnal entries
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Array} Filtered entries
 */
function filterJurnalByDateRange(entries, startDate, endDate) {
  return entries.filter((entry) => {
    const entryDate = new Date(entry.transaction?.tanggal || entry.tanggal);
    return entryDate >= startDate && entryDate <= endDate;
  });
}

/**
 * Filter jurnal entries by account
 * @param {Array} entries - Array of jurnal entries
 * @param {string} akunId - Account ID
 * @returns {Array} Filtered entries
 */
function filterJurnalByAccount(entries, akunId) {
  return entries.filter((entry) => entry.akunId === akunId);
}

/**
 * Group jurnal entries by account
 * @param {Array} entries - Array of jurnal entries
 * @returns {Object} Object dengan key = akunId, value = array of entries
 */
function groupJurnalsByAccount(entries) {
  const grouped = {};
  entries.forEach((entry) => {
    if (!grouped[entry.akunId]) {
      grouped[entry.akunId] = [];
    }
    grouped[entry.akunId].push(entry);
  });
  return grouped;
}

/**
 * Get all account balances
 * @param {Array} accounts - Array of accounts
 * @param {Array} entries - Array of jurnal entries (from JurnalEntry)
 * @param {Date} endDate - End date untuk filter (optional)
 * @returns {Object} Object dengan key = accountId, value = { account, saldo }
 */
function getAllAccountBalances(accounts, entries, endDate = null) {
  const balances = {};

  // Filter entries by date if endDate provided
  let filteredEntries = entries;
  if (endDate) {
    filteredEntries = filterJurnalByDateRange(
      entries,
      new Date(0),
      new Date(endDate)
    );
  }

  // Group entries by account
  const entriesByAccount = groupJurnalsByAccount(filteredEntries);

  // Calculate balance for each account
  accounts.forEach((account) => {
    const accountEntries = entriesByAccount[account.id] || [];
    const saldo = calculateAccountBalance(accountEntries, account.normalBalance, account.type);

    balances[account.id] = {
      account,
      saldo,
    };
  });

  return balances;
}

/**
 * Get all account balances separated by restriction
 * @param {Array} accounts - Array of accounts
 * @param {Array} entries - Array of jurnal entries (from JurnalEntry)
 * @param {Date} endDate - End date untuk filter (optional)
 * @returns {Object} Object dengan key = accountId, value = { account, tanpaPembatasan, denganPembatasan, saldo }
 */
function getAllAccountBalancesByRestriction(accounts, entries, endDate = null) {
  const balances = {};

  // Filter entries by date if endDate provided
  let filteredEntries = entries;
  if (endDate) {
    // Pastikan endDate adalah Date object dan set ke akhir hari untuk memastikan semua transaksi pada hari tersebut terhitung
    const endDateObj = new Date(endDate);
    // Jika endDate sudah di-set ke 23:59:59.999, gunakan langsung
    // Jika belum, set ke akhir hari
    if (endDateObj.getHours() === 0 && endDateObj.getMinutes() === 0 && endDateObj.getSeconds() === 0) {
      endDateObj.setHours(23, 59, 59, 999);
    }
    
    filteredEntries = filterJurnalByDateRange(
      entries,
      new Date(0), // Start dari epoch (semua transaksi dari awal)
      endDateObj
    );
  }

  // Group entries by account
  const entriesByAccount = groupJurnalsByAccount(filteredEntries);

  // Calculate balance for each account
  accounts.forEach((account) => {
    const accountEntries = entriesByAccount[account.id] || [];
    const { tanpaPembatasan, denganPembatasan } = calculateAccountBalanceByRestriction(
      accountEntries,
      account.normalBalance,
      account.type
    );
    const saldo = tanpaPembatasan + denganPembatasan;

    balances[account.id] = {
      account,
      tanpaPembatasan,
      denganPembatasan,
      saldo,
    };
  });

  return balances;
}

module.exports = {
  calculateAccountBalance,
  calculateAccountBalanceByRestriction,
  filterJurnalByDateRange,
  filterJurnalByAccount,
  groupJurnalsByAccount,
  getAllAccountBalances,
  getAllAccountBalancesByRestriction,
};
