const express = require("express");

const { register, login } = require("./auth.controller");

const {
  verifyEmail,
  resendVerification,
} = require("./verification.controller");

const {
  forgotPassword,
  resetPasswordController,
} = require("./passwordReset.controller");

const {
  registerRateLimiter,
  loginRateLimiter,
  forgotPasswordRateLimiter,
  resendVerificationRateLimiter,
} = require("../../core/middleware/rateLimiter");

const router = express.Router();

// Register
router.post(
  "/register",
  registerRateLimiter,
  register
);

// Verify email
router.post(
  "/verify-email",
  verifyEmail
);

// Resend verification code
router.post(
  "/resend-verification",
  resendVerificationRateLimiter,
  resendVerification
);

// Login
router.post(
  "/login",
  loginRateLimiter,
  login
);

// Request password reset link
router.post(
  "/forgot-password",
  forgotPasswordRateLimiter,
  forgotPassword
);

// Reset password using token
router.post(
  "/reset-password",
  resetPasswordController
);

module.exports = router;