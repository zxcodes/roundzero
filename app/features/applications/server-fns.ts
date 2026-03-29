import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getUserById } from "@/features/auth/queries/queries_sql";
import { getCompanyByOwnerId } from "@/features/companies/queries/queries_sql";
import { getJobById } from "@/features/jobs/queries/queries_sql";
import { getDb } from "@/shared/db";
import { applicationStatusSchema } from "@/shared/enums";
import { authMiddleware } from "@/shared/middleware";
import {
  createApplication as createApplicationQuery,
  getApplicationById,
  getApplicationByJobAndCandidate,
  getApplicationCountByJob,
  getApplicationsByCandidate,
  getApplicationsByJob,
  updateApplicationStatus as updateApplicationStatusQuery,
} from "./queries/queries_sql";

const applySchema = z.object({
  jobId: z.string().uuid(),
  resumeUrl: z.string().url().nullable().optional(),
  links: z.array(z.string().url()).default([]),
});

const updateStatusSchema = z.object({
  applicationId: z.string().uuid(),
  status: applicationStatusSchema,
});

export const applyToJob = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((data: { jobId: string; resumeUrl?: string | null; links?: string[] }) =>
    applySchema.parse(data),
  )
  .handler(async ({ data, context }) => {
    const db = getDb();

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

    // Check if already applied
    const existing = await getApplicationByJobAndCandidate(db, {
      jobId: data.jobId,
      candidateId: context.userId,
    });
    if (existing) {
      throw new Error("You have already applied to this job");
    }

    const application = await createApplicationQuery(db, {
      jobId: data.jobId,
      candidateId: context.userId,
      resumeUrl: data.resumeUrl ?? null,
      links: JSON.stringify(data.links),
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

export const getJobApplicants = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator((data: { jobId: string }) => z.object({ jobId: z.string().uuid() }).parse(data))
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

export const getApplicationDetail = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const db = getDb();

    const application = await getApplicationById(db, { id: data.id });
    if (!application) {
      throw new Error("Application not found");
    }

    // Only the candidate or the company owner can view
    if (application.candidateId !== context.userId) {
      const company = await getCompanyByOwnerId(db, { ownerId: context.userId });
      if (!company) {
        throw new Error("Not authorized");
      }
      const job = await getJobById(db, { id: application.jobId });
      if (!job || job.companyId !== company.id) {
        throw new Error("Not authorized");
      }
    }

    return application;
  });

const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  applied: ["interviewing", "rejected"],
  interviewing: ["evaluated", "rejected"],
  evaluated: ["rejected"],
  rejected: [],
};

export const updateApplicationStatus = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator((data: { applicationId: string; status: string }) =>
    updateStatusSchema.parse(data),
  )
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
    const currentStatus = application.status;
    const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus] ?? [];
    if (!allowedTransitions.includes(data.status)) {
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

export const getApplicationCount = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator((data: { jobId: string }) => z.object({ jobId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const db = getDb();

    // Only the company owner of this job can view the count
    const company = await getCompanyByOwnerId(db, { ownerId: context.userId });
    if (!company) {
      throw new Error("Not authorized");
    }

    const job = await getJobById(db, { id: data.jobId });
    if (!job || job.companyId !== company.id) {
      throw new Error("Not authorized");
    }

    const result = await getApplicationCountByJob(db, { jobId: data.jobId });
    return result?.count ?? 0;
  });

export const hasApplied = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .inputValidator((data: { jobId: string }) => z.object({ jobId: z.string().uuid() }).parse(data))
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
