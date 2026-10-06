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

module.exports = {
  createCandidateProfile,
  getCandidateProfile,
};