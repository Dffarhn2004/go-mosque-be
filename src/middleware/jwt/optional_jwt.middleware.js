const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

const optionalAuthenticateJWT = (req, _res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
  } catch (error) {
    console.error("Optional token verification failed:", error.message);
    req.user = null;
  }

  next();
};

module.exports = optionalAuthenticateJWT;
