const Candidate = require("./candidate.model");

const AppError = require("../../core/errors/AppError");

const createCandidateProfile = async ({
  userId,
  fullName,
  username,
}) => {
  // Check whether candidate profile already exists
  const existingCandidate = await Candidate.findOne({
    userId,
  });

  if (existingCandidate) {
    throw new AppError(
      "Candidate profile already exists",
      409
    );
  }

  // Check whether username is already taken
  const existingUsername = await Candidate.findOne({
    username,
  });

  if (existingUsername) {
    throw new AppError(
      "Username is already taken",
      409
    );
  }

  // Create candidate profile
  const candidate = await Candidate.create({
    userId,
    fullName,
    username,
  });

  return candidate;
};

const getCandidateProfile = async (userId) => {
  const candidate = await Candidate.findOne({
    userId,
  });

  if (!candidate) {
    throw new AppError(
      "Candidate profile not found",
      404
    );
  }

  return candidate;
};

const updateCandidateProfile = async (userId, updates) => {
  const candidate = await Candidate.findOne({
    userId,
  });

  if (!candidate) {
    throw new AppError(
      "Candidate profile not found",
      404
    );
  }

  // Fields that are allowed to be updated
  const allowedFields = [
    "fullName",
    "username",
    "headline",
    "bio",
    "location",
    "profileImage",
    "githubUrl",
    "linkedinUrl",
    "portfolioUrl",
    "isPublic",
  ];

  // Update only allowed fields
  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      candidate[field] = updates[field];
    }
  }

  // Check username uniqueness if username is being changed
  if (updates.username !== undefined) {
    const existingUsername = await Candidate.findOne({
      username: updates.username,
      _id: { $ne: candidate._id },
    });

    if (existingUsername) {
      throw new AppError(
        "Username is already taken",
        409
      );
    }
  }

  await candidate.save();

  return candidate;
};

module.exports = {
  createCandidateProfile,
  getCandidateProfile,
  updateCandidateProfile,
};