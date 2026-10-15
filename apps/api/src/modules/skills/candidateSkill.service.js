
const Candidate = require("../candidates/candidate.model");
const Skill = require("./skill.model");
const CandidateSkill = require("./candidateSkill.model");
const Evidence = require("../evidence/evidence.model");

const AppError = require("../../core/errors/AppError");

const addSkillToCandidate = async (userId, skillId) => {
  const candidate = await Candidate.findOne({ userId });

  if (!candidate) {
    throw new AppError("Candidate profile not found", 404);
  }

  const skill = await Skill.findOne({
    _id: skillId,
    isActive: true,
  });

  if (!skill) {
    throw new AppError("Skill not found", 404);
  }

  const existingCandidateSkill = await CandidateSkill.findOne({
    candidateId: candidate._id,
    skillId: skill._id,
  });

  if (existingCandidateSkill) {
    if (!existingCandidateSkill.isActive) {
      existingCandidateSkill.isActive = true;

      // Recalculate from the existing, non-rejected evidence.
      const analyzedEvidence = await Evidence.find({
        candidateSkillId: existingCandidateSkill._id,
        aiAnalysis: { $ne: null },
        verificationStatus: { $ne: "REJECTED" },
      }).select("confidenceScore");

      const scores = analyzedEvidence
        .map((item) => item.confidenceScore)
        .filter(
          (score) =>
            typeof score === "number" &&
            Number.isFinite(score) &&
            score >= 0 &&
            score <= 100
        );

      existingCandidateSkill.confidenceScore =
        scores.length > 0
          ? Math.round(
              scores.reduce((sum, score) => sum + score, 0) /
                scores.length
            )
          : 0;

      if (
        existingCandidateSkill.verificationStatus !== "VERIFIED" &&
        existingCandidateSkill.verificationStatus !== "REJECTED"
      ) {
        existingCandidateSkill.verificationStatus =
          scores.length > 0 ? "PENDING" : "UNVERIFIED";
      }

      await existingCandidateSkill.save();

      return existingCandidateSkill;
    }

    throw new AppError(
      "Skill is already added to this candidate",
      409
    );
  }

  return CandidateSkill.create({
    candidateId: candidate._id,
    skillId: skill._id,
  });
};

const getCandidateSkills = async (userId) => {
  const candidate = await Candidate.findOne({ userId });

  if (!candidate) {
    throw new AppError("Candidate profile not found", 404);
  }

  return CandidateSkill.find({
    candidateId: candidate._id,
    isActive: true,
  })
    .populate(
      "skillId",
      "name slug category description competencies"
    )
    .sort({ createdAt: -1 });
};

const removeSkillFromCandidate = async (userId, skillId) => {
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

  // Deactivate the skill without deleting its evidence history.
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
