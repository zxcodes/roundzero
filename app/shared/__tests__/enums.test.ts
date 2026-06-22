import { describe, expect, it } from "vitest";
import {
  APPLICATION_STATUS_TRANSITIONS,
  type ApplicationStatus,
  applicationStatusSchema,
  type EmploymentType,
  type ExperienceLevel,
  employmentTypeLabels,
  employmentTypeSchema,
  experienceLevelLabels,
  experienceLevelSchema,
  getApplicationStatusLabel,
  isValidTransition,
  jobStatusSchema,
  userRoleSchema,
  type WorkplaceType,
  workplaceTypeLabels,
  workplaceTypeSchema,
} from "@/shared/enums";

// ─── Enum schema validation ─────────────────────────────────────

describe("userRoleSchema", () => {
  it("accepts valid roles", () => {
    expect(userRoleSchema.parse("company")).toBe("company");
    expect(userRoleSchema.parse("candidate")).toBe("candidate");
  });

  it("rejects invalid roles", () => {
    expect(() => userRoleSchema.parse("admin")).toThrow();
    expect(() => userRoleSchema.parse("")).toThrow();
  });
});

describe("jobStatusSchema", () => {
  it("accepts valid statuses", () => {
    expect(jobStatusSchema.parse("draft")).toBe("draft");
    expect(jobStatusSchema.parse("open")).toBe("open");
    expect(jobStatusSchema.parse("closed")).toBe("closed");
  });

  it("rejects invalid statuses", () => {
    expect(() => jobStatusSchema.parse("archived")).toThrow();
  });
});

describe("applicationStatusSchema", () => {
  it("accepts all valid statuses", () => {
    for (const status of [
      "applied",
      "pre_screening",
      "queued_for_batch",
      "interview_invited",
      "interview_in_progress",
      "evaluated_held",
      "evaluated",
      "shortlisted",
      "rejected",
      "withdrawn",
      "evaluation_failed",
    ]) {
      expect(applicationStatusSchema.parse(status)).toBe(status);
    }
  });

  it("rejects invalid statuses", () => {
    expect(() => applicationStatusSchema.parse("pending")).toThrow();
    expect(() => applicationStatusSchema.parse("hired")).toThrow();
  });
});

// ─── Label map completeness ─────────────────────────────────────

describe("label maps", () => {
  it("workplaceTypeLabels covers every enum value", () => {
    const values = workplaceTypeSchema.options;
    for (const value of values) {
      expect(workplaceTypeLabels[value as WorkplaceType]).toBeDefined();
    }
  });

  it("employmentTypeLabels covers every enum value", () => {
    const values = employmentTypeSchema.options;
    for (const value of values) {
      expect(employmentTypeLabels[value as EmploymentType]).toBeDefined();
    }
  });

  it("experienceLevelLabels covers every enum value", () => {
    const values = experienceLevelSchema.options;
    for (const value of values) {
      expect(experienceLevelLabels[value as ExperienceLevel]).toBeDefined();
    }
  });
});

// ─── Application status transitions ─────────────────────────────

describe("APPLICATION_STATUS_TRANSITIONS", () => {
  it("has entries for every application status", () => {
    const statuses = applicationStatusSchema.options;
    for (const status of statuses) {
      expect(APPLICATION_STATUS_TRANSITIONS[status as ApplicationStatus]).toBeDefined();
    }
  });

  it("only contains valid application statuses as targets", () => {
    const validStatuses = new Set(applicationStatusSchema.options);
    for (const targets of Object.values(APPLICATION_STATUS_TRANSITIONS)) {
      for (const target of targets) {
        expect(validStatuses.has(target)).toBe(true);
      }
    }
  });
});

describe("getApplicationStatusLabel", () => {
  it("returns Screened when pre_screening has a score", () => {
    expect(getApplicationStatusLabel("pre_screening", { preEvaluationScore: 82 })).toBe("Screened");
  });

  it("returns Screening when pre_screening has no score yet", () => {
    expect(getApplicationStatusLabel("pre_screening", { preEvaluationScore: null })).toBe(
      "Screening",
    );
    expect(getApplicationStatusLabel("pre_screening")).toBe("Screening");
  });

  it("ignores score for other statuses", () => {
    expect(getApplicationStatusLabel("interview_invited", { preEvaluationScore: 82 })).toBe(
      "Invited",
    );
  });
});

describe("isValidTransition", () => {
  it("allows valid forward transitions", () => {
    expect(isValidTransition("applied", "pre_screening")).toBe(true);
    expect(isValidTransition("applied", "rejected")).toBe(true);
    expect(isValidTransition("pre_screening", "queued_for_batch")).toBe(true);
    expect(isValidTransition("queued_for_batch", "interview_invited")).toBe(true);
    expect(isValidTransition("interview_invited", "rejected")).toBe(true);
    expect(isValidTransition("interview_in_progress", "evaluated_held")).toBe(true);
    expect(isValidTransition("evaluated_held", "evaluated")).toBe(true);
    expect(isValidTransition("evaluated_held", "rejected")).toBe(true);
    expect(isValidTransition("evaluated", "rejected")).toBe(true);
  });

  it("allows pre_screening → interview_invited for manual company invites", () => {
    expect(isValidTransition("pre_screening", "interview_invited")).toBe(true);
  });

  it("rejects backward transitions", () => {
    expect(isValidTransition("interview_invited", "applied")).toBe(false);
    expect(isValidTransition("evaluated", "interview_invited")).toBe(false);
    expect(isValidTransition("rejected", "applied")).toBe(false);
  });

  it("allows manual recovery from evaluation_failed to interview_invited", () => {
    // Pre-eval / post-eval crashes leave the application in evaluation_failed.
    // Companies must be able to push the candidate forward manually instead
    // of being forced to reject them.
    expect(isValidTransition("evaluation_failed", "interview_invited")).toBe(true);
    expect(isValidTransition("evaluation_failed", "rejected")).toBe(true);
    expect(isValidTransition("evaluation_failed", "withdrawn")).toBe(true);
  });

  it("rejects skipping steps", () => {
    expect(isValidTransition("applied", "evaluated")).toBe(false);
  });

  it("rejects same-status transitions", () => {
    expect(isValidTransition("applied", "applied")).toBe(false);
    expect(isValidTransition("rejected", "rejected")).toBe(false);
  });

  it("rejected is terminal — no transitions out", () => {
    for (const status of [
      "applied",
      "interview_invited",
      "evaluated",
      "rejected",
      "withdrawn",
    ] as const) {
      expect(isValidTransition("rejected", status)).toBe(false);
    }
  });

  it("allows withdrawal from applied and interviewing", () => {
    expect(isValidTransition("applied", "withdrawn")).toBe(true);
    expect(isValidTransition("interview_invited", "withdrawn")).toBe(true);
    expect(isValidTransition("queued_for_batch", "withdrawn")).toBe(true);
  });

  it("rejects withdrawal from evaluated and rejected", () => {
    expect(isValidTransition("evaluated", "withdrawn")).toBe(false);
    expect(isValidTransition("evaluated_held", "withdrawn")).toBe(false);
    expect(isValidTransition("rejected", "withdrawn")).toBe(false);
  });

  it("withdrawn is terminal — no transitions out", () => {
    for (const status of [
      "applied",
      "interview_invited",
      "evaluated",
      "rejected",
      "withdrawn",
    ] as const) {
      expect(isValidTransition("withdrawn", status)).toBe(false);
    }
  });
});
