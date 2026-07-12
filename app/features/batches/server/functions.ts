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
  getBatchDetail,
  getInterviewsByBatchWithCandidate,
  getReportsByBatchId,
} from "@/features/batches/queries/queries_sql";
import { getCompanyByMemberUserId } from "@/features/companies/queries/membership-queries_sql";
import { getJobById } from "@/features/jobs/queries/queries_sql";
import { getDb } from "@/shared/db";
import { authMiddleware } from "@/shared/middleware";

const batchIdSchema = z.object({ batchId: z.string().uuid() });

export const getBatchOverview = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(zodValidator(batchIdSchema))
  .handler(async ({ data, context }) => {
    const db = getDb();

    const [batch, company] = await Promise.all([
      getBatchDetail(db, { id: data.batchId }),
      getCompanyByMemberUserId(db, { userId: context.userId }),
    ]);
    if (!batch) {
      return null;
    }
    if (!company) {
      throw new Error("Not authorized to view this batch");
    }

    const [job, reports, interviews] = await Promise.all([
      getJobById(db, { id: batch.jobId }),
      getReportsByBatchId(db, { batchId: data.batchId }),
      getInterviewsByBatchWithCandidate(db, { batchId: data.batchId }),
    ]);
    if (!job || job.companyId !== company.id) {
      throw new Error("Not authorized to view this batch");
    }

    return {
      batch,
      reports,
      interviews,
    };
  });
