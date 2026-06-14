/** Server functions for batch detail UI.
 *
 * IMPORTANT: This module is imported from route files (client + server). Keep it
 * free of `cloudflare:workers` imports and any other server-only code.
 *
 * Workflow / orchestration code lives in `./orchestration.ts`.
 * Pure DB release logic lives in `./release.ts`.
 */
import { createServerFn } from "@tanstack/react-start";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import {
  getActiveBatchForJob,
  getBatchDetail,
  getInterviewsByBatchWithCandidate,
  getReportsByBatchId,
} from "@/features/batches/queries/queries_sql";
import { getCompanyByMemberUserId } from "@/features/companies/queries/queries_sql";
import { getJobById } from "@/features/jobs/queries/queries_sql";
import { getDb } from "@/shared/db";
import { authMiddleware } from "@/shared/middleware";

const jobIdSchema = z.object({ jobId: z.string().uuid() });
const batchIdSchema = z.object({ batchId: z.string().uuid() });

export const getActiveBatchForJobServer = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(zodValidator(jobIdSchema))
  .handler(async ({ data, context }) => {
    const db = getDb();

    const company = await getCompanyByMemberUserId(db, { userId: context.userId });
    if (!company) {
      throw new Error("No company found");
    }

    const job = await getJobById(db, { id: data.jobId });
    if (!job || job.companyId !== company.id) {
      throw new Error("Job not found or not authorized");
    }

    const batch = await getActiveBatchForJob(db, { jobId: data.jobId });
    return batch;
  });

export const getBatchOverview = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(zodValidator(batchIdSchema))
  .handler(async ({ data, context }) => {
    const db = getDb();

    const batch = await getBatchDetail(db, { id: data.batchId });
    if (!batch) {
      return null;
    }

    // Verify the requester owns the company that owns the job
    const company = await getCompanyByMemberUserId(db, { userId: context.userId });
    if (!company) {
      throw new Error("Not authorized to view this batch");
    }

    const job = await getJobById(db, { id: batch.jobId });
    if (!job || job.companyId !== company.id) {
      throw new Error("Not authorized to view this batch");
    }

    const [reports, interviews] = await Promise.all([
      getReportsByBatchId(db, { batchId: data.batchId }),
      getInterviewsByBatchWithCandidate(db, { batchId: data.batchId }),
    ]);

    return {
      batch,
      reports,
      interviews,
    };
  });
