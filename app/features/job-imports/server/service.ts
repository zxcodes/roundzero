import type { Sql } from "postgres";

import { dismissCompanyJobImportPrompt } from "@/features/companies/queries/queries_sql";
import { readCompanyEntitlements } from "@/features/entitlements/server/enforcement";
import { getMissingPublishFields } from "@/features/jobs/publish-readiness";
import { asSqlTransaction } from "@/shared/db-transaction";
import { ExpectedError } from "@/shared/expected-error";

import {
  completeJobImportBatch,
  createImportedJob,
  createJobImportBatch,
  createJobImportItem,
  type createJobImportItemRow,
  getJobImportBatchForCompany,
  getJobImportBatchForUpdate,
  listJobImportItemsForCompany,
  type listJobImportItemsForCompanyRow,
  listSelectedJobImportItemsForCompany,
  type listSelectedJobImportItemsForCompanyRow,
  markJobImportItemDuplicate,
  markJobImportItemImported,
  type updateJobImportItemEnrichmentRow,
  updateJobImportItemEnrichment,
} from "../queries/queries_sql";
import {
  type JobImportCandidate,
  type JobImportItemOverride,
  jobImportCandidateSchema,
  type JobImportItemResponse,
  jobImportItemResponseSchema,
  type JobImportPreview,
  type JobImportSourcePlatform,
  jobImportSourcePlatformSchema,
} from "../schemas";
import { enrichJobImportCandidate } from "./enrichment";

type ImportItemRow =
  | createJobImportItemRow
  | listJobImportItemsForCompanyRow
  | listSelectedJobImportItemsForCompanyRow
  | updateJobImportItemEnrichmentRow;

function parseStoredCandidate(row: ImportItemRow): JobImportCandidate {
  return jobImportCandidateSchema.parse({
    job: row.normalizedPayload,
    warnings: row.warnings,
    inferredFields: row.inferredFields,
  });
}

function toItemResponse(row: ImportItemRow): JobImportItemResponse {
  const candidate = parseStoredCandidate(row);
  return jobImportItemResponseSchema.parse({
    id: row.id,
    status: row.status,
    job: candidate.job,
    warnings: candidate.warnings,
    inferredFields: candidate.inferredFields,
    error: row.error,
    importedJobId: row.importedJobId,
  });
}

export async function createJobImportPreview(args: {
  db: Sql;
  companyId: string;
  userId: string;
  sourcePlatform: JobImportSourcePlatform;
  sourceLabel: string;
  candidates: JobImportCandidate[];
}): Promise<JobImportPreview> {
  const result = await args.db.begin(async (transactionHandle) => {
    const transaction = asSqlTransaction(transactionHandle);
    const batch = await createJobImportBatch(transaction, {
      companyId: args.companyId,
      createdBy: args.userId,
      sourceKind: args.sourcePlatform,
      sourceLabel: args.sourceLabel,
      discoveredCount: args.candidates.length,
    });
    if (!batch) throw new Error("Failed to create job import batch");

    const itemRows = await Promise.all(
      args.candidates.map((candidate) =>
        createJobImportItem(transaction, {
          batchId: batch.id,
          sourcePlatform: args.sourcePlatform,
          sourceExternalId: candidate.job.externalId,
          sourceUrl: candidate.job.sourceUrl,
          sourceUpdatedAt: candidate.job.sourceUpdatedAt
            ? new Date(candidate.job.sourceUpdatedAt)
            : null,
          normalizedPayload: candidate.job,
          warnings: candidate.warnings,
          inferredFields: candidate.inferredFields,
        }),
      ),
    );
    if (itemRows.some((row) => row === null)) throw new Error("Failed to stage imported jobs");
    return { batch, itemRows: itemRows.filter((row) => row !== null) };
  });

  return {
    batchId: result.batch.id,
    sourcePlatform: args.sourcePlatform,
    sourceLabel: args.sourceLabel,
    items: result.itemRows.map(toItemResponse),
  };
}

export async function loadJobImportPreview(args: {
  db: Sql;
  companyId: string;
  batchId: string;
}): Promise<JobImportPreview | null> {
  const [batch, items] = await Promise.all([
    getJobImportBatchForCompany(args.db, { id: args.batchId, companyId: args.companyId }),
    listJobImportItemsForCompany(args.db, {
      batchId: args.batchId,
      companyId: args.companyId,
    }),
  ]);
  if (!batch) return null;
  return {
    batchId: batch.id,
    sourcePlatform: jobImportSourcePlatformSchema.parse(batch.sourceKind),
    sourceLabel: batch.sourceLabel,
    items: items.map(toItemResponse),
  };
}

async function mapWithConcurrency<T, R>(
  values: T[],
  concurrency: number,
  mapper: (value: T) => Promise<R>,
): Promise<R[]> {
  const results = Array.from<R>({ length: values.length });
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(concurrency, values.length) }, async () => {
    while (nextIndex < values.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(values[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

export async function enrichSelectedJobImportItems(args: {
  db: Sql;
  companyId: string;
  batchId: string;
  itemIds: string[];
}): Promise<JobImportPreview> {
  const selected = await listSelectedJobImportItemsForCompany(args.db, {
    batchId: args.batchId,
    companyId: args.companyId,
    itemIdsCsv: args.itemIds.join(","),
  });
  if (selected.length === 0) {
    throw new ExpectedError("not_found", "No importable jobs were selected.");
  }

  await mapWithConcurrency(selected, 3, async (row) => {
    const enriched = await enrichJobImportCandidate(parseStoredCandidate(row));
    const updated = await updateJobImportItemEnrichment(args.db, {
      id: row.id,
      normalizedPayload: enriched.job,
      warnings: enriched.warnings,
      inferredFields: enriched.inferredFields,
    });
    if (!updated) throw new Error(`Failed to enrich import item ${row.id}`);
    return updated;
  });

  const items = await listJobImportItemsForCompany(args.db, {
    batchId: args.batchId,
    companyId: args.companyId,
  });
  const batch = await getJobImportBatchForCompany(args.db, {
    id: args.batchId,
    companyId: args.companyId,
  });
  if (!batch) throw new ExpectedError("not_found", "Job import not found.");
  return {
    batchId: args.batchId,
    sourcePlatform: jobImportSourcePlatformSchema.parse(batch.sourceKind),
    sourceLabel: batch.sourceLabel,
    items: items.map(toItemResponse),
  };
}

export async function importSelectedJobDrafts(args: {
  db: Sql;
  companyId: string;
  batchId: string;
  items: JobImportItemOverride[];
}): Promise<{
  imported: Array<{
    itemId: string;
    jobId: string;
    title: string;
    missingFields: ReturnType<typeof getMissingPublishFields>;
  }>;
  skipped: Array<{ itemId: string; title: string | null; reason: string }>;
}> {
  return args.db.begin(async (transactionHandle) => {
    const transaction = asSqlTransaction(transactionHandle);
    const batch = await getJobImportBatchForUpdate(transaction, {
      id: args.batchId,
      companyId: args.companyId,
    });
    if (!batch) throw new ExpectedError("not_found", "Job import not found.");
    if (batch.status === "completed") {
      throw new ExpectedError("invalid_state", "This job import has already been completed.");
    }

    const itemIds = args.items.map((item) => item.id);
    const selected = await listSelectedJobImportItemsForCompany(transaction, {
      batchId: args.batchId,
      companyId: args.companyId,
      itemIdsCsv: itemIds.join(","),
    });
    const overrides = new Map(args.items.map((item) => [item.id, item]));
    const entitlements = await readCompanyEntitlements(transaction, args.companyId);
    const imported: Array<{
      itemId: string;
      jobId: string;
      title: string;
      missingFields: ReturnType<typeof getMissingPublishFields>;
    }> = [];
    const skipped: Array<{ itemId: string; title: string | null; reason: string }> = [];

    for (const row of selected) {
      const override = overrides.get(row.id);
      if (!override) continue;
      const candidate = parseStoredCandidate(row);
      const job = {
        ...candidate.job,
        workplaceType: override.workplaceType,
        employmentType: override.employmentType,
        experienceLevel: override.experienceLevel,
      };

      const importedJob = await createImportedJob(transaction, {
        companyId: args.companyId,
        title: job.title,
        description: job.description,
        requirements: job.requirements,
        location: job.location,
        workplaceType: job.workplaceType,
        employmentType: job.employmentType,
        experienceLevel: job.experienceLevel,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        salaryCurrency: job.salaryCurrency,
        headcount: job.headcount,
        finalReportTarget: entitlements.reports.defaultTarget,
        expiresAt: job.expiresAt ? new Date(job.expiresAt) : null,
        sourcePlatform: row.sourcePlatform,
        sourceExternalId: row.sourceExternalId,
        sourceUrl: row.sourceUrl,
        sourceUpdatedAt: row.sourceUpdatedAt,
        importBatchId: args.batchId,
      });
      if (!importedJob) {
        const reason = "This source job has already been imported.";
        await markJobImportItemDuplicate(transaction, { id: row.id });
        skipped.push({ itemId: row.id, title: job.title, reason });
        continue;
      }

      await markJobImportItemImported(transaction, { id: row.id, importedJobId: importedJob.id });
      imported.push({
        itemId: row.id,
        jobId: importedJob.id,
        title: job.title,
        missingFields: getMissingPublishFields(job),
      });
    }

    const selectedIds = new Set(selected.map((item) => item.id));
    for (const requested of args.items) {
      if (!selectedIds.has(requested.id)) {
        skipped.push({
          itemId: requested.id,
          title: null,
          reason: "This job is unavailable or already imported.",
        });
      }
    }

    await completeJobImportBatch(transaction, { batchId: args.batchId });
    if (imported.length > 0) {
      await dismissCompanyJobImportPrompt(transaction, { id: args.companyId });
    }
    return { imported, skipped };
  });
}
