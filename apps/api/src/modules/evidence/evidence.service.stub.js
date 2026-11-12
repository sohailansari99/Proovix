const { analyzeEvidenceWithAI } = require("../../integrations/openrouter/openrouter.service");

// Mock analyzeEvidenceWithAI for testing/stubbing when needed
const analyzeEvidence = async (userId, evidenceId) => {
  // stub or real
  return { success: true };
};

module.exports = { analyzeEvidence };
