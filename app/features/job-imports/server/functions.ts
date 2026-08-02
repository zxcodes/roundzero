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
} from "../schemas";
import { parseJobImportSource } from "./adapters";
import { parseJobImportCsv } from "./csv";
import { safeFetchImportSource } from "./safe-fetch";
import {
  createJobImportPreview,
  enrichSelectedJobImportItems,
  importSelectedJobDrafts,
  loadJobImportPreview,
} from "./service";
import { hydrateSmartRecruitersPostings } from "./smartrecruiters";
import { detectJobImportSource } from "./source-detector";

export const previewJobsFromUrl = createServerFn({ method: "POST" })
  .middleware([companyMiddleware])
  .validator(zodValidator(previewJobImportUrlSchema))
  .handler(async ({ data, context }) => {
    const source = detectJobImportSource(data.url);
    const response = await safeFetchImportSource(
      source.requestUrl,
      source.platform === "generic" ? "html" : "json",
    );
    const text =
      source.platform === "smartrecruiters"
        ? await hydrateSmartRecruitersPostings(response.text, response.finalUrl)
        : response.text;
    const candidates = parseJobImportSource({
      platform: source.platform,
      text,
      finalUrl: response.finalUrl,
    });
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
      items: data.items,
    }),
  );
