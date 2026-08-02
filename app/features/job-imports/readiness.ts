import { getMissingPublishFields } from "@/features/jobs/publish-readiness";
import type { EmploymentType, ExperienceLevel, WorkplaceType } from "@/shared/enums";

import type { JobImportItemResponse, JobImportPreview } from "./schemas";

export type JobImportMapping = {
  workplaceType: WorkplaceType | null;
  employmentType: EmploymentType | null;
  experienceLevel: ExperienceLevel | null;
};

export type JobImportReviewFilter = "all" | "needs_review" | "ready" | "duplicate";

export function initialJobImportMappings(
  preview: JobImportPreview,
): Record<string, JobImportMapping> {
  return Object.fromEntries(
    preview.items.map((item) => [
      item.id,
      {
        workplaceType: item.job.workplaceType,
        employmentType: item.job.employmentType,
        experienceLevel: item.job.experienceLevel,
      },
    ]),
  );
}

export function getJobImportMissingFields(mapping: JobImportMapping | undefined) {
  return getMissingPublishFields({
    workplaceType: mapping?.workplaceType ?? null,
    employmentType: mapping?.employmentType ?? null,
    experienceLevel: mapping?.experienceLevel ?? null,
  });
}

export function getJobImportReviewState(
  item: JobImportItemResponse,
  mapping: JobImportMapping | undefined,
): "ready" | "needs_review" | "duplicate" | "failed" | "imported" {
  if (item.status !== "ready") return item.status;
  return getJobImportMissingFields(mapping).length > 0 ? "needs_review" : "ready";
}

export function getJobImportReadinessCounts(
  items: JobImportItemResponse[],
  mappings: Record<string, JobImportMapping>,
) {
  let ready = 0;
  let needsReview = 0;
  let duplicates = 0;
  for (const item of items) {
    const state = getJobImportReviewState(item, mappings[item.id]);
    if (state === "ready") ready += 1;
    if (state === "needs_review") needsReview += 1;
    if (state === "duplicate") duplicates += 1;
  }
  return { ready, needsReview, duplicates, newJobs: ready + needsReview };
}

export function filterJobImportItems(args: {
  items: JobImportItemResponse[];
  mappings: Record<string, JobImportMapping>;
  filter: JobImportReviewFilter;
  search: string;
}): JobImportItemResponse[] {
  const query = args.search.trim().toLowerCase();
  return args.items.filter((item) => {
    const state = getJobImportReviewState(item, args.mappings[item.id]);
    if (args.filter === "duplicate" && state !== "duplicate") return false;
    if (args.filter === "ready" && state !== "ready") return false;
    if (args.filter === "needs_review" && state !== "needs_review") return false;
    if (args.filter === "all" && state === "imported") return false;
    if (!query) return true;
    return `${item.job.title} ${item.job.location ?? ""}`.toLowerCase().includes(query);
  });
}

export function summarizeJobImportSuggestions(args: {
  before: JobImportPreview;
  after: JobImportPreview;
  selectedIds: Set<string>;
  mappings: Record<string, JobImportMapping>;
}) {
  const beforeById = new Map(args.before.items.map((item) => [item.id, item]));
  let jobsChanged = 0;
  let fieldsSuggested = 0;
  let stillNeedAttention = 0;

  for (const item of args.after.items) {
    if (!args.selectedIds.has(item.id)) continue;
    const previous = beforeById.get(item.id);
    const addedFields = item.inferredFields.filter(
      (field) => !previous?.inferredFields.includes(field),
    );
    if (addedFields.length > 0) jobsChanged += 1;
    fieldsSuggested += addedFields.length;
    const mapping = args.mappings[item.id];
    const nextMapping = {
      workplaceType: mapping?.workplaceType ?? item.job.workplaceType,
      employmentType: mapping?.employmentType ?? item.job.employmentType,
      experienceLevel: mapping?.experienceLevel ?? item.job.experienceLevel,
    };
    if (getJobImportMissingFields(nextMapping).length > 0) stillNeedAttention += 1;
  }

  return { jobsChanged, fieldsSuggested, stillNeedAttention };
}
