const crypto = require("crypto");

const EmailVerification = require("./emailVerification.model");
const User = require("../users/user.model");

const {
  sendVerificationEmail,
} = require("../../integrations/email/email.service");

const AppError = require("../../core/errors/AppError");

const LINK_LIFETIME_MS = 24 * 60 * 60 * 1000; // 24 hours
const RESEND_COOLDOWN_MS = 60 * 1000; // 1 minute

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const buildVerificationUrl = (token) => {
  const baseUrl = (
    process.env.FRONTEND_URL || "http://localhost:5173"
  ).replace(/\/$/, "");

  return `${baseUrl}/?verify=${token}`;
};

const createVerificationLink = async (userId, email) => {
  // Long random token that cannot be guessed
  const token = crypto.randomBytes(32).toString("hex");

  await EmailVerification.findOneAndUpdate(
    { userId },
    {
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + LINK_LIFETIME_MS),
    },
    { upsert: true, new: true }
  );

  const verificationUrl = buildVerificationUrl(token);

  // Handy while developing: you can click the link from the terminal
  if (process.env.NODE_ENV !== "production") {
    console.log(`[dev] Verification link for ${email}: ${verificationUrl}`);
  }

  await sendVerificationEmail(email, verificationUrl);
};

// Returns the userId that the token belongs to, and consumes the token.
const verifyEmailToken = async (token) => {
  const verification = await EmailVerification.findOne({
    tokenHash: hashToken(token),
  });

  if (!verification) {
    throw new AppError(
      "This verification link is invalid or has already been used",
      400
    );
  }

  if (verification.expiresAt < new Date()) {
    await EmailVerification.deleteOne({ _id: verification._id });

    throw new AppError(
      "This verification link has expired. Please request a new one",
      400
    );
  }

  const userId = verification.userId;

  await EmailVerification.deleteOne({ _id: verification._id });

  return userId;
};

const resendVerificationLink = async (email) => {
  const user = await User.findOne({ email });

  // Don't reveal whether the email exists
  if (!user) return;

  // Nothing to send if already verified
  if (user.emailVerified) return;

  const existing = await EmailVerification.findOne({ userId: user._id });

  if (existing) {
    const elapsed = Date.now() - existing.updatedAt.getTime();

    if (elapsed < RESEND_COOLDOWN_MS) {
      const remainingSeconds = Math.ceil(
        (RESEND_COOLDOWN_MS - elapsed) / 1000
      );

      throw new AppError(
        `Please wait ${remainingSeconds} seconds before requesting another verification link`,
        429
      );
    }
  }

  await createVerificationLink(user._id, user.email);
};

module.exports = {
  createVerificationLink,
  // Old name kept so auth.service.js keeps working without changes
  createVerificationCode: createVerificationLink,
  verifyEmailToken,
  resendVerificationLink,
};