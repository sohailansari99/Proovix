const mongoose = require("mongoose");

const skillSchema = new mongoose.Schema(
  {
    // Human-readable skill name
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 100,
    },

    // URL-friendly identifier
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 100,
    },

    // Skill category
    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    // What this skill represents
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },

    // Core abilities associated with the skill
    competencies: {
      type: [String],
      default: [],
    },

    // Skill definition version
    version: {
      type: Number,
      default: 1,
    },

    // Allows us to disable old skills without deleting them
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Skill", skillSchema);