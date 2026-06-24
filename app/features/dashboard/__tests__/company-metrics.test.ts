import { describe, expect, it } from "vitest";
import {
  buildActivitySummary,
  buildHeroSummary,
  buildRoleAttention,
  mapReleasedReportRow,
} from "@/features/dashboard/company-metrics";

describe("mapReleasedReportRow", () => {
  it("maps a released report row with strengths and weaknesses", () => {
    const mapped = mapReleasedReportRow({
      reportId: "00000000-0000-0000-0000-000000000001",
      applicationId: "00000000-0000-0000-0000-000000000002",
      recommendation: "strong_yes",
      scores: {
        communication: 9,
        problemSolving: 8.8,
        ownership: 8.6,
        roleFit: 9.1,
        overall: 8.9,
      },
      strengths: ["Strong communication", "Clear ownership"],
      weaknesses: ["Limited leadership examples"],
      releasedAt: new Date("2026-06-24T12:00:00Z"),
      applicationStatus: "evaluated",
      jobId: "00000000-0000-0000-0000-000000000003",
      jobTitle: "Senior Engineer",
      candidateName: "Sarah Chen",
      preEvaluationConfidence: "high",
    });

    expect(mapped).not.toBeNull();
    expect(mapped?.overallScore).toBe(8.9);
    expect(mapped?.strengths).toEqual(["Strong communication", "Clear ownership"]);
    expect(mapped?.topConcern).toBe("Limited leadership examples");
    expect(mapped?.confidence).toBe("High");
  });
});

describe("buildRoleAttention", () => {
  it("aggregates hire outcomes per open role", () => {
    const jobId = "00000000-0000-0000-0000-000000000010";
    const roles = buildRoleAttention(
      [
        {
          id: jobId,
          title: "Backend Engineer",
          status: "open",
          totalApplicants: 12,
        } as never,
      ],
      [
        {
          applicationId: "a1",
          jobId,
          jobTitle: "Backend Engineer",
          candidateName: "A",
          overallScore: 9,
          recommendation: "strong_yes",
          confidence: "High",
          strengths: [],
          topConcern: null,
          scores: {
            communication: 9,
            problemSolving: 9,
            ownership: 9,
            roleFit: 9,
          },
          releasedAt: new Date(),
          applicationStatus: "evaluated",
        },
        {
          applicationId: "a2",
          jobId,
          jobTitle: "Backend Engineer",
          candidateName: "B",
          overallScore: 7,
          recommendation: "yes",
          confidence: "Medium",
          strengths: [],
          topConcern: null,
          scores: {
            communication: 7,
            problemSolving: 7,
            ownership: 7,
            roleFit: 7,
          },
          releasedAt: new Date(),
          applicationStatus: "evaluated",
        },
      ],
    );

    expect(roles[0]?.strongHire).toBe(1);
    expect(roles[0]?.hire).toBe(1);
    expect(roles[0]?.reportsReady).toBe(2);
  });
});

describe("buildHeroSummary", () => {
  it("aggregates hero stats and picks the busiest awaiting-review role", () => {
    const jobA = "00000000-0000-0000-0000-000000000020";
    const jobB = "00000000-0000-0000-0000-000000000021";
    const summary = buildHeroSummary(
      [
        {
          id: jobA,
          totalApplicants: 50,
          evaluatedCount: 10,
          evaluatedHeldCount: 2,
          shortlistedCount: 3,
          rejectedCount: 5,
        } as never,
        {
          id: jobB,
          totalApplicants: 77,
          evaluatedCount: 8,
          evaluatedHeldCount: 1,
          shortlistedCount: 2,
          rejectedCount: 4,
        } as never,
      ],
      [{ applicationId: "r1" } as never, { applicationId: "r2" } as never],
      [
        {
          jobId: jobA,
          recommendation: "strong_yes",
        } as never,
        {
          jobId: jobA,
          recommendation: "yes",
        } as never,
        {
          jobId: jobB,
          recommendation: "strong_yes",
        } as never,
      ],
      [{ targetSize: 7 }],
    );

    expect(summary.applicationsProcessed).toBe(127);
    expect(summary.interviewsCompleted).toBe(35);
    expect(summary.reportsReady).toBe(2);
    expect(summary.awaitingReviewCount).toBe(3);
    expect(summary.strongHireAwaitingCount).toBe(2);
    expect(summary.evaluatingCount).toBe(7);
    expect(summary.viewAllAwaitingJobId).toBe(jobA);
  });
});

describe("buildActivitySummary", () => {
  it("summarizes same-day report activity", () => {
    const now = new Date();
    const items = buildActivitySummary(
      [
        {
          applicationId: "a1",
          jobId: "j1",
          jobTitle: "Role",
          candidateName: "A",
          overallScore: 8,
          recommendation: "yes",
          confidence: null,
          strengths: [],
          topConcern: null,
          scores: {
            communication: 8,
            problemSolving: 8,
            ownership: 8,
            roleFit: 8,
          },
          releasedAt: now,
          applicationStatus: "evaluated",
        },
      ],
      [],
    );

    expect(items[0]?.label).toContain("report");
  });
});
