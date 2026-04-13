import { createServerFn } from "@tanstack/react-start";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { getCompanyByOwnerId } from "@/features/companies/queries/queries_sql";
import { getDb } from "@/shared/db";
import { authMiddleware, companyMiddleware } from "@/shared/middleware";
import {
  archiveJob as archiveJobQuery,
  closeExpiredJobsQuery,
  countOpenJobsFiltered,
  createJob as createJobQuery,
  getArchivedJobsByCompanyId,
  getJobById,
  getJobsByCompanyId,
  getOpenJobsByCompanyId as getOpenJobsByCompanyIdQuery,
  getOpenJobsPaginated as getOpenJobsPaginatedQuery,
  getOpenJobs as getOpenJobsQuery,
  updateJob as updateJobQuery,
} from "../queries/queries_sql";
import { jobFieldsSchema, jobIdSchema, updateJobSchema } from "../schemas";

export const createJob = createServerFn({ method: "POST" })
  .middleware([companyMiddleware])
  .inputValidator(zodValidator(jobFieldsSchema))
  .handler(async ({ data, context }) => {
    const db = getDb();

    const job = await createJobQuery(db, {
      companyId: context.company.id,
      title: data.title,
      description: data.description,
      requirements: data.requirements,
      interviewQuestions: data.interviewQuestions,
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
      expiresAt: data.expiresAt ?? null,
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
    await db.unsafe(closeExpiredJobsQuery);
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
  .inputValidator(zodValidator(jobIdSchema))
  .handler(async ({ data, context }) => {
    const db = getDb();
    await db.unsafe(closeExpiredJobsQuery);
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
  .inputValidator(zodValidator(updateJobSchema))
  .handler(async ({ data, context }) => {
    const db = getDb();

    const job = await updateJobQuery(db, {
      id: data.id,
      companyId: context.company.id,
      title: data.title,
      description: data.description,
      requirements: data.requirements,
      interviewQuestions: data.interviewQuestions,
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
      expiresAt: data.expiresAt ?? null,
    });

    if (!job) {
      throw new Error("Failed to update job: not found or not authorized");
    }

    return { job };
  });

export const archiveJob = createServerFn({ method: "POST" })
  .middleware([companyMiddleware])
  .inputValidator(zodValidator(jobIdSchema))
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
  await db.unsafe(closeExpiredJobsQuery);
  const jobs = await getOpenJobsQuery(db);
  return jobs;
});

export const publishJob = createServerFn({ method: "POST" })
  .middleware([companyMiddleware])
  .inputValidator(zodValidator(jobIdSchema))
  .handler(async ({ data, context }) => {
    const db = getDb();
    await db.unsafe(closeExpiredJobsQuery);

    const job = await getJobById(db, { id: data.id });
    if (!job || job.companyId !== context.company.id) {
      throw new Error("Job not found or not authorized");
    }

    if (job.status !== "draft") {
      throw new Error("Only draft jobs can be published");
    }

    if (job.expiresAt && job.expiresAt <= new Date()) {
      throw new Error("This job has already expired. Update the deadline before publishing.");
    }

    const updated = await updateJobQuery(db, {
      id: data.id,
      companyId: context.company.id,
      title: job.title,
      description: job.description,
      requirements: job.requirements,
      interviewQuestions: job.interviewQuestions,
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
      expiresAt: job.expiresAt,
    });

    if (!updated) {
      throw new Error("Failed to publish job");
    }

    return { job: updated };
  });

// --- Public Server Functions ---

const companyIdSchema = z.object({
  companyId: z.string().uuid(),
});

export const getPublicJobById = createServerFn({ method: "GET" })
  .inputValidator(zodValidator(jobIdSchema))
  .handler(async ({ data }) => {
    const db = getDb();
    await db.unsafe(closeExpiredJobsQuery);
    const job = await getJobById(db, { id: data.id });

    if (!job || job.status !== "open" || job.archivedAt) {
      throw new Error("Job not found");
    }

    return job;
  });

export const getOpenJobsByCompanyId = createServerFn({ method: "GET" })
  .inputValidator(zodValidator(companyIdSchema))
  .handler(async ({ data }) => {
    const db = getDb();
    await db.unsafe(closeExpiredJobsQuery);
    return getOpenJobsByCompanyIdQuery(db, { companyId: data.companyId });
  });

const JOBS_PER_PAGE = 12;

const paginatedJobsSchema = z.object({
  search: z.string(),
  type: z.string(),
  level: z.string(),
  workplace: z.string(),
  salaryMin: z.number().int().min(0),
  salaryCurrency: z.string(),
  page: z.number().int().min(1),
});

export const getOpenJobsPaginated = createServerFn({ method: "GET" })
  .inputValidator(zodValidator(paginatedJobsSchema))
  .handler(async ({ data }) => {
    const db = getDb();
    await db.unsafe(closeExpiredJobsQuery);
    const offset = (data.page - 1) * JOBS_PER_PAGE;

    const filterArgs = {
      search: data.search,
      employmentType: data.type,
      experienceLevel: data.level,
      workplaceType: data.workplace,
      salaryMin: data.salaryMin,
      salaryCurrency: data.salaryCurrency,
    };

    const [items, countRow] = await Promise.all([
      getOpenJobsPaginatedQuery(db, { ...filterArgs, limit: JOBS_PER_PAGE, offset }),
      countOpenJobsFiltered(db, filterArgs),
    ]);

    const total = countRow?.total ?? 0;

    return { items, total, totalPages: Math.ceil(total / JOBS_PER_PAGE) };
  });
