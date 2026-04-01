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
    requirements: z.array(z.string().trim().min(1).max(200)).default([]),
    status: jobStatusSchema.default("draft"),
    location: nullableTrimmedString(200).optional(),
    workplaceType: workplaceTypeSchema.nullable().optional(),
    employmentType: employmentTypeSchema.nullable().optional(),
    experienceLevel: experienceLevelSchema.nullable().optional(),
    salaryMin: z.number().int().positive().nullable().optional(),
    salaryMax: z.number().int().positive().nullable().optional(),
    salaryCurrency: requiredTrimmedString(10, "Salary currency is required").default("USD"),
    teamSize: z.number().int().positive().nullable().optional(),
    headcount: z.number().int().positive().nullable().optional(),
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
