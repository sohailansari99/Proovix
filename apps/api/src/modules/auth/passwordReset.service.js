const crypto = require("crypto");
const bcrypt = require("bcrypt");

const PasswordReset = require("./passwordReset.model");
const User = require("../users/user.model");

const AppError = require("../../core/errors/AppError");

const {
  validatePassword,
} = require("../../core/utils/validation");

const {
  sendPasswordResetEmail,
} = require("../../integrations/email/email.service");

const createPasswordResetToken = async (email) => {
  // Find user by email
  const user = await User.findOne({ email });

  // Don't reveal whether the email exists
  if (!user) {
    return;
  }

  // Generate a secure random token
  const resetToken = crypto.randomBytes(32).toString("hex");

  // Hash token before storing it in database
  const tokenHash = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // Token expires after 15 minutes
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  // Replace any existing reset token
  await PasswordReset.findOneAndUpdate(
    { userId: user._id },
    {
      userId: user._id,
      tokenHash,
      expiresAt,
    },
    {
      upsert: true,
      new: true,
    }
  );

  // Create password reset link
  const resetLink = `http://localhost:5173/reset-password?token=${resetToken}`;

  // Send reset link by email
  await sendPasswordResetEmail(user.email, resetLink);
};

const verifyPasswordResetToken = async (token) => {
  if (!token) {
    throw new AppError("Password reset token is required", 400);
  }

  // Hash token received from the frontend
  const tokenHash = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  // Find matching reset token
  const reset = await PasswordReset.findOne({ tokenHash });

  if (!reset) {
    throw new AppError(
      "Invalid or expired password reset link",
      400
    );
  }

  // Check expiration
  if (reset.expiresAt < new Date()) {
    await PasswordReset.deleteOne({ _id: reset._id });

    throw new AppError(
      "Password reset link has expired",
      400
    );
  }

  return reset.userId;
};

const resetPassword = async (token, newPassword) => {
  // Validate new password before doing anything else
  const passwordError = validatePassword(newPassword);

  if (passwordError) {
    throw new AppError(passwordError, 400);
  }

  // Verify token
  const userId = await verifyPasswordResetToken(token);

  // Find user
  const user = await User.findById(userId);

  if (!user) {
    throw new AppError("User not found", 404);
  }

  // Hash new password
  const passwordHash = await bcrypt.hash(newPassword, 12);

  // Update password
  user.passwordHash = passwordHash;

  await user.save();

  // Invalidate token after successful password reset
  await PasswordReset.deleteOne({ userId });
};

module.exports = {
  createPasswordResetToken,
  verifyPasswordResetToken,
  resetPassword,
};