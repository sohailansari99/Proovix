const express = require("express");

const authMiddleware = require("../../core/middleware/authMiddleware");

const {
  addSkill,
  getSkills,
  removeSkill,
} = require("./candidateSkill.controller");

const router = express.Router();

router.use(authMiddleware);

router.post("/", addSkill);

router.get("/", getSkills);

router.delete("/:skillId", removeSkill);

module.exports = router;