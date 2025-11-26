const express = require("express");
const jurnalController = require("../controllers/jurnal_controllers");
const authenticateJWT = require("../middleware/jwt/jwt.middleware");

const jurnalRouter = express.Router();

// Public route untuk account balances (tidak perlu authentication, masjidId dari query params)
jurnalRouter.get("/public/balances", jurnalController.getAccountBalancesPublic);

// All routes require authentication
jurnalRouter.use(authenticateJWT);

// GET /jurnal - Get all jurnals with filters
jurnalRouter.get("/", jurnalController.getAllJurnals);

// GET /jurnal/balances - Get account balances
jurnalRouter.get("/balances", jurnalController.getAccountBalances);

// GET /jurnal/:id - Get jurnal by ID
jurnalRouter.get("/:id", jurnalController.getJurnalById);

// POST /jurnal - Create new jurnal
jurnalRouter.post("/", jurnalController.createJurnal);

// PUT /jurnal/:id - Update jurnal
jurnalRouter.put("/:id", jurnalController.updateJurnal);

// DELETE /jurnal/:id - Delete jurnal
jurnalRouter.delete("/:id", jurnalController.deleteJurnal);

module.exports = jurnalRouter;

