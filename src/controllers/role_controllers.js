const roleService = require("../services/role_service");
const { successResponse, errorResponse } = require("../utils/response");

// src/controllers/role_controllers.js

// GET /roles - Get all roles
exports.getRoles = async (req, res) => {
  try {
    const roles = await roleService.getAllRoles();
    if (!roles) {
      return errorResponse(res, "No roles found", 404);
    }
    successResponse(res, "Roles fetched successfully", roles);
  } catch (err) {
    errorResponse(res, "Failed to fetch roles: " + err.message);
  }
};

// POST /roles - Create a new role
exports.createRole = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return errorResponse(res, "Role name is required", 400);
    }
    const newRole = await roleService.createRole(name);
    successResponse(res, "Role created successfully", newRole, 201);
  } catch (err) {
    errorResponse(res, "Failed to fetch roles: " + err.message);
  }
};
