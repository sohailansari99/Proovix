
const AppError = require("../errors/AppError");

const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError("Authentication is required", 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          "You are not authorized to perform this action",
          403
        )
      );
    }

    next();
  };
};

module.exports = authorizeRoles;
