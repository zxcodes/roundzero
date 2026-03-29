import { z } from "zod";
import {
  employmentTypeSchema,
  experienceLevelSchema,
  jobStatusSchema,
  workplaceTypeSchema,
} from "@/shared/enums";

export const jobFieldsSchema = z
  .object({
    title: z.string().min(1, "Job title is required").max(200),
    description: z.string().min(1, "Job description is required").max(5000),
    requirements: z.array(z.string()).default([]),
    status: jobStatusSchema.default("draft"),
    location: z.string().max(200).nullable().optional(),
    workplaceType: workplaceTypeSchema.nullable().optional(),
    employmentType: employmentTypeSchema.nullable().optional(),
    experienceLevel: experienceLevelSchema.nullable().optional(),
    salaryMin: z.number().int().positive().nullable().optional(),
    salaryMax: z.number().int().positive().nullable().optional(),
    salaryCurrency: z.string().max(10).default("USD"),
    teamSize: z.number().int().positive().nullable().optional(),
    headcount: z.number().int().positive().nullable().optional(),
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
