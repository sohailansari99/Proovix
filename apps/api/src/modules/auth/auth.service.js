const bcrypt = require("bcrypt");
const crypto = require("crypto");

const User = require("../users/user.model");

const AppError = require("../../core/errors/AppError");

const { generateToken } = require("../../core/utils/jwt");

const { validatePassword } = require("../../core/utils/validation");

const { createVerificationCode } = require("./verification.service");

const REVIEWER_TRACKS = ["FRONTEND", "BACKEND"];

const isValidGmail = (email) => {
  return /^[a-zA-Z0-9._%+-]+@gmail\.com$/i.test(email);
};

// Compare the entered reviewer code with the one in .env without leaking timing.
const matchesReviewerCode = (given) => {
  const expected = process.env.REVIEWER_INVITE_CODE;

  if (!expected || typeof given !== "string") return false;

  const a = Buffer.from(given.trim());
  const b = Buffer.from(expected);

  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

const registerUser = async ({
  email,
  password,
  role,
  reviewerCode,
  reviewerTracks,
}) => {
  if (typeof email !== "string" || typeof password !== "string") {
    throw new AppError("Email and password are required", 400);
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Validate Gmail address
  if (!isValidGmail(normalizedEmail)) {
    throw new AppError("Only Gmail addresses are allowed", 400);
  }

  // Validate password strength
  const passwordError = validatePassword(password);

  if (passwordError) {
    throw new AppError(passwordError, 400);
  }

  // Everyone starts as a candidate. Reviewer needs the secret access code
  // and at least one track. Nobody can register as ADMIN here.
  let userRole = "CANDIDATE";
  let tracks = [];

  if (role === "REVIEWER") {
    if (!matchesReviewerCode(reviewerCode)) {
      throw new AppError("The reviewer access code is not valid", 403);
    }

    tracks = Array.isArray(reviewerTracks)
      ? [...new Set(reviewerTracks.filter((t) => REVIEWER_TRACKS.includes(t)))]
      : [];

    if (tracks.length === 0) {
      throw new AppError("Choose at least one reviewer track", 400);
    }

    userRole = "REVIEWER";
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    throw new AppError("User with this email already exists", 409);
  }

  // Hash password before storing it
  const passwordHash = await bcrypt.hash(password, 12);

  // Create user
  const user = await User.create({
    email: normalizedEmail,
    passwordHash,
    role: userRole,
    reviewerTracks: tracks,
  });

  // Generate and send the email verification link
  await createVerificationCode(user._id, user.email);

  return {
    id: user._id,
    email: user.email,
    role: user.role,
    emailVerified: user.emailVerified,
  };
};

const loginUser = async ({ email, password }) => {
  if (typeof email !== "string" || typeof password !== "string") {
    throw new AppError("Email and password are required", 400);
  }

  // Find user by email
  const user = await User.findOne({ email: email.trim().toLowerCase() });

  if (!user) {
    throw new AppError("Invalid email or password", 401);
  }

  // Compare entered password with stored bcrypt hash
  const isPasswordCorrect = await bcrypt.compare(
    password,
    user.passwordHash
  );

  if (!isPasswordCorrect) {
    throw new AppError("Invalid email or password", 401);
  }

  // Prevent login before email verification
  if (!user.emailVerified) {
    throw new AppError(
      "Please verify your email address before logging in",
      403
    );
  }

  // Check whether account is active
  if (user.status !== "ACTIVE") {
    throw new AppError("User account is not active", 403);
  }

  // Update last login time
  user.lastLoginAt = new Date();

  await user.save();

  // Generate JWT
  const token = generateToken({
    userId: user._id.toString(),
    role: user.role,
  });

  return {
    token,
    user: {
      id: user._id,
      email: user.email,
      role: user.role,
      reviewerTracks: user.reviewerTracks || [],
    },
  };
};

module.exports = {
  registerUser,
  loginUser,
};