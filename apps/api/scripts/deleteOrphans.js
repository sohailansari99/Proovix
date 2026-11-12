require("dotenv").config({ path: "../.env" });
const mongoose = require("mongoose");
const Skill = require("../src/modules/skills/skill.model");
const CandidateSkill = require("../src/modules/skills/candidateSkill.model");
const Evidence = require("../src/modules/evidence/evidence.model");
const env = require("../src/config/env");

const deleteOrphans = async () => {
  try {
    await mongoose.connect(env.mongoUri);
    console.log("Connected to MongoDB");

    const validSkills = await Skill.find({}, "_id");
    const validSkillIds = validSkills.map((s) => s._id.toString());

    const candidateSkills = await CandidateSkill.find({});
    const orphanedCandidateSkills = candidateSkills.filter(
      (cs) => !validSkillIds.includes(cs.skillId.toString())
    );
    const orphanedCSIds = orphanedCandidateSkills.map((cs) => cs._id);

    if (orphanedCSIds.length > 0) {
      const csResult = await CandidateSkill.deleteMany({ _id: { $in: orphanedCSIds } });
      console.log(`Deleted ${csResult.deletedCount} orphaned CandidateSkill documents.`);
    }

    const validCandidateSkills = await CandidateSkill.find({}, "_id");
    const validCandidateSkillIds = validCandidateSkills.map((cs) => cs._id.toString());

    const evidences = await Evidence.find({});
    const orphanedEvidences = evidences.filter(
      (ev) => !validCandidateSkillIds.includes(ev.candidateSkillId.toString())
    );
    const orphanedEvIds = orphanedEvidences.map((ev) => ev._id);

    if (orphanedEvIds.length > 0) {
      const evResult = await Evidence.deleteMany({ _id: { $in: orphanedEvIds } });
      console.log(`Deleted ${evResult.deletedCount} orphaned Evidence documents.`);
    }

  } catch (error) {
    console.error("Error deleting orphans:", error);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
};

deleteOrphans();
