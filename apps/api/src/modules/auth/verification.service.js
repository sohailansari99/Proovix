const crypto = require("crypto");
const bcrypt = require("bcrypt");

const EmailVerification = require("./emailVerification.model");
const { sendVerificationEmail } = require("../../integrations/email/email.service");
const AppError = require("../../core/errors/AppError");

const generateVerificationCode = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

const createVerificationCode = async (userId, email) => {
  // Generate a secure 6-digit verification code
  const code = generateVerificationCode();

  // Hash the code before storing it
  const codeHash = await bcrypt.hash(code, 12);

  // Code expires after 10 minutes
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  // Replace any existing verification record
  await EmailVerification.findOneAndUpdate(
    { userId },
    {
      userId,
      codeHash,
      expiresAt,
      attempts: 0,
    },
    {
      upsert: true,
      new: true,
    }
  );

  // Send code to user's email
  await sendVerificationEmail(email, code);
};

const verifyEmailCode = async (userId, code) => {
  const verification = await EmailVerification.findOne({ userId });

  if (!verification) {
    throw new AppError("Verification code not found", 404);
  }

  // Check expiration
  if (verification.expiresAt < new Date()) {
    await EmailVerification.deleteOne({ userId });

    throw new AppError("Verification code has expired", 400);
  }

  // Prevent unlimited attempts
  if (verification.attempts >= 5) {
    await EmailVerification.deleteOne({ userId });

    throw new AppError(
      "Too many verification attempts. Please request a new code.",
      429
    );
  }

  const isValid = await bcrypt.compare(code, verification.codeHash);

  if (!isValid) {
    verification.attempts += 1;
    await verification.save();

    throw new AppError("Invalid verification code", 400);
  }

  await EmailVerification.deleteOne({ userId });

  return true;
};

module.exports = {
  createVerificationCode,
  verifyEmailCode,
};