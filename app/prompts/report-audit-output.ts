import { z } from "zod";

export const REPORT_AUDIT_LIMITS = {
  MAX_STRENGTHS: 5,
  MAX_WEAKNESSES: 5,
  MAX_INSIGHTS: 4,
  MAX_EVIDENCE: 8,
} as const;

const { MAX_STRENGTHS, MAX_WEAKNESSES, MAX_INSIGHTS, MAX_EVIDENCE } = REPORT_AUDIT_LIMITS;

/** LLM audit schema, prose only; scores/recommendation owned by deterministic refine. */
export const reportAuditGenerationSchema = z
  .object({
    summary: z.string(),
    strengths: z.array(z.string()).max(MAX_STRENGTHS),
    weaknesses: z.array(z.string()).max(MAX_WEAKNESSES),
    insights: z.array(z.string()).max(MAX_INSIGHTS),
    evidence: z.array(z.string()).max(MAX_EVIDENCE),
    screeningAnswers: z.array(
      z.object({
        question: z.string(),
        answer: z.string().nullable(),
        concern: z.enum(["none", "minor", "dealbreaker"]),
        notes: z.string(),
      }),
    ),
  })
  .strict();

export type ReportAuditGenerationOutput = z.infer<typeof reportAuditGenerationSchema>;
