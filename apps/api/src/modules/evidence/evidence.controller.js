const {
  createEvidence,
  getCandidateEvidence,
  getEvidenceById,
  removeEvidence,
  analyzeEvidence,
  reviewEvidence,
} = require("./evidence.service");

const AppError = require("../../core/errors/AppError");

const {
  sendSuccess,
} = require("../../core/utils/apiResponse");


// Create evidence
const create = async (req, res, next) => {
  try {
    const {
      candidateSkillId,
      type,
      title,
      description,
      sourceUrl,
    } = req.body;

    // Required fields
    if (
      !candidateSkillId ||
      !type ||
      !title
    ) {
      throw new AppError(
        "Candidate skill ID, type, and title are required",
        400
      );
    }

    const userId = req.user.userId;

    const evidence = await createEvidence(
      userId,
      {
        candidateSkillId,
        type,
        title,
        description,
        sourceUrl,
      }
    );

    return sendSuccess(
      res,
      201,
      "Evidence created successfully",
      evidence
    );
  } catch (error) {
    next(error);
  }
};


// Get all candidate evidence
const getAll = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const evidence =
      await getCandidateEvidence(userId);

    return sendSuccess(
      res,
      200,
      "Candidate evidence retrieved successfully",
      evidence
    );
  } catch (error) {
    next(error);
  }
};


// Get one evidence item
const getOne = async (req, res, next) => {
  try {
    const { evidenceId } = req.params;

    if (!evidenceId) {
      throw new AppError(
        "Evidence ID is required",
        400
      );
    }

    const userId = req.user.userId;

    const evidence =
      await getEvidenceById(
        userId,
        evidenceId
      );

    return sendSuccess(
      res,
      200,
      "Evidence retrieved successfully",
      evidence
    );
  } catch (error) {
    next(error);
  }
};


// Remove evidence
const remove = async (req, res, next) => {
  try {
    const { evidenceId } = req.params;

    if (!evidenceId) {
      throw new AppError(
        "Evidence ID is required",
        400
      );
    }

    const userId = req.user.userId;

    await removeEvidence(
      userId,
      evidenceId
    );

    return sendSuccess(
      res,
      200,
      "Evidence removed successfully"
    );
  } catch (error) {
    next(error);
  }
};

const analyze = async (req, res, next) => {
  try {
    const { evidenceId } = req.params;
    const userId = req.user.userId;

    const evidence = await analyzeEvidence(
      userId,
      evidenceId
    );

    return sendSuccess(
      res,
      200,
      "Evidence analyzed successfully",
      evidence
    );
  } catch (error) {
    next(error);
  }
};


const review = async (req, res, next) => {
  try {
    const { evidenceId } = req.params;
    const { status, reviewNote } = req.body;

    if (!evidenceId || !status) {
      throw new AppError(
        "Evidence ID and review status are required",
        400
      );
    }

    const evidence = await reviewEvidence(
      req.user.userId,
      evidenceId,
      { status, reviewNote }
    );

    return sendSuccess(
      res,
      200,
      `Evidence ${status.toLowerCase()} successfully`,
      evidence
    );
  } catch (error) {
    next(error);
  }
};




module.exports = {
  create,
  getAll,
  getOne,
  remove,
  analyze,
  review,
};
