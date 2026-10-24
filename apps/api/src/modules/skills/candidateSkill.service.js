const Candidate = require("../candidates/candidate.model");
const Skill = require("./skill.model");
const CandidateSkill = require("./candidateSkill.model");
const { recalculateCandidateSkillScore } = require("../evidence/evidence.service");

const AppError = require("../../core/errors/AppError");
const { requireObjectId } = require("../../core/utils/validators");

const addSkillToCandidate = async (userId, skillId) => {
  requireObjectId(skillId, "Skill ID");

  const candidate = await Candidate.findOne({ userId });

  if (!candidate) {
    throw new AppError("Candidate profile not found", 404);
  }

  const skill = await Skill.findOne({ _id: skillId, isActive: true });

  if (!skill) {
    throw new AppError("Skill not found", 404);
  }

  const existing = await CandidateSkill.findOne({
    candidateId: candidate._id,
    skillId: skill._id,
  });

  if (existing) {
    if (existing.isActive) {
      throw new AppError("Skill is already added to this candidate", 409);
    }

    // Bring the skill back and score it with the same rules as everywhere else.
    existing.isActive = true;
    await existing.save();

    return recalculateCandidateSkillScore(existing._id);
  }

  try {
    return await CandidateSkill.create({
      candidateId: candidate._id,
      skillId: skill._id,
    });
  } catch (error) {
    if (error.code === 11000) {
      throw new AppError("Skill is already added to this candidate", 409);
    }
    throw error;
  }
};

const getCandidateSkills = async (userId) => {
  const candidate = await Candidate.findOne({ userId });

  if (!candidate) {
    throw new AppError("Candidate profile not found", 404);
  }

  return CandidateSkill.find({ candidateId: candidate._id, isActive: true })
    .populate("skillId", "name slug category description competencies")
    .sort({ createdAt: -1 });
};

const removeSkillFromCandidate = async (userId, skillId) => {
  requireObjectId(skillId, "Skill ID");

  const candidate = await Candidate.findOne({ userId });

  if (!candidate) {
    throw new AppError("Candidate profile not found", 404);
  }

  const candidateSkill = await CandidateSkill.findOne({
    candidateId: candidate._id,
    skillId,
    isActive: true,
  });

  if (!candidateSkill) {
    throw new AppError("Candidate skill not found", 404);
  }

  // Deactivate without deleting the evidence history.
  candidateSkill.isActive = false;
  candidateSkill.confidenceScore = 0;
  candidateSkill.verificationStatus = "UNVERIFIED";

  await candidateSkill.save();

  return candidateSkill;
};

module.exports = {
  addSkillToCandidate,
  getCandidateSkills,
  removeSkillFromCandidate,
};