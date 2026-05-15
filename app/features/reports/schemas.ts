import { z } from "zod";

const reportScoresSchema = z.object({
  communication: z.number().min(0).max(100),
  problemSolving: z.number().min(0).max(100),
  ownership: z.number().min(0).max(100),
  roleFit: z.number().min(0).max(100),
  overall: z.number().min(0).max(100),
});

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
  })
  .strict();

export type ReportData = z.infer<typeof reportSchema>;

export function getOverallScore(scores: unknown): number | null {
  const parsed = reportScoresSchema.safeParse(scores);
  return parsed.success ? parsed.data.overall : null;
}
