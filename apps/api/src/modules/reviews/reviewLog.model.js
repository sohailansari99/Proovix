const mongoose = require("mongoose");

const reviewLogSchema = new mongoose.Schema(
  {
    evidenceId: { type: mongoose.Schema.Types.ObjectId, ref: "Evidence", required: true, index: true },
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate", required: true, index: true },
    reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    action: { type: String, enum: ["VERIFIED", "REJECTED", "CHANGES_REQUESTED"], required: true },
    previousStatus: { type: String, default: "PENDING" },
    note: { type: String, trim: true, maxlength: 1000, default: "" },
    // Snapshot, so the history stays readable even if the evidence is deleted later
    evidenceTitle: { type: String, trim: true, maxlength: 150, default: "" },
  },
  { timestamps: true }
);

reviewLogSchema.index({ createdAt: -1 });

module.exports =
  mongoose.models.ReviewLog || mongoose.model("ReviewLog", reviewLogSchema);