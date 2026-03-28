import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { z } from "zod";
import { getCompanyByOwnerId } from "@/features/companies/queries/queries_sql";
import { getDb } from "@/shared/db";
import { jobStatusSchema } from "@/shared/enums";
import {
  createJob as createJobQuery,
  deleteJob as deleteJobQuery,
  getJobById,
  getJobsByCompanyId,
  getOpenJobs as getOpenJobsQuery,
  updateJob as updateJobQuery,
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

const requireCompany = async () => {
  const userId = await requireAuth();
  const db = getDb();
  const company = await getCompanyByOwnerId(db, { ownerId: userId });
  if (!company) {
    throw new Error("No company found");
  }
  return { userId, company };
};

const createJobSchema = z.object({
  title: z.string().min(1, "Job title is required").max(200),
  description: z.string().min(1, "Job description is required").max(5000),
  requirements: z.array(z.string()).default([]),
  status: jobStatusSchema.default("draft"),
});

const updateJobSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1, "Job title is required").max(200),
  description: z.string().min(1, "Job description is required").max(5000),
  requirements: z.array(z.string()).default([]),
  status: jobStatusSchema,
});

const deleteJobSchema = z.object({
  id: z.string().uuid(),
});

export const createJob = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { title: string; description: string; requirements?: string[]; status?: string }) =>
      createJobSchema.parse(data),
  )
  .handler(async ({ data }) => {
    const { company } = await requireCompany();
    const db = getDb();

    const job = await createJobQuery(db, {
      companyId: company.id,
      title: data.title,
      description: data.description,
      requirements: JSON.stringify(data.requirements),
      status: data.status,
    });

    if (!job) {
      throw new Error("Failed to create job");
    }

    return { job };
  });

export const getMyJobs = createServerFn({ method: "GET" }).handler(async () => {
  const userId = await requireAuth();
  const db = getDb();
  const company = await getCompanyByOwnerId(db, { ownerId: userId });
  if (!company) {
    return [];
  }
  const jobs = await getJobsByCompanyId(db, { companyId: company.id });
  return jobs;
});

export const getJob = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => deleteJobSchema.parse(data))
  .handler(async ({ data }) => {
    const db = getDb();
    const job = await getJobById(db, { id: data.id });
    if (!job) {
      throw new Error("Job not found");
    }
    return job;
  });

export const updateJob = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      id: string;
      title: string;
      description: string;
      requirements?: string[];
      status: string;
    }) => updateJobSchema.parse(data),
  )
  .handler(async ({ data }) => {
    const { company } = await requireCompany();
    const db = getDb();

    const job = await updateJobQuery(db, {
      id: data.id,
      companyId: company.id,
      title: data.title,
      description: data.description,
      requirements: JSON.stringify(data.requirements),
      status: data.status,
    });

    if (!job) {
      throw new Error("Failed to update job — not found or not authorized");
    }

    return { job };
  });

export const deleteJob = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => deleteJobSchema.parse(data))
  .handler(async ({ data }) => {
    const { company } = await requireCompany();
    const db = getDb();
    await deleteJobQuery(db, { id: data.id, companyId: company.id });
    return { success: true };
  });

export const getOpenJobs = createServerFn({ method: "GET" }).handler(async () => {
  const db = getDb();
  const jobs = await getOpenJobsQuery(db);
  return jobs;
});
