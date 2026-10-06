const User = require("./user.model");
const AppError = require("../../core/errors/AppError");
const { sendSuccess } = require("../../core/utils/apiResponse");

const getCurrentUser = async (req, res, next) => {
  try {
    // Get authenticated user ID from JWT
    const userId = req.user.userId;

    // Find user in database
    const user = await User.findById(userId).select(
      "-passwordHash"
    );

    if (!user) {
      throw new AppError("User not found", 404);
    }

    return sendSuccess(
      res,
      200,
      "Current user retrieved successfully",
      {
        id: user._id,
        email: user.email,
        role: user.role,
        status: user.status,
        emailVerified: user.emailVerified,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
      }
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCurrentUser,
};