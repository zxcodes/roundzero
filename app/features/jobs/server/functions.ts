import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getCompanyByOwnerId } from "@/features/companies/queries/queries_sql";
import { getDb } from "@/shared/db";
import {
  employmentTypeSchema,
  experienceLevelSchema,
  jobStatusSchema,
  workplaceTypeSchema,
} from "@/shared/enums";
import { authMiddleware, companyMiddleware } from "@/shared/middleware";
import {
  archiveJob as archiveJobQuery,
  createJob as createJobQuery,
  getArchivedJobsByCompanyId,
  getJobById,
  getJobsByCompanyId,
  getOpenJobs as getOpenJobsQuery,
  updateJob as updateJobQuery,
} from "../queries/queries_sql";

const jobFieldsSchema = z
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

const updateJobSchema = jobFieldsSchema.extend({
  id: z.string().uuid(),
});

const jobIdSchema = z.object({
  id: z.string().uuid(),
});

export const createJob = createServerFn({ method: "POST" })
  .middleware([companyMiddleware])
  .inputValidator((data: z.input<typeof jobFieldsSchema>) => jobFieldsSchema.parse(data))
  .handler(async ({ data, context }) => {
    const db = getDb();

    const job = await createJobQuery(db, {
      companyId: context.company.id,
      title: data.title,
      description: data.description,
      requirements: JSON.stringify(data.requirements),
      status: data.status,
      location: data.location ?? null,
      workplaceType: data.workplaceType ?? null,
      employmentType: data.employmentType ?? null,
      experienceLevel: data.experienceLevel ?? null,
      salaryMin: data.salaryMin ?? null,
      salaryMax: data.salaryMax ?? null,
      salaryCurrency: data.salaryCurrency,
      teamSize: data.teamSize ?? null,
      headcount: data.headcount ?? null,
    });

    if (!job) {
      throw new Error("Failed to create job");
    }

    return { job };
  });

export const getMyJobs = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const db = getDb();
    const company = await getCompanyByOwnerId(db, { ownerId: context.userId });
    if (!company) {
      return [];
    }
    const jobs = await getJobsByCompanyId(db, { companyId: company.id });
    return jobs;
  });

export const getMyArchivedJobs = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const db = getDb();
    const company = await getCompanyByOwnerId(db, { ownerId: context.userId });
    if (!company) {
      return [];
    }
    const jobs = await getArchivedJobsByCompanyId(db, { companyId: company.id });
    return jobs;
  });

export const getJob = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator((data: { id: string }) => jobIdSchema.parse(data))
  .handler(async ({ data, context }) => {
    const db = getDb();
    const job = await getJobById(db, { id: data.id });
    if (!job) {
      throw new Error("Job not found");
    }

    // Non-open jobs are only visible to the company owner
    if (job.status !== "open") {
      const company = await getCompanyByOwnerId(db, { ownerId: context.userId });
      if (!company || company.id !== job.companyId) {
        throw new Error("Job not found");
      }
    }

    return job;
  });

export const updateJob = createServerFn({ method: "POST" })
  .middleware([companyMiddleware])
  .inputValidator((data: z.input<typeof updateJobSchema>) => updateJobSchema.parse(data))
  .handler(async ({ data, context }) => {
    const db = getDb();

    const job = await updateJobQuery(db, {
      id: data.id,
      companyId: context.company.id,
      title: data.title,
      description: data.description,
      requirements: JSON.stringify(data.requirements),
      status: data.status,
      location: data.location ?? null,
      workplaceType: data.workplaceType ?? null,
      employmentType: data.employmentType ?? null,
      experienceLevel: data.experienceLevel ?? null,
      salaryMin: data.salaryMin ?? null,
      salaryMax: data.salaryMax ?? null,
      salaryCurrency: data.salaryCurrency,
      teamSize: data.teamSize ?? null,
      headcount: data.headcount ?? null,
    });

    if (!job) {
      throw new Error("Failed to update job — not found or not authorized");
    }

    return { job };
  });

export const archiveJob = createServerFn({ method: "POST" })
  .middleware([companyMiddleware])
  .inputValidator((data: { id: string }) => jobIdSchema.parse(data))
  .handler(async ({ data, context }) => {
    const db = getDb();
    const archived = await archiveJobQuery(db, { id: data.id, companyId: context.company.id });
    if (!archived) {
      throw new Error("Job not found, not authorized, or already archived");
    }
    return { job: archived };
  });

export const getOpenJobs = createServerFn({ method: "GET" }).handler(async () => {
  const db = getDb();
  const jobs = await getOpenJobsQuery(db);
  return jobs;
});

export const publishJob = createServerFn({ method: "POST" })
  .middleware([companyMiddleware])
  .inputValidator((data: { id: string }) => jobIdSchema.parse(data))
  .handler(async ({ data, context }) => {
    const db = getDb();

    const job = await getJobById(db, { id: data.id });
    if (!job || job.companyId !== context.company.id) {
      throw new Error("Job not found or not authorized");
    }

    if (job.status !== "draft") {
      throw new Error("Only draft jobs can be published");
    }

    const updated = await updateJobQuery(db, {
      id: data.id,
      companyId: context.company.id,
      title: job.title,
      description: job.description,
      requirements: JSON.stringify(job.requirements),
      status: "open",
      location: job.location,
      workplaceType: job.workplaceType,
      employmentType: job.employmentType,
      experienceLevel: job.experienceLevel,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      salaryCurrency: job.salaryCurrency,
      teamSize: job.teamSize,
      headcount: job.headcount,
    });

    if (!updated) {
      throw new Error("Failed to publish job");
    }

    return { job: updated };
  });
