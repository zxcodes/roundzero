import { describe, expect, it } from "vitest";

import { getTestDb, seedCandidateProfile, seedJob } from "@/shared/__tests__/test-utils";

import {
  getCandidateMatchFeed,
  hasReadyOpenJobMatchingProfile,
  listDigestCandidates,
  lockCandidateDigestMatches,
  markCandidateMatchViewed,
  upsertCandidateJobMatch,
} from "../queries_sql";

const sql = getTestDb();

describe("candidate match persistence", () => {
  it("reports whether at least one current open-job profile is ready", async () => {
    const { job } = await seedJob({ status: "open" });

    expect((await hasReadyOpenJobMatchingProfile(sql))?.ready).toBe(false);

    await sql`
      INSERT INTO job_matching_profiles (
        job_id, requested_source_hash, completed_source_hash, source_version,
        extraction_status, matching_profile, extraction_token
      ) VALUES (
        ${job.id}, 'job-v1', 'job-v1', 'v1', 'ready', ${sql.json({ facts: [] })}, ${crypto.randomUUID()}
      )
    `;

    expect((await hasReadyOpenJobMatchingProfile(sql))?.ready).toBe(true);

    await sql`
      UPDATE job_matching_profiles
      SET requested_source_hash = 'job-v2', updated_at = now()
      WHERE job_id = ${job.id}
    `;
    expect((await hasReadyOpenJobMatchingProfile(sql))?.ready).toBe(false);
  });

  it("preserves candidate interaction timestamps across reranks", async () => {
    const { user } = await seedCandidateProfile();
    const { job } = await seedJob({ status: "open" });
    const firstGeneration = crypto.randomUUID();
    const args = {
      candidateId: user.id,
      jobId: job.id,
      generationId: firstGeneration,
      candidateProfileSourceHash: "candidate-v1",
      jobProfileSourceHash: "job-v1",
      score: 88,
      band: "strong",
      reasons: [
        {
          candidateFactId: "candidate-react",
          jobFactId: "job-react",
          text: "React aligns with React.",
        },
        {
          candidateFactId: "candidate-ui",
          jobFactId: "job-ui",
          text: "UI systems aligns with UI systems.",
        },
      ],
      consideration: null,
      algorithmVersion: "algorithm-v1",
      thresholdVersion: "threshold-v1",
      promptVersion: "prompt-v1",
      model: "test-model",
    };
    const first = await upsertCandidateJobMatch(sql, args);
    await markCandidateMatchViewed(sql, { candidateId: user.id, jobId: job.id });
    const second = await upsertCandidateJobMatch(sql, {
      ...args,
      generationId: crypto.randomUUID(),
      score: 50,
      band: "potential",
    });

    expect(first?.firstStrongAt).toBeInstanceOf(Date);
    expect(second?.firstStrongAt?.getTime()).toBe(first?.firstStrongAt?.getTime());
    expect(second?.viewedAt).toBeInstanceOf(Date);
  });

  it("reads only the serving live generation", async () => {
    const { user } = await seedCandidateProfile();
    const { job } = await seedJob({ status: "open" });
    const generationId = crypto.randomUUID();
    await sql`
      INSERT INTO job_matching_profiles (
        job_id, requested_source_hash, completed_source_hash, source_version,
        extraction_status, matching_profile, extraction_token
      ) VALUES (
        ${job.id}, 'job-v1', 'job-v1', 'v1', 'ready', ${sql.json({ facts: [] })}, ${crypto.randomUUID()}
      )
    `;
    await upsertCandidateJobMatch(sql, {
      candidateId: user.id,
      jobId: job.id,
      generationId,
      candidateProfileSourceHash: "candidate-v1",
      jobProfileSourceHash: "job-v1",
      score: 80,
      band: "strong",
      reasons: [
        { candidateFactId: "one", jobFactId: "one", text: "One aligns." },
        { candidateFactId: "two", jobFactId: "two", text: "Two aligns." },
      ],
      consideration: null,
      algorithmVersion: "v1",
      thresholdVersion: "v1",
      promptVersion: "v1",
      model: "test",
    });
    await sql`
      UPDATE candidate_profiles
      SET serving_match_generation = ${generationId}
      WHERE user_id = ${user.id}
    `;

    expect(await getCandidateMatchFeed(sql, { userId: user.id })).toHaveLength(1);
    await sql`UPDATE jobs SET status = 'closed', updated_at = now() WHERE id = ${job.id}`;
    expect(await getCandidateMatchFeed(sql, { userId: user.id })).toHaveLength(0);
  });

  it("applies live-feed eligibility rules to digest matches", async () => {
    const { user } = await seedCandidateProfile();
    const { job } = await seedJob({ status: "open" });
    const generationId = crypto.randomUUID();
    await sql`
      INSERT INTO job_matching_profiles (
        job_id, requested_source_hash, completed_source_hash, source_version,
        extraction_status, matching_profile, extraction_token
      ) VALUES (
        ${job.id}, 'job-v1', 'job-v1', 'v1', 'ready', ${sql.json({ facts: [] })}, ${crypto.randomUUID()}
      )
    `;
    await upsertCandidateJobMatch(sql, {
      candidateId: user.id,
      jobId: job.id,
      generationId,
      candidateProfileSourceHash: "candidate-v1",
      jobProfileSourceHash: "job-v1",
      score: 90,
      band: "strong",
      reasons: [],
      consideration: null,
      algorithmVersion: "v1",
      thresholdVersion: "v1",
      promptVersion: "v1",
      model: "test",
    });
    await sql`
      UPDATE candidate_profiles
      SET serving_match_generation = ${generationId},
          match_alerts_enabled_at = now() - interval '1 minute'
      WHERE user_id = ${user.id}
    `;

    expect((await listDigestCandidates(sql)).map((row) => row.userId)).toContain(user.id);
    expect(
      await lockCandidateDigestMatches(sql, { candidateId: user.id, matchLimit: "10" }),
    ).toHaveLength(1);

    await sql`
      INSERT INTO applications (job_id, candidate_id, resume_key, metadata, status)
      VALUES (${job.id}, ${user.id}, 'resume.pdf', '{}', 'applied')
    `;
    expect((await listDigestCandidates(sql)).map((row) => row.userId)).not.toContain(user.id);
    expect(
      await lockCandidateDigestMatches(sql, { candidateId: user.id, matchLimit: "10" }),
    ).toHaveLength(0);

    await sql`DELETE FROM applications WHERE job_id = ${job.id} AND candidate_id = ${user.id}`;
    await sql`
      UPDATE job_matching_profiles
      SET requested_source_hash = 'job-v2', updated_at = now()
      WHERE job_id = ${job.id}
    `;
    expect((await listDigestCandidates(sql)).map((row) => row.userId)).not.toContain(user.id);
    expect(
      await lockCandidateDigestMatches(sql, { candidateId: user.id, matchLimit: "10" }),
    ).toHaveLength(0);

    await sql`
      UPDATE job_matching_profiles
      SET completed_source_hash = 'job-v2', updated_at = now()
      WHERE job_id = ${job.id}
    `;
    await sql`UPDATE candidate_profiles SET resume_key = NULL WHERE user_id = ${user.id}`;
    expect((await listDigestCandidates(sql)).map((row) => row.userId)).not.toContain(user.id);
  });
});
