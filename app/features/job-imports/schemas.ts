import { z } from "zod";

import {
  employmentTypeSchema,
  experienceLevelSchema,
  salaryCurrencySchema,
  workplaceTypeSchema,
} from "@/shared/enums";

const POSTGRES_INTEGER_MAX = 2_147_483_647;
const positivePostgresIntegerSchema = z.number().int().positive().max(POSTGRES_INTEGER_MAX);

export const jobImportSourcePlatformSchema = z.enum([
  "greenhouse",
  "lever",
  "ashby",
  "recruitee",
  "smartrecruiters",
  "generic",
  "csv",
]);
export type JobImportSourcePlatform = z.infer<typeof jobImportSourcePlatformSchema>;

export const jobImportWarningSchema = z.object({
  code: z.string().trim().min(1).max(80),
  message: z.string().trim().min(1).max(300),
  field: z.string().trim().min(1).max(80).nullable().default(null),
});
export type JobImportWarning = z.infer<typeof jobImportWarningSchema>;

export const normalizedJobImportSchema = z
  .object({
    externalId: z.string().trim().min(1).max(500),
    sourceUrl: z.url().max(2_000).nullable(),
    sourceUpdatedAt: z.iso.datetime({ offset: true }).nullable(),
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().min(1).max(5_000),
    requirements: z.array(z.string().trim().min(1).max(200)).max(30),
    location: z.string().trim().min(1).max(200).nullable(),
    workplaceType: workplaceTypeSchema.nullable(),
    employmentType: employmentTypeSchema.nullable(),
    experienceLevel: experienceLevelSchema.nullable(),
    salaryMin: positivePostgresIntegerSchema.nullable(),
    salaryMax: positivePostgresIntegerSchema.nullable(),
    salaryCurrency: salaryCurrencySchema,
    headcount: positivePostgresIntegerSchema.nullable(),
    expiresAt: z.iso.datetime({ offset: true }).nullable(),
  })
  .strict();
export type NormalizedJobImport = z.infer<typeof normalizedJobImportSchema>;

export const jobImportCandidateSchema = z.object({
  job: normalizedJobImportSchema,
  warnings: z.array(jobImportWarningSchema),
  inferredFields: z.array(z.enum(["requirements", "experienceLevel"])),
});
export type JobImportCandidate = z.infer<typeof jobImportCandidateSchema>;

export const previewJobImportUrlSchema = z.object({
  url: z.string().trim().url("Enter a valid careers page or job URL").max(2_000),
});

export const previewJobImportCsvSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  csv: z
    .string()
    .min(1, "The CSV file is empty")
    .max(262_144, "CSV files must be under 256 KB")
    .refine(
      (csv) => new TextEncoder().encode(csv).byteLength <= 262_144,
      "CSV files must be under 256 KB",
    ),
});

export const getJobImportPreviewSchema = z.object({ batchId: z.string().uuid() });

export const editableJobImportPayloadSchema = normalizedJobImportSchema
  .omit({ externalId: true, sourceUrl: true, sourceUpdatedAt: true })
  .refine(
    (job) => job.salaryMin == null || job.salaryMax == null || job.salaryMin <= job.salaryMax,
    {
      message: "Minimum salary cannot exceed maximum salary",
      path: ["salaryMin"],
    },
  );
export type EditableJobImportPayload = z.infer<typeof editableJobImportPayloadSchema>;

const jobImportItemEditSchema = z.object({
  id: z.string().uuid(),
  expectedRevision: z.number().int().nonnegative(),
  job: editableJobImportPayloadSchema,
});

export const updateJobImportItemsSchema = z.object({
  batchId: z.string().uuid(),
  items: z.array(jobImportItemEditSchema).min(1).max(50),
});

export const importSelectedJobsSchema = z.object({
  batchId: z.string().uuid(),
  itemIds: z.array(z.string().uuid()).min(1).max(50),
});

export const enrichSelectedJobImportsSchema = z.object({
  batchId: z.string().uuid(),
  itemIds: z.array(z.string().uuid()).min(1).max(50),
});

export const jobImportItemResponseSchema = z.object({
  id: z.string().uuid(),
  revision: z.coerce.number().int().nonnegative(),
  status: z.enum(["ready", "duplicate", "imported", "failed"]),
  job: normalizedJobImportSchema,
  warnings: z.array(jobImportWarningSchema),
  inferredFields: z.array(z.enum(["requirements", "experienceLevel"])),
  error: z.string().nullable(),
  importedJobId: z.string().uuid().nullable(),
});
export type JobImportItemResponse = z.infer<typeof jobImportItemResponseSchema>;

export const jobImportPreviewSchema = z.object({
  batchId: z.string().uuid(),
  status: z.enum(["ready", "completed"]),
  sourcePlatform: jobImportSourcePlatformSchema,
  sourceLabel: z.string(),
  items: z.array(jobImportItemResponseSchema),
});
export type JobImportPreview = z.infer<typeof jobImportPreviewSchema>;

export const enrichmentGenerationSchema = z
  .object({
    requirements: z.array(z.string().trim().min(1).max(200)).max(15),
    experienceLevel: experienceLevelSchema.nullable(),
  })
  .strict();
