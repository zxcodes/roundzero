import { describe, expect, it } from "vitest";
import {
  breadcrumbSegmentCount,
  type DashboardMatch,
  isDashboardBreadcrumbPending,
  resolveDashboardBreadcrumbs,
} from "@/shared/dashboard-breadcrumbs";

const jobId = "11111111-1111-4111-8111-111111111111";
const applicationId = "22222222-2222-4222-8222-222222222222";
const otherJobId = "33333333-3333-4333-8333-333333333333";

function match(
  routeId: string,
  loaderData?: unknown,
  overrides: Partial<DashboardMatch> = {},
): DashboardMatch {
  return {
    routeId,
    loaderData,
    status: "success",
    isFetching: false,
    ...overrides,
  };
}

describe("resolveDashboardBreadcrumbs", () => {
  it("returns flat crumbs for top-level dashboard routes", () => {
    expect(resolveDashboardBreadcrumbs("/_authenticated/dashboard/", true, [])).toEqual([
      { label: "Overview" },
    ]);
    expect(resolveDashboardBreadcrumbs("/_authenticated/dashboard/jobs/", false, [])).toEqual([
      { label: "Browse jobs" },
    ]);
    expect(
      resolveDashboardBreadcrumbs("/_authenticated/dashboard/applications", false, []),
    ).toEqual([{ label: "My applications" }]);
  });

  it("builds company job detail trails from parent loader data", () => {
    const matches = [
      match("/_authenticated/dashboard/jobs/$jobId", {
        type: "company",
        job: { id: jobId, title: "Senior Engineer" },
      }),
      match("/_authenticated/dashboard/jobs/$jobId/"),
    ];

    expect(
      resolveDashboardBreadcrumbs("/_authenticated/dashboard/jobs/$jobId/", true, matches),
    ).toEqual([{ label: "Jobs", to: "/dashboard/jobs" }, { label: "Senior Engineer" }]);
  });

  it("builds candidate application detail trails", () => {
    const matches = [
      match("/_authenticated/dashboard/application/$applicationId", {
        application: { id: applicationId, jobTitle: "React Frontend Engineer" },
      }),
    ];

    expect(
      resolveDashboardBreadcrumbs(
        "/_authenticated/dashboard/application/$applicationId",
        false,
        matches,
      ),
    ).toEqual([
      { label: "My applications", to: "/dashboard/applications" },
      { label: "React Frontend Engineer" },
    ]);
  });

  it("includes Applicants in company applicant review trails", () => {
    const matches = [
      match("/_authenticated/dashboard/applicants/$applicationId", {
        application: {
          id: applicationId,
          jobId,
          jobTitle: "Senior Engineer",
          candidateName: "Ada Lovelace",
        },
      }),
    ];

    expect(
      resolveDashboardBreadcrumbs(
        "/_authenticated/dashboard/applicants/$applicationId",
        true,
        matches,
      ),
    ).toEqual([
      { label: "Jobs", to: "/dashboard/jobs" },
      { label: "Senior Engineer", to: "/dashboard/jobs/$jobId", params: { jobId } },
      {
        label: "Applicants",
        to: "/dashboard/job-applicants/$jobId",
        params: { jobId },
      },
      { label: "Ada Lovelace" },
    ]);
  });

  it("returns null when loader data is missing", () => {
    expect(
      resolveDashboardBreadcrumbs("/_authenticated/dashboard/jobs/$jobId/", true, []),
    ).toBeNull();
  });
});

describe("breadcrumbSegmentCount", () => {
  it("uses resolved trail length when breadcrumbs are available", () => {
    const breadcrumbs = resolveDashboardBreadcrumbs(
      "/_authenticated/dashboard/applicants/$applicationId",
      true,
      [
        match("/_authenticated/dashboard/applicants/$applicationId", {
          application: {
            id: applicationId,
            jobId,
            jobTitle: "Senior Engineer",
            candidateName: "Ada Lovelace",
          },
        }),
      ],
    );

    expect(
      breadcrumbSegmentCount("/_authenticated/dashboard/applicants/$applicationId", breadcrumbs),
    ).toBe(4);
  });

  it("falls back to route-specific counts while pending", () => {
    expect(
      breadcrumbSegmentCount(
        "/_authenticated/dashboard/applicant-reports/$applicationId/full",
        null,
      ),
    ).toBe(5);
    expect(breadcrumbSegmentCount("/_authenticated/dashboard/settings", null)).toBe(1);
  });
});

describe("isDashboardBreadcrumbPending", () => {
  it("is pending when loader data is missing", () => {
    expect(
      isDashboardBreadcrumbPending(
        "/_authenticated/dashboard/jobs/$jobId/",
        [],
        null,
        match("/_authenticated/dashboard/jobs/$jobId/", undefined, {
          params: { jobId },
        }),
      ),
    ).toBe(true);
  });

  it("is pending when route params do not match cached loader data", () => {
    const matches = [
      match("/_authenticated/dashboard/jobs/$jobId", {
        job: { id: jobId, title: "Senior Engineer" },
      }),
      match("/_authenticated/dashboard/jobs/$jobId/", undefined, {
        params: { jobId: otherJobId },
        status: "success",
      }),
    ];
    const breadcrumbs = resolveDashboardBreadcrumbs(
      "/_authenticated/dashboard/jobs/$jobId/",
      true,
      matches,
    );

    expect(
      isDashboardBreadcrumbPending(
        "/_authenticated/dashboard/jobs/$jobId/",
        matches,
        breadcrumbs,
        matches[1],
      ),
    ).toBe(true);
  });

  it("is pending while the active match is loading", () => {
    const matches = [
      match("/_authenticated/dashboard/application/$applicationId", {
        application: { id: applicationId, jobTitle: "React Frontend Engineer" },
      }),
    ];
    const breadcrumbs = resolveDashboardBreadcrumbs(
      "/_authenticated/dashboard/application/$applicationId",
      false,
      matches,
    );

    expect(
      isDashboardBreadcrumbPending(
        "/_authenticated/dashboard/application/$applicationId",
        matches,
        breadcrumbs,
        match("/_authenticated/dashboard/application/$applicationId", undefined, {
          params: { applicationId },
          status: "pending",
          isFetching: "loader",
        }),
      ),
    ).toBe(true);
  });

  it("is not pending when params and loader data align", () => {
    const matches = [
      match("/_authenticated/dashboard/application/$applicationId", {
        application: { id: applicationId, jobTitle: "React Frontend Engineer" },
      }),
    ];
    const breadcrumbs = resolveDashboardBreadcrumbs(
      "/_authenticated/dashboard/application/$applicationId",
      false,
      matches,
    );

    expect(
      isDashboardBreadcrumbPending(
        "/_authenticated/dashboard/application/$applicationId",
        matches,
        breadcrumbs,
        match("/_authenticated/dashboard/application/$applicationId", undefined, {
          params: { applicationId },
          status: "success",
        }),
      ),
    ).toBe(false);
  });
});
