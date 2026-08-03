import { createServerFn } from "@tanstack/react-start";

import { getDb } from "@/shared/db";
import { companyMiddleware } from "@/shared/middleware";
import { zodValidator } from "@/shared/validation";

import {
  enrichSelectedJobImportsSchema,
  getJobImportPreviewSchema,
  importSelectedJobsSchema,
  previewJobImportCsvSchema,
  previewJobImportUrlSchema,
  updateJobImportItemsSchema,
} from "../schemas";
import { parseJobImportCsv } from "./csv";
import {
  createJobImportPreview,
  enrichSelectedJobImportItems,
  importSelectedJobDrafts,
  loadJobImportPreview,
  updateJobImportItems,
} from "./service";
import { detectJobImportSource } from "./source-detector";
import { loadJobImportCandidates } from "./source-loader";

export const previewJobsFromUrl = createServerFn({ method: "POST" })
  .middleware([companyMiddleware])
  .validator(zodValidator(previewJobImportUrlSchema))
  .handler(async ({ data, context }) => {
    const source = detectJobImportSource(data.url);
    const candidates = await loadJobImportCandidates(source);
    return createJobImportPreview({
      db: getDb(),
      companyId: context.company.id,
      userId: context.userId,
      sourcePlatform: source.platform,
      sourceLabel: source.label,
      candidates,
    });
  });

export const previewJobsFromCsv = createServerFn({ method: "POST" })
  .middleware([companyMiddleware])
  .validator(zodValidator(previewJobImportCsvSchema))
  .handler(async ({ data, context }) => {
    const candidates = await parseJobImportCsv(data.csv);
    return createJobImportPreview({
      db: getDb(),
      companyId: context.company.id,
      userId: context.userId,
      sourcePlatform: "csv",
      sourceLabel: data.fileName,
      candidates,
    });
  });

export const getJobImportPreview = createServerFn({ method: "GET" })
  .middleware([companyMiddleware])
  .validator(zodValidator(getJobImportPreviewSchema))
  .handler(async ({ data, context }) =>
    loadJobImportPreview({
      db: getDb(),
      companyId: context.company.id,
      batchId: data.batchId,
    }),
  );

export const saveJobImportItems = createServerFn({ method: "POST" })
  .middleware([companyMiddleware])
  .validator(zodValidator(updateJobImportItemsSchema))
  .handler(async ({ data, context }) =>
    updateJobImportItems({
      db: getDb(),
      companyId: context.company.id,
      batchId: data.batchId,
      items: data.items,
    }),
  );

export const enrichSelectedJobImports = createServerFn({ method: "POST" })
  .middleware([companyMiddleware])
  .validator(zodValidator(enrichSelectedJobImportsSchema))
  .handler(async ({ data, context }) =>
    enrichSelectedJobImportItems({
      db: getDb(),
      companyId: context.company.id,
      batchId: data.batchId,
      itemIds: data.itemIds,
    }),
  );

export const importSelectedJobs = createServerFn({ method: "POST" })
  .middleware([companyMiddleware])
  .validator(zodValidator(importSelectedJobsSchema))
  .handler(async ({ data, context }) =>
    importSelectedJobDrafts({
      db: getDb(),
      companyId: context.company.id,
      batchId: data.batchId,
      itemIds: data.itemIds,
    }),
  );
