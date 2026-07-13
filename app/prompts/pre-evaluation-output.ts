import { z } from "zod";

/** LLM-safe, see `app/shared/llm-schema.ts`. Scores normalized via `normalizeCandidateScoreValue()` after generation. */
export const preEvaluationGenerationSchema = z
  .object({
    score: z.number(),
    missingRequirements: z.array(z.string()),
    confidence: z.enum(["low", "medium", "high"]),
    nextStep: z.enum(["interview_invited", "hold"]),
  })
  .strict();

/** LLM-safe, see `app/shared/llm-schema.ts`. Scores normalized via `normalizeCandidateScoreValue()` after generation. */
export const slopDetectionGenerationSchema = z
  .object({
    consistencyScore: z.number(),
    redFlags: z.array(z.string()),
    explanation: z.string(),
  })
  .strict();
