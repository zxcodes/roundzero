import { describe, expect, it } from "vitest";

import { jobToFormDefaults, type JobFormData } from "@/features/jobs/components/job-form";

const JOB_FORM_KEYS = [
  "title",
  "description",
  "screeningQuestions",
  "status",
  "location",
  "workplaceType",
  "employmentType",
  "experienceLevel",
  "salaryMin",
  "salaryMax",
  "salaryCurrency",
  "teamSize",
  "headcount",
  "finalReportTarget",
  "expiresAt",
] as const satisfies ReadonlyArray<keyof JobFormData>;

describe("jobToFormDefaults", () => {
  it("maps every JobFormData field so edit cannot omit and wipe values", () => {
    const expiresAt = new Date("2026-09-15T23:59:59.999");
    const defaults = jobToFormDefaults({
      title: "Engineer",
      description: "Build things",
      screeningQuestions: ["Why us?", null, "Remote ok?"],
      status: "open",
      location: "Remote",
      workplaceType: "remote",
      employmentType: "full_time",
      experienceLevel: "mid",
      salaryMin: 100_000,
      salaryMax: 150_000,
      salaryCurrency: "USD",
      teamSize: 5,
      headcount: 2,
      finalReportTarget: 10,
      expiresAt,
    });

    for (const key of JOB_FORM_KEYS) {
      expect(defaults).toHaveProperty(key);
    }
    expect(Object.keys(defaults).sort()).toEqual([...JOB_FORM_KEYS].sort());

    expect(defaults).toMatchObject({
      title: "Engineer",
      description: "Build things",
      screeningQuestions: ["Why us?", "Remote ok?"],
      status: "open",
      location: "Remote",
      workplaceType: "remote",
      employmentType: "full_time",
      experienceLevel: "mid",
      salaryMin: 100_000,
      salaryMax: 150_000,
      salaryCurrency: "USD",
      teamSize: 5,
      headcount: 2,
      finalReportTarget: 10,
    });
    expect(defaults.expiresAt).toBeInstanceOf(Date);
    expect(defaults.expiresAt?.getTime()).toBe(expiresAt.getTime());
  });

  it("preserves closed status and normalizes null/string deadline", () => {
    const defaults = jobToFormDefaults({
      title: "Closed role",
      description: "Done",
      screeningQuestions: undefined,
      status: "closed",
      location: null,
      workplaceType: null,
      employmentType: null,
      experienceLevel: null,
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: "EUR",
      teamSize: null,
      headcount: null,
      finalReportTarget: 5,
      expiresAt: "2026-08-01T23:59:59.999Z",
    });

    expect(defaults.status).toBe("closed");
    expect(defaults.screeningQuestions).toEqual([]);
    expect(defaults.location).toBeNull();
    expect(defaults.expiresAt).toBeInstanceOf(Date);
  });

  it("defaults unknown status to draft", () => {
    const defaults = jobToFormDefaults({
      title: "Odd",
      description: "Odd",
      screeningQuestions: [],
      status: "archived",
      location: null,
      workplaceType: "hybrid",
      employmentType: "contract",
      experienceLevel: "senior",
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: "USD",
      teamSize: null,
      headcount: null,
      finalReportTarget: 5,
      expiresAt: null,
    });

    expect(defaults.status).toBe("draft");
    expect(defaults.expiresAt).toBeNull();
  });
});
