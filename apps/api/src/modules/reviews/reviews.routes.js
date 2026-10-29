const express = require("express");

const authMiddleware = require("../../core/middleware/authMiddleware");
const authorizeRoles = require("../../core/middleware/authorizeRoles");
const AppError = require("../../core/errors/AppError");

const {
  stats,
  queue,
  history,
  detail,
  decision,
} = require("./reviews.controller");

const router = express.Router();

// Every route here is reviewer-only, enforced on the server.
router.use(authMiddleware, authorizeRoles("REVIEWER", "ADMIN"));

router.param("evidenceId", (req, res, next, id) => {
  if (!/^[a-f\d]{24}$/i.test(id)) {
    return next(new AppError("Evidence ID is invalid", 400));
  }
  next();
});

router.get("/stats", stats);
router.get("/queue", queue);
router.get("/history", history);
router.get("/evidence/:evidenceId", detail);
router.post("/evidence/:evidenceId/decision", decision);

module.exports = router;