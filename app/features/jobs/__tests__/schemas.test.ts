import { describe, expect, it } from "vitest";

import { jobFieldsSchema, jobIdSchema, jobIdsSchema, updateJobSchema } from "../schemas";

describe("jobFieldsSchema", () => {
  const validJob = {
    title: "Software Engineer",
    description: "Build things",
    workplaceType: "remote",
    employmentType: "full_time",
    experienceLevel: "mid",
  };

  it("accepts minimal valid input with defaults", () => {
    const result = jobFieldsSchema.parse(validJob);
    expect(result.title).toBe("Software Engineer");
    expect(result.requirements).toEqual([]);
    expect(result.status).toBe("draft");
    expect(result.salaryCurrency).toBe("USD");
    expect(result.screeningQuestions).toEqual([]);
  });

  it("accepts full input with all fields", () => {
    const result = jobFieldsSchema.parse({
      ...validJob,
      requirements: ["TypeScript", "React"],
      screeningQuestions: ["Are you authorized to work in the US?"],
      status: "open",
      location: "NYC",
      workplaceType: "hybrid",
      employmentType: "full_time",
      experienceLevel: "senior",
      salaryMin: 100000,
      salaryMax: 200000,
      salaryCurrency: "EUR",
      teamSize: 8,
      headcount: 3,
    });
    expect(result.workplaceType).toBe("hybrid");
    expect(result.screeningQuestions).toEqual(["Are you authorized to work in the US?"]);
    expect(result.salaryMin).toBe(100000);
    expect(result.salaryMax).toBe(200000);
  });

  it("accepts null for nullable fields", () => {
    const result = jobFieldsSchema.parse({
      ...validJob,
      location: null,
      salaryMin: null,
      salaryMax: null,
      teamSize: null,
      headcount: null,
      screeningQuestions: [],
    });
    expect(result.location).toBeNull();
    expect(result.screeningQuestions).toEqual([]);
  });

  it("rejects missing required job detail fields", () => {
    expect(() => jobFieldsSchema.parse({ title: "Test", description: "Test" })).toThrow();
    expect(() =>
      jobFieldsSchema.parse({ title: "Test", description: "Test", workplaceType: "remote" }),
    ).toThrow();
  });

  // ─── Validation failures ─────────────────────────────────

  it("rejects empty title", () => {
    expect(() => jobFieldsSchema.parse({ ...validJob, title: "" })).toThrow();
  });

  it("rejects title over 200 chars", () => {
    expect(() => jobFieldsSchema.parse({ ...validJob, title: "a".repeat(201) })).toThrow();
  });

  it("rejects empty description", () => {
    expect(() => jobFieldsSchema.parse({ ...validJob, description: "" })).toThrow();
  });

  it("rejects description over 5000 chars", () => {
    expect(() => jobFieldsSchema.parse({ ...validJob, description: "a".repeat(5001) })).toThrow();
  });

  it("rejects invalid workplace type", () => {
    expect(() => jobFieldsSchema.parse({ ...validJob, workplaceType: "office" })).toThrow();
  });

  it("rejects invalid employment type", () => {
    expect(() => jobFieldsSchema.parse({ ...validJob, employmentType: "freelance" })).toThrow();
  });

  it("rejects invalid experience level", () => {
    expect(() => jobFieldsSchema.parse({ ...validJob, experienceLevel: "intern" })).toThrow();
  });

  it("rejects negative salary", () => {
    expect(() => jobFieldsSchema.parse({ ...validJob, salaryMin: -1 })).toThrow();
  });

  it("rejects zero salary", () => {
    expect(() => jobFieldsSchema.parse({ ...validJob, salaryMin: 0 })).toThrow();
  });

  it("rejects non-integer salary", () => {
    expect(() => jobFieldsSchema.parse({ ...validJob, salaryMin: 100.5 })).toThrow();
  });

  it("allows up to 50 final reports per job", () => {
    expect(jobFieldsSchema.parse({ ...validJob, finalReportTarget: 50 }).finalReportTarget).toBe(
      50,
    );
    expect(jobFieldsSchema.safeParse({ ...validJob, finalReportTarget: 51 }).success).toBe(false);
  });

  // ─── Salary refinement ───────────────────────────────────

  it("allows salaryMin equal to salaryMax", () => {
    const result = jobFieldsSchema.parse({
      ...validJob,
      salaryMin: 100000,
      salaryMax: 100000,
    });
    expect(result.salaryMin).toBe(100000);
    expect(result.salaryMax).toBe(100000);
  });

  it("rejects salaryMin greater than salaryMax", () => {
    expect(() =>
      jobFieldsSchema.parse({
        ...validJob,
        salaryMin: 200000,
        salaryMax: 100000,
      }),
    ).toThrow("Minimum salary cannot exceed maximum salary");
  });

  it("allows salaryMin without salaryMax", () => {
    const result = jobFieldsSchema.parse({ ...validJob, salaryMin: 100000 });
    expect(result.salaryMin).toBe(100000);
    expect(result.salaryMax).toBeUndefined();
  });

  it("allows salaryMax without salaryMin", () => {
    const result = jobFieldsSchema.parse({ ...validJob, salaryMax: 200000 });
    expect(result.salaryMax).toBe(200000);
    expect(result.salaryMin).toBeUndefined();
  });
});

describe("updateJobSchema", () => {
  const validUpdate = {
    title: "Test",
    description: "Test",
    workplaceType: "remote",
    employmentType: "full_time",
    experienceLevel: "mid",
  };

  it("requires a valid UUID id", () => {
    expect(() =>
      updateJobSchema.parse({
        ...validUpdate,
        id: "not-a-uuid",
      }),
    ).toThrow();
  });

  it("accepts valid input with UUID", () => {
    const result = updateJobSchema.parse({
      ...validUpdate,
      id: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.id).toBe("550e8400-e29b-41d4-a716-446655440000");
  });
});

describe("jobIdSchema", () => {
  it("accepts a valid UUID", () => {
    const result = jobIdSchema.parse({ id: "550e8400-e29b-41d4-a716-446655440000" });
    expect(result.id).toBe("550e8400-e29b-41d4-a716-446655440000");
  });

  it("rejects non-UUID strings", () => {
    expect(() => jobIdSchema.parse({ id: "abc" })).toThrow();
  });

  it("rejects missing id", () => {
    expect(() => jobIdSchema.parse({})).toThrow();
  });
});

describe("jobIdsSchema", () => {
  it("accepts a bounded bulk publish selection", () => {
    const ids = [crypto.randomUUID(), crypto.randomUUID()];
    expect(jobIdsSchema.parse({ ids })).toEqual({ ids });
  });

  it("rejects empty and oversized selections", () => {
    expect(jobIdsSchema.safeParse({ ids: [] }).success).toBe(false);
    expect(
      jobIdsSchema.safeParse({
        ids: Array.from({ length: 51 }, () => crypto.randomUUID()),
      }).success,
    ).toBe(false);
  });
});
