const bcrypt = require("bcrypt");

const User = require("../users/user.model");
const AppError = require("../../core/errors/AppError");
const { generateToken } = require("../../core/utils/jwt");
const { createVerificationCode } = require("./verification.service");

const isValidGmail = (email) => {
  return /^[a-zA-Z0-9._%+-]+@gmail\.com$/i.test(email);
};

const registerUser = async ({ email, password }) => {
  // Validate Gmail address
  if (!isValidGmail(email)) {
    throw new AppError("Only Gmail addresses are allowed", 400);
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    throw new AppError("User with this email already exists", 409);
  }

  // Hash password before storing it
  const passwordHash = await bcrypt.hash(password, 12);

  // Create user
  const user = await User.create({
    email,
    passwordHash,
  });

  // Generate and send email verification code
  await createVerificationCode(user._id, user.email);

  return {
    id: user._id,
    email: user.email,
    role: user.role,
    emailVerified: user.emailVerified,
  };
};

const loginUser = async ({ email, password }) => {
  // Find user by email
  const user = await User.findOne({ email });

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
    },
  };
};

module.exports = {
  registerUser,
  loginUser,
};