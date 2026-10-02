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

    codeHash: {
      type: String,
      required: true,
    },

    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },

    attempts: {
      type: Number,
      default: 0,
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