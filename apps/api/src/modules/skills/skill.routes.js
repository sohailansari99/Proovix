const express = require("express");

const authMiddleware = require("../../core/middleware/authMiddleware");
const authorizeRoles = require("../../core/middleware/authorizeRoles");

const { create, getAll, getBySlug } = require("./skill.controller");

const router = express.Router();

router.use(authMiddleware);

// Only admins can add skills to the catalog
router.post("/", authorizeRoles("ADMIN"), create);

router.get("/", getAll);
router.get("/:slug", getBySlug);

module.exports = router;