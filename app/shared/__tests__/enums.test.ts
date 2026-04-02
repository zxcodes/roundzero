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
    for (const status of ["applied", "interviewing", "evaluated", "rejected"]) {
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

describe("isValidTransition", () => {
  it("allows valid forward transitions", () => {
    expect(isValidTransition("applied", "interviewing")).toBe(true);
    expect(isValidTransition("applied", "rejected")).toBe(true);
    expect(isValidTransition("interviewing", "evaluated")).toBe(true);
    expect(isValidTransition("interviewing", "rejected")).toBe(true);
    expect(isValidTransition("evaluated", "rejected")).toBe(true);
  });

  it("rejects backward transitions", () => {
    expect(isValidTransition("interviewing", "applied")).toBe(false);
    expect(isValidTransition("evaluated", "interviewing")).toBe(false);
    expect(isValidTransition("rejected", "applied")).toBe(false);
  });

  it("rejects skipping steps", () => {
    expect(isValidTransition("applied", "evaluated")).toBe(false);
  });

  it("rejects same-status transitions", () => {
    expect(isValidTransition("applied", "applied")).toBe(false);
    expect(isValidTransition("rejected", "rejected")).toBe(false);
  });

  it("rejected is terminal — no transitions out", () => {
    for (const status of ["applied", "interviewing", "evaluated", "rejected"] as const) {
      expect(isValidTransition("rejected", status)).toBe(false);
    }
  });
});
