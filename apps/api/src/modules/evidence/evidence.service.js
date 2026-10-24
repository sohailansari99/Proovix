const {
  analyzeEvidenceWithAI,
} = require("../../integrations/openrouter/openrouter.service");

const {
  requireObjectId,
  optionalHttpUrl,
} = require("../../core/utils/validators");

const Candidate = require("../candidates/candidate.model");
const CandidateSkill = require("../skills/candidateSkill.model");
const Evidence = require("./evidence.model");
const AppError = require("../../core/errors/AppError");

const ALLOWED_EVIDENCE_TYPES = [
  "PROJECT",
  "GITHUB",
  "ASSESSMENT",
  "CERTIFICATE",
  "INTERNSHIP",
];

const SKILL_POPULATE = {
  path: "candidateSkillId",
  populate: {
    path: "skillId",
    select: "name slug category description competencies",
  },
};

// Recalculate a candidate skill's score and verification status.
const recalculateCandidateSkillScore = async (candidateSkillId) => {
  const candidateSkill = await CandidateSkill.findById(candidateSkillId);

  if (!candidateSkill) {
    throw new AppError("Candidate skill not found", 404);
  }

  const allEvidence = await Evidence.find({
    candidateSkillId: candidateSkill._id,
  }).select("verificationStatus confidenceScore aiAnalysis");

  // Only analyzed and human-verified evidence contributes to the skill score.
  const analyzedEvidence = allEvidence.filter(
    (item) =>
      item.verificationStatus === "VERIFIED" &&
      item.aiAnalysis !== null &&
      item.aiAnalysis !== undefined
  );

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

  const hasVerifiedEvidence = allEvidence.some(
    (item) => item.verificationStatus === "VERIFIED"
  );

  const hasPendingEvidence = allEvidence.some(
    (item) => item.verificationStatus === "PENDING"
  );

  const hasRejectedEvidence = allEvidence.some(
    (item) => item.verificationStatus === "REJECTED"
  );

  // Pending evidence takes priority while review is outstanding.
  if (hasPendingEvidence) {
    candidateSkill.verificationStatus = "PENDING";
  } else if (hasVerifiedEvidence) {
    candidateSkill.verificationStatus = "VERIFIED";
  } else if (hasRejectedEvidence) {
    candidateSkill.verificationStatus = "REJECTED";
  } else {
    candidateSkill.verificationStatus = "UNVERIFIED";
  }

  await candidateSkill.save();

  return candidateSkill;
};

// Create evidence for an active skill belonging to the candidate.
const createEvidence = async (
  userId,
  { candidateSkillId, type, title, description, sourceUrl }
) => {
  requireObjectId(candidateSkillId, "Candidate skill ID");

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
    throw new AppError("Active candidate skill not found", 404);
  }

  if (!ALLOWED_EVIDENCE_TYPES.includes(type)) {
    throw new AppError("Invalid evidence type", 400);
  }

  if (
    typeof title !== "string" ||
    !title.trim() ||
    title.trim().length > 150
  ) {
    throw new AppError(
      "Title is required and must be 150 characters or fewer",
      400
    );
  }

  if (
    description !== undefined &&
    (typeof description !== "string" || description.length > 2000)
  ) {
    throw new AppError(
      "Description must be 2000 characters or fewer",
      400
    );
  }

  const evidence = await Evidence.create({
    candidateId: candidate._id,
    candidateSkillId: candidateSkill._id,
    type,
    title: title.trim(),
    description:
      typeof description === "string" ? description.trim() : "",
    sourceUrl: optionalHttpUrl(sourceUrl, "Source URL"),
  });

  await recalculateCandidateSkillScore(candidateSkill._id);

  return Evidence.findById(evidence._id).populate(SKILL_POPULATE);
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

// Update evidence submitted by its owner.
const updateEvidence = async (
  userId,
  evidenceId,
  { type, title, description, sourceUrl } = {}
) => {
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

  if (evidence.verificationStatus === "VERIFIED") {
    throw new AppError("Verified evidence cannot be edited", 400);
  }

  // Rejected evidence stays rejected. Submitting new evidence is the way forward.
  if (evidence.verificationStatus === "REJECTED") {
    throw new AppError(
      "Rejected evidence cannot be edited. Submit new evidence instead.",
      400
    );
  }

  if (type !== undefined) {
    if (!ALLOWED_EVIDENCE_TYPES.includes(type)) {
      throw new AppError("Invalid evidence type", 400);
    }

    evidence.type = type;
  }

  if (title !== undefined) {
    if (
      typeof title !== "string" ||
      !title.trim() ||
      title.trim().length > 150
    ) {
      throw new AppError(
        "Title is required and must be 150 characters or fewer",
        400
      );
    }

    evidence.title = title.trim();
  }

  if (description !== undefined) {
    if (
      typeof description !== "string" ||
      description.length > 2000
    ) {
      throw new AppError(
        "Description must be 2000 characters or fewer",
        400
      );
    }

    evidence.description = description.trim();
  }

  if (sourceUrl !== undefined) {
    evidence.sourceUrl = optionalHttpUrl(sourceUrl, "Source URL");
  }

  // Editing invalidates the previous analysis and review.
  evidence.aiAnalysis = null;
  evidence.confidenceScore = 0;
  evidence.verificationStatus = "PENDING";
  evidence.verifiedAt = null;
  evidence.reviewedBy = null;
  evidence.reviewedAt = null;
  evidence.reviewNote = "";

  await evidence.save();

  await recalculateCandidateSkillScore(evidence.candidateSkillId);

  return Evidence.findById(evidence._id).populate(SKILL_POPULATE);
};

// Delete evidence and recalculate the associated skill.
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

  // Generate a fresh AI analysis.
  const analysis = await analyzeEvidenceWithAI({ evidence, skill });

  // Validate the AI response.
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

  // Store the latest successful AI analysis.
  evidence.aiAnalysis = analysis;
  evidence.confidenceScore = analysis.overallEvidenceScore;

  // A previous approval applies to the old analysis, not this new one.
  if (evidence.verificationStatus === "VERIFIED") {
    evidence.verificationStatus = "PENDING";
    evidence.verifiedAt = null;
    evidence.reviewedBy = null;
    evidence.reviewedAt = null;
    evidence.reviewNote = "";
  }

  await evidence.save();

  // Recalculate the skill score using eligible verified evidence.
  await recalculateCandidateSkillScore(candidateSkill._id);

  return Evidence.findById(evidence._id).populate(SKILL_POPULATE);
};

// Reviewer approves or rejects evidence.
const reviewEvidence = async (
  reviewerUserId,
  evidenceId,
  { status, reviewNote = "" } = {}
) => {
  if (!["VERIFIED", "REJECTED"].includes(status)) {
    throw new AppError(
      "Review status must be VERIFIED or REJECTED",
      400
    );
  }

  if (typeof reviewNote !== "string" || reviewNote.length > 1000) {
    throw new AppError(
      "Review note must be 1000 characters or fewer",
      400
    );
  }

  const evidence = await Evidence.findById(evidenceId);

  if (!evidence) {
    throw new AppError("Evidence not found", 404);
  }

  // Nobody reviews their own work.
  const owner = await Candidate.findById(evidence.candidateId).select(
    "userId"
  );

  if (owner && String(owner.userId) === String(reviewerUserId)) {
    throw new AppError("You cannot review your own evidence", 403);
  }

  // A skill score comes from analyzed evidence, so require the analysis first.
  if (status === "VERIFIED" && !evidence.aiAnalysis) {
    throw new AppError(
      "Run the AI analysis before verifying this evidence",
      400
    );
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
  updateEvidence,
  getCandidateEvidence,
  getEvidenceById,
  removeEvidence,
  analyzeEvidence,
  reviewEvidence,
  recalculateCandidateSkillScore,
};