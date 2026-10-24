const Candidate = require("./candidate.model");
const AppError = require("../../core/errors/AppError");
const {
  requireString,
  optionalString,
  optionalHttpUrl,
} = require("../../core/utils/validators");

const USERNAME_PATTERN = /^[a-z0-9_-]{3,30}$/;

const normalizeUsername = (value) => {
  if (typeof value !== "string") {
    throw new AppError("Username is required", 400);
  }

  const username = value.trim().toLowerCase();

  if (!USERNAME_PATTERN.test(username)) {
    throw new AppError(
      "Username must be 3–30 characters and use only letters, numbers, underscores or hyphens",
      400
    );
  }

  return username;
};

const createCandidateProfile = async ({ userId, fullName, username }) => {
  const cleanName = requireString(fullName, "Full name", 100);
  const cleanUsername = normalizeUsername(username);

  if (await Candidate.findOne({ userId })) {
    throw new AppError("Candidate profile already exists", 409);
  }

  if (await Candidate.findOne({ username: cleanUsername })) {
    throw new AppError("Username is already taken", 409);
  }

  try {
    return await Candidate.create({
      userId,
      fullName: cleanName,
      username: cleanUsername,
    });
  } catch (error) {
    if (error.code === 11000) {
      throw new AppError("Username is already taken", 409);
    }
    throw error;
  }
};

const getCandidateProfile = async (userId) => {
  const candidate = await Candidate.findOne({ userId });

  if (!candidate) {
    throw new AppError("Candidate profile not found", 404);
  }

  return candidate;
};

const updateCandidateProfile = async (userId, updates = {}) => {
  const candidate = await Candidate.findOne({ userId });

  if (!candidate) {
    throw new AppError("Candidate profile not found", 404);
  }

  const changes = {};

  if (updates.fullName !== undefined) {
    changes.fullName = requireString(updates.fullName, "Full name", 100);
  }

  if (updates.username !== undefined) {
    changes.username = normalizeUsername(updates.username);

    const taken = await Candidate.findOne({
      username: changes.username,
      _id: { $ne: candidate._id },
    });

    if (taken) {
      throw new AppError("Username is already taken", 409);
    }
  }

  if (updates.headline !== undefined) {
    changes.headline = optionalString(updates.headline, "Headline", 150);
  }
  if (updates.bio !== undefined) {
    changes.bio = optionalString(updates.bio, "Bio", 1000);
  }
  if (updates.location !== undefined) {
    changes.location = optionalString(updates.location, "Location", 100);
  }

  for (const field of ["githubUrl", "linkedinUrl", "portfolioUrl", "profileImage"]) {
    if (updates[field] !== undefined) {
      changes[field] = optionalHttpUrl(updates[field], field);
    }
  }

  if (updates.isPublic !== undefined) {
    if (typeof updates.isPublic !== "boolean") {
      throw new AppError("isPublic must be true or false", 400);
    }
    changes.isPublic = updates.isPublic;
  }

  Object.assign(candidate, changes);

  try {
    await candidate.save();
  } catch (error) {
    if (error.code === 11000) {
      throw new AppError("Username is already taken", 409);
    }
    throw error;
  }

  return candidate;
};

module.exports = {
  createCandidateProfile,
  getCandidateProfile,
  updateCandidateProfile,
};