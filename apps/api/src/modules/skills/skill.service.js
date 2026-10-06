const Skill = require("./skill.model");

const AppError = require("../../core/errors/AppError");

const createSkill = async ({
  name,
  slug,
  category,
  description,
  competencies,
}) => {
  // Check whether skill already exists
  const existingSkill = await Skill.findOne({
    $or: [
      { name },
      { slug },
    ],
  });

  if (existingSkill) {
    throw new AppError(
      "Skill with this name or slug already exists",
      409
    );
  }

  const skill = await Skill.create({
    name,
    slug,
    category,
    description,
    competencies,
  });

  return skill;
};

const getAllSkills = async () => {
  const skills = await Skill.find({
    isActive: true,
  }).sort({
    name: 1,
  });

  return skills;
};

const getSkillBySlug = async (slug) => {
  const skill = await Skill.findOne({
    slug,
    isActive: true,
  });

  if (!skill) {
    throw new AppError(
      "Skill not found",
      404
    );
  }

  return skill;
};

module.exports = {
  createSkill,
  getAllSkills,
  getSkillBySlug,
};