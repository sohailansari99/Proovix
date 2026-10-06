const {
  createPasswordResetToken,
  resetPassword,
} = require("./passwordReset.service");

const { sendSuccess } = require("../../core/utils/apiResponse");
const AppError = require("../../core/errors/AppError");

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      throw new AppError("Email is required", 400);
    }

    await createPasswordResetToken(email);

    // Same response whether the account exists or not
    return sendSuccess(
      res,
      200,
      "If an account exists with this email, a password reset link has been sent"
    );
  } catch (error) {
    next(error);
  }
};

const resetPasswordController = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      throw new AppError(
        "Reset token and new password are required",
        400
      );
    }

    await resetPassword(token, newPassword);

    return sendSuccess(
      res,
      200,
      "Password reset successfully"
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  forgotPassword,
  resetPasswordController,
};