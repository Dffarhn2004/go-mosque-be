const express = require("express");
const accountController = require("../controllers/account_controllers");
const authenticateJWT = require("../middleware/jwt/jwt.middleware");

const accountRouter = express.Router();

// Public route untuk get all accounts (tidak perlu authentication, masjidId dari query params)
accountRouter.get("/public", accountController.getAllAccountsPublic);

// All routes require authentication
accountRouter.use(authenticateJWT);

// GET /coa - Get all accounts
accountRouter.get("/", accountController.getAllAccounts);

// GET /coa/tree - Get accounts in tree structure
accountRouter.get("/tree", accountController.getAccountTree);

// GET /coa/next-code - Get next available account code
accountRouter.get("/next-code", accountController.getNextAccountCode);

// GET /coa/valid-parents - Get valid parent accounts (group accounts that can have detail accounts)
accountRouter.get("/valid-parents", accountController.getValidParents);

// GET /coa/:id - Get account by ID
accountRouter.get("/:id", accountController.getAccountById);

// POST /coa - Create new account
accountRouter.post("/", accountController.createAccount);

// PUT /coa/:id - Update account
accountRouter.put("/:id", accountController.updateAccount);

// DELETE /coa/:id - Delete account
accountRouter.delete("/:id", accountController.deleteAccount);

module.exports = accountRouter;

