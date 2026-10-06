const mongoose = require("mongoose");

const candidateSchema = new mongoose.Schema(
  {
    // Link candidate profile to authentication user
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    // Professional identity
    fullName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
    },

    headline: {
      type: String,
      trim: true,
      maxlength: 150,
      default: "",
    },

    bio: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    // Location
    location: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
    },

    // Profile image URL
    profileImage: {
      type: String,
      trim: true,
      default: "",
    },

    // Professional links
    githubUrl: {
      type: String,
      trim: true,
      default: "",
    },

    linkedinUrl: {
      type: String,
      trim: true,
      default: "",
    },

    portfolioUrl: {
      type: String,
      trim: true,
      default: "",
    },

    // Profile visibility
    isPublic: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "Candidate",
  candidateSchema
);