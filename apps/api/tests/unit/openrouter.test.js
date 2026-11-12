const { analyzeEvidenceWithAI } = require('../../src/integrations/openrouter/openrouter.service');
const AppError = require('../../src/core/errors/AppError');

describe('AI Analysis Service', () => {
  const mockSkill = {
    name: 'React',
    category: 'UI Library',
    description: 'JS library for UIs',
    competencies: ['Hooks', 'Components']
  };

  const mockEvidence = {
    type: 'PROJECT',
    title: 'Test Project',
    description: 'A test project description',
    sourceUrl: 'https://github.com/test/repo'
  };

  test('should throw error if API key is missing', async () => {
    const originalKey = process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_API_KEY;

    await expect(analyzeEvidenceWithAI({ evidence: mockEvidence, skill: mockSkill }))
      .rejects
      .toThrow('OpenRouter API key is not configured');

    process.env.OPENROUTER_API_KEY = originalKey;
  });

  test('should use stubbed response when STUB_AI is enabled', async () => {
    const originalStub = process.env.STUB_AI;
    process.env.STUB_AI = 'true';

    const result = await analyzeEvidenceWithAI({ evidence: mockEvidence, skill: mockSkill });

    expect(result.summary).toContain('Stubbed AI');
    expect(result.competencies.length).toBe(2);
    expect(result.overallEvidenceScore).toBe(85);

    process.env.STUB_AI = originalStub;
  });
});
