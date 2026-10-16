
const {
  analyzeEvidenceWithAI,
} = require("../../integrations/openrouter/openrouter.service");

const Candidate = require("../candidates/candidate.model");
const CandidateSkill = require("../skills/candidateSkill.model");
const Evidence = require("./evidence.model");
const AppError = require("../../core/errors/AppError");

const SKILL_POPULATE = {
  path: "candidateSkillId",
  populate: {
    path: "skillId",
    select: "name slug category description competencies",
  },
};

// Recalculate the aggregate score, excluding rejected evidence.
const recalculateCandidateSkillScore = async (candidateSkillId) => {
  const candidateSkill = await CandidateSkill.findById(candidateSkillId);

  if (!candidateSkill) {
    throw new AppError("Candidate skill not found", 404);
  }

  const analyzedEvidence = await Evidence.find({
    candidateSkillId: candidateSkill._id,
    aiAnalysis: { $ne: null },
    verificationStatus: { $ne: "REJECTED" },
  }).select("confidenceScore");

  const validScores = analyzedEvidence
    .map((item) => item.confidenceScore)
    .filter(
      (score) =>
        typeof score === "number" &&
        Number.isFinite(score) &&
        score >= 0 &&
        score <= 100
    );

  candidateSkill.confidenceScore = validScores.length
    ? Math.round(
        validScores.reduce((sum, score) => sum + score, 0) /
          validScores.length
      )
    : 0;

  // AI analysis must never automatically verify a skill.
  if (
    candidateSkill.verificationStatus !== "VERIFIED" &&
    candidateSkill.verificationStatus !== "REJECTED"
  ) {
    candidateSkill.verificationStatus = validScores.length
      ? "PENDING"
      : "UNVERIFIED";
  }

  await candidateSkill.save();
  return candidateSkill;
};

// Create evidence for a candidate skill.
const createEvidence = async (
  userId,
  { candidateSkillId, type, title, description, sourceUrl }
) => {
  const candidate = await Candidate.findOne({ userId });

  if (!candidate) {
    throw new AppError("Candidate profile not found", 404);
  }

  const candidateSkill = await CandidateSkill.findOne({
    _id: candidateSkillId,
    candidateId: candidate._id,
    isActive: true,
  });

  if (!candidateSkill) {
    throw new AppError("Candidate skill not found", 404);
  }

  const allowedTypes = [
    "PROJECT",
    "GITHUB",
    "ASSESSMENT",
    "CERTIFICATE",
    "INTERNSHIP",
  ];

  if (!allowedTypes.includes(type)) {
    throw new AppError("Invalid evidence type", 400);
  }

  return Evidence.create({
    candidateId: candidate._id,
    candidateSkillId: candidateSkill._id,
    type,
    title,
    description,
    sourceUrl,
  });
};

// Get all evidence belonging to the current candidate.
const getCandidateEvidence = async (userId) => {
  const candidate = await Candidate.findOne({ userId });

  if (!candidate) {
    throw new AppError("Candidate profile not found", 404);
  }

  return Evidence.find({ candidateId: candidate._id })
    .populate(SKILL_POPULATE)
    .sort({ createdAt: -1 });
};

// Get one evidence item belonging to the current candidate.
const getEvidenceById = async (userId, evidenceId) => {
  const candidate = await Candidate.findOne({ userId });

  if (!candidate) {
    throw new AppError("Candidate profile not found", 404);
  }

  const evidence = await Evidence.findOne({
    _id: evidenceId,
    candidateId: candidate._id,
  }).populate(SKILL_POPULATE);

  if (!evidence) {
    throw new AppError("Evidence not found", 404);
  }

  return evidence;
};

// Delete evidence and recalculate its skill score.
const removeEvidence = async (userId, evidenceId) => {
  const candidate = await Candidate.findOne({ userId });

  if (!candidate) {
    throw new AppError("Candidate profile not found", 404);
  }

  const evidence = await Evidence.findOne({
    _id: evidenceId,
    candidateId: candidate._id,
  });

  if (!evidence) {
    throw new AppError("Evidence not found", 404);
  }

  const candidateSkillId = evidence.candidateSkillId;

  await Evidence.findByIdAndDelete(evidence._id);
  await recalculateCandidateSkillScore(candidateSkillId);

  return evidence;
};

// Analyze evidence using AI.
const analyzeEvidence = async (userId, evidenceId) => {
  const candidate = await Candidate.findOne({ userId });

  if (!candidate) {
    throw new AppError("Candidate profile not found", 404);
  }

  const evidence = await Evidence.findOne({
    _id: evidenceId,
    candidateId: candidate._id,
  }).populate(SKILL_POPULATE);

  if (!evidence) {
    throw new AppError("Evidence not found", 404);
  }

  if (evidence.verificationStatus === "REJECTED") {
    throw new AppError(
      "Rejected evidence cannot be analyzed. Submit new evidence instead.",
      400
    );
  }

  const candidateSkill = evidence.candidateSkillId;
  const skill = candidateSkill?.skillId;

  if (!candidateSkill || !skill || !candidateSkill.isActive) {
    throw new AppError(
      "An active candidate skill is required to analyze evidence",
      400
    );
  }

  const analysis = await analyzeEvidenceWithAI({ evidence, skill });

  if (
    !analysis ||
    typeof analysis.summary !== "string" ||
    !Array.isArray(analysis.competencies) ||
    !Array.isArray(analysis.strengths) ||
    !Array.isArray(analysis.missingEvidence) ||
    !Number.isInteger(analysis.overallEvidenceScore) ||
    analysis.overallEvidenceScore < 0 ||
    analysis.overallEvidenceScore > 100
  ) {
    throw new AppError("AI returned an invalid analysis structure", 502);
  }

  for (const item of analysis.competencies) {
    if (
      typeof item.name !== "string" ||
      typeof item.reason !== "string" ||
      !Number.isInteger(item.score) ||
      item.score < 0 ||
      item.score > 100
    ) {
      throw new AppError("AI returned invalid competency scores", 502);
    }
  }

  if (
    !analysis.strengths.every((item) => typeof item === "string") ||
    !analysis.missingEvidence.every((item) => typeof item === "string")
  ) {
    throw new AppError(
      "AI returned invalid strengths or evidence gaps",
      502
    );
  }

  evidence.aiAnalysis = analysis;
  evidence.confidenceScore = analysis.overallEvidenceScore;
  await evidence.save();

  await recalculateCandidateSkillScore(candidateSkill._id);

  return Evidence.findById(evidence._id).populate(SKILL_POPULATE);
};

// Admin/reviewer approves or rejects evidence.
const reviewEvidence = async (
  reviewerUserId,
  evidenceId,
  { status, reviewNote = "" }
) => {
  if (!["VERIFIED", "REJECTED"].includes(status)) {
    throw new AppError(
      "Review status must be VERIFIED or REJECTED",
      400
    );
  }

  if (typeof reviewNote !== "string" || reviewNote.length > 1000) {
    throw new AppError("Review note must be 1000 characters or fewer", 400);
  }

  const evidence = await Evidence.findById(evidenceId);

  if (!evidence) {
    throw new AppError("Evidence not found", 404);
  }

  const candidateSkillId = evidence.candidateSkillId;

  evidence.verificationStatus = status;
  evidence.reviewedBy = reviewerUserId;
  evidence.reviewedAt = new Date();
  evidence.reviewNote = reviewNote.trim();
  evidence.verifiedAt = status === "VERIFIED" ? new Date() : null;

  await evidence.save();

  await recalculateCandidateSkillScore(candidateSkillId);

  return Evidence.findById(evidence._id).populate(SKILL_POPULATE);
};

module.exports = {
  createEvidence,
  getCandidateEvidence,
  getEvidenceById,
  removeEvidence,
  analyzeEvidence,
  reviewEvidence,
};
