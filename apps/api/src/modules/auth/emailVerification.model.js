const mongoose = require("mongoose");

const emailVerificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    // SHA-256 hash of the token that was emailed (the raw token is never stored)
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      sparse: true,
    },

    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "EmailVerification",
  emailVerificationSchema
);