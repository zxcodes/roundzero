import { createServerFn } from "@tanstack/react-start";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { getCompanyByOwnerId } from "@/features/companies/queries/queries_sql";
import { getJobById } from "@/features/jobs/queries/queries_sql";
import { getDb } from "@/shared/db";
import { applicationStatusSchema } from "@/shared/enums";
import { serverEnv } from "@/shared/env.server";
import { authMiddleware, companyMiddleware } from "@/shared/middleware";
import { createR2ResumeDownloadUrl } from "@/shared/r2.server";
import {
  getApplicationById,
  getApplicationByJobAndCandidate,
  getApplicationReviewById,
  getApplicationsByCandidate,
  getApplicationsByJob,
} from "../queries/queries_sql";
import {
  applyToJobWorkflow,
  updateApplicationStatusWorkflow,
  withdrawApplicationWorkflow,
} from "../services/workflows";

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
  .inputValidator(zodValidator(applySchema))
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
            await fetch(`${serverEnv.EDGE_WORKER_URL}/pre-evaluate`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${serverEnv.EDGE_WORKER_SECRET}`,
              },
              body: JSON.stringify({ applicationId }),
            });
          } catch {
            console.error(`Failed to trigger pre-evaluation for ${applicationId}`);
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
      throw new Error("Only candidates can view applications");
    }

    const applications = await getApplicationsByCandidate(db, {
      candidateId: context.userId,
    });
    return applications;
  });

export const getMyApplicationDetail = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(zodValidator(applicationIdSchema))
  .handler(async ({ data, context }) => {
    const db = getDb();

    if (context.user.role !== "candidate") {
      throw new Error("Only candidates can view applications");
    }

    const application = await getApplicationById(db, { id: data.applicationId });
    if (!application) {
      return null;
    }

    if (application.candidateId !== context.userId) {
      throw new Error("Not authorized to view this application");
    }

    return application;
  });

export const getJobApplicants = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(zodValidator(jobIdSchema))
  .handler(async ({ data, context }) => {
    const db = getDb();

    // Verify this user owns the company that owns the job
    const company = await getCompanyByOwnerId(db, { ownerId: context.userId });
    if (!company) {
      throw new Error("No company found");
    }

    const job = await getJobById(db, { id: data.jobId });
    if (!job || job.companyId !== company.id) {
      throw new Error("Job not found or not authorized");
    }

    const applicants = await getApplicationsByJob(db, { jobId: data.jobId });
    return applicants;
  });

export const updateApplicationStatus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(zodValidator(updateStatusSchema))
  .handler(async ({ data, context }) => {
    const db = getDb();
    return await updateApplicationStatusWorkflow(db, {
      userId: context.userId,
      applicationId: data.applicationId,
      status: data.status,
    });
  });

export const withdrawApplication = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(zodValidator(applicationIdSchema))
  .handler(async ({ data, context }) => {
    const db = getDb();
    return await withdrawApplicationWorkflow(db, {
      userId: context.userId,
      applicationId: data.applicationId,
    });
  });

export const hasApplied = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(zodValidator(jobIdSchema))
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

export const getApplicationResumeDownloadUrl = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(zodValidator(applicationIdSchema))
  .handler(async ({ data, context }) => {
    const db = getDb();

    const application = await getApplicationById(db, { id: data.applicationId });
    if (!application?.resumeKey) {
      throw new Error("Resume not found");
    }

    if (context.user.role === "candidate" && application.candidateId === context.userId) {
      return {
        url: await createR2ResumeDownloadUrl({ data: { resumeKey: application.resumeKey } }),
      };
    }

    if (context.user.role === "company") {
      const company = await getCompanyByOwnerId(db, { ownerId: context.userId });
      if (!company) {
        throw new Error("Not authorized");
      }

      const job = await getJobById(db, { id: application.jobId });
      if (!job || job.companyId !== company.id) {
        throw new Error("Not authorized");
      }

      return {
        url: await createR2ResumeDownloadUrl({ data: { resumeKey: application.resumeKey } }),
      };
    }

    throw new Error("Not authorized");
  });

export const getCompanyApplicantReview = createServerFn({ method: "GET" })
  .middleware([companyMiddleware])
  .inputValidator(zodValidator(applicationIdSchema))
  .handler(async ({ data, context }) => {
    const db = getDb();

    const application = await getApplicationReviewById(db, { id: data.applicationId });
    if (!application) {
      return null;
    }

    if (application.companyId !== context.company.id) {
      throw new Error("Not authorized to view this applicant");
    }

    const applicants = await getApplicationsByJob(db, { jobId: application.jobId });
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
    };
  });
