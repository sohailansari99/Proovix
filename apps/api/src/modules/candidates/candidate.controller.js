const {
  createCandidateProfile,
  getCandidateProfile,
} = require("./candidate.service");

const AppError = require("../../core/errors/AppError");

const {
  sendSuccess,
} = require("../../core/utils/apiResponse");

const createProfile = async (req, res, next) => {
  try {
    const { fullName, username } = req.body;

    // Validate required fields
    if (!fullName || !username) {
      throw new AppError(
        "Full name and username are required",
        400
      );
    }

    // User ID comes from authenticated JWT
    const userId = req.user.userId;

    const candidate = await createCandidateProfile({
      userId,
      fullName,
      username,
    });

    return sendSuccess(
      res,
      201,
      "Candidate profile created successfully",
      candidate
    );
  } catch (error) {
    next(error);
  }
};

const getProfile = async (req, res, next) => {
  try {
    // User ID comes from authenticated JWT
    const userId = req.user.userId;

    const candidate = await getCandidateProfile(
      userId
    );

    return sendSuccess(
      res,
      200,
      "Candidate profile retrieved successfully",
      candidate
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createProfile,
  getProfile,
};