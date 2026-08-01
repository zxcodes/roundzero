import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { z } from "zod";

import { getActiveBatchForJob, getJobReportProgress } from "@/features/batches/queries/queries_sql";
import { getCompanyByMemberUserId } from "@/features/companies/queries/membership-queries_sql";
import {
  getActiveInterviewsByJob,
  getInterviewForCandidateByApplicationId,
} from "@/features/interviews/queries/queries_sql";
import { expireInterviewIfDue } from "@/features/interviews/server/expire";
import { closeExpiredJobsQuery, getJobById } from "@/features/jobs/queries/queries_sql";
import { loadApplicantReportTimeline } from "@/features/reports/server/timeline";
import { getDb } from "@/shared/db";
import { applicationStatusSchema } from "@/shared/enums";
import { ExpectedError } from "@/shared/expected-error";
import { authMiddleware, companyMiddleware } from "@/shared/middleware";
import { arrayBufferToBase64 } from "@/shared/resume";
import { zodValidator } from "@/shared/validation";
import { disposeRpcResource } from "@/shared/workflow-rpc";

import {
  getApplicationById,
  getApplicationByJobAndCandidate,
  getApplicationReviewById,
  getApplicationsByCandidate,
  getApplicationsByJob,
  getShortlistedApplicantsByCompany,
} from "../queries/queries_sql";
import { previewEvaluationRetry, retryEvaluation } from "../services/retry";
import {
  applyToJobWorkflow,
  shortlistApplicantWorkflow,
  updateApplicationStatusWorkflow,
  withdrawApplicationWorkflow,
} from "../services/workflows";
import { shortlistInputSchema } from "../shortlist";

const applySchema = z.object({
  jobId: z.string().uuid(),
});

const updateStatusSchema = z.object({
  applicationId: z.string().uuid(),
  status: applicationStatusSchema,
});

const jobIdSchema = z.object({
  jobId: z.string().uuid(),
});

const applicationIdSchema = z.object({
  applicationId: z.string().uuid(),
});

export const applyToJob = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(zodValidator(applySchema))
  .handler(async ({ data, context }) => {
    const db = getDb();
    return await applyToJobWorkflow(
      db,
      {
        userId: context.userId,
        jobId: data.jobId,
      },
      {
        triggerPreEvaluation: async (applicationId: string) => {
          try {
            const instance = await env.PRE_EVALUATION.create({ params: { applicationId } });
            try {
              return { workflowInstanceId: instance.id };
            } finally {
              disposeRpcResource(instance);
            }
          } catch (error) {
            console.error(`Failed to trigger pre-evaluation for ${applicationId}`, error);
          }
        },
      },
    );
  });

export const getMyApplications = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const db = getDb();

    if (context.user.role !== "candidate") {
      throw new ExpectedError("forbidden", "Only candidates can view applications");
    }

    const applications = await getApplicationsByCandidate(db, {
      candidateId: context.userId,
    });
    return applications;
  });

export const getMyApplicationDetail = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(zodValidator(applicationIdSchema))
  .handler(async ({ data, context }) => {
    const db = getDb();

    if (context.user.role !== "candidate") {
      throw new ExpectedError("forbidden", "Only candidates can view applications");
    }

    const [application, interview] = await Promise.all([
      getApplicationById(db, { id: data.applicationId }),
      getInterviewForCandidateByApplicationId(db, {
        id: data.applicationId,
        candidateId: context.userId,
      }),
    ]);
    if (!application) {
      return null;
    }

    if (application.candidateId !== context.userId) {
      throw new ExpectedError("forbidden", "Not authorized to view this application");
    }

    const effectiveInterview = interview
      ? (await expireInterviewIfDue({ db, interview })).interview
      : null;

    return { application, interview: effectiveInterview };
  });

export const getJobApplicants = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(zodValidator(jobIdSchema))
  .handler(async ({ data, context }) => {
    const db = getDb();

    // Verify this user owns the company that owns the job
    const [company, job] = await Promise.all([
      getCompanyByMemberUserId(db, { userId: context.userId }),
      getJobById(db, { id: data.jobId }),
    ]);
    if (!company) {
      throw new ExpectedError("setup_required", "No company found");
    }
    if (!job || job.companyId !== company.id) {
      throw new ExpectedError("not_found", "Job not found or not authorized");
    }

    const [activeInterviews, applicants] = await Promise.all([
      getActiveInterviewsByJob(db, { jobId: data.jobId }),
      getApplicationsByJob(db, { jobId: data.jobId }),
    ]);
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

    return applicants;
  });

// Consolidated read for the job-applicants dashboard route: one auth-middleware
// run + one job lookup, then the applicants and active batch in parallel.
// Returns null when the job is missing or not owned by the caller's company so
// the loader can throw notFound() instead of hitting the error boundary.
export const getJobApplicantsView = createServerFn({ method: "GET" })
  .middleware([companyMiddleware])
  .validator(zodValidator(jobIdSchema))
  .handler(async ({ data, context }) => {
    const db = getDb();
    await db.unsafe(closeExpiredJobsQuery);

    const job = await getJobById(db, { id: data.jobId });
    if (!job || job.companyId !== context.company.id) {
      return null;
    }

    const activeInterviews = await getActiveInterviewsByJob(db, { jobId: data.jobId });

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

    const [applicants, activeBatch, progress] = await Promise.all([
      getApplicationsByJob(db, { jobId: data.jobId }),
      getActiveBatchForJob(db, { jobId: data.jobId }),
      getJobReportProgress(db, { jobId: data.jobId }),
    ]);

    return {
      job,
      applicants,
      activeBatch,
      reportProgress: {
        target: job.finalReportTarget,
        delivered: progress?.deliveredCount ?? 0,
        processing: progress?.processingCount ?? 0,
        underway: progress?.underwayCount ?? 0,
        waitlisted: progress?.waitlistedCount ?? 0,
      },
    };
  });

export const updateApplicationStatus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(zodValidator(updateStatusSchema))
  .handler(async ({ data, context }) => {
    const db = getDb();
    return await updateApplicationStatusWorkflow(db, {
      userId: context.userId,
      applicationId: data.applicationId,
      status: data.status,
    });
  });

export const shortlistApplicant = createServerFn({ method: "POST" })
  .middleware([companyMiddleware])
  .validator(zodValidator(shortlistInputSchema))
  .handler(async ({ data, context }) => {
    const db = getDb();
    return await shortlistApplicantWorkflow(db, {
      userId: context.userId,
      applicationId: data.applicationId,
      note: data.note ?? null,
      notify: data.notify ?? false,
    });
  });

export const getShortlistedApplicants = createServerFn({ method: "GET" })
  .middleware([companyMiddleware])
  .handler(async ({ context }) => {
    const db = getDb();
    return await getShortlistedApplicantsByCompany(db, { id: context.company.id });
  });

export const withdrawApplication = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(zodValidator(applicationIdSchema))
  .handler(async ({ data, context }) => {
    const db = getDb();
    return await withdrawApplicationWorkflow(db, {
      userId: context.userId,
      applicationId: data.applicationId,
    });
  });

export const retryApplicationEvaluation = createServerFn({ method: "POST" })
  .middleware([companyMiddleware])
  .validator(zodValidator(applicationIdSchema))
  .handler(async ({ data, context }) => {
    const db = getDb();

    // Authorize: the company must own the job the application is for.
    const review = await getApplicationReviewById(db, { id: data.applicationId });
    if (!review) {
      return null;
    }
    if (review.companyId !== context.company.id) {
      throw new ExpectedError(
        "forbidden",
        "Not authorized to retry evaluation for this application",
      );
    }
    if (review.status !== "evaluation_failed") {
      throw new ExpectedError(
        "invalid_state",
        `Cannot retry evaluation — application is in "${review.status}", not evaluation_failed`,
      );
    }

    // Manual retries are not capped — the operator made the call.
    return await retryEvaluation(
      db,
      data.applicationId,
      { preEvaluation: env.PRE_EVALUATION, postEvaluation: env.POST_EVALUATION },
      { cap: null, source: "manual" },
    );
  });

export const hasApplied = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(zodValidator(jobIdSchema))
  .handler(async ({ data, context }) => {
    const db = getDb();

    if (context.user.role !== "candidate") {
      return false;
    }

    const existing = await getApplicationByJobAndCandidate(db, {
      jobId: data.jobId,
      candidateId: context.userId,
    });
    return !!existing;
  });

export const getApplicationResume = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(zodValidator(applicationIdSchema))
  .handler(async ({ data, context }) => {
    const db = getDb();

    const application = await getApplicationById(db, { id: data.applicationId });
    if (!application?.resumeKey) {
      throw new ExpectedError("not_found", "Resume not found");
    }

    if (context.user.role === "candidate" && application.candidateId !== context.userId) {
      throw new ExpectedError("forbidden", "Not authorized");
    }

    if (context.user.role === "company") {
      const company = await getCompanyByMemberUserId(db, { userId: context.userId });
      if (!company) {
        throw new ExpectedError("forbidden", "Not authorized");
      }

      const job = await getJobById(db, { id: application.jobId });
      if (!job || job.companyId !== company.id) {
        throw new ExpectedError("forbidden", "Not authorized");
      }
    }

    if (context.user.role !== "candidate" && context.user.role !== "company") {
      throw new ExpectedError("forbidden", "Not authorized");
    }

    const object = await env.RESUMES.get(application.resumeKey);
    if (!object) {
      throw new Error(`Resume object missing from R2: ${application.resumeKey}`);
    }
    return {
      base64: arrayBufferToBase64(await object.arrayBuffer()),
      contentType: object.httpMetadata?.contentType ?? "application/octet-stream",
    };
  });

export const getCompanyApplicantReview = createServerFn({ method: "GET" })
  .middleware([companyMiddleware])
  .validator(zodValidator(applicationIdSchema))
  .handler(async ({ data, context }) => {
    const db = getDb();

    const application = await getApplicationReviewById(db, { id: data.applicationId });
    if (!application) {
      return null;
    }

    if (application.companyId !== context.company.id) {
      throw new ExpectedError("forbidden", "Not authorized to view this applicant");
    }

    const applicantsPromise = getApplicationsByJob(db, { jobId: application.jobId });
    const reportTimelinePromise = loadApplicantReportTimeline(db, application);
    const evaluationRetryPromise =
      application.status === "evaluation_failed"
        ? previewEvaluationRetry(db, application.id, {
            preEvaluation: env.PRE_EVALUATION,
            postEvaluation: env.POST_EVALUATION,
          })
        : Promise.resolve(null);
    const [applicants, reportTimeline, evaluationRetry] = await Promise.all([
      applicantsPromise,
      reportTimelinePromise,
      evaluationRetryPromise,
    ]);
    const currentIndex = applicants.findIndex((applicant) => applicant.id === application.id);
    const previousApplicant = currentIndex > 0 ? applicants[currentIndex - 1] : null;
    const nextApplicant =
      currentIndex >= 0 && currentIndex < applicants.length - 1
        ? applicants[currentIndex + 1]
        : null;

    return {
      application,
      applicantCount: applicants.length,
      previousApplicant,
      nextApplicant,
      evaluationRetry,
      preEvaluation: reportTimeline.preEvaluation,
      reportTimeline,
    };
  });
