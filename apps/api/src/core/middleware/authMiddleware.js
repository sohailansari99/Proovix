const AppError = require("../errors/AppError");
const { verifyToken } = require("../utils/jwt");

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // Check whether Authorization header exists
    if (!authHeader) {
      throw new AppError("Authentication token is required", 401);
    }

    // Expected format: Bearer <token>
    const parts = authHeader.split(" ");

    if (parts.length !== 2 || parts[0] !== "Bearer") {
      throw new AppError("Invalid authorization format", 401);
    }

    const token = parts[1];

    // Verify JWT
    const decoded = verifyToken(token);

    // Attach authenticated user information to request
    req.user = decoded;

    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return next(new AppError("Invalid authentication token", 401));
    }

    if (error.name === "TokenExpiredError") {
      return next(new AppError("Authentication token has expired", 401));
    }

    next(error);
  }
};

module.exports = authMiddleware;