import { createServerFn } from "@tanstack/react-start";
import { generateText, NoObjectGeneratedError, NoOutputGeneratedError, Output } from "ai";
import { z } from "zod";

import {
  getApplicationByJobAndCandidate,
  getApplicationsByJob,
} from "@/features/applications/queries/queries_sql";
import { checkAndLaunchBatch } from "@/features/batches/server/orchestration";
import { getCandidateProfileByUserId } from "@/features/candidates/queries/queries_sql";
import { getCompanyByMemberUserId } from "@/features/companies/queries/membership-queries_sql";
import { notifyCompanyTeam } from "@/features/companies/services/company-team-notifications";
import {
  enforceCompanyEntitlement,
  enforceReportTarget,
  lockCompanyEntitlementScope,
  readCompanyEntitlements,
} from "@/features/entitlements/server/enforcement";
import { getActiveInterviewsByJob } from "@/features/interviews/queries/queries_sql";
import { expireInterviewIfDue } from "@/features/interviews/server/expire";
import {
  requestJobMatchingExtraction,
  startJobMatchingExtraction,
  startJobMatchingExtractions,
} from "@/features/job-matching/server/orchestration";
import {
  isJobPublishTransition,
  notifyJobPublished,
} from "@/features/jobs/services/job-lifecycle-notifications";
import { getDb } from "@/shared/db";
import { asSqlTransaction } from "@/shared/db-transaction";
import { ExpectedError } from "@/shared/expected-error";
import { authMiddleware, companyMiddleware } from "@/shared/middleware";
import { createChatModel } from "@/shared/openrouter";
import { zodValidator } from "@/shared/validation";

import {
  archiveJob as archiveJobQuery,
  closeExpiredJobsQuery,
  countCandidateOpenJobsFiltered,
  countJobsByCompanyAndStatus,
  countOpenJobsFiltered,
  createJob as createJobQuery,
  getArchivedJobsByCompanyId,
  getCandidateOpenJobsPaginated as getCandidateOpenJobsPaginatedQuery,
  getJobById,
  getOwnedJobForUpdate,
  getJobsWithPipelineByCompanyId,
  getOpenJobCompanies,
  getOpenJobsByCompanyId as getOpenJobsByCompanyIdQuery,
  getOpenJobsPaginated as getOpenJobsPaginatedQuery,
  updateJob as updateJobQuery,
} from "../queries/queries_sql";
import {
  aiJobGenerationSchema,
  jobFieldsSchema,
  jobIdSchema,
  jobIdsSchema,
  updateJobSchema,
} from "../schemas";

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

    const result =
      data.status === "open"
        ? await db.begin(async (tx) => {
            const transaction = asSqlTransaction(tx);
            await lockCompanyEntitlementScope(transaction, context.company.id);
            const entitlements = await enforceCompanyEntitlement(
              transaction,
              context.company.id,
              "jobs.open",
            );

            const job = await createJobQuery(transaction, {
              ...createArgs,
              finalReportTarget: enforceReportTarget(entitlements, data.finalReportTarget),
            });
            const matchingRequest = job
              ? await requestJobMatchingExtraction(transaction, job)
              : null;
            return { job, matchingRequest };
          })
        : await (async () => {
            const entitlements = await readCompanyEntitlements(db, context.company.id);
            const job = await createJobQuery(db, {
              ...createArgs,
              finalReportTarget: enforceReportTarget(entitlements, data.finalReportTarget),
            });
            return { job, matchingRequest: null };
          })();

    if (!result.job) {
      throw new Error("Failed to create job");
    }

    if (isJobPublishTransition(null, result.job.status)) {
      await notifyJobPublished(db, context.company.id, result.job);
    }
    if (result.matchingRequest) await startJobMatchingExtraction(result.matchingRequest);

    return { job: result.job };
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

export const getAuthenticatedJobDetail = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(zodValidator(jobIdSchema))
  .handler(async ({ data, context }) => {
    const db = getDb();
    await db.unsafe(closeExpiredJobsQuery);
    const job = await getJobById(db, { id: data.id });
    if (!job) {
      return null;
    }

    if (context.user.role === "company") {
      const company = await getCompanyByMemberUserId(db, { userId: context.userId });
      if (!company || company.id !== job.companyId) {
        return null;
      }

      const activeInterviews = await getActiveInterviewsByJob(db, { jobId: job.id });
      await Promise.all(
        activeInterviews.map((interview) =>
          expireInterviewIfDue({
            db,
            interview: {
              id: interview.id,
              applicationId: interview.applicationId,
              status: interview.status,
              expiresAt: interview.expiresAt,
            },
          }),
        ),
      );
      const applicants = await getApplicationsByJob(db, { jobId: job.id });
      return { type: "company" as const, job, applicants };
    }

    if (context.user.role !== "candidate" || job.status !== "open") {
      return null;
    }

    const [application, candidateProfile] = await Promise.all([
      getApplicationByJobAndCandidate(db, {
        jobId: job.id,
        candidateId: context.userId,
      }),
      getCandidateProfileByUserId(db, { userId: context.userId }),
    ]);
    return {
      type: "candidate" as const,
      job,
      alreadyApplied: application !== null,
      candidateProfile,
    };
  });

export const updateJob = createServerFn({ method: "POST" })
  .middleware([companyMiddleware])
  .validator(zodValidator(updateJobSchema))
  .handler(async ({ data, context }) => {
    const db = getDb();
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

    const result = await db.begin(async (tx) => {
      const transaction = asSqlTransaction(tx);
      await lockCompanyEntitlementScope(transaction, context.company.id);
      const existing = await getOwnedJobForUpdate(transaction, {
        id: data.id,
        companyId: context.company.id,
      });
      if (!existing) return null;
      if (data.finalReportTarget < existing.finalReportTarget) {
        throw new ExpectedError("invalid_input", "The report target can only be increased.");
      }

      const targetIncreased = data.finalReportTarget > existing.finalReportTarget;
      let finalReportTarget = existing.finalReportTarget;
      if (targetIncreased) {
        const entitlements = await readCompanyEntitlements(transaction, context.company.id);
        finalReportTarget = enforceReportTarget(entitlements, data.finalReportTarget);
      }
      if (data.status === "open" && existing.status !== "open") {
        const entitlements = await enforceCompanyEntitlement(
          transaction,
          context.company.id,
          "jobs.open",
        );
        if (finalReportTarget > entitlements.reports.perJobLimit) {
          throw new ExpectedError(
            "quota_exceeded",
            `Upgrade your plan to publish this job with a report target of ${finalReportTarget}.`,
          );
        }
      }

      const job = await updateJobQuery(transaction, { ...updateArgs, finalReportTarget });
      if (!job) {
        throw new ExpectedError("conflict", "The report target can only be increased.");
      }
      const matchingRequest =
        job.status === "open" ? await requestJobMatchingExtraction(transaction, job) : null;
      return { job, previousStatus: existing.status, targetIncreased, matchingRequest };
    });

    if (!result) {
      throw new ExpectedError("not_found", "Job not found or not authorized");
    }

    if (isJobPublishTransition(result.previousStatus, result.job.status)) {
      await notifyJobPublished(db, context.company.id, result.job);
    }
    if (result.targetIncreased && result.job.status === "open") {
      await checkAndLaunchBatch(result.job.id);
    }
    if (result.matchingRequest) await startJobMatchingExtraction(result.matchingRequest);

    return { job: result.job };
  });

export const archiveJob = createServerFn({ method: "POST" })
  .middleware([companyMiddleware])
  .validator(zodValidator(jobIdSchema))
  .handler(async ({ data, context }) => {
    const db = getDb();
    const archived = await archiveJobQuery(db, { id: data.id, companyId: context.company.id });
    if (!archived) {
      throw new ExpectedError("conflict", "Job not found, not authorized, or already archived");
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

const publishCompanyJobs = async (companyId: string, requestedIds: string[]) => {
  const db = getDb();
  const ids = [...new Set(requestedIds)].sort();
  await db.unsafe(closeExpiredJobsQuery);

  const published = await db.begin(async (tx) => {
    const transaction = asSqlTransaction(tx);
    await lockCompanyEntitlementScope(transaction, companyId);

    const jobs = [];
    for (const id of ids) {
      const job = await getOwnedJobForUpdate(transaction, { id, companyId });
      if (!job) {
        throw new ExpectedError("not_found", "A selected job was not found or not authorized");
      }
      if (job.archivedAt) {
        throw new ExpectedError("invalid_state", `“${job.title}” has been archived.`);
      }
      if (job.status !== "draft") {
        throw new ExpectedError("invalid_state", `“${job.title}” is no longer a draft.`);
      }

      if (job.expiresAt && job.expiresAt <= new Date()) {
        throw new ExpectedError(
          "expired",
          `“${job.title}” has expired. Update its deadline before publishing.`,
        );
      }
      jobs.push(job);
    }

    const entitlements = await enforceCompanyEntitlement(transaction, companyId, "jobs.open");
    if (jobs.length > entitlements.jobs.active.remaining) {
      const remaining = entitlements.jobs.active.remaining;
      throw new ExpectedError(
        "quota_exceeded",
        `Your plan has ${remaining} active job ${remaining === 1 ? "slot" : "slots"} remaining. Select fewer drafts or upgrade your plan.`,
      );
    }

    const results = [];
    for (const job of jobs) {
      if (job.finalReportTarget > entitlements.reports.perJobLimit) {
        throw new ExpectedError(
          "quota_exceeded",
          `Upgrade your plan to publish “${job.title}” with a report target of ${job.finalReportTarget}.`,
        );
      }

      const updated = await updateJobQuery(transaction, {
        id: job.id,
        companyId,
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
        finalReportTarget: job.finalReportTarget,
        expiresAt: job.expiresAt,
      });
      if (!updated) {
        throw new ExpectedError("conflict", `“${job.title}” changed while it was being published.`);
      }
      const matchingRequest = await requestJobMatchingExtraction(transaction, updated);
      results.push({ job: updated, matchingRequest });
    }
    return results;
  });

  for (let index = 0; index < published.length; index += 3) {
    await Promise.all(
      published.slice(index, index + 3).map(({ job }) => notifyJobPublished(db, companyId, job)),
    );
  }
  await startJobMatchingExtractions(
    published.flatMap(({ matchingRequest }) => (matchingRequest ? [matchingRequest] : [])),
  );
  return published.map(({ job }) => job);
};

export const publishJob = createServerFn({ method: "POST" })
  .middleware([companyMiddleware])
  .validator(zodValidator(jobIdSchema))
  .handler(async ({ data, context }) => {
    const [job] = await publishCompanyJobs(context.company.id, [data.id]);
    return { job };
  });

export const publishJobs = createServerFn({ method: "POST" })
  .middleware([companyMiddleware])
  .validator(zodValidator(jobIdsSchema))
  .handler(async ({ data, context }) => {
    const jobs = await publishCompanyJobs(context.company.id, data.ids);
    return { jobs };
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
  company: z.string(),
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
      companySlug: data.company,
    };

    const [items, countRow, companies] = await Promise.all([
      getOpenJobsPaginatedQuery(db, { ...filterArgs, limit: JOBS_PER_PAGE, offset }),
      countOpenJobsFiltered(db, filterArgs),
      getOpenJobCompanies(db),
    ]);

    const total = countRow?.total ?? 0;

    return { items, total, totalPages: Math.ceil(total / JOBS_PER_PAGE), companies };
  });

export const getCandidateOpenJobsPaginated = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(zodValidator(paginatedJobsSchema))
  .handler(async ({ data, context }) => {
    const db = getDb();
    await db.unsafe(closeExpiredJobsQuery);
    const offset = (data.page - 1) * JOBS_PER_PAGE;

    const filterArgs = {
      candidateId: context.userId,
      search: data.search,
      employmentType: data.type,
      experienceLevel: data.level,
      workplaceType: data.workplace,
      salaryMin: data.salaryMin,
      salaryCurrency: data.salaryCurrency,
      companySlug: data.company,
    };

    const [items, countRow, countIncludingAppliedRow, companies] = await Promise.all([
      getCandidateOpenJobsPaginatedQuery(db, {
        ...filterArgs,
        limit: JOBS_PER_PAGE,
        offset,
      }),
      countCandidateOpenJobsFiltered(db, filterArgs),
      countOpenJobsFiltered(db, filterArgs),
      getOpenJobCompanies(db),
    ]);

    const total = countRow?.total ?? 0;
    const totalIncludingApplied = countIncludingAppliedRow?.total ?? 0;

    return {
      items,
      total,
      totalIncludingApplied,
      totalPages: Math.ceil(total / JOBS_PER_PAGE),
      companies,
    };
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

Never refuse, apologize, or ask for more input in any field. Do not use titles like "Error" or descriptions that explain what information is missing. Even brief prompts should be expanded into a complete posting — infer reasonable role details and requirements when the user omits them.

Guidelines:
- Write a professional, engaging job description that would attract top-tier candidates
- Requirements should be specific and actionable (e.g., "5+ years of React experience" not just "React experience")
- Include 4-8 relevant requirements based on the role
- Always return an empty screeningQuestions array. Companies add must-know logistics constraints themselves.
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

function nullInvalidOptionalInt(value: unknown): number | null | undefined {
  if (value === null || value === undefined) {
    return value as null | undefined;
  }
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    !Number.isInteger(value) ||
    value <= 0
  ) {
    return null;
  }
  return value;
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

  const optionalIntFields = ["salaryMin", "salaryMax", "teamSize", "headcount"] as const;
  for (const key of optionalIntFields) {
    if (key in cleaned) {
      cleaned[key] = nullInvalidOptionalInt(cleaned[key]);
    }
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
        screeningQuestions: [],
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
        throw new ExpectedError(
          "invalid_input",
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
        throw new Error("We couldn't generate a complete job posting. Please try again.", {
          cause: error,
        });
      }

      if (error instanceof Error && error.message) {
        throw error;
      }

      throw new Error("Something went wrong while generating your job posting. Please try again.");
    }
  });
