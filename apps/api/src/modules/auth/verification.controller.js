const User = require("../users/user.model");
const AppError = require("../../core/errors/AppError");
const { verifyEmailCode } = require("./verification.service");
const { sendSuccess } = require("../../core/utils/apiResponse");

const verifyEmail = async (req, res, next) => {
  try {
    const { userId, code } = req.body;

    if (!userId || !code) {
      throw new AppError("User ID and verification code are required", 400);
    }

    const user = await User.findById(userId);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    if (user.emailVerified) {
      throw new AppError("Email is already verified", 400);
    }

    await verifyEmailCode(userId, code);

    user.emailVerified = true;
    await user.save();

    return sendSuccess(
      res,
      200,
      "Email verified successfully",
      {
        id: user._id,
        email: user.email,
        emailVerified: user.emailVerified,
      }
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  verifyEmail,
};