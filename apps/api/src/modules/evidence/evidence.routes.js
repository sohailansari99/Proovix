const express = require("express");

const authMiddleware = require("../../core/middleware/authMiddleware");
const authorizeRoles = require("../../core/middleware/authorizeRoles");


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


// All evidence routes require authentication
router.use(authMiddleware);


// Create evidence
router.post("/", create);

router.post("/:evidenceId/analyze", analyze);
router.patch("/:evidenceId", update);

router.patch(
  "/:evidenceId/review",
  authorizeRoles("ADMIN", "REVIEWER"),
  review
);



// Get all evidence
router.get("/", getAll);


// Get one evidence
router.get("/:evidenceId", getOne);


// Remove evidence
router.delete("/:evidenceId", remove);


module.exports = router;