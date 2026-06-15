import { describe, expect, it } from "vitest";
import { getTestDb, seedCandidateProfile, seedUser } from "@/shared/__tests__/test-utils";
import {
  createCandidateProfile,
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
});
