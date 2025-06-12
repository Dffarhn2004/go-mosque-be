const jwt = require("jsonwebtoken");
const { unauthorizedResponse } = require("../../utils/response");

// Your secret and expiration time from environment variables
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Middleware to verify the JWT token
const authenticateJWT = (req, res, next) => {
  // Get the token from the Authorization header (e.g., "Bearer <token>")
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    // If no token, return an unauthorized error
    return unauthorizedResponse(res, "No token provided", 401);
  }

  try {
    // Verify the token and decode it
    const decoded = jwt.verify(token, JWT_SECRET);

    // Attach decoded user info to the request object
    req.user = decoded;

    // Proceed to the next middleware or route handler
    next();
  } catch (error) {
    console.error("Token verification failed:", error);
    return unauthorizedResponse(res, "Invalid token", 401);
  }
};

module.exports = authenticateJWT;
