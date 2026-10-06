const express = require("express");

const authMiddleware = require("../../core/middleware/authMiddleware");

const {
  createProfile,
  getProfile,
  updateProfile,
} = require("./candidate.controller");

const router = express.Router();

// All candidate routes require authentication
router.use(authMiddleware);

// Create candidate profile
router.post("/", createProfile);

// Get current candidate profile
router.get("/me", getProfile);

// Update current candidate profile
router.patch("/me", updateProfile);

module.exports = router;