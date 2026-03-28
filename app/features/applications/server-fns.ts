import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { z } from "zod";
import { getCompanyByOwnerId } from "@/features/companies/queries/queries_sql";
import { getJobById } from "@/features/jobs/queries/queries_sql";
import { getDb } from "@/shared/db";
import { applicationStatusSchema } from "@/shared/enums";
import {
  createApplication as createApplicationQuery,
  getApplicationById,
  getApplicationByJobAndCandidate,
  getApplicationCountByJob,
  getApplicationsByCandidate,
  getApplicationsByJob,
  updateApplicationStatus as updateApplicationStatusQuery,
} from "./queries/queries_sql";

type SessionData = {
  userId: string;
};

const sessionConfig = {
  password: process.env.SESSION_SECRET!,
  name: "hirely-session",
  maxAge: 60 * 60 * 24 * 30,
};

const requireAuth = async () => {
  const session = await useSession<SessionData>(sessionConfig);
  if (!session.data.userId) {
    throw new Error("Not authenticated");
  }
  return session.data.userId;
};

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
  .inputValidator((data: { jobId: string; resumeUrl?: string | null; links?: string[] }) =>
    applySchema.parse(data),
  )
  .handler(async ({ data }) => {
    const userId = await requireAuth();
    const db = getDb();

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
      candidateId: userId,
    });
    if (existing) {
      throw new Error("You have already applied to this job");
    }

    const application = await createApplicationQuery(db, {
      jobId: data.jobId,
      candidateId: userId,
      resumeUrl: data.resumeUrl ?? null,
      links: JSON.stringify(data.links),
    });

    if (!application) {
      throw new Error("Failed to submit application");
    }

    return { application };
  });

export const getMyApplications = createServerFn({ method: "GET" }).handler(async () => {
  const userId = await requireAuth();
  const db = getDb();
  const applications = await getApplicationsByCandidate(db, {
    candidateId: userId,
  });
  return applications;
});

export const getJobApplicants = createServerFn({ method: "GET" })
  .inputValidator((data: { jobId: string }) => z.object({ jobId: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const userId = await requireAuth();
    const db = getDb();

    // Verify this user owns the company that owns the job
    const company = await getCompanyByOwnerId(db, { ownerId: userId });
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
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const userId = await requireAuth();
    const db = getDb();

    const application = await getApplicationById(db, { id: data.id });
    if (!application) {
      throw new Error("Application not found");
    }

    // Only the candidate or the company owner can view
    if (application.candidateId !== userId) {
      const company = await getCompanyByOwnerId(db, { ownerId: userId });
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

export const updateApplicationStatus = createServerFn({ method: "POST" })
  .inputValidator((data: { applicationId: string; status: string }) =>
    updateStatusSchema.parse(data),
  )
  .handler(async ({ data }) => {
    const userId = await requireAuth();
    const db = getDb();

    // Only the company owner can update status
    const application = await getApplicationById(db, {
      id: data.applicationId,
    });
    if (!application) {
      throw new Error("Application not found");
    }

    const company = await getCompanyByOwnerId(db, { ownerId: userId });
    if (!company) {
      throw new Error("Not authorized");
    }

    const job = await getJobById(db, { id: application.jobId });
    if (!job || job.companyId !== company.id) {
      throw new Error("Not authorized");
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
  .inputValidator((data: { jobId: string }) => z.object({ jobId: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const db = getDb();
    const result = await getApplicationCountByJob(db, { jobId: data.jobId });
    return result?.count ?? 0;
  });

export const hasApplied = createServerFn({ method: "GET" })
  .inputValidator((data: { jobId: string }) => z.object({ jobId: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const userId = await requireAuth();
    const db = getDb();
    const existing = await getApplicationByJobAndCandidate(db, {
      jobId: data.jobId,
      candidateId: userId,
    });
    return !!existing;
  });
