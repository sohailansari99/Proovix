const User = require("../users/user.model");

const AppError = require("../../core/errors/AppError");

const {
  verifyEmailToken,
  resendVerificationLink,
} = require("./verification.service");

const { sendSuccess } = require("../../core/utils/apiResponse");

const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.body;

    if (!token || typeof token !== "string") {
      throw new AppError("Verification token is required", 400);
    }

    const userId = await verifyEmailToken(token);

    const user = await User.findById(userId);

    if (!user) {
      throw new AppError("User not found", 404);
    }

    user.emailVerified = true;
    await user.save();

    return sendSuccess(res, 200, "Email verified successfully", {
      id: user._id,
      email: user.email,
      emailVerified: user.emailVerified,
    });
  } catch (error) {
    next(error);
  }
};

const resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new AppError("Email is required", 400);
    }

    await resendVerificationLink(email.trim().toLowerCase());

    return sendSuccess(
      res,
      200,
      "If the account exists and is not verified, a new verification link has been sent"
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  verifyEmail,
  resendVerification,
};