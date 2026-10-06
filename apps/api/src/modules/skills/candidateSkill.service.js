const Candidate = require("../candidates/candidate.model");
const Skill = require("./skill.model");
const CandidateSkill = require("./candidateSkill.model");

const AppError = require("../../core/errors/AppError");

const addSkillToCandidate = async (
  userId,
  skillId
) => {
  // Find candidate profile
  const candidate = await Candidate.findOne({
    userId,
  });

  if (!candidate) {
    throw new AppError(
      "Candidate profile not found",
      404
    );
  }

  // Check whether skill exists
  const skill = await Skill.findOne({
    _id: skillId,
    isActive: true,
  });

  if (!skill) {
    throw new AppError(
      "Skill not found",
      404
    );
  }

  // Prevent duplicate candidate-skill relationship
  const existingCandidateSkill =
    await CandidateSkill.findOne({
      candidateId: candidate._id,
      skillId: skill._id,
    });

  if (existingCandidateSkill) {
    throw new AppError(
      "Skill is already added to this candidate",
      409
    );
  }

  // Create relationship
  const candidateSkill = await CandidateSkill.create({
    candidateId: candidate._id,
    skillId: skill._id,
  });

  return candidateSkill;
};

const getCandidateSkills = async (userId) => {
  // Find candidate profile
  const candidate = await Candidate.findOne({
    userId,
  });

  if (!candidate) {
    throw new AppError(
      "Candidate profile not found",
      404
    );
  }

  // Get candidate skills with skill details
  const candidateSkills = await CandidateSkill.find({
    candidateId: candidate._id,
    isActive: true,
  })
    .populate(
      "skillId",
      "name slug category description competencies"
    )
    .sort({
      createdAt: -1,
    });

  return candidateSkills;
};

const removeSkillFromCandidate = async (
  userId,
  skillId
) => {
  // Find candidate profile
  const candidate = await Candidate.findOne({
    userId,
  });

  if (!candidate) {
    throw new AppError(
      "Candidate profile not found",
      404
    );
  }

  // Find candidate-skill relationship
  const candidateSkill =
    await CandidateSkill.findOne({
      candidateId: candidate._id,
      skillId,
      isActive: true,
    });

  if (!candidateSkill) {
    throw new AppError(
      "Candidate skill not found",
      404
    );
  }

  // Deactivate instead of deleting
  candidateSkill.isActive = false;

  await candidateSkill.save();

  return candidateSkill;
};

module.exports = {
  addSkillToCandidate,
  getCandidateSkills,
  removeSkillFromCandidate,
};