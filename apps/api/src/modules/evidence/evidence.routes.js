const express = require("express");
const rateLimit = require("express-rate-limit");

const authMiddleware = require("../../core/middleware/authMiddleware");
const authorizeRoles = require("../../core/middleware/authorizeRoles");
const AppError = require("../../core/errors/AppError");

const {
  create,
  update,
  getAll,
  getOne,
  remove,
  analyze,
  review,
} = require("./evidence.controller");

const router = express.Router();

// AI analysis costs money, so limit it per user.
const analyzeRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String(req.user?.userId || "anonymous"),
  message: {
    success: false,
    message: "Too many analysis requests. Please try again in a few minutes.",
  },
});

router.use(authMiddleware);

// Reject malformed IDs before they reach the database.
router.param("evidenceId", (req, res, next, id) => {
  if (!/^[a-f\d]{24}$/i.test(id)) {
    return next(new AppError("Evidence ID is invalid", 400));
  }
  next();
});

router.post("/", create);
router.get("/", getAll);
router.get("/:evidenceId", getOne);
router.patch("/:evidenceId", update);
router.delete("/:evidenceId", remove);

router.post("/:evidenceId/analyze", analyzeRateLimiter, analyze);

router.patch(
  "/:evidenceId/review",
  authorizeRoles("ADMIN", "REVIEWER"),
  review
);

module.exports = router;