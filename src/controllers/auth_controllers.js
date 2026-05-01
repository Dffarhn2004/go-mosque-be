const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const authService = require("../services/auth_service");
const { errorResponse, successResponse } = require("../utils/response");

// Register controller
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const result = await authService.registerUser({
      username,
      email,
      password,
    });

    if (result) {
      const user = { ...result.user };
      delete user.Password; // agar password user tidak dikembalikan pada response

      return successResponse(
        res,
        "User registered successfully",
        { ...result, user },
        201
      );
    } else {
      return errorResponse(res, result.message, 400);
    }
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return errorResponse(
      res,
      error.message || "Internal server error",
      statusCode,
      {
        error: error.message,
      }
    );
  }
};

// Register controller
exports.registerTakmir = async (req, res) => {
  try {
    const { username, email, password, nama_masjid, alamat, nomor_telfon } =
      req.body;

    const dataMasjid = {
      nama_masjid,
      alamat,
      nomor_telfon,
    };

    const result = await authService.registerTakmir(
      { username, email, password },
      dataMasjid
    );

    if (result) {
      const user = { ...result.user };
      delete user.Password; // agar password user tidak dikembalikan pada response

      return successResponse(
        res,
        "User registered successfully",
        { ...result, user },
        201
      );
    } else {
      return errorResponse(res, result.message, 400);
    }
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return errorResponse(
      res,
      error.message || "Internal server error",
      statusCode,
      {
        error: error.message,
      }
    );
  }
};

// Login controller
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("[LOGIN] attempt for email:", email);

    const user = await authService.loginUser(email, password);

    if (!user) {
      return errorResponse(res, "Invalid email or password", 401);
    }

    console.log("[LOGIN] success for email:", email);
    return successResponse(res, "Login successful", user, 200);
  } catch (error) {
    console.error("[LOGIN CONTROLLER ERROR] name:", error.name);
    console.error("[LOGIN CONTROLLER ERROR] message:", error.message);
    console.error("[LOGIN CONTROLLER ERROR] stack:", error.stack);
    const statusCode = error.statusCode || 500;
    return errorResponse(
      res,
      error.message || "Internal server error",
      statusCode,
      {
        error: error.message,
      }
    );
  }
};
