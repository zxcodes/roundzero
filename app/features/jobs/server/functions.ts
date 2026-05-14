import { createServerFn } from "@tanstack/react-start";
import { zodValidator } from "@tanstack/zod-adapter";
import { generateText, Output } from "ai";
import { z } from "zod";
import { hasActiveSubscription } from "@/features/billing/config";
import { getCompanyByOwnerId } from "@/features/companies/queries/queries_sql";
import { createNotification } from "@/features/notifications/queries/queries_sql";
import { getDb } from "@/shared/db";
import { authMiddleware, companyMiddleware } from "@/shared/middleware";
import { getModelChain, getOpenRouter } from "@/shared/openrouter";
import {
  archiveJob as archiveJobQuery,
  closeExpiredJobsQuery,
  countJobsByCompanyAndStatus,
  countOpenJobsFiltered,
  createJob as createJobQuery,
  getArchivedJobsByCompanyId,
  getJobById,
  getJobsWithPipelineByCompanyId,
  getOpenJobsByCompanyId as getOpenJobsByCompanyIdQuery,
  getOpenJobsPaginated as getOpenJobsPaginatedQuery,
  updateJob as updateJobQuery,
} from "../queries/queries_sql";
import { aiJobGenerationSchema, jobFieldsSchema, jobIdSchema, updateJobSchema } from "../schemas";

async function enforceJobLimit(
  db: ReturnType<typeof getDb>,
  companyId: string,
  subscriptionPlan: string | null,
  subscriptionStatus: string | null,
): Promise<void> {
  const isPaid = hasActiveSubscription({
    subscriptionPlan,
    subscriptionStatus,
  });
  if (isPaid) return;
  const counts = await countJobsByCompanyAndStatus(db, { companyId });
  if (counts && counts.openCount >= 3) {
    throw new Error("Free plan limited to 3 active jobs. Upgrade to Pro to post more.");
  }
}

export const createJob = createServerFn({ method: "POST" })
  .middleware([companyMiddleware])
  .inputValidator(zodValidator(jobFieldsSchema))
  .handler(async ({ data, context }) => {
    const db = getDb();

    // Enforce the 3-job limit for all creations on free plans.
    // Paid plans bypass this check entirely.
    await enforceJobLimit(
      db,
      context.company.id,
      context.company.subscriptionPlan,
      context.company.subscriptionStatus,
    );

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
      finalReportTarget: data.finalReportTarget,
      expiresAt: data.expiresAt ?? null,
    });

    if (!job) {
      throw new Error("Failed to create job");
    }

    return { job };
  });

export const getMyJobsWithPipeline = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const db = getDb();
    await db.unsafe(closeExpiredJobsQuery);
    const company = await getCompanyByOwnerId(db, { ownerId: context.userId });
    if (!company) {
      return [];
    }
    return getJobsWithPipelineByCompanyId(db, { companyId: company.id });
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
      return null;
    }

    // Non-open jobs are only visible to the company owner
    if (job.status !== "open") {
      const company = await getCompanyByOwnerId(db, { ownerId: context.userId });
      if (!company || company.id !== job.companyId) {
        return null;
      }
    }

    return job;
  });

export const updateJob = createServerFn({ method: "POST" })
  .middleware([companyMiddleware])
  .inputValidator(zodValidator(updateJobSchema))
  .handler(async ({ data, context }) => {
    const db = getDb();

    if (data.status === "open") {
      const existing = await getJobById(db, { id: data.id });
      if (existing && existing.status !== "open") {
        await enforceJobLimit(
          db,
          context.company.id,
          context.company.subscriptionPlan,
          context.company.subscriptionStatus,
        );
      }
    }

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
      finalReportTarget: data.finalReportTarget,
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

    // Create notification for job archived
    await createNotification(db, {
      userId: context.userId,
      type: "job_archived",
      payload: {
        jobId: archived.id,
        jobTitle: archived.title,
        status: "closed",
      },
    });

    return { job: archived };
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

    await enforceJobLimit(
      db,
      context.company.id,
      context.company.subscriptionPlan,
      context.company.subscriptionStatus,
    );

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
      finalReportTarget: job.finalReportTarget,
      expiresAt: job.expiresAt,
    });

    if (!updated) {
      throw new Error("Failed to publish job");
    }

    // Create notification for job published
    await createNotification(db, {
      userId: context.userId,
      type: "job_published",
      payload: {
        jobId: updated.id,
        jobTitle: updated.title,
        status: "open",
      },
    });

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

    if (!job || job.archivedAt || job.status === "draft") {
      return null;
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

export const getMyJobCounts = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const db = getDb();
    const company = await getCompanyByOwnerId(db, { ownerId: context.userId });
    if (!company) {
      return { openCount: 0, draftCount: 0, totalCount: 0 };
    }
    const counts = await countJobsByCompanyAndStatus(db, { companyId: company.id });
    return counts ?? { openCount: 0, draftCount: 0, totalCount: 0 };
  });

const generateJobPromptSchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(10, "Please provide a more detailed description")
    .max(500, "Description must be under 500 characters"),
});

const SYSTEM_PROMPT = `You are an expert technical recruiter and job description writer. Given a brief description of a role, generate a complete, detailed, and compelling job posting.

IMPORTANT: Do NOT prepend colons (:), dashes (-), bullets, or any markdown formatting to text values. The title should be "Senior UX Designer" not ": Senior UX Designer". The description should be plain paragraphs, not a list.

Guidelines:
- Write a professional, engaging job description that would attract top-tier candidates
- Requirements should be specific and actionable (e.g., "5+ years of React experience" not just "React experience")
- Include 4-8 relevant requirements based on the role
- Include 2-4 interview questions that assess key competencies for the role
- Salary should be realistic for the role and location; if unsure, use reasonable market ranges
- Team size and headcount should be realistic; use null if not inferable from the prompt
- Experience level should map to: junior (0-2y), mid (2-5y), senior (5-8y), staff (8-12y), lead (5+ y with leadership), principal (10+ y)
- Workplace type: remote, hybrid, or onsite — infer from context or default to hybrid
- Employment type: full_time, part_time, contract, or internship
- Currency should be inferred from location (USD for US, EUR for Europe, GBP for UK, etc.)
- Be specific about technologies, frameworks, and tools mentioned in the prompt`;

function cleanGeneratedString(value: string | null | undefined): string | null | undefined {
  if (typeof value !== "string") return value;
  return value.replace(/^[:\-\s]+/, "").trim() || null;
}

function cleanAiJobOutput(output: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = { ...output };

  const stringFields = ["title", "description", "location", "salaryCurrency"];
  for (const key of stringFields) {
    if (key in cleaned) {
      cleaned[key] = cleanGeneratedString(cleaned[key] as string | null | undefined);
    }
  }

  const arrayStringFields = ["requirements", "interviewQuestions"];
  for (const key of arrayStringFields) {
    const arr = cleaned[key];
    if (Array.isArray(arr)) {
      cleaned[key] = arr.map((item) =>
        typeof item === "string" ? cleanGeneratedString(item) : item,
      );
    }
  }

  return cleaned;
}

export const generateJobWithAI = createServerFn({ method: "POST" })
  .middleware([companyMiddleware])
  .inputValidator(zodValidator(generateJobPromptSchema))
  .handler(async ({ data, context }) => {
    const isPaid = hasActiveSubscription({
      subscriptionPlan: context.company.subscriptionPlan,
      subscriptionStatus: context.company.subscriptionStatus,
    });
    if (!isPaid) {
      throw new Error("AI job creation is available on Pro. Upgrade to unlock this feature.");
    }

    const openrouter = getOpenRouter();
    const { model, fallbacks } = getModelChain("job_creation");

    const result = await generateText({
      model: openrouter.chat(model, { plugins: [{ id: "response-healing" }] }),
      output: Output.object({ schema: aiJobGenerationSchema }),
      system: SYSTEM_PROMPT,
      prompt: data.prompt,
      ...(fallbacks.length > 0 ? { providerOptions: { openrouter: { models: fallbacks } } } : {}),
    });

    const cleaned = cleanAiJobOutput(result.output);

    const validated = jobFieldsSchema.safeParse({
      ...cleaned,
      status: "draft",
      expiresAt: null,
      finalReportTarget: 5,
    });

    if (!validated.success) {
      const issues = validated.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
      throw new Error(`Generated job failed validation: ${issues.join("; ")}`);
    }

    return validated.data;
  });
