const {
  createSkill,
  getAllSkills,
  getSkillBySlug,
} = require("./skill.service");

const AppError = require("../../core/errors/AppError");

const {
  sendSuccess,
} = require("../../core/utils/apiResponse");

const create = async (req, res, next) => {
  try {
    const {
      name,
      slug,
      category,
      description,
      competencies,
    } = req.body;

    // Validate required fields
    if (
      !name ||
      !slug ||
      !category ||
      !description
    ) {
      throw new AppError(
        "Name, slug, category, and description are required",
        400
      );
    }

    const skill = await createSkill({
      name,
      slug,
      category,
      description,
      competencies,
    });

    return sendSuccess(
      res,
      201,
      "Skill created successfully",
      skill
    );
  } catch (error) {
    next(error);
  }
};

const getAll = async (req, res, next) => {
  try {
    const skills = await getAllSkills();

    return sendSuccess(
      res,
      200,
      "Skills retrieved successfully",
      skills
    );
  } catch (error) {
    next(error);
  }
};

const getBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;

    if (!slug) {
      throw new AppError(
        "Skill slug is required",
        400
      );
    }

    const skill = await getSkillBySlug(slug);

    return sendSuccess(
      res,
      200,
      "Skill retrieved successfully",
      skill
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  create,
  getAll,
  getBySlug,
};