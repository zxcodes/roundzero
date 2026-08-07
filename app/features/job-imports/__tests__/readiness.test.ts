import { describe, expect, it } from "vitest";

import {
  filterJobImportItems,
  getJobImportMissingFields,
  getJobImportReadinessCounts,
  summarizeJobImportSuggestions,
  type JobImportMapping,
} from "../readiness";
import type { JobImportItemResponse, JobImportPreview } from "../schemas";

const mapping: JobImportMapping = {
  workplaceType: "remote",
  employmentType: "full_time",
  experienceLevel: "senior",
};

const item = (overrides?: Partial<JobImportItemResponse>): JobImportItemResponse => ({
  id: crypto.randomUUID(),
  revision: 0,
  status: "ready",
  job: {
    externalId: crypto.randomUUID(),
    sourceUrl: "https://example.com/jobs/1",
    sourceUpdatedAt: null,
    title: "Platform Engineer",
    description: "Build the platform.",
    location: "Remote",
    workplaceType: "remote",
    employmentType: "full_time",
    experienceLevel: "senior",
    salaryMin: null,
    salaryMax: null,
    salaryCurrency: "USD",
    headcount: null,
    expiresAt: null,
  },
  warnings: [],
  inferredFields: [],
  error: null,
  importedJobId: null,
  ...overrides,
});

describe("job import readiness", () => {
  it("reports every missing publish field", () => {
    expect(
      getJobImportMissingFields({
        workplaceType: null,
        employmentType: null,
        experienceLevel: null,
      }),
    ).toEqual(["workplaceType", "employmentType", "experienceLevel"]);
    expect(getJobImportMissingFields(mapping)).toEqual([]);
  });

  it("counts ready, incomplete, and duplicate rows", () => {
    const ready = item();
    const incomplete = item();
    const duplicate = item({ status: "duplicate" });
    expect(
      getJobImportReadinessCounts([ready, incomplete, duplicate], {
        [ready.id]: mapping,
        [incomplete.id]: { ...mapping, experienceLevel: null },
        [duplicate.id]: mapping,
      }),
    ).toEqual({ ready: 1, needsReview: 1, duplicates: 1, newJobs: 2 });
  });

  it("filters by readiness and title or location", () => {
    const ready = item();
    const incomplete = item({
      job: { ...item().job, title: "Product Designer", location: "London" },
    });
    const mappings = {
      [ready.id]: mapping,
      [incomplete.id]: { ...mapping, experienceLevel: null },
    };
    expect(
      filterJobImportItems({
        items: [ready, incomplete],
        mappings,
        filter: "needs_review",
        search: "London",
      }),
    ).toEqual([incomplete]);
  });

  it("summarizes newly suggested fields", () => {
    const beforeItem = item({ job: { ...item().job, experienceLevel: null } });
    const afterItem = {
      ...beforeItem,
      job: { ...beforeItem.job, experienceLevel: "senior" as const },
      inferredFields: ["experienceLevel" as const],
    };
    const before: JobImportPreview = {
      batchId: crypto.randomUUID(),
      status: "ready",
      sourcePlatform: "generic",
      sourceLabel: "example.com",
      items: [beforeItem],
    };
    const after = { ...before, items: [afterItem] };
    expect(
      summarizeJobImportSuggestions({
        before,
        after,
        selectedIds: new Set([beforeItem.id]),
        mappings: { [beforeItem.id]: { ...mapping, experienceLevel: null } },
      }),
    ).toEqual({ jobsChanged: 1, fieldsSuggested: 1, stillNeedAttention: 0 });
  });
});
