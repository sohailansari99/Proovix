const mongoose = require("mongoose");

const evidenceSchema = new mongoose.Schema(
  {
    // Candidate who owns this evidence
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Candidate",
      required: true,
      index: true,
    },

    // Skill this evidence is supporting
    candidateSkillId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CandidateSkill",
      required: true,
      index: true,
    },

    // Type of evidence
    type: {
      type: String,
      enum: [
        "PROJECT",
        "GITHUB",
        "ASSESSMENT",
        "CERTIFICATE",
        "INTERNSHIP",
      ],
      required: true,
    },

    // Name/title of the evidence
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    // Additional explanation
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },

    // URL of the evidence
    // Example:
    // GitHub repository
    // Certificate verification page
    // Project deployment
    sourceUrl: {
      type: String,
      trim: true,
      default: "",
    },

    // Current verification status
    verificationStatus: {
      type: String,
      enum: [
        "PENDING",
        "VERIFIED",
        "REJECTED",
      ],
      default: "PENDING",
    },

    // AI/evidence confidence score
    confidenceScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    // AI-generated analysis
    aiAnalysis: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    // When the evidence was verified
    verifiedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "Evidence",
  evidenceSchema
);