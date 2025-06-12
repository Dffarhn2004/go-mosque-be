const express = require("express");
const roleController = require("../controllers/role_controllers");

const roleRouter = express.Router();

// Routes
roleRouter.get("/", roleController.getRoles);
roleRouter.post("/", roleController.createRole);

module.exports = roleRouter;
