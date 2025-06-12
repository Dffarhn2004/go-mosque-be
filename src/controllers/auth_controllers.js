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

    const user = await authService.loginUser(email, password);

    if (!user) {
      return errorResponse(res, "Invalid email or password", 401);
    }

    return successResponse(res, "Login successful", user, 200);
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
