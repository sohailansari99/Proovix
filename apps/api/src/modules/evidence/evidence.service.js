const { analyzeEvidenceWithAI } = require("../../integrations/openrouter/openrouter.service");
const Candidate = require("../candidates/candidate.model");
const CandidateSkill = require("../skills/candidateSkill.model");
const Evidence = require("./evidence.model");

const AppError = require("../../core/errors/AppError");

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
      _id: candidateSkillId,
      candidateId: candidate._id,
      isActive: true,
    });

  if (!candidateSkill) {
    throw new AppError(
      "Candidate skill not found",
      404
    );
  }

  // Validate evidence type
  const allowedTypes = [
    "PROJECT",
    "GITHUB",
    "ASSESSMENT",
    "CERTIFICATE",
    "INTERNSHIP",
  ];

  if (!allowedTypes.includes(type)) {
    throw new AppError(
      "Invalid evidence type",
      400
    );
  }

  // Create evidence
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


// Get all evidence belonging to current candidate
const getCandidateEvidence = async (userId) => {
  // Find candidate
  const candidate = await Candidate.findOne({
    userId,
  });

  if (!candidate) {
    throw new AppError(
      "Candidate profile not found",
      404
    );
  }

  // Get active evidence
  const evidence = await Evidence.find({
    candidateId: candidate._id,
  })
    .populate({
      path: "candidateSkillId",
      populate: {
        path: "skillId",
        select:
          "name slug category description competencies",
      },
    })
    .sort({
      createdAt: -1,
    });

  return evidence;
};


// Get one specific evidence item
const getEvidenceById = async (
  userId,
  evidenceId
) => {
  // Find candidate
  const candidate = await Candidate.findOne({
    userId,
  });

  if (!candidate) {
    throw new AppError(
      "Candidate profile not found",
      404
    );
  }

  // Find evidence belonging to this candidate
  const evidence = await Evidence.findOne({
    _id: evidenceId,
    candidateId: candidate._id,
  }).populate({
    path: "candidateSkillId",
    populate: {
      path: "skillId",
      select:
        "name slug category description competencies",
    },
  });

  if (!evidence) {
    throw new AppError(
      "Evidence not found",
      404
    );
  }

  return evidence;
};


// Remove evidence
const removeEvidence = async (
  userId,
  evidenceId
) => {
  // Find candidate
  const candidate = await Candidate.findOne({
    userId,
  });

  if (!candidate) {
    throw new AppError(
      "Candidate profile not found",
      404
    );
  }

  // Find evidence
  const evidence = await Evidence.findOne({
    _id: evidenceId,
    candidateId: candidate._id,
  });

  if (!evidence) {
    throw new AppError(
      "Evidence not found",
      404
    );
  }

  // Delete evidence
  await Evidence.findByIdAndDelete(
    evidence._id
  );

  return evidence;
};

const analyzeEvidence = async (userId, evidenceId) => {
  // Find the candidate profile belonging to the logged-in user
  const candidate = await Candidate.findOne({ userId });

  if (!candidate) {
    throw new AppError("Candidate profile not found", 404);
  }

  // Only allow the owner to analyze their evidence
  const evidence = await Evidence.findOne({
    _id: evidenceId,
    candidateId: candidate._id,
  }).populate({
    path: "candidateSkillId",
    populate: {
      path: "skillId",
      select: "name slug category description competencies",
    },
  });

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

  // Ask OpenRouter to analyze the submitted evidence
  const analysis = await analyzeEvidenceWithAI({
    evidence,
    skill,
  });

  // Validate the AI response before saving it
  if (
    !analysis ||
    typeof analysis.summary !== "string" ||
    !Array.isArray(analysis.competencies) ||
    !Array.isArray(analysis.strengths) ||
    !Array.isArray(analysis.missingEvidence) ||
    typeof analysis.overallEvidenceScore !== "number" ||
    !Number.isFinite(analysis.overallEvidenceScore) ||
    analysis.overallEvidenceScore < 0 ||
    analysis.overallEvidenceScore > 100
  ) {
    throw new AppError("AI returned an invalid analysis structure", 502);
  }

  for (const item of analysis.competencies) {
    if (
      typeof item.name !== "string" ||
      typeof item.reason !== "string" ||
      typeof item.score !== "number" ||
      !Number.isFinite(item.score) ||
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
    throw new AppError("AI returned invalid strengths or evidence gaps", 502);
  }

  // Store the evidence-level analysis.
  // This does NOT verify the candidate's skill.
  evidence.aiAnalysis = analysis;
  evidence.confidenceScore = analysis.overallEvidenceScore;

  await evidence.save();

  return evidence;
};

module.exports = {
  createEvidence,
  getCandidateEvidence,
  getEvidenceById,
  removeEvidence,
  analyzeEvidence,
};