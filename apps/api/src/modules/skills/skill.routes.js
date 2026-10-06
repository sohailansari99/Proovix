const express = require("express");

const {
  create,
  getAll,
  getBySlug,
} = require("./skill.controller");

const router = express.Router();

// Create a new skill
router.post("/", create);

// Get all active skills
router.get("/", getAll);

// Get skill by slug
router.get("/:slug", getBySlug);

module.exports = router;