const express = require("express");
const authenticateJWT = require("../middleware/jwt/jwt.middleware");
const requireAdmin = require("../middleware/role/admin.middleware");
const controller = require("../controllers/system_admin_controller");

const router = express.Router();

router.use(authenticateJWT, requireAdmin);

router.get("/users", controller.listUsers);
router.get("/users/:id", controller.getUserById);
router.post("/users/admin", controller.createAdminUser);
router.post("/users/takmir", controller.createTakmirUser);
router.patch("/users/:id/role", controller.updateUserRole);
router.patch("/users/:id/status", controller.updateUserStatus);

router.get("/masjids", controller.listMasjids);
router.get("/masjids/:id", controller.getMasjidById);
router.patch("/masjids/:id", controller.updateMasjid);
router.patch("/masjids/:id/status", controller.updateMasjidStatus);

router.get("/categories/donations", controller.listDonationCategories);
router.post("/categories/donations", controller.createDonationCategory);
router.patch("/categories/donations/:id", controller.updateDonationCategory);

router.get("/categories/expenses", controller.listExpenseCategories);
router.post("/categories/expenses", controller.createExpenseCategory);
router.patch("/categories/expenses/:id", controller.updateExpenseCategory);

router.get("/coa/default", controller.listDefaultAccounts);
router.post("/coa/default", controller.createDefaultAccount);
router.put("/coa/default/:id", controller.updateDefaultAccount);
router.patch("/coa/default/:id/status", controller.deactivateDefaultAccount);
router.post("/coa/default/reseed", controller.reseedDefaultAccounts);

router.get("/monitoring/donations", controller.listDonationCampaigns);
router.get("/monitoring/donations/:id", controller.getDonationCampaignById);
router.get("/monitoring/expenses", controller.listExpenseRecords);
router.get("/monitoring/summary", controller.getMonitoringSummary);

router.get("/audit-logs", controller.listAuditLogs);

router.get("/configs", controller.listSystemConfigs);
router.put("/configs/:key", controller.upsertSystemConfig);

module.exports = router;
