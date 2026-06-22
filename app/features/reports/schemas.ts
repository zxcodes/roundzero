import { z } from "zod";

export const reportScoresSchema = z.object({
  communication: z.number().min(0).max(10),
  problemSolving: z.number().min(0).max(10),
  ownership: z.number().min(0).max(10),
  roleFit: z.number().min(0).max(10),
  overall: z.number().min(0).max(10),
});

export const answerAuthenticitySignalSchema = z.object({
  signal: z.string(),
  evidence: z.string(),
  affectedAnswers: z.array(z.string()),
});

export const answerAuthenticitySchema = z.object({
  riskLevel: z.enum(["low", "medium", "high"]),
  signals: z.array(answerAuthenticitySignalSchema),
  explanation: z.string(),
});

export type AnswerAuthenticity = z.infer<typeof answerAuthenticitySchema>;

// Schema for the report persisted to DB and served to the UI.
// Includes answerAuthenticity sourced from a separate detection step.
export const reportSchema = z
  .object({
    summary: z.string(),
    strengths: z.array(z.string()),
    weaknesses: z.array(z.string()),
    insights: z.array(z.string()),
    evidence: z.array(z.string()),
    screeningAnswers: z.array(
      z.object({
        question: z.string(),
        answer: z.string().nullable(),
        concern: z.enum(["none", "minor", "dealbreaker"]),
        notes: z.string(),
      }),
    ),
    scores: reportScoresSchema,
    recommendation: z.enum(["strong_yes", "yes", "lean_no", "no"]),
    answerAuthenticity: answerAuthenticitySchema.nullable(),
  })
  .strict();

export type ReportData = z.infer<typeof reportSchema>;

// Schema for the report generation model call — the model does NOT produce
// answerAuthenticity. That field is populated from a separate detection step.
export const reportGenerationSchema = reportSchema.omit({ answerAuthenticity: true });

export function getOverallScore(scores: unknown): number | null {
  const parsed = reportScoresSchema.safeParse(scores);
  return parsed.success ? parsed.data.overall : null;
}

type StoredReportInput = {
  summary: string;
  strengths: unknown;
  weaknesses: unknown;
  insights: unknown;
  evidence: unknown;
  screeningAnswers: unknown;
  scores: unknown;
  recommendation: unknown;
  answerAuthenticity: unknown;
};

export function parseStoredReport(row: StoredReportInput): ReportData | null {
  const parsed = reportSchema.safeParse({
    summary: row.summary,
    strengths: row.strengths,
    weaknesses: row.weaknesses,
    insights: row.insights,
    evidence: row.evidence,
    screeningAnswers: row.screeningAnswers,
    scores: row.scores,
    recommendation: row.recommendation,
    answerAuthenticity: row.answerAuthenticity,
  });

  return parsed.success ? parsed.data : null;
}
