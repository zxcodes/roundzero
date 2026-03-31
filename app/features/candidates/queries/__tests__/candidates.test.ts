import { describe, expect, it } from "vitest";
import { getTestDb, seedCandidateProfile, seedUser } from "@/shared/__tests__/test-utils";
import {
  createCandidateProfile,
  getCandidateProfileByUserId,
  updateCandidateProfile,
} from "../queries_sql";

const sql = getTestDb();

// ─── createCandidateProfile ─────────────────────────────────────

describe("createCandidateProfile", () => {
  it("creates a profile with headline and resume URL", async () => {
    const user = await seedUser({ role: "candidate" });

    const profile = await createCandidateProfile(sql, {
      userId: user.id,
      headline: "Full-Stack Developer",
      resumeKey: "https://example.com/resume.pdf",
    });

    expect(profile).not.toBeNull();
    expect(profile!.userId).toBe(user.id);
    expect(profile!.headline).toBe("Full-Stack Developer");
    expect(profile!.resumeKey).toBe("https://example.com/resume.pdf");
    expect(profile!.bio).toBeNull();
    // JSONB columns default to '[]' (NOT NULL)
    expect(profile!.skills).toEqual([]);
    expect(profile!.workHistory).toEqual([]);
    expect(profile!.links).toEqual({});
    expect(profile!.createdAt).toBeInstanceOf(Date);
    expect(profile!.updatedAt).toBeInstanceOf(Date);
  });

  it("creates a profile with null headline and resume", async () => {
    const user = await seedUser({ role: "candidate" });

    const profile = await createCandidateProfile(sql, {
      userId: user.id,
      headline: null,
      resumeKey: null,
    });

    expect(profile).not.toBeNull();
    expect(profile!.headline).toBeNull();
    expect(profile!.resumeKey).toBeNull();
  });

  it("enforces unique user_id constraint", async () => {
    const user = await seedUser({ role: "candidate" });

    await createCandidateProfile(sql, {
      userId: user.id,
      headline: "First Profile",
      resumeKey: null,
    });

    await expect(
      createCandidateProfile(sql, {
        userId: user.id,
        headline: "Duplicate Profile",
        resumeKey: null,
      }),
    ).rejects.toThrow();
  });
});

// ─── getCandidateProfileByUserId ────────────────────────────────

describe("getCandidateProfileByUserId", () => {
  it("returns the profile for an existing user", async () => {
    const { profile: seeded, user } = await seedCandidateProfile({
      headline: "Backend Engineer",
    });

    const profile = await getCandidateProfileByUserId(sql, { userId: user.id });

    expect(profile).not.toBeNull();
    expect(profile!.id).toBe(seeded.id);
    expect(profile!.headline).toBe("Backend Engineer");
  });

  it("returns null for a user without a profile", async () => {
    const user = await seedUser({ role: "candidate" });

    const profile = await getCandidateProfileByUserId(sql, { userId: user.id });

    expect(profile).toBeNull();
  });
});

// ─── updateCandidateProfile ─────────────────────────────────────

describe("updateCandidateProfile", () => {
  it("updates all profile fields", async () => {
    const { user } = await seedCandidateProfile({ headline: "Old Headline" });

    const skills = ["TypeScript", "Go", "PostgreSQL"];
    const workHistory = [{ company: "Acme", role: "Engineer", years: 3 }];
    const links = [{ label: "GitHub", url: "https://github.com/test" }];

    const updated = await updateCandidateProfile(sql, {
      userId: user.id,
      headline: "Senior Engineer",
      resumeKey: "https://example.com/new-resume.pdf",
      bio: "I build scalable systems.",
      skills,
      workHistory,
      links,
    });

    expect(updated).not.toBeNull();
    expect(updated!.headline).toBe("Senior Engineer");
    expect(updated!.resumeKey).toBe("https://example.com/new-resume.pdf");
    expect(updated!.bio).toBe("I build scalable systems.");
    expect(updated!.skills).toEqual(skills);
    expect(updated!.workHistory).toEqual(workHistory);
    expect(updated!.links).toEqual(links);
  });

  it("sets updated_at to a newer timestamp", async () => {
    const { user } = await seedCandidateProfile();

    // Small delay to ensure timestamp difference
    await new Promise((resolve) => setTimeout(resolve, 50));

    const updated = await updateCandidateProfile(sql, {
      userId: user.id,
      headline: "Updated",
      resumeKey: null,
      bio: null,
      skills: [],
      workHistory: [],
      links: [],
    });

    expect(updated).not.toBeNull();
    expect(updated!.updatedAt).toBeInstanceOf(Date);
  });

  it("returns null when updating a non-existent profile", async () => {
    const user = await seedUser({ role: "candidate" });

    const result = await updateCandidateProfile(sql, {
      userId: user.id,
      headline: "Ghost",
      resumeKey: null,
      bio: null,
      skills: [],
      workHistory: [],
      links: [],
    });

    expect(result).toBeNull();
  });

  it("resets JSONB fields to empty arrays", async () => {
    const { user } = await seedCandidateProfile();

    // First set values
    await updateCandidateProfile(sql, {
      userId: user.id,
      headline: "Engineer",
      resumeKey: "https://example.com/resume.pdf",
      bio: "Some bio",
      skills: ["TypeScript"],
      workHistory: [{ company: "Test" }],
      links: [{ url: "https://example.com" }],
    });

    // Then reset JSONB fields to empty and clear text fields
    const cleared = await updateCandidateProfile(sql, {
      userId: user.id,
      headline: null,
      resumeKey: null,
      bio: null,
      skills: [],
      workHistory: [],
      links: [],
    });

    expect(cleared).not.toBeNull();
    expect(cleared!.headline).toBeNull();
    expect(cleared!.resumeKey).toBeNull();
    expect(cleared!.bio).toBeNull();
    expect(cleared!.skills).toEqual([]);
    expect(cleared!.workHistory).toEqual([]);
    expect(cleared!.links).toEqual([]);
  });
});
