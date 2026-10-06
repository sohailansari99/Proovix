const express = require("express");

const authMiddleware = require("../../core/middleware/authMiddleware");
const { getCurrentUser } = require("./users.controller");

const router = express.Router();

// Protected route
router.get("/me", authMiddleware, getCurrentUser);

module.exports = router;