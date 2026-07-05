/**
 * Rules for Zod schemas passed to `Output.object()` / provider structured output.
 *
 * Prod routes many tasks through Anthropic (and Bedrock) first. Those APIs reject
 * JSON Schema `minimum` / `maximum` / `exclusiveMinimum` / `exclusiveMaximum` on
 * **number** types. Zod's `.min()`, `.max()`, `.positive()`, `.negative()`, etc.
 * emit those keywords — so they must NOT appear on generation schemas.
 *
 * Pattern:
 *  - Generation schema: plain `z.number()` (and clamp/normalize in `.preprocess()` or
 *    in the deterministic refine step immediately after the model returns).
 *  - Storage / form validation schema: keep `.min()/.max()` for strict reads.
 *
 * String `.min()/.max()` → `minLength`/`maxLength` and array `.max()` → `maxItems`
 * are fine on Anthropic today. Enums and `.strict()` (`additionalProperties: false`)
 * are required/desired.
 *
 * All `Output.object()` call sites (keep in sync when adding new ones):
 *  - `communicationAssessmentSchema` — voice scoring (post_eval)
 *  - `preEvaluationGenerationSchema`, `slopDetectionGenerationSchema` — pre_eval (`app/prompts/pre-evaluation-output.ts`)
 *  - `jobTypeSchema` — pre_eval classify
 *  - `reportGenerationSchema` — post_eval report draft
 *  - `answerAuthenticitySchema` — post_eval (Haiku; strings/enums only)
 *  - `reportAuditGenerationSchema` — post_eval_audit (`app/prompts/report-audit-output.ts`)
 *  - `aiJobGenerationSchema` — job_creation
 */

import { z } from "zod";
import { CANDIDATE_SCORE_MAX, clampCandidateScore } from "@/shared/score";

/** Normalize a model score onto 0–10. Values above 10 are treated as 0–100 scale. */
export function normalizeCandidateScoreValue(value: unknown, fallback = 5): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  const scaled = value > CANDIDATE_SCORE_MAX ? value / 10 : value;
  return clampCandidateScore(scaled);
}

const REPORT_SCORE_KEYS = [
  "communication",
  "problemSolving",
  "ownership",
  "roleFit",
  "overall",
] as const;

export function normalizeReportScoresInput(raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return raw;
  }

  const obj = raw as Record<string, unknown>;
  const normalized: Record<string, unknown> = {};
  for (const key of REPORT_SCORE_KEYS) {
    normalized[key] = normalizeCandidateScoreValue(obj[key]);
  }
  return normalized;
}

/** LLM-safe 0–10 score field (no JSON Schema minimum/maximum on numbers). */
export const llmCandidateScoreSchema = z.number();

/** LLM-safe report dimension scores — clamped via preprocess. */
export const llmReportScoresObjectSchema = z.object({
  communication: llmCandidateScoreSchema,
  problemSolving: llmCandidateScoreSchema,
  ownership: llmCandidateScoreSchema,
  roleFit: llmCandidateScoreSchema,
  overall: llmCandidateScoreSchema,
});

export const llmReportScoresSchema = z.preprocess(
  normalizeReportScoresInput,
  llmReportScoresObjectSchema,
);

/**
 * Optional number from structured output. No `.int()` — Zod 4's `.int()` emits
 * safe-integer `minimum`/`maximum`, which Anthropic rejects. Integer-ness and
 * range are enforced after generation (`nullInvalidOptionalInt` + `jobFieldsSchema`).
 */
export const llmOptionalIntSchema = z.number().nullable().optional();
