const express = require("express");

const authMiddleware = require("../../core/middleware/authMiddleware");

const {
  create,
  getAll,
  getOne,
  remove,
  analyze,
} = require("./evidence.controller");

const router = express.Router();


// All evidence routes require authentication
router.use(authMiddleware);


// Create evidence
router.post("/", create);

router.post("/:evidenceId/analyze", analyze);


// Get all evidence
router.get("/", getAll);


// Get one evidence
router.get("/:evidenceId", getOne);


// Remove evidence
router.delete("/:evidenceId", remove);


module.exports = router;