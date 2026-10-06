const express = require("express");

const authMiddleware = require("../../core/middleware/authMiddleware");

const {
  createProfile,
  getProfile,
} = require("./candidate.controller");

const router = express.Router();

// All candidate routes require authentication
router.use(authMiddleware);

// Create candidate profile
router.post("/", createProfile);

// Get current candidate profile
router.get("/me", getProfile);

module.exports = router;