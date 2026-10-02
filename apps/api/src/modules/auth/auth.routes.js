const express = require("express");

const { register, login } = require("./auth.controller");
const { verifyEmail } = require("./verification.controller");

const router = express.Router();

// Register a new user
router.post("/register", register);

// Verify user's email
router.post("/verify-email", verifyEmail);

// Login user
router.post("/login", login);

module.exports = router;