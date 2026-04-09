import { createServerFn } from "@tanstack/react-start";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { getUserById } from "@/features/auth/queries/queries_sql";
import {
  getCandidateProfileByUserId,
  getCandidateWorkHistoryByProfileId,
} from "@/features/candidates/queries/queries_sql";
import { getCompanyByOwnerId } from "@/features/companies/queries/queries_sql";
import { closeExpiredJobsQuery, getJobById } from "@/features/jobs/queries/queries_sql";
import { getDb } from "@/shared/db";
import { applicationStatusSchema, isValidTransition } from "@/shared/enums";
import { authMiddleware, companyMiddleware } from "@/shared/middleware";
import { createR2ResumeDownloadUrl } from "@/shared/r2";
import {
  createApplication as createApplicationQuery,
  getApplicationById,
  getApplicationByJobAndCandidate,
  getApplicationReviewById,
  getApplicationsByCandidate,
  getApplicationsByJob,
  updateApplicationStatus as updateApplicationStatusQuery,
} from "../queries/queries_sql";

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
    await db.unsafe(closeExpiredJobsQuery);

    // Only candidates can apply
    const user = await getUserById(db, { id: context.userId });
    if (!user || user.role !== "candidate") {
      throw new Error("Only candidates can apply to jobs");
    }

    // Verify the job exists and is open
    const job = await getJobById(db, { id: data.jobId });
    if (!job) {
      throw new Error("Job not found");
    }
    if (job.status !== "open") {
      throw new Error("This job is not accepting applications");
    }
    if (job.expiresAt && job.expiresAt <= new Date()) {
      throw new Error("This job has expired and is no longer accepting applications");
    }

    // Check if already applied
    const existing = await getApplicationByJobAndCandidate(db, {
      jobId: data.jobId,
      candidateId: context.userId,
    });
    if (existing) {
      throw new Error("You have already applied to this job");
    }

    const profile = await getCandidateProfileByUserId(db, { userId: context.userId });
    if (!profile?.resumeKey) {
      throw new Error("Add your resume to your profile before applying");
    }

    const workHistory = await getCandidateWorkHistoryByProfileId(db, {
      candidateProfileId: profile.id,
    });

    const application = await createApplicationQuery(db, {
      jobId: data.jobId,
      candidateId: context.userId,
      resumeKey: profile.resumeKey,
      metadata: {
        headline: profile.headline,
        bio: profile.bio,
        skills: profile.skills,
        workHistory: workHistory.map((entry) => ({
          company: entry.company,
          title: entry.title,
          startMonth: entry.startMonth,
          endMonth: entry.endMonth,
          currentlyWorkingHere: entry.currentlyWorkingHere,
          description: entry.description,
        })),
        links: profile.links,
      },
      status: "applied",
    });

    if (!application) {
      throw new Error("Failed to submit application");
    }

    return { application };
  });

export const getMyApplications = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const db = getDb();

    const user = await getUserById(db, { id: context.userId });
    if (!user || user.role !== "candidate") {
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

    const user = await getUserById(db, { id: context.userId });
    if (!user || user.role !== "candidate") {
      throw new Error("Only candidates can view applications");
    }

    const application = await getApplicationById(db, { id: data.applicationId });
    if (!application || application.candidateId !== context.userId) {
      throw new Error("Application not found");
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

    // Only the company owner can update status
    const application = await getApplicationById(db, {
      id: data.applicationId,
    });
    if (!application) {
      throw new Error("Application not found");
    }

    const company = await getCompanyByOwnerId(db, { ownerId: context.userId });
    if (!company) {
      throw new Error("Not authorized");
    }

    const job = await getJobById(db, { id: application.jobId });
    if (!job || job.companyId !== company.id) {
      throw new Error("Not authorized");
    }

    // Validate status transition
    const currentStatus = applicationStatusSchema.parse(application.status);
    if (!isValidTransition(currentStatus, data.status)) {
      throw new Error(`Cannot transition from "${currentStatus}" to "${data.status}"`);
    }

    const updated = await updateApplicationStatusQuery(db, {
      status: data.status,
      id: data.applicationId,
    });

    if (!updated) {
      throw new Error("Failed to update application status");
    }

    return { application: updated };
  });

export const hasApplied = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator(zodValidator(jobIdSchema))
  .handler(async ({ data, context }) => {
    const db = getDb();

    const user = await getUserById(db, { id: context.userId });
    if (!user || user.role !== "candidate") {
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

    const user = await getUserById(db, { id: context.userId });
    if (!user) {
      throw new Error("Not authorized");
    }

    if (user.role === "candidate" && application.candidateId === context.userId) {
      return {
        url: await createR2ResumeDownloadUrl({
          resumeKey: application.resumeKey,
        }),
      };
    }

    if (user.role === "company") {
      const company = await getCompanyByOwnerId(db, { ownerId: context.userId });
      if (!company) {
        throw new Error("Not authorized");
      }

      const job = await getJobById(db, { id: application.jobId });
      if (!job || job.companyId !== company.id) {
        throw new Error("Not authorized");
      }

      return {
        url: await createR2ResumeDownloadUrl({
          resumeKey: application.resumeKey,
        }),
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
      throw new Error("Application not found");
    }

    if (application.companyId !== context.company.id) {
      throw new Error("Not authorized");
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
