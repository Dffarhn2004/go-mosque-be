const { successResponse, errorResponse } = require("../utils/response");
const systemAdminService = require("../services/system_admin_service");
const CustomError = require("../utils/custom_error");

function handleError(res, err, fallback) {
  console.error(fallback, err);
  if (err instanceof CustomError) {
    return errorResponse(res, err.message, err.statusCode);
  }
  return errorResponse(res, `${fallback}: ${err.message}`);
}

exports.listUsers = async (req, res) => {
  try {
    const { search, roleId, isActive } = req.query;
    const users = await systemAdminService.listUsers({
      search,
      roleId,
      isActive: isActive === undefined ? undefined : isActive === "true",
    });
    return successResponse(res, "Users fetched successfully", users);
  } catch (err) {
    return handleError(res, err, "Failed to fetch users");
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await systemAdminService.getUserById(req.params.id);
    return successResponse(res, "User fetched successfully", user);
  } catch (err) {
    return handleError(res, err, "Failed to fetch user");
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const updated = await systemAdminService.updateUserRole({
      actorId: req.currentUser.id,
      userId: req.params.id,
      roleId: req.body.roleId,
    });
    return successResponse(res, "User role updated successfully", updated);
  } catch (err) {
    return handleError(res, err, "Failed to update user role");
  }
};

exports.updateUserStatus = async (req, res) => {
  try {
    const updated = await systemAdminService.updateUserStatus({
      actorId: req.currentUser.id,
      userId: req.params.id,
      isActive: req.body.isActive,
    });
    return successResponse(res, "User status updated successfully", updated);
  } catch (err) {
    return handleError(res, err, "Failed to update user status");
  }
};

exports.createTakmirUser = async (req, res) => {
  try {
    const result = await systemAdminService.createTakmirUser({
      actorId: req.currentUser.id,
      ...req.body,
    });
    return successResponse(res, "Takmir user created successfully", result, 201);
  } catch (err) {
    return handleError(res, err, "Failed to create takmir user");
  }
};

exports.createAdminUser = async (req, res) => {
  try {
    const result = await systemAdminService.createAdminUser({
      actorId: req.currentUser.id,
      ...req.body,
    });
    return successResponse(res, "Admin user created successfully", result, 201);
  } catch (err) {
    return handleError(res, err, "Failed to create admin user");
  }
};

exports.listMasjids = async (req, res) => {
  try {
    const { search, isActive } = req.query;
    const masjids = await systemAdminService.listMasjidsAdmin({
      search,
      isActive: isActive === undefined ? undefined : isActive === "true",
    });
    return successResponse(res, "Masjids fetched successfully", masjids);
  } catch (err) {
    return handleError(res, err, "Failed to fetch masjids");
  }
};

exports.getMasjidById = async (req, res) => {
  try {
    const masjid = await systemAdminService.getMasjidAdminById(req.params.id);
    return successResponse(res, "Masjid fetched successfully", masjid);
  } catch (err) {
    return handleError(res, err, "Failed to fetch masjid");
  }
};

exports.updateMasjid = async (req, res) => {
  try {
    const updated = await systemAdminService.updateMasjidAdmin({
      actorId: req.currentUser.id,
      masjidId: req.params.id,
      data: req.body,
    });
    return successResponse(res, "Masjid updated successfully", updated);
  } catch (err) {
    return handleError(res, err, "Failed to update masjid");
  }
};

exports.updateMasjidStatus = async (req, res) => {
  try {
    const updated = await systemAdminService.updateMasjidStatus({
      actorId: req.currentUser.id,
      masjidId: req.params.id,
      isActive: req.body.isActive,
    });
    return successResponse(res, "Masjid status updated successfully", updated);
  } catch (err) {
    return handleError(res, err, "Failed to update masjid status");
  }
};

exports.listDonationCategories = async (req, res) => {
  try {
    const data = await systemAdminService.listDonationCategories({
      includeInactive: req.query.includeInactive !== "false",
    });
    return successResponse(res, "Donation categories fetched successfully", data);
  } catch (err) {
    return handleError(res, err, "Failed to fetch donation categories");
  }
};

exports.createDonationCategory = async (req, res) => {
  try {
    const data = await systemAdminService.createDonationCategory({
      actorId: req.currentUser.id,
      nama: req.body.nama,
    });
    return successResponse(res, "Donation category created successfully", data, 201);
  } catch (err) {
    return handleError(res, err, "Failed to create donation category");
  }
};

exports.updateDonationCategory = async (req, res) => {
  try {
    const data = await systemAdminService.updateDonationCategory({
      actorId: req.currentUser.id,
      id: req.params.id,
      data: req.body,
    });
    return successResponse(res, "Donation category updated successfully", data);
  } catch (err) {
    return handleError(res, err, "Failed to update donation category");
  }
};

exports.listExpenseCategories = async (req, res) => {
  try {
    const data = await systemAdminService.listExpenseCategories({
      includeInactive: req.query.includeInactive !== "false",
    });
    return successResponse(res, "Expense categories fetched successfully", data);
  } catch (err) {
    return handleError(res, err, "Failed to fetch expense categories");
  }
};

exports.createExpenseCategory = async (req, res) => {
  try {
    const data = await systemAdminService.createExpenseCategory({
      actorId: req.currentUser.id,
      nama: req.body.nama,
    });
    return successResponse(res, "Expense category created successfully", data, 201);
  } catch (err) {
    return handleError(res, err, "Failed to create expense category");
  }
};

exports.updateExpenseCategory = async (req, res) => {
  try {
    const data = await systemAdminService.updateExpenseCategory({
      actorId: req.currentUser.id,
      id: req.params.id,
      data: req.body,
    });
    return successResponse(res, "Expense category updated successfully", data);
  } catch (err) {
    return handleError(res, err, "Failed to update expense category");
  }
};

exports.listDefaultAccounts = async (req, res) => {
  try {
    const data = await systemAdminService.listDefaultAccounts({
      includeInactive: req.query.includeInactive === "true",
    });
    return successResponse(res, "Default accounts fetched successfully", data);
  } catch (err) {
    return handleError(res, err, "Failed to fetch default accounts");
  }
};

exports.createDefaultAccount = async (req, res) => {
  try {
    const data = await systemAdminService.createDefaultAccount({
      actorId: req.currentUser.id,
      data: req.body,
    });
    return successResponse(res, "Default account created successfully", data, 201);
  } catch (err) {
    return handleError(res, err, "Failed to create default account");
  }
};

exports.updateDefaultAccount = async (req, res) => {
  try {
    const data = await systemAdminService.updateDefaultAccount({
      actorId: req.currentUser.id,
      id: req.params.id,
      data: req.body,
    });
    return successResponse(res, "Default account updated successfully", data);
  } catch (err) {
    return handleError(res, err, "Failed to update default account");
  }
};

exports.deactivateDefaultAccount = async (req, res) => {
  try {
    const data = await systemAdminService.deactivateDefaultAccount({
      actorId: req.currentUser.id,
      id: req.params.id,
    });
    return successResponse(res, "Default account deactivated successfully", data);
  } catch (err) {
    return handleError(res, err, "Failed to deactivate default account");
  }
};

exports.reseedDefaultAccounts = async (req, res) => {
  try {
    const data = await systemAdminService.reseedDefaultAccounts({
      actorId: req.currentUser.id,
    });
    return successResponse(res, "Default accounts reseeded successfully", data);
  } catch (err) {
    return handleError(res, err, "Failed to reseed default accounts");
  }
};

exports.listDonationCampaigns = async (req, res) => {
  try {
    const data = await systemAdminService.listDonationCampaigns(req.query);
    return successResponse(res, "Donation campaigns fetched successfully", data);
  } catch (err) {
    return handleError(res, err, "Failed to fetch donation campaigns");
  }
};

exports.getDonationCampaignById = async (req, res) => {
  try {
    const data = await systemAdminService.getDonationCampaignById(req.params.id);
    return successResponse(res, "Donation campaign fetched successfully", data);
  } catch (err) {
    return handleError(res, err, "Failed to fetch donation campaign");
  }
};

exports.listExpenseRecords = async (req, res) => {
  try {
    const data = await systemAdminService.listExpenseRecords(req.query);
    return successResponse(res, "Expense records fetched successfully", data);
  } catch (err) {
    return handleError(res, err, "Failed to fetch expense records");
  }
};

exports.getMonitoringSummary = async (req, res) => {
  try {
    const data = await systemAdminService.getMonitoringSummary();
    return successResponse(res, "Monitoring summary fetched successfully", data);
  } catch (err) {
    return handleError(res, err, "Failed to fetch monitoring summary");
  }
};

exports.listAuditLogs = async (req, res) => {
  try {
    const data = await systemAdminService.listAuditLogs(req.query);
    return successResponse(res, "Audit logs fetched successfully", data);
  } catch (err) {
    return handleError(res, err, "Failed to fetch audit logs");
  }
};

exports.listSystemConfigs = async (req, res) => {
  try {
    const data = await systemAdminService.listSystemConfigs();
    return successResponse(res, "System configs fetched successfully", data);
  } catch (err) {
    return handleError(res, err, "Failed to fetch system configs");
  }
};

exports.upsertSystemConfig = async (req, res) => {
  try {
    const data = await systemAdminService.upsertSystemConfig({
      actorId: req.currentUser.id,
      key: req.params.key,
      value: req.body.value,
      description: req.body.description,
    });
    return successResponse(res, "System config updated successfully", data);
  } catch (err) {
    return handleError(res, err, "Failed to update system config");
  }
};
