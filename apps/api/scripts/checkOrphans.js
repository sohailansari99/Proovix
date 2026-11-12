require("dotenv").config({ path: "../.env" });
const mongoose = require("mongoose");
const Skill = require("../src/modules/skills/skill.model");
const CandidateSkill = require("../src/modules/skills/candidateSkill.model");
const Evidence = require("../src/modules/evidence/evidence.model");
const env = require("../src/config/env");

const findOrphans = async () => {
  try {
    await mongoose.connect(env.mongoUri);
    console.log("Connected to MongoDB");

    // Get all valid Skill IDs
    const validSkills = await Skill.find({}, "_id");
    const validSkillIds = validSkills.map((s) => s._id.toString());

    // Find orphaned CandidateSkills
    const candidateSkills = await CandidateSkill.find({});
    const orphanedCandidateSkills = candidateSkills.filter(
      (cs) => !validSkillIds.includes(cs.skillId.toString())
    );

    console.log(`\nFound ${orphanedCandidateSkills.length} orphaned CandidateSkill documents:`);
    orphanedCandidateSkills.forEach((cs) => {
      console.log(` - ID: ${cs._id}, CandidateID: ${cs.candidateId}, Deleted SkillID: ${cs.skillId}`);
    });

    const validCandidateSkillIds = candidateSkills
      .filter((cs) => validSkillIds.includes(cs.skillId.toString()))
      .map((cs) => cs._id.toString());

    // Find orphaned Evidence documents
    const evidences = await Evidence.find({});
    const orphanedEvidences = evidences.filter(
      (ev) => !validCandidateSkillIds.includes(ev.candidateSkillId.toString())
    );

    console.log(`\nFound ${orphanedEvidences.length} orphaned Evidence documents:`);
    orphanedEvidences.forEach((ev) => {
      console.log(` - ID: ${ev._id}, CandidateID: ${ev.candidateId}, Title: "${ev.title}", CandidateSkillID: ${ev.candidateSkillId}`);
    });

  } catch (error) {
    console.error("Error finding orphans:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\nDisconnected from MongoDB");
  }
};

findOrphans();
