const express = require("express");
const authController = require("../controllers/auth_controllers");

const authRoute = express.Router();

// Routes
// authRoute.get("/", authController.register);
// authRoute.post("/", authController.login);
authRoute.post("/register", authController.register);
authRoute.post("/register/takmir", authController.registerTakmir);
authRoute.post("/login", authController.login);


module.exports = authRoute;
