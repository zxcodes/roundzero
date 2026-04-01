import { describe, expect, it } from "vitest";
import { getTestDb, seedCandidateProfile, seedUser } from "@/shared/__tests__/test-utils";
import {
  createCandidateProfile,
  createCandidateWorkHistoryEntry,
  deleteCandidateWorkHistoryByProfileId,
  getCandidateProfileByUserId,
  getCandidateWorkHistoryByProfileId,
  updateCandidateProfile,
} from "../queries_sql";

const sql = getTestDb();

describe("createCandidateProfile", () => {
  it("creates a profile with headline and resume key", async () => {
    const user = await seedUser({ role: "candidate" });

    const profile = await createCandidateProfile(sql, {
      userId: user.id,
      headline: "Full-Stack Developer",
      resumeKey: "resumes/test-user/resume.pdf",
    });

    expect(profile).not.toBeNull();
    expect(profile!.userId).toBe(user.id);
    expect(profile!.headline).toBe("Full-Stack Developer");
    expect(profile!.resumeKey).toBe("resumes/test-user/resume.pdf");
    expect(profile!.bio).toBeNull();
    expect(profile!.skills).toEqual([]);
    expect(profile!.links).toEqual({});
    expect(profile!.createdAt).toBeInstanceOf(Date);
    expect(profile!.updatedAt).toBeInstanceOf(Date);
  });

  it("allows null headline and resume key", async () => {
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

describe("updateCandidateProfile", () => {
  it("updates profile fields without touching relational work history", async () => {
    const { user } = await seedCandidateProfile({ headline: "Old Headline" });

    const updated = await updateCandidateProfile(sql, {
      userId: user.id,
      headline: "Senior Engineer",
      resumeKey: "resumes/test-user/new-resume.pdf",
      bio: "I build scalable systems.",
      skills: ["TypeScript", "Go", "PostgreSQL"],
      links: { github: "https://github.com/test" },
    });

    expect(updated).not.toBeNull();
    expect(updated!.headline).toBe("Senior Engineer");
    expect(updated!.resumeKey).toBe("resumes/test-user/new-resume.pdf");
    expect(updated!.bio).toBe("I build scalable systems.");
    expect(updated!.skills).toEqual(["TypeScript", "Go", "PostgreSQL"]);
    expect(updated!.links).toEqual({ github: "https://github.com/test" });
  });

  it("sets updated_at to a newer timestamp", async () => {
    const { user } = await seedCandidateProfile();

    await new Promise((resolve) => setTimeout(resolve, 50));

    const updated = await updateCandidateProfile(sql, {
      userId: user.id,
      headline: "Updated",
      resumeKey: null,
      bio: null,
      skills: [],
      links: {},
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
      links: {},
    });

    expect(result).toBeNull();
  });

  it("clears optional profile fields", async () => {
    const { user } = await seedCandidateProfile();

    await updateCandidateProfile(sql, {
      userId: user.id,
      headline: "Engineer",
      resumeKey: "resumes/test-user/resume.pdf",
      bio: "Some bio",
      skills: ["TypeScript"],
      links: { github: "https://github.com/test" },
    });

    const cleared = await updateCandidateProfile(sql, {
      userId: user.id,
      headline: null,
      resumeKey: null,
      bio: null,
      skills: [],
      links: {},
    });

    expect(cleared).not.toBeNull();
    expect(cleared!.headline).toBeNull();
    expect(cleared!.resumeKey).toBeNull();
    expect(cleared!.bio).toBeNull();
    expect(cleared!.skills).toEqual([]);
    expect(cleared!.links).toEqual({});
  });
});

describe("candidate work history queries", () => {
  it("creates and returns ordered work history rows", async () => {
    const { profile } = await seedCandidateProfile();

    await createCandidateWorkHistoryEntry(sql, {
      candidateProfileId: profile.id,
      company: "Acme",
      title: "Engineer",
      startMonth: "2021-01",
      endMonth: "2022-06",
      currentlyWorkingHere: false,
      description: "Built APIs",
      sortOrder: 1,
    });

    await createCandidateWorkHistoryEntry(sql, {
      candidateProfileId: profile.id,
      company: "Beta",
      title: "Senior Engineer",
      startMonth: "2022-07",
      endMonth: null,
      currentlyWorkingHere: true,
      description: null,
      sortOrder: 0,
    });

    const history = await getCandidateWorkHistoryByProfileId(sql, {
      candidateProfileId: profile.id,
    });

    expect(history).toHaveLength(2);
    expect(history[0]!.company).toBe("Beta");
    expect(history[0]!.currentlyWorkingHere).toBe(true);
    expect(history[1]!.company).toBe("Acme");
    expect(history[1]!.endMonth).toBe("2022-06");
  });

  it("deletes all work history rows for a profile", async () => {
    const { profile } = await seedCandidateProfile();

    await createCandidateWorkHistoryEntry(sql, {
      candidateProfileId: profile.id,
      company: "Acme",
      title: "Engineer",
      startMonth: "2021-01",
      endMonth: "2022-06",
      currentlyWorkingHere: false,
      description: null,
      sortOrder: 0,
    });

    await deleteCandidateWorkHistoryByProfileId(sql, {
      candidateProfileId: profile.id,
    });

    const history = await getCandidateWorkHistoryByProfileId(sql, {
      candidateProfileId: profile.id,
    });

    expect(history).toEqual([]);
  });
});
