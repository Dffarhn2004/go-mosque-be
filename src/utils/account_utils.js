/**
 * Generate pathCode dari parent pathCode + code sendiri
 * @param {string} code - Code akun sendiri
 * @param {string|null} parentPathCode - PathCode dari parent (null jika root)
 * @returns {string} Full pathCode
 */
function generatePathCode(code, parentPathCode = null) {
  if (!parentPathCode) {
    return code;
  }
  return `${parentPathCode}.${code}`;
}

/**
 * Validasi hierarchical structure
 * @param {Object} accountData - Data account yang akan dibuat/diupdate
 * @param {Object} parent - Parent account object (null jika root)
 * @returns {Object} { valid: boolean, error: string|null }
 */
function validateHierarchy(accountData, parent = null) {
  // Jika ada parent, parent harus isGroup = true
  if (parent && !parent.isGroup) {
    return {
      valid: false,
      error: "Parent account must be a group (isGroup = true)",
    };
  }

  // Jika isGroup = true, tidak bisa memiliki parent yang isGroup = false
  if (accountData.isGroup && parent && !parent.isGroup) {
    return {
      valid: false,
      error: "Group account cannot have non-group parent",
    };
  }

  return { valid: true, error: null };
}

/**
 * Build tree structure dari flat array of accounts
 * @param {Array} accounts - Array of account objects
 * @returns {Array} Tree structure dengan children nested
 */
function buildAccountTree(accounts) {
  const accountMap = new Map();
  const rootAccounts = [];

  // Create map of all accounts
  accounts.forEach((account) => {
    accountMap.set(account.id, { ...account, children: [] });
  });

  // Build tree
  accounts.forEach((account) => {
    const accountNode = accountMap.get(account.id);
    if (account.parentId) {
      const parent = accountMap.get(account.parentId);
      if (parent) {
        parent.children.push(accountNode);
      } else {
        // Parent not found, treat as root
        rootAccounts.push(accountNode);
      }
    } else {
      rootAccounts.push(accountNode);
    }
  });

  return rootAccounts;
}

/**
 * Get all descendant account IDs (recursive)
 * @param {string} accountId - ID of parent account
 * @param {Array} allAccounts - All accounts array
 * @returns {Array} Array of descendant account IDs
 */
function getDescendantIds(accountId, allAccounts) {
  const descendants = [];
  const children = allAccounts.filter((acc) => acc.parentId === accountId);

  children.forEach((child) => {
    descendants.push(child.id);
    descendants.push(...getDescendantIds(child.id, allAccounts));
  });

  return descendants;
}

module.exports = {
  generatePathCode,
  validateHierarchy,
  buildAccountTree,
  getDescendantIds,
};

