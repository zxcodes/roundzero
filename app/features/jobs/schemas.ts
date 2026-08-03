import { z } from "zod";

import {
  employmentTypeSchema,
  experienceLevelSchema,
  jobStatusSchema,
  workplaceTypeSchema,
} from "@/shared/enums";
import { llmOptionalIntSchema } from "@/shared/llm-schema";
import { nullableTrimmedString, requiredTrimmedString } from "@/shared/validation";

const jobFieldsBaseSchema = z.object({
  title: requiredTrimmedString(200, "Job title is required"),
  description: requiredTrimmedString(5000, "Job description is required"),
  requirements: z
    .array(
      z
        .string()
        .trim()
        .min(1, "Requirement cannot be empty")
        .max(200, "Requirement must be under 200 characters"),
    )
    .default([]),
  screeningQuestions: z
    .array(
      z
        .string()
        .trim()
        .min(1, "Question cannot be empty")
        .max(300, "Question must be under 300 characters"),
    )
    .default([]),
  status: jobStatusSchema.default("draft"),
  location: nullableTrimmedString(200).optional(),
  workplaceType: workplaceTypeSchema,
  employmentType: employmentTypeSchema,
  experienceLevel: experienceLevelSchema,
  salaryMin: z
    .number({ error: "Minimum salary must be a valid number" })
    .int("Minimum salary must be a whole number")
    .positive("Minimum salary must be positive")
    .nullable()
    .optional(),
  salaryMax: z
    .number({ error: "Maximum salary must be a valid number" })
    .int("Maximum salary must be a whole number")
    .positive("Maximum salary must be positive")
    .nullable()
    .optional(),
  salaryCurrency: requiredTrimmedString(10, "Salary currency is required").default("USD"),
  teamSize: z
    .number({ error: "Team size must be a valid number" })
    .int("Team size must be a whole number")
    .positive("Team size must be positive")
    .nullable()
    .optional(),
  headcount: z
    .number({ error: "Headcount must be a valid number" })
    .int("Headcount must be a whole number")
    .positive("Headcount must be positive")
    .nullable()
    .optional(),
  finalReportTarget: z
    .number({ error: "Final report target must be a valid number" })
    .int("Final report target must be a whole number")
    .min(1, "Final report target must be at least 1")
    .max(50, "Final report target cannot exceed 50")
    .default(5),
  expiresAt: z.coerce.date().nullable().optional(),
});

export const jobFieldsSchema = jobFieldsBaseSchema.refine(
  (data) => {
    if (data.salaryMin != null && data.salaryMax != null) {
      return data.salaryMin <= data.salaryMax;
    }
    return true;
  },
  { message: "Minimum salary cannot exceed maximum salary", path: ["salaryMin"] },
);

export const updateJobSchema = jobFieldsSchema.extend({
  id: z.string().uuid(),
});

export const jobIdSchema = z.object({
  id: z.string().uuid(),
});

export const jobIdsSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(50),
});

/**
 * Schema used for AI job generation via structured outputs.
 * Numeric fields use LLM-safe shapes (no `.positive()` / `.min()` on numbers).
 * `cleanAiJobOutput()` + `jobFieldsSchema.safeParse()` enforce ranges after generation.
 */
export const aiJobGenerationSchema = jobFieldsBaseSchema
  .omit({
    status: true,
    expiresAt: true,
    finalReportTarget: true,
    salaryMin: true,
    salaryMax: true,
    teamSize: true,
    headcount: true,
  })
  .extend({
    salaryMin: llmOptionalIntSchema,
    salaryMax: llmOptionalIntSchema,
    teamSize: llmOptionalIntSchema,
    headcount: llmOptionalIntSchema,
  })
  .strict();

export type AiJobGenerationOutput = z.infer<typeof aiJobGenerationSchema>;
