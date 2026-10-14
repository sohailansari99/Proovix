const AppError = require("../../core/errors/AppError");

const OPENROUTER_URL =
  "https://openrouter.ai/api/v1/chat/completions";

const analyzeEvidenceWithAI = async ({
  evidence,
  skill,
}) => {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new AppError(
      "OpenRouter API key is not configured",
      500
    );
  }

  const prompt = `
You are the AI evidence analyzer for Proovix.

Your job is to analyze evidence submitted by a candidate
and determine how strongly it demonstrates competencies
for a specific technical skill.

IMPORTANT RULES:
- Do not invent evidence.
- Only use information provided in the evidence.
- Do not automatically declare the candidate verified.
- Give conservative scores.
- Explain why each competency received its score.
- Identify missing evidence.
- Return ONLY valid JSON.

SKILL:
Name: ${skill.name}
Category: ${skill.category}
Description: ${skill.description}

COMPETENCIES:
${JSON.stringify(skill.competencies)}

EVIDENCE:
Type: ${evidence.type}
Title: ${evidence.title}
Description: ${evidence.description}
Source URL: ${evidence.sourceUrl}

Return JSON in exactly this structure:

{
  "summary": "short overall assessment",
  "competencies": [
    {
      "name": "competency name",
      "score": 0,
      "reason": "why this score was given"
    }
  ],
  "strengths": [],
  "missingEvidence": [],
  "overallEvidenceScore": 0
}

Scoring:
0-20   = almost no evidence
21-40  = weak evidence
41-60  = moderate evidence
61-80  = strong evidence
81-100 = very strong evidence
`;

  try {
    const response = await fetch(
      OPENROUTER_URL,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        },

        body: JSON.stringify({
          model:
            process.env.OPENROUTER_MODEL ||
            "openai/gpt-4o-mini",

          messages: [
            {
              role: "system",
              content:
                "You are a strict technical evidence evaluator. Return JSON only.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],

          temperature: 0.2,

          response_format: {
            type: "json_object",
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error(
        "OpenRouter error:",
        data
      );

      throw new AppError(
        "AI analysis request failed",
        502
      );
    }

    const content =
      data?.choices?.[0]?.message?.content;

    if (!content) {
      throw new AppError(
        "AI returned an empty response",
        502
      );
    }

    let analysis;

    try {
      analysis = JSON.parse(content);
    } catch (error) {
      throw new AppError(
        "AI returned invalid JSON",
        502
      );
    }

    return analysis;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    console.error(
      "OpenRouter request failed:",
      error
    );

    throw new AppError(
      "Unable to analyze evidence with AI",
      502
    );
  }
};

module.exports = {
  analyzeEvidenceWithAI,
};