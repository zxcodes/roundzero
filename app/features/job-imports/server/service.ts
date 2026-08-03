import type { Sql } from "postgres";

import { dismissCompanyJobImportPrompt } from "@/features/companies/queries/queries_sql";
import { readCompanyEntitlements } from "@/features/entitlements/server/enforcement";
import { getMissingPublishFields } from "@/features/jobs/publish-readiness";
import { asSqlTransaction } from "@/shared/db-transaction";
import { ExpectedError } from "@/shared/expected-error";

import {
  deleteExpiredJobImportBatches,
  finalizeJobImportBatch,
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
  lockJobImportCompany,
  reserveJobImportEnrichmentAttempts,
  type reserveJobImportEnrichmentAttemptsRow,
  type updateJobImportItemEnrichmentRow,
  updateJobImportItemEnrichment,
  updateReadyJobImportItem,
  type updateReadyJobImportItemRow,
} from "../queries/queries_sql";
import {
  type JobImportCandidate,
  type EditableJobImportPayload,
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
  | updateJobImportItemEnrichmentRow
  | reserveJobImportEnrichmentAttemptsRow
  | updateReadyJobImportItemRow;

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
    revision: row.revision,
    status: row.status,
    job: candidate.job,
    warnings: candidate.warnings,
    inferredFields: candidate.inferredFields,
    error: row.error,
    importedJobId: row.importedJobId,
  });
}

async function loadJobImportPreviewFromDb(args: {
  db: Sql;
  companyId: string;
  batchId: string;
}): Promise<JobImportPreview | null> {
  const batch = await getJobImportBatchForCompany(args.db, {
    id: args.batchId,
    companyId: args.companyId,
  });
  if (!batch) return null;
  const items = await listJobImportItemsForCompany(args.db, {
    batchId: args.batchId,
    companyId: args.companyId,
  });
  return {
    batchId: batch.id,
    status: batch.status === "completed" ? "completed" : "ready",
    sourcePlatform: jobImportSourcePlatformSchema.parse(batch.sourceKind),
    sourceLabel: batch.sourceLabel,
    items: items.map(toItemResponse),
  };
}

export async function createJobImportPreview(args: {
  db: Sql;
  companyId: string;
  userId: string;
  sourcePlatform: JobImportSourcePlatform;
  sourceLabel: string;
  candidates: JobImportCandidate[];
}): Promise<JobImportPreview> {
  const startedAt = Date.now();
  const result = await args.db.begin(async (transactionHandle) => {
    const transaction = asSqlTransaction(transactionHandle);
    await deleteExpiredJobImportBatches(transaction, { companyId: args.companyId });
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

  const preview: JobImportPreview = {
    batchId: result.batch.id,
    status: "ready",
    sourcePlatform: args.sourcePlatform,
    sourceLabel: args.sourceLabel,
    items: result.itemRows.map(toItemResponse),
  };
  console.info(
    JSON.stringify({
      event: "job_import.preview",
      companyId: args.companyId,
      batchId: preview.batchId,
      source: args.sourcePlatform,
      items: preview.items.length,
      latencyMs: Date.now() - startedAt,
    }),
  );
  return preview;
}

export async function loadJobImportPreview(args: {
  db: Sql;
  companyId: string;
  batchId: string;
}): Promise<JobImportPreview | null> {
  return loadJobImportPreviewFromDb(args);
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
  const startedAt = Date.now();
  const enrichmentToken = crypto.randomUUID();
  const selected = await args.db.begin(async (transactionHandle) => {
    const transaction = asSqlTransaction(transactionHandle);
    const batch = await getJobImportBatchForUpdate(transaction, {
      id: args.batchId,
      companyId: args.companyId,
    });
    if (!batch) throw new ExpectedError("not_found", "Job import not found.");
    if (batch.status !== "ready")
      throw new ExpectedError(
        "invalid_state",
        "This job import is already complete and cannot be enriched.",
      );
    await lockJobImportCompany(transaction, { id: args.companyId });
    return reserveJobImportEnrichmentAttempts(transaction, {
      batchId: args.batchId,
      companyId: args.companyId,
      itemIdsCsv: args.itemIds.join(","),
      enrichmentToken,
    });
  });
  if (selected.length === 0) {
    throw new ExpectedError(
      "invalid_state",
      "No enrichment attempts were reserved. Each job can be enriched twice, with a company limit of 100 attempts per 24 hours; choose eligible ready jobs or try again later.",
    );
  }

  const enrichments = await mapWithConcurrency(selected, 3, async (row) => {
    const enriched = await enrichJobImportCandidate(parseStoredCandidate(row));
    return { row, enriched };
  });
  await args.db.begin(async (transactionHandle) => {
    const transaction = asSqlTransaction(transactionHandle);
    const batch = await getJobImportBatchForUpdate(transaction, {
      id: args.batchId,
      companyId: args.companyId,
    });
    if (!batch || batch.status !== "ready") return;
    let applied = 0;
    let unavailable = 0;
    for (const { row, enriched } of enrichments) {
      const updated = await updateJobImportItemEnrichment(transaction, {
        id: row.id,
        batchId: args.batchId,
        enrichmentToken,
        expectedRevision: row.revision,
        normalizedPayload: enriched.job,
        warnings: enriched.warnings,
        inferredFields: enriched.inferredFields,
      });
      if (updated) {
        applied += 1;
        if (enriched.warnings.some((warning) => warning.code === "enrichment_unavailable")) {
          unavailable += 1;
        }
      }
    }
    console.info(
      JSON.stringify({
        event: "job_import.enrichment_result",
        companyId: args.companyId,
        batchId: args.batchId,
        reserved: selected.length,
        applied,
        unavailable,
        stale: selected.length - applied,
      }),
    );
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
  const preview: JobImportPreview = {
    batchId: args.batchId,
    status: batch.status === "completed" ? "completed" : "ready",
    sourcePlatform: jobImportSourcePlatformSchema.parse(batch.sourceKind),
    sourceLabel: batch.sourceLabel,
    items: items.map(toItemResponse),
  };
  console.info(
    JSON.stringify({
      event: "job_import.enrichment",
      companyId: args.companyId,
      batchId: args.batchId,
      attempted: selected.length,
      latencyMs: Date.now() - startedAt,
    }),
  );
  return preview;
}

export async function updateJobImportItems(args: {
  db: Sql;
  companyId: string;
  batchId: string;
  items: Array<{ id: string; expectedRevision: number; job: EditableJobImportPayload }>;
}): Promise<JobImportPreview> {
  return args.db.begin(async (transactionHandle) => {
    const transaction = asSqlTransaction(transactionHandle);
    const batch = await getJobImportBatchForUpdate(transaction, {
      id: args.batchId,
      companyId: args.companyId,
    });
    if (!batch) throw new ExpectedError("not_found", "Job import not found.");
    if (batch.status !== "ready") {
      throw new ExpectedError("invalid_state", "Only an open job import can be edited.");
    }
    const storedItems = await listJobImportItemsForCompany(transaction, {
      batchId: args.batchId,
      companyId: args.companyId,
    });
    const storedById = new Map(storedItems.map((item) => [item.id, item]));
    for (const edit of args.items) {
      const existing = storedById.get(edit.id);
      if (!existing)
        throw new ExpectedError("not_found", `Job import item ${edit.id} was not found.`);
      if (existing.status !== "ready") {
        throw new ExpectedError(
          "invalid_state",
          `Job import item ${edit.id} is no longer editable.`,
        );
      }
      if (Number(existing.revision) !== edit.expectedRevision) {
        throw new ExpectedError(
          "invalid_state",
          `Job import item ${edit.id} changed since you opened it. Refresh the import and reapply your edit.`,
        );
      }
      const candidate = parseStoredCandidate(existing);
      const inferredFields = candidate.inferredFields.filter(
        (field) => JSON.stringify(candidate.job[field]) === JSON.stringify(edit.job[field]),
      );
      const updated = await updateReadyJobImportItem(transaction, {
        id: edit.id,
        batchId: args.batchId,
        companyId: args.companyId,
        expectedRevision: String(edit.expectedRevision),
        normalizedPayload: { ...candidate.job, ...edit.job },
        warnings: candidate.warnings,
        inferredFields,
      });
      if (!updated) {
        throw new ExpectedError(
          "invalid_state",
          `Job import item ${edit.id} changed while it was being saved. Refresh and try again.`,
        );
      }
    }
    const preview = await loadJobImportPreviewFromDb({ ...args, db: transaction });
    if (!preview) throw new ExpectedError("not_found", "Job import not found.");
    return preview;
  });
}

export async function importSelectedJobDrafts(args: {
  db: Sql;
  companyId: string;
  batchId: string;
  itemIds: string[];
}): Promise<{
  imported: Array<{
    itemId: string;
    jobId: string;
    title: string;
    missingFields: ReturnType<typeof getMissingPublishFields>;
  }>;
  skipped: Array<{ itemId: string; title: string | null; reason: string }>;
  preview: JobImportPreview;
}> {
  const startedAt = Date.now();
  const result = await args.db.begin(async (transactionHandle) => {
    const transaction = asSqlTransaction(transactionHandle);
    const batch = await getJobImportBatchForUpdate(transaction, {
      id: args.batchId,
      companyId: args.companyId,
    });
    if (!batch) throw new ExpectedError("not_found", "Job import not found.");
    if (batch.status === "completed") {
      const completedItems = await listJobImportItemsForCompany(transaction, {
        batchId: args.batchId,
        companyId: args.companyId,
      });
      const imported = completedItems.flatMap((row) => {
        if (row.status !== "imported" || !row.importedJobId) return [];
        const job = parseStoredCandidate(row).job;
        return [
          {
            itemId: row.id,
            jobId: row.importedJobId,
            title: job.title,
            missingFields: getMissingPublishFields(job),
          },
        ];
      });
      const skipped = completedItems.flatMap((row) =>
        row.status === "duplicate" || row.status === "failed"
          ? [
              {
                itemId: row.id,
                title: parseStoredCandidate(row).job.title,
                reason: row.error ?? "This job was skipped.",
              },
            ]
          : [],
      );
      const preview = await loadJobImportPreviewFromDb({ ...args, db: transaction });
      if (!preview) throw new ExpectedError("not_found", "Job import not found.");
      return {
        imported,
        skipped,
        preview,
      };
    }

    const selected = await listSelectedJobImportItemsForCompany(transaction, {
      batchId: args.batchId,
      companyId: args.companyId,
      itemIdsCsv: args.itemIds.join(","),
    });
    const entitlements = await readCompanyEntitlements(transaction, args.companyId);
    const imported: Array<{
      itemId: string;
      jobId: string;
      title: string;
      missingFields: ReturnType<typeof getMissingPublishFields>;
    }> = [];
    const skipped: Array<{ itemId: string; title: string | null; reason: string }> = [];

    for (const row of selected) {
      const candidate = parseStoredCandidate(row);
      const job = candidate.job;

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
    for (const itemId of args.itemIds) {
      if (!selectedIds.has(itemId)) {
        skipped.push({
          itemId,
          title: null,
          reason: "This job is unavailable or already imported.",
        });
      }
    }

    await finalizeJobImportBatch(transaction, { batchId: args.batchId });
    if (imported.length > 0) {
      await dismissCompanyJobImportPrompt(transaction, { id: args.companyId });
    }
    const preview = await loadJobImportPreviewFromDb({ ...args, db: transaction });
    if (!preview) throw new ExpectedError("not_found", "Job import not found.");
    return { imported, skipped, preview };
  });
  console.info(
    JSON.stringify({
      event: "job_import.import",
      companyId: args.companyId,
      batchId: args.batchId,
      imported: result.imported.length,
      skipped: result.skipped.length,
      latencyMs: Date.now() - startedAt,
    }),
  );
  return result;
}
