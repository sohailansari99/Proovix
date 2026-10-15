
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

// Recalculate the candidate skill score from all analyzed evidence.
// Rejected evidence is excluded from the calculation.
const recalculateCandidateSkillScore = async (candidateSkillId) => {
  const candidateSkill = await CandidateSkill.findById(
    candidateSkillId
  );

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

  const averageScore =
    validScores.length > 0
      ? Math.round(
          validScores.reduce((total, score) => total + score, 0) /
            validScores.length
        )
      : 0;

  candidateSkill.confidenceScore = averageScore;

  // AI analysis never automatically verifies a skill.
  // Preserve any existing VERIFIED or REJECTED decision.
  if (
    candidateSkill.verificationStatus !== "VERIFIED" &&
    candidateSkill.verificationStatus !== "REJECTED"
  ) {
    candidateSkill.verificationStatus =
      validScores.length > 0 ? "PENDING" : "UNVERIFIED";
  }

  await candidateSkill.save();

  return candidateSkill;
};

// Create evidence for a candidate skill
const createEvidence = async (
  userId,
  {
    candidateSkillId,
    type,
    title,
    description,
    sourceUrl,
  }
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

  const evidence = await Evidence.create({
    candidateId: candidate._id,
    candidateSkillId: candidateSkill._id,
    type,
    title,
    description,
    sourceUrl,
  });

  return evidence;
};

// Get all evidence belonging to the current candidate
const getCandidateEvidence = async (userId) => {
  const candidate = await Candidate.findOne({ userId });

  if (!candidate) {
    throw new AppError("Candidate profile not found", 404);
  }

  return Evidence.find({
    candidateId: candidate._id,
  })
    .populate(SKILL_POPULATE)
    .sort({ createdAt: -1 });
};

// Get one specific evidence item
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

// Remove evidence and recalculate the linked skill score
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

// Analyze evidence and update the linked candidate skill
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

  const candidateSkill = evidence.candidateSkillId;
  const skill = candidateSkill?.skillId;

  if (!candidateSkill || !skill || !candidateSkill.isActive) {
    throw new AppError(
      "An active candidate skill is required to analyze evidence",
      400
    );
  }

  const analysis = await analyzeEvidenceWithAI({
    evidence,
    skill,
  });

  // Validate the returned analysis structure.
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
    throw new AppError(
      "AI returned an invalid analysis structure",
      502
    );
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
    !analysis.strengths.every(
      (item) => typeof item === "string"
    ) ||
    !analysis.missingEvidence.every(
      (item) => typeof item === "string"
    )
  ) {
    throw new AppError(
      "AI returned invalid strengths or evidence gaps",
      502
    );
  }

  // Save the evidence-level analysis.
  evidence.aiAnalysis = analysis;
  evidence.confidenceScore = analysis.overallEvidenceScore;

  await evidence.save();

  // Update the skill's aggregate score using all its analyzed evidence.
  await recalculateCandidateSkillScore(candidateSkill._id);

  // Fetch again so the response includes the updated CandidateSkill.
  const updatedEvidence = await Evidence.findById(
    evidence._id
  ).populate(SKILL_POPULATE);

  return updatedEvidence;
};

module.exports = {
  createEvidence,
  getCandidateEvidence,
  getEvidenceById,
  removeEvidence,
  analyzeEvidence,
};
