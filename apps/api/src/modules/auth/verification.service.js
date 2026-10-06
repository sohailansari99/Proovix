const crypto = require("crypto");
const bcrypt = require("bcrypt");

const EmailVerification = require("./emailVerification.model");
const User = require("../users/user.model");

const {
  sendVerificationEmail,
} = require("../../integrations/email/email.service");

const AppError = require("../../core/errors/AppError");

const generateVerificationCode = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

const createVerificationCode = async (userId, email) => {
  const code = generateVerificationCode();

  const codeHash = await bcrypt.hash(code, 12);

  const expiresAt = new Date(
    Date.now() + 10 * 60 * 1000
  );

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

  await sendVerificationEmail(email, code);
};

const verifyEmailCode = async (userId, code) => {
  const verification = await EmailVerification.findOne({
    userId,
  });

  if (!verification) {
    throw new AppError(
      "Verification code not found",
      404
    );
  }

  if (verification.expiresAt < new Date()) {
    await EmailVerification.deleteOne({ userId });

    throw new AppError(
      "Verification code has expired",
      400
    );
  }

  if (verification.attempts >= 5) {
    await EmailVerification.deleteOne({ userId });

    throw new AppError(
      "Too many verification attempts. Please request a new code.",
      429
    );
  }

  const isValid = await bcrypt.compare(
    code,
    verification.codeHash
  );

  if (!isValid) {
    verification.attempts += 1;

    await verification.save();

    throw new AppError(
      "Invalid verification code",
      400
    );
  }

  await EmailVerification.deleteOne({ userId });

  return true;
};

const resendVerificationCode = async (email) => {
  // Find user
  const user = await User.findOne({ email });

  // Don't reveal whether the email exists
  if (!user) {
    return;
  }

  // Don't send another code if email is already verified
  if (user.emailVerified) {
    return;
  }

  // Find existing verification record
  const existingVerification =
    await EmailVerification.findOne({
      userId: user._id,
    });

  // Prevent repeated email requests
  if (existingVerification) {
    const cooldown =
      60 * 1000;

    const timeSinceLastRequest =
      Date.now() -
      existingVerification.updatedAt.getTime();

    if (timeSinceLastRequest < cooldown) {
      const remainingSeconds = Math.ceil(
        (cooldown - timeSinceLastRequest) / 1000
      );

      throw new AppError(
        `Please wait ${remainingSeconds} seconds before requesting another verification code`,
        429
      );
    }
  }

  // Generate and send a new verification code
  await createVerificationCode(
    user._id,
    user.email
  );
};

module.exports = {
  createVerificationCode,
  verifyEmailCode,
  resendVerificationCode,
};