const express = require("express");
const authenticateJWT = require("../middleware/jwt/jwt.middleware");
const userController = require("../controllers/user_controller");

const userRouter = express.Router();

userRouter.get("/me", authenticateJWT, userController.getMe);
userRouter.patch("/me", authenticateJWT, userController.updateMe);

module.exports = userRouter;

