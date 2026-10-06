const {
  addSkillToCandidate,
  getCandidateSkills,
  removeSkillFromCandidate,
} = require("./candidateSkill.service");

const AppError = require("../../core/errors/AppError");

const {
  sendSuccess,
} = require("../../core/utils/apiResponse");

const addSkill = async (req, res, next) => {
  try {
    const { skillId } = req.body;

    if (!skillId) {
      throw new AppError(
        "Skill ID is required",
        400
      );
    }

    const userId = req.user.userId;

    const candidateSkill =
      await addSkillToCandidate(
        userId,
        skillId
      );

    return sendSuccess(
      res,
      201,
      "Skill added to candidate successfully",
      candidateSkill
    );
  } catch (error) {
    next(error);
  }
};

const getSkills = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const candidateSkills =
      await getCandidateSkills(userId);

    return sendSuccess(
      res,
      200,
      "Candidate skills retrieved successfully",
      candidateSkills
    );
  } catch (error) {
    next(error);
  }
};

const removeSkill = async (req, res, next) => {
  try {
    const { skillId } = req.params;

    if (!skillId) {
      throw new AppError(
        "Skill ID is required",
        400
      );
    }

    const userId = req.user.userId;

    const candidateSkill =
      await removeSkillFromCandidate(
        userId,
        skillId
      );

    return sendSuccess(
      res,
      200,
      "Skill removed from candidate successfully",
      candidateSkill
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addSkill,
  getSkills,
  removeSkill,
};