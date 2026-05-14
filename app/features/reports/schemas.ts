import { z } from "zod";

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
    scores: z.object({
      communication: z.number().min(0).max(100),
      problemSolving: z.number().min(0).max(100),
      ownership: z.number().min(0).max(100),
      roleFit: z.number().min(0).max(100),
      overall: z.number().min(0).max(100),
    }),
    recommendation: z.enum(["strong_yes", "yes", "lean_no", "no"]),
  })
  .strict();

export type ReportData = z.infer<typeof reportSchema>;
