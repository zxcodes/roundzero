import { createServerFn } from "@tanstack/react-start";
import { zodValidator } from "@tanstack/zod-adapter";
import { generateText, NoObjectGeneratedError, NoOutputGeneratedError, Output } from "ai";
import { z } from "zod";
import { getCompanyByMemberUserId } from "@/features/companies/queries/membership-queries_sql";
import { notifyCompanyTeam } from "@/features/companies/services/company-team-notifications";
import type { Entitlements } from "@/features/entitlements/entitlements";
import {
  enforceCompanyEntitlement,
  enforceReportTarget,
  lockCompanyEntitlementScope,
  readCompanyEntitlements,
} from "@/features/entitlements/server/enforcement";
import {
  isJobPublishTransition,
  notifyJobPublished,
} from "@/features/jobs/services/job-lifecycle-notifications";
import { getDb } from "@/shared/db";
import { asSqlTransaction } from "@/shared/db-transaction";
import { authMiddleware, companyMiddleware } from "@/shared/middleware";
import { createChatModel } from "@/shared/openrouter";
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

export const createJob = createServerFn({ method: "POST" })
  .middleware([companyMiddleware])
  .validator(zodValidator(jobFieldsSchema))
  .handler(async ({ data, context }) => {
    const db = getDb();
    const createArgs = {
      companyId: context.company.id,
      title: data.title,
      description: data.description,
      requirements: data.requirements,
      screeningQuestions: data.screeningQuestions,
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
    };

    const job =
      data.status === "open"
        ? await db.begin(async (tx) => {
            const transaction = asSqlTransaction(tx);
            await lockCompanyEntitlementScope(transaction, context.company.id);
            const entitlements = await enforceCompanyEntitlement(
              transaction,
              context.company.id,
              "jobs.open",
            );

            return createJobQuery(transaction, {
              ...createArgs,
              finalReportTarget: enforceReportTarget(entitlements, data.finalReportTarget),
            });
          })
        : await (async () => {
            const entitlements = await readCompanyEntitlements(db, context.company.id);
            return createJobQuery(db, {
              ...createArgs,
              finalReportTarget: enforceReportTarget(entitlements, data.finalReportTarget),
            });
          })();

    if (!job) {
      throw new Error("Failed to create job");
    }

    if (isJobPublishTransition(null, job.status)) {
      await notifyJobPublished(db, context.company.id, job);
    }

    return { job };
  });

export const getMyJobsWithPipeline = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const db = getDb();
    await db.unsafe(closeExpiredJobsQuery);
    const company = await getCompanyByMemberUserId(db, { userId: context.userId });
    if (!company) {
      return [];
    }
    return getJobsWithPipelineByCompanyId(db, { companyId: company.id });
  });

export const getMyArchivedJobs = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const db = getDb();
    const company = await getCompanyByMemberUserId(db, { userId: context.userId });
    if (!company) {
      return [];
    }
    const jobs = await getArchivedJobsByCompanyId(db, { companyId: company.id });
    return jobs;
  });

export const getJob = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(zodValidator(jobIdSchema))
  .handler(async ({ data, context }) => {
    const db = getDb();
    await db.unsafe(closeExpiredJobsQuery);
    const job = await getJobById(db, { id: data.id });
    if (!job) {
      return null;
    }

    // Non-open jobs are only visible to company members
    if (job.status !== "open") {
      const company = await getCompanyByMemberUserId(db, { userId: context.userId });
      if (!company || company.id !== job.companyId) {
        return null;
      }
    }

    return job;
  });

export const updateJob = createServerFn({ method: "POST" })
  .middleware([companyMiddleware])
  .validator(zodValidator(updateJobSchema))
  .handler(async ({ data, context }) => {
    const db = getDb();
    const existing = data.status === "open" ? await getJobById(db, { id: data.id }) : null;
    const updateArgs = {
      id: data.id,
      companyId: context.company.id,
      title: data.title,
      description: data.description,
      requirements: data.requirements,
      screeningQuestions: data.screeningQuestions,
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
    };

    const job =
      data.status === "open"
        ? await db.begin(async (tx) => {
            const transaction = asSqlTransaction(tx);
            await lockCompanyEntitlementScope(transaction, context.company.id);

            const existing = await getJobById(transaction, { id: data.id });
            const entitlements: Entitlements =
              existing && existing.status !== "open"
                ? await enforceCompanyEntitlement(transaction, context.company.id, "jobs.open")
                : await readCompanyEntitlements(transaction, context.company.id);

            return updateJobQuery(transaction, {
              ...updateArgs,
              finalReportTarget: enforceReportTarget(entitlements, data.finalReportTarget),
            });
          })
        : await (async () => {
            const entitlements = await readCompanyEntitlements(db, context.company.id);
            return updateJobQuery(db, {
              ...updateArgs,
              finalReportTarget: enforceReportTarget(entitlements, data.finalReportTarget),
            });
          })();

    if (!job) {
      throw new Error("Failed to update job: not found or not authorized");
    }

    if (isJobPublishTransition(existing?.status, job.status)) {
      await notifyJobPublished(db, context.company.id, job);
    }

    return { job };
  });

export const archiveJob = createServerFn({ method: "POST" })
  .middleware([companyMiddleware])
  .validator(zodValidator(jobIdSchema))
  .handler(async ({ data, context }) => {
    const db = getDb();
    const archived = await archiveJobQuery(db, { id: data.id, companyId: context.company.id });
    if (!archived) {
      throw new Error("Job not found, not authorized, or already archived");
    }

    await notifyCompanyTeam(db, {
      companyId: context.company.id,
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
  .validator(zodValidator(jobIdSchema))
  .handler(async ({ data, context }) => {
    const db = getDb();
    await db.unsafe(closeExpiredJobsQuery);
    const updated = await db.begin(async (tx) => {
      const transaction = asSqlTransaction(tx);
      await lockCompanyEntitlementScope(transaction, context.company.id);

      const job = await getJobById(transaction, { id: data.id });
      if (!job || job.companyId !== context.company.id) {
        throw new Error("Job not found or not authorized");
      }

      if (job.status !== "draft") {
        throw new Error("Only draft jobs can be published");
      }

      if (job.expiresAt && job.expiresAt <= new Date()) {
        throw new Error("This job has already expired. Update the deadline before publishing.");
      }

      const entitlements = await enforceCompanyEntitlement(
        transaction,
        context.company.id,
        "jobs.open",
      );

      return updateJobQuery(transaction, {
        id: data.id,
        companyId: context.company.id,
        title: job.title,
        description: job.description,
        requirements: job.requirements,
        screeningQuestions: job.screeningQuestions,
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
        finalReportTarget: enforceReportTarget(entitlements, job.finalReportTarget, "clamp"),
        expiresAt: job.expiresAt,
      });
    });

    if (!updated) {
      throw new Error("Failed to publish job");
    }

    await notifyJobPublished(db, context.company.id, updated);

    return { job: updated };
  });

// --- Public Server Functions ---

const companyIdSchema = z.object({
  companyId: z.string().uuid(),
});

export const getPublicJobById = createServerFn({ method: "GET" })
  .validator(zodValidator(jobIdSchema))
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
  .validator(zodValidator(companyIdSchema))
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
  .validator(zodValidator(paginatedJobsSchema))
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
    const company = await getCompanyByMemberUserId(db, { userId: context.userId });
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

Never refuse, apologize, or ask for more input in any field. Do not use titles like "Error" or descriptions that explain what information is missing. Even brief prompts should be expanded into a complete posting — infer reasonable role details, requirements, and screening questions when the user omits them.

Guidelines:
- Write a professional, engaging job description that would attract top-tier candidates
- Requirements should be specific and actionable (e.g., "5+ years of React experience" not just "React experience")
- Include 4-8 relevant requirements based on the role
- Include 2-4 screening questions. These are NOT technical or competency questions — they are short, informatory logistics/eligibility questions used to qualify candidates early (e.g. work authorization/visa status, willingness to relocate, salary expectations, notice period, availability/start date, on-site vs remote preference). Tailor them to the role and location (e.g. ask about relocation only if the role is onsite/hybrid, ask about visa status based on the location). Never include questions that test skills, knowledge, or problem-solving.
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

  const arrayStringFields = ["requirements", "screeningQuestions"];
  for (const key of arrayStringFields) {
    const arr = cleaned[key];
    if (Array.isArray(arr)) {
      cleaned[key] = arr.map((item) =>
        typeof item === "string" ? cleanGeneratedString(item) : item,
      );
    }
  }

  // Sanity check: cap array lengths to prevent model from generating excessive lists
  const MAX_REQUIREMENTS = 12;
  const MAX_SCREENING_QUESTIONS = 12;
  if (Array.isArray(cleaned.requirements) && cleaned.requirements.length > MAX_REQUIREMENTS) {
    cleaned.requirements = cleaned.requirements.slice(0, MAX_REQUIREMENTS);
  }
  if (
    Array.isArray(cleaned.screeningQuestions) &&
    cleaned.screeningQuestions.length > MAX_SCREENING_QUESTIONS
  ) {
    cleaned.screeningQuestions = cleaned.screeningQuestions.slice(0, MAX_SCREENING_QUESTIONS);
  }

  // Sanity check: cap salary fields to prevent unrealistic values
  const MAX_SALARY = 1000000; // $1M upper bound
  if (typeof cleaned.salaryMin === "number" && cleaned.salaryMin > MAX_SALARY) {
    cleaned.salaryMin = MAX_SALARY;
  }
  if (typeof cleaned.salaryMax === "number" && cleaned.salaryMax > MAX_SALARY) {
    cleaned.salaryMax = MAX_SALARY;
  }

  // Sanity check: cap team size and headcount to realistic values
  const MAX_TEAM_SIZE = 1000;
  const MAX_HEADCOUNT = 1000;
  if (typeof cleaned.teamSize === "number" && cleaned.teamSize > MAX_TEAM_SIZE) {
    cleaned.teamSize = MAX_TEAM_SIZE;
  }
  if (typeof cleaned.headcount === "number" && cleaned.headcount > MAX_HEADCOUNT) {
    cleaned.headcount = MAX_HEADCOUNT;
  }

  return cleaned;
}

function looksLikeRefusalOutput(output: { title: string; description: string }): boolean {
  const title = output.title.trim();
  const combined = `${title}\n${output.description}`.toLowerCase();

  if (/^error\b/i.test(title)) {
    return true;
  }

  if (
    combined.includes("invalid request") ||
    combined.includes("does not contain the necessary information") ||
    combined.includes("please provide") ||
    combined.includes("unable to generate") ||
    combined.includes("unable to create") ||
    combined.includes("cannot generate") ||
    combined.includes("cannot create") ||
    combined.includes("insufficient information") ||
    combined.includes("not enough information") ||
    combined.includes("i'm unable") ||
    combined.includes("i am unable")
  ) {
    return true;
  }

  return false;
}

export const generateJobWithAI = createServerFn({ method: "POST" })
  .middleware([companyMiddleware])
  .validator(zodValidator(generateJobPromptSchema))
  .handler(async ({ data, context }) => {
    const entitlements = await enforceCompanyEntitlement(
      getDb(),
      context.company.id,
      "aiJobCreation",
    );

    try {
      const result = await generateText({
        model: createChatModel("job_creation", { plugins: [{ id: "response-healing" }] }),
        output: Output.object({ schema: aiJobGenerationSchema }),
        system: SYSTEM_PROMPT,
        prompt: data.prompt,
      });

      const cleaned = cleanAiJobOutput(result.output);

      const validated = jobFieldsSchema.safeParse({
        ...cleaned,
        status: "draft",
        expiresAt: null,
        finalReportTarget: enforceReportTarget(entitlements, null),
      });

      if (!validated.success) {
        throw new Error(
          "The draft was incomplete. Add a bit more detail about the role, requirements, and work setup, then try again.",
        );
      }

      if (looksLikeRefusalOutput(validated.data)) {
        throw new Error(
          "We couldn't turn that into a job posting. Describe the role, seniority, location or remote setup, and compensation if you have it, then try again.",
        );
      }

      return validated.data;
    } catch (error) {
      if (
        NoObjectGeneratedError.isInstance(error) ||
        NoOutputGeneratedError.isInstance(error) ||
        (error instanceof Error &&
          (error.message.includes("No object generated") ||
            error.message.includes("No output generated")))
      ) {
        throw new Error(
          "We couldn't turn that into a job posting. Describe the role, seniority, location or remote setup, and compensation if you have it, then try again.",
        );
      }

      if (error instanceof Error && error.message) {
        throw error;
      }

      throw new Error("Something went wrong while generating your job posting. Please try again.");
    }
  });
