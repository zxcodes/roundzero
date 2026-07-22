import { describe, expect, it } from "vitest";

import { upsertCandidateJobMatch } from "@/features/job-matching/queries/queries_sql";
import { getTestDb, seedCandidateProfile, seedJob, seedUser } from "@/shared/__tests__/test-utils";

import {
  createCandidateProfile,
  deleteCandidateJobMatches,
  getCandidateProfileByUserId,
  updateCandidateProfile,
} from "../queries_sql";

const sql = getTestDb();

describe("createCandidateProfile", () => {
  it("creates a profile with resume key", async () => {
    const user = await seedUser({ role: "candidate" });

    const profile = await createCandidateProfile(sql, {
      userId: user.id,
      resumeKey: "resumes/test-user/resume.pdf",
    });

    expect(profile).not.toBeNull();
    expect(profile!.userId).toBe(user.id);
    expect(profile!.resumeKey).toBe("resumes/test-user/resume.pdf");
    expect(profile!.createdAt).toBeInstanceOf(Date);
    expect(profile!.updatedAt).toBeInstanceOf(Date);
  });

  it("allows null resume key", async () => {
    const user = await seedUser({ role: "candidate" });

    const profile = await createCandidateProfile(sql, {
      userId: user.id,
      resumeKey: null,
    });

    expect(profile).not.toBeNull();
    expect(profile!.resumeKey).toBeNull();
  });

  it("enforces unique user_id constraint", async () => {
    const user = await seedUser({ role: "candidate" });

    await createCandidateProfile(sql, {
      userId: user.id,
      resumeKey: null,
    });

    await expect(
      createCandidateProfile(sql, {
        userId: user.id,
        resumeKey: null,
      }),
    ).rejects.toThrow();
  });
});

describe("getCandidateProfileByUserId", () => {
  it("returns the profile for an existing user", async () => {
    const { profile: seeded, user } = await seedCandidateProfile();

    const profile = await getCandidateProfileByUserId(sql, { userId: user.id });

    expect(profile).not.toBeNull();
    expect(profile!.id).toBe(seeded.id);
  });

  it("returns null for a user without a profile", async () => {
    const user = await seedUser({ role: "candidate" });

    const profile = await getCandidateProfileByUserId(sql, { userId: user.id });

    expect(profile).toBeNull();
  });
});

describe("updateCandidateProfile", () => {
  it("updates profile fields", async () => {
    const { user } = await seedCandidateProfile();

    const updated = await updateCandidateProfile(sql, {
      userId: user.id,
      resumeKey: "resumes/test-user/new-resume.pdf",
    });

    expect(updated).not.toBeNull();
    expect(updated!.resumeKey).toBe("resumes/test-user/new-resume.pdf");
  });

  it("sets updated_at to a newer timestamp", async () => {
    const { user } = await seedCandidateProfile();

    await new Promise((resolve) => setTimeout(resolve, 50));

    const updated = await updateCandidateProfile(sql, {
      userId: user.id,
      resumeKey: null,
    });

    expect(updated).not.toBeNull();
    expect(updated!.updatedAt).toBeInstanceOf(Date);
  });

  it("returns null when updating a non-existent profile", async () => {
    const user = await seedUser({ role: "candidate" });

    const result = await updateCandidateProfile(sql, {
      userId: user.id,
      resumeKey: null,
    });

    expect(result).toBeNull();
  });

  it("invalidates matching state and removes matches when a resume is removed", async () => {
    const { user } = await seedCandidateProfile();
    const { job } = await seedJob({ status: "open" });
    const generationId = crypto.randomUUID();
    const refreshToken = crypto.randomUUID();
    await sql`
      UPDATE candidate_profiles
      SET matching_profile = ${sql.json({ facts: [] })},
          matching_profile_source_hash = 'candidate-v1',
          matching_profile_version = 'v1',
          matching_profile_status = 'ready',
          serving_match_generation = ${generationId},
          serving_match_input_hash = 'input-v1',
          match_feed_status = 'ready',
          match_feed_refreshed_at = now(),
          match_refresh_token = ${refreshToken},
          match_refresh_claimed_at = now()
      WHERE user_id = ${user.id}
    `;
    await upsertCandidateJobMatch(sql, {
      candidateId: user.id,
      jobId: job.id,
      generationId,
      candidateProfileSourceHash: "candidate-v1",
      jobProfileSourceHash: "job-v1",
      score: 59,
      band: "potential",
      reasons: [],
      consideration: null,
      algorithmVersion: "v1",
      thresholdVersion: "v1",
      promptVersion: "v1",
      model: "test",
    });

    const updated = await updateCandidateProfile(sql, { userId: user.id, resumeKey: null });
    await deleteCandidateJobMatches(sql, { candidateId: user.id });

    expect(updated).toMatchObject({
      resumeKey: null,
      resumeUpdatedAt: null,
      matchingProfile: null,
      matchingProfileSourceHash: null,
      matchingProfileVersion: null,
      servingMatchGeneration: null,
      servingMatchInputHash: null,
      matchFeedRefreshedAt: null,
      matchAlertsEnabledAt: null,
      matchRefreshToken: null,
      matchRefreshClaimedAt: null,
    });
    const matches = await sql`
      SELECT 1 FROM candidate_job_matches WHERE candidate_id = ${user.id}
    `;
    expect(matches).toHaveLength(0);
  });
});
