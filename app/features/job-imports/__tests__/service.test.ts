import { describe, expect, it } from "vitest";

import { getTestDb, seedCompany } from "@/shared/__tests__/test-utils";

import type { JobImportCandidate } from "../schemas";
import {
  createJobImportPreview,
  enrichSelectedJobImportItems,
  importSelectedJobDrafts,
} from "../server/service";

const sql = getTestDb();

const candidate: JobImportCandidate = {
  job: {
    externalId: "lever-job-123",
    sourceUrl: "https://jobs.lever.co/acme/lever-job-123",
    sourceUpdatedAt: "2026-08-01T10:00:00.000Z",
    title: "Platform Engineer",
    description: "Build and operate the platform.",
    requirements: ["TypeScript", "Distributed systems"],
    location: "Remote",
    workplaceType: "remote",
    employmentType: "full_time",
    experienceLevel: "senior",
    salaryMin: 100000,
    salaryMax: 150000,
    salaryCurrency: "USD",
    headcount: 2,
    expiresAt: null,
  },
  warnings: [],
  inferredFields: [],
};

describe("job import service", () => {
  it("prepares multiple selected job IDs", async () => {
    const { company, owner } = await seedCompany();
    const preview = await createJobImportPreview({
      db: sql,
      companyId: company.id,
      userId: owner.id,
      sourcePlatform: "lever",
      sourceLabel: "Lever · acme",
      candidates: [
        candidate,
        {
          ...candidate,
          job: { ...candidate.job, externalId: "lever-job-456", title: "Product Engineer" },
        },
      ],
    });

    const prepared = await enrichSelectedJobImportItems({
      db: sql,
      companyId: company.id,
      batchId: preview.batchId,
      itemIds: preview.items.map((item) => item.id),
    });

    expect(prepared.items).toHaveLength(2);
    expect(prepared.items.every((item) => item.status === "ready")).toBe(true);
  });

  it("creates a draft with provenance and detects the same source as a duplicate", async () => {
    const { company, owner } = await seedCompany();
    const preview = await createJobImportPreview({
      db: sql,
      companyId: company.id,
      userId: owner.id,
      sourcePlatform: "lever",
      sourceLabel: "Lever · acme",
      candidates: [candidate],
    });

    expect(preview.items[0].status).toBe("ready");
    const result = await importSelectedJobDrafts({
      db: sql,
      companyId: company.id,
      batchId: preview.batchId,
      items: [
        {
          id: preview.items[0].id,
          workplaceType: "remote",
          employmentType: "full_time",
          experienceLevel: "senior",
        },
      ],
    });

    expect(result).toMatchObject({ imported: [{ itemId: preview.items[0].id }], skipped: [] });
    const [job] = await sql`
      SELECT status, source_platform, source_external_id, source_url, import_batch_id
      FROM jobs
      WHERE id = ${result.imported[0].jobId}
    `;
    expect(job).toMatchObject({
      status: "draft",
      source_platform: "lever",
      source_external_id: "lever-job-123",
      source_url: "https://jobs.lever.co/acme/lever-job-123",
      import_batch_id: preview.batchId,
    });

    const duplicatePreview = await createJobImportPreview({
      db: sql,
      companyId: company.id,
      userId: owner.id,
      sourcePlatform: "lever",
      sourceLabel: "Lever · acme",
      candidates: [candidate],
    });
    expect(duplicatePreview.items[0].status).toBe("duplicate");
  });

  it("creates an incomplete draft without requiring classifications", async () => {
    const { company, owner } = await seedCompany();
    const preview = await createJobImportPreview({
      db: sql,
      companyId: company.id,
      userId: owner.id,
      sourcePlatform: "lever",
      sourceLabel: "Lever · acme",
      candidates: [candidate],
    });

    const result = await importSelectedJobDrafts({
      db: sql,
      companyId: company.id,
      batchId: preview.batchId,
      items: [
        {
          id: preview.items[0].id,
          workplaceType: null,
          employmentType: null,
          experienceLevel: null,
        },
      ],
    });

    expect(result.imported[0]).toMatchObject({
      title: "Platform Engineer",
      missingFields: ["workplaceType", "employmentType", "experienceLevel"],
    });
    const [job] = await sql`
      SELECT status, workplace_type, employment_type, experience_level
      FROM jobs
      WHERE id = ${result.imported[0].jobId}
    `;
    expect(job).toMatchObject({
      status: "draft",
      workplace_type: null,
      employment_type: null,
      experience_level: null,
    });
  });
});
