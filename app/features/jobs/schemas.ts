import { z } from "zod";
import {
  employmentTypeSchema,
  experienceLevelSchema,
  jobStatusSchema,
  workplaceTypeSchema,
} from "@/shared/enums";
import { nullableTrimmedString, requiredTrimmedString } from "@/shared/validation";

export const jobFieldsSchema = z
  .object({
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
    interviewQuestions: z
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
    expiresAt: z.coerce.date().nullable().optional(),
  })
  .refine(
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
