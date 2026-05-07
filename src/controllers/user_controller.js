const { successResponse, errorResponse } = require("../utils/response");
const userService = require("../services/user_service");

exports.getMe = async (req, res) => {
  try {
    const user = await userService.getMe(req.user.id);
    successResponse(res, "User fetched successfully", user);
  } catch (err) {
    if (err.statusCode) {
      return errorResponse(res, err.message, err.statusCode);
    }
    errorResponse(res, "Failed to fetch user: " + err.message);
  }
};

exports.updateMe = async (req, res) => {
  try {
    const { NamaLengkap, Email, currentPassword, newPassword } = req.body || {};

    const updated = await userService.updateMe({
      userId: req.user.id,
      namaLengkap: NamaLengkap,
      email: Email,
      currentPassword,
      newPassword,
    });

    successResponse(res, "User updated successfully", updated);
  } catch (err) {
    if (err.statusCode) {
      return errorResponse(res, err.message, err.statusCode);
    }
    errorResponse(res, "Failed to update user: " + err.message);
  }
};

