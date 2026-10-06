const mongoose = require("mongoose");

const candidateSkillSchema = new mongoose.Schema(
  {
    // Candidate who claims this skill
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Candidate",
      required: true,
      index: true,
    },

    // Skill being claimed
    skillId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Skill",
      required: true,
      index: true,
    },

    // Current verification state
    verificationStatus: {
      type: String,
      enum: [
        "UNVERIFIED",
        "PENDING",
        "VERIFIED",
        "REJECTED",
      ],
      default: "UNVERIFIED",
    },

    // Overall confidence after evidence/assessment
    confidenceScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    // Whether candidate currently wants this skill
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// A candidate should not have the same skill twice
candidateSkillSchema.index(
  {
    candidateId: 1,
    skillId: 1,
  },
  {
    unique: true,
  }
);

module.exports = mongoose.model(
  "CandidateSkill",
  candidateSkillSchema
);