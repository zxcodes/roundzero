import { describe, expect, it } from "vitest";

import { getTestDb, seedCompany } from "@/shared/__tests__/test-utils";
import { asSqlTransaction } from "@/shared/db-transaction";

import {
  lockJobImportCompany,
  reserveJobImportEnrichmentAttempts,
  updateJobImportItemEnrichment,
} from "../queries/queries_sql";
import type { JobImportCandidate } from "../schemas";
import {
  createJobImportPreview,
  enrichSelectedJobImportItems,
  importSelectedJobDrafts,
  loadJobImportPreview,
  updateJobImportItems,
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
      itemIds: [preview.items[0].id],
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
    const [updatedCompany] = await sql`
      SELECT job_import_prompt_dismissed_at
      FROM companies
      WHERE id = ${company.id}
    `;
    expect(updatedCompany.job_import_prompt_dismissed_at).toBeInstanceOf(Date);

    const duplicatePreview = await createJobImportPreview({
      db: sql,
      companyId: company.id,
      userId: owner.id,
      sourcePlatform: "lever",
      sourceLabel: "Lever · acme",
      candidates: [candidate],
    });
    expect(duplicatePreview.items[0].status).toBe("duplicate");
    const completedDuplicate = await importSelectedJobDrafts({
      db: sql,
      companyId: company.id,
      batchId: duplicatePreview.batchId,
      itemIds: [duplicatePreview.items[0].id],
    });
    expect(completedDuplicate).toMatchObject({
      imported: [],
      skipped: [{ itemId: duplicatePreview.items[0].id }],
      preview: { status: "completed" },
    });
    const duplicateRetry = await importSelectedJobDrafts({
      db: sql,
      companyId: company.id,
      batchId: duplicatePreview.batchId,
      itemIds: [duplicatePreview.items[0].id],
    });
    expect(duplicateRetry.skipped).toEqual([
      expect.objectContaining({ itemId: duplicatePreview.items[0].id }),
    ]);
  });

  it("imports persisted classifications without client overrides", async () => {
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
      itemIds: [preview.items[0].id],
    });

    expect(result.imported[0]).toMatchObject({
      title: "Platform Engineer",
      missingFields: [],
    });
    const [job] = await sql`
      SELECT status, workplace_type, employment_type, experience_level
      FROM jobs
      WHERE id = ${result.imported[0].jobId}
    `;
    expect(job).toMatchObject({
      status: "draft",
      workplace_type: "remote",
      employment_type: "full_time",
      experience_level: "senior",
    });
  });

  it("persists editable fields without allowing provenance replacement", async () => {
    const { company, owner } = await seedCompany();
    const preview = await createJobImportPreview({
      db: sql,
      companyId: company.id,
      userId: owner.id,
      sourcePlatform: "lever",
      sourceLabel: "Lever · acme",
      candidates: [candidate],
    });
    const edited = await updateJobImportItems({
      db: sql,
      companyId: company.id,
      batchId: preview.batchId,
      items: [
        {
          id: preview.items[0].id,
          expectedRevision: preview.items[0].revision,
          job: {
            description: candidate.job.description,
            requirements: candidate.job.requirements,
            location: candidate.job.location,
            workplaceType: candidate.job.workplaceType,
            employmentType: candidate.job.employmentType,
            experienceLevel: candidate.job.experienceLevel,
            salaryMin: candidate.job.salaryMin,
            salaryMax: candidate.job.salaryMax,
            salaryCurrency: candidate.job.salaryCurrency,
            headcount: candidate.job.headcount,
            expiresAt: candidate.job.expiresAt,
            title: "Edited title",
          },
        },
      ],
    });
    expect(edited.items[0].job).toMatchObject({
      title: "Edited title",
      externalId: "lever-job-123",
      sourceUrl: candidate.job.sourceUrl,
    });
  });

  it("rejects stale revisions and prevents stale enrichment from overwriting an edit", async () => {
    const { company, owner } = await seedCompany();
    const preview = await createJobImportPreview({
      db: sql,
      companyId: company.id,
      userId: owner.id,
      sourcePlatform: "lever",
      sourceLabel: "Lever · acme",
      candidates: [candidate],
    });
    const item = preview.items[0];
    const enrichmentToken = crypto.randomUUID();
    const reserved = await sql.begin(async (handle) => {
      const transaction = asSqlTransaction(handle);
      await lockJobImportCompany(transaction, { id: company.id });
      return reserveJobImportEnrichmentAttempts(transaction, {
        batchId: preview.batchId,
        companyId: company.id,
        itemIdsCsv: item.id,
        enrichmentToken,
      });
    });
    const editedJob = { ...item.job, title: "Human edit" };
    const edited = await updateJobImportItems({
      db: sql,
      companyId: company.id,
      batchId: preview.batchId,
      items: [{ id: item.id, expectedRevision: Number(reserved[0].revision), job: editedJob }],
    });
    await expect(
      updateJobImportItems({
        db: sql,
        companyId: company.id,
        batchId: preview.batchId,
        items: [{ id: item.id, expectedRevision: item.revision, job: item.job }],
      }),
    ).rejects.toThrow("changed since you opened it");
    const staleAiWrite = await updateJobImportItemEnrichment(sql, {
      id: item.id,
      batchId: preview.batchId,
      enrichmentToken,
      expectedRevision: reserved[0].revision,
      normalizedPayload: { ...item.job, title: "Stale AI" },
      warnings: [],
      inferredFields: [],
    });
    expect(staleAiWrite).toBeNull();
    expect(edited.items[0]).toMatchObject({ revision: 2, job: { title: "Human edit" } });
  });

  it("imports the latest persisted payload rather than client classifications", async () => {
    const { company, owner } = await seedCompany();
    const preview = await createJobImportPreview({
      db: sql,
      companyId: company.id,
      userId: owner.id,
      sourcePlatform: "lever",
      sourceLabel: "Lever · acme",
      candidates: [candidate],
    });
    await updateJobImportItems({
      db: sql,
      companyId: company.id,
      batchId: preview.batchId,
      items: [
        {
          id: preview.items[0].id,
          expectedRevision: preview.items[0].revision,
          job: {
            ...preview.items[0].job,
            title: "Latest persisted title",
            workplaceType: "hybrid",
          },
        },
      ],
    });
    const result = await importSelectedJobDrafts({
      db: sql,
      companyId: company.id,
      batchId: preview.batchId,
      itemIds: [preview.items[0].id],
    });
    const [job] =
      await sql`SELECT title, workplace_type FROM jobs WHERE id = ${result.imported[0].jobId}`;
    expect(job).toMatchObject({ title: "Latest persisted title", workplace_type: "hybrid" });
    expect(result.preview.status).toBe("completed");
  });

  it("keeps partial imports open and reconstructs a completed retry", async () => {
    const { company, owner } = await seedCompany();
    const preview = await createJobImportPreview({
      db: sql,
      companyId: company.id,
      userId: owner.id,
      sourcePlatform: "lever",
      sourceLabel: "Lever · acme",
      candidates: [
        candidate,
        { ...candidate, job: { ...candidate.job, externalId: "second", title: "Second" } },
      ],
    });
    await importSelectedJobDrafts({
      db: sql,
      companyId: company.id,
      batchId: preview.batchId,
      itemIds: [preview.items[0].id],
    });
    expect(
      (await loadJobImportPreview({ db: sql, companyId: company.id, batchId: preview.batchId }))
        ?.status,
    ).toBe("ready");
    const completed = await importSelectedJobDrafts({
      db: sql,
      companyId: company.id,
      batchId: preview.batchId,
      itemIds: [preview.items[1].id],
    });
    expect(
      (await loadJobImportPreview({ db: sql, companyId: company.id, batchId: preview.batchId }))
        ?.status,
    ).toBe("completed");
    const retry = await importSelectedJobDrafts({
      db: sql,
      companyId: company.id,
      batchId: preview.batchId,
      itemIds: [preview.items[1].id],
    });
    expect(retry.imported).toHaveLength(2);
    expect(retry.imported.map((item) => item.jobId)).toEqual(
      expect.arrayContaining([completed.imported[0].jobId]),
    );
  });

  it("expires stale partial imports without deleting imported drafts", async () => {
    const { company, owner } = await seedCompany();
    const preview = await createJobImportPreview({
      db: sql,
      companyId: company.id,
      userId: owner.id,
      sourcePlatform: "lever",
      sourceLabel: "Lever · old",
      candidates: [
        candidate,
        {
          ...candidate,
          job: { ...candidate.job, externalId: "lever-job-old-2", title: "Old second job" },
        },
      ],
    });
    const partial = await importSelectedJobDrafts({
      db: sql,
      companyId: company.id,
      batchId: preview.batchId,
      itemIds: [preview.items[0].id],
    });
    await sql`
      UPDATE job_import_batches
      SET created_at = now() - interval '31 days'
      WHERE id = ${preview.batchId}
    `;

    await createJobImportPreview({
      db: sql,
      companyId: company.id,
      userId: owner.id,
      sourcePlatform: "lever",
      sourceLabel: "Lever · new",
      candidates: [
        {
          ...candidate,
          job: { ...candidate.job, externalId: "lever-job-new", title: "New job" },
        },
      ],
    });

    const [oldBatch] = await sql`SELECT id FROM job_import_batches WHERE id = ${preview.batchId}`;
    const [draft] = await sql`
      SELECT import_batch_id
      FROM jobs
      WHERE id = ${partial.imported[0].jobId}
    `;
    expect(oldBatch).toBeUndefined();
    expect(draft.import_batch_id).toBeNull();
  });

  it("exclusively claims enrichment and atomically caps attempts per item", async () => {
    const { company, owner } = await seedCompany();
    const preview = await createJobImportPreview({
      db: sql,
      companyId: company.id,
      userId: owner.id,
      sourcePlatform: "lever",
      sourceLabel: "Lever · acme",
      candidates: [candidate],
    });
    const reserve = () =>
      sql.begin(async (handle) => {
        const transaction = asSqlTransaction(handle);
        await lockJobImportCompany(transaction, { id: company.id });
        return reserveJobImportEnrichmentAttempts(transaction, {
          batchId: preview.batchId,
          companyId: company.id,
          itemIdsCsv: preview.items[0].id,
          enrichmentToken: crypto.randomUUID(),
        });
      });

    const concurrent = await Promise.all([reserve(), reserve()]);
    expect(concurrent.flat()).toHaveLength(1);
    await expect(reserve()).resolves.toEqual([]);
    await sql`
      UPDATE job_import_items
      SET enrichment_claimed_at = now() - interval '16 minutes'
      WHERE id = ${preview.items[0].id}
    `;
    await expect(reserve()).resolves.toHaveLength(1);
    await expect(reserve()).resolves.toEqual([]);
    const [attempts] = await sql`
      SELECT enrichment_attempts
      FROM job_import_items
      WHERE id = ${preview.items[0].id}
    `;
    expect(attempts.enrichment_attempts).toBe(2);
  });
});
