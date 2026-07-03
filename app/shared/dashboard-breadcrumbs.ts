import type { AppBreadcrumbItem } from "@/components/app-breadcrumbs";
import {
  candidateApplicationDetailTrail,
  candidateJobDetailTrail,
  companyApplicantFullReportTrail,
  companyApplicantReportTrail,
  companyApplicantReviewTrail,
  companyEditJobTrail,
  companyJobApplicantsTrail,
  companyJobBatchTrail,
  companyJobDetailTrail,
  companyNewJobTrail,
} from "@/shared/breadcrumb-trails";
export type DashboardMatch = {
  routeId: string;
  loaderData?: unknown;
  status?: "pending" | "success" | "error" | "redirected" | "notFound";
  isFetching?: false | "beforeLoad" | "loader";
  params?: Record<string, string>;
};

const BREADCRUMB_SEGMENT_FALLBACK: Partial<Record<string, number>> = {
  "/_authenticated/dashboard/applicant-reports/$applicationId/full": 5,
  "/_authenticated/dashboard/applicant-reports/$applicationId/": 4,
  "/_authenticated/dashboard/jobs/$jobId/edit": 3,
  "/_authenticated/dashboard/job-applicants/$jobId": 2,
  "/_authenticated/dashboard/applicants/$applicationId": 3,
  "/_authenticated/dashboard/job-batches/$batchId": 3,
  "/_authenticated/dashboard/jobs/$jobId": 2,
  "/_authenticated/dashboard/jobs/$jobId/": 2,
  "/_authenticated/dashboard/jobs/new": 2,
  "/_authenticated/dashboard/application/$applicationId": 2,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readStringField(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === "string" ? value : null;
}

function readJobLoader(data: unknown): { id: string; title: string } | null {
  if (!isRecord(data) || !isRecord(data.job)) {
    return null;
  }
  const id = readStringField(data.job, "id");
  const title = readStringField(data.job, "title");
  if (!id || !title) {
    return null;
  }
  return { id, title };
}

function readApplicationLoader(
  data: unknown,
): { id: string; jobId: string; jobTitle: string; candidateName: string } | null {
  if (!isRecord(data) || !isRecord(data.application)) {
    return null;
  }
  const id = readStringField(data.application, "id");
  const jobId = readStringField(data.application, "jobId");
  const jobTitle = readStringField(data.application, "jobTitle");
  const candidateName = readStringField(data.application, "candidateName");
  if (!id || !jobId || !jobTitle || !candidateName) {
    return null;
  }
  return { id, jobId, jobTitle, candidateName };
}

function readCandidateApplicationLoader(data: unknown): { id: string; jobTitle: string } | null {
  if (!isRecord(data) || !isRecord(data.application)) {
    return null;
  }
  const id = readStringField(data.application, "id");
  const jobTitle = readStringField(data.application, "jobTitle");
  if (!id || !jobTitle) {
    return null;
  }
  return { id, jobTitle };
}

function readBatchLoader(data: unknown): { id: string; jobId: string; jobTitle: string } | null {
  if (!isRecord(data) || !isRecord(data.batch)) {
    return null;
  }
  const id = readStringField(data.batch, "id");
  const jobId = readStringField(data.batch, "jobId");
  const jobTitle = readStringField(data.batch, "jobTitle");
  if (!id || !jobId || !jobTitle) {
    return null;
  }
  return { id, jobId, jobTitle };
}

function getMatchLoaderData(matches: DashboardMatch[], routeId: string): unknown {
  const match = matches.find((entry) => entry.routeId === routeId);
  return match?.loaderData;
}

function flatCrumb(label: string): AppBreadcrumbItem[] {
  return [{ label }];
}

function warnUnknownRoute(routeId: string) {
  if (!import.meta.env.DEV) {
    return;
  }
  console.warn(`[dashboard-breadcrumbs] Unhandled routeId: ${routeId}`);
}

function areBreadcrumbParamsAligned(
  routeId: string,
  matches: DashboardMatch[],
  params: Record<string, string> | undefined,
): boolean {
  if (!params) {
    return true;
  }

  switch (routeId) {
    case "/_authenticated/dashboard/jobs/$jobId":
    case "/_authenticated/dashboard/jobs/$jobId/":
    case "/_authenticated/dashboard/jobs/$jobId/edit": {
      const job = readJobLoader(
        getMatchLoaderData(matches, "/_authenticated/dashboard/jobs/$jobId"),
      );
      return job ? params.jobId === job.id : false;
    }
    case "/_authenticated/dashboard/job-applicants/$jobId": {
      const job = readJobLoader(
        getMatchLoaderData(matches, "/_authenticated/dashboard/job-applicants/$jobId"),
      );
      return job ? params.jobId === job.id : false;
    }
    case "/_authenticated/dashboard/applicants/$applicationId": {
      const application = readApplicationLoader(
        getMatchLoaderData(matches, "/_authenticated/dashboard/applicants/$applicationId"),
      );
      return application ? params.applicationId === application.id : false;
    }
    case "/_authenticated/dashboard/applicant-reports/$applicationId/":
    case "/_authenticated/dashboard/applicant-reports/$applicationId/full": {
      const application = readApplicationLoader(getMatchLoaderData(matches, routeId));
      return application ? params.applicationId === application.id : false;
    }
    case "/_authenticated/dashboard/job-batches/$batchId": {
      const batch = readBatchLoader(
        getMatchLoaderData(matches, "/_authenticated/dashboard/job-batches/$batchId"),
      );
      return batch ? params.batchId === batch.id : false;
    }
    case "/_authenticated/dashboard/application/$applicationId": {
      const application = readCandidateApplicationLoader(
        getMatchLoaderData(matches, "/_authenticated/dashboard/application/$applicationId"),
      );
      return application ? params.applicationId === application.id : false;
    }
    default:
      return true;
  }
}

export function breadcrumbSegmentCount(
  routeId: string,
  breadcrumbs: AppBreadcrumbItem[] | null,
): number {
  if (breadcrumbs) {
    return breadcrumbs.length;
  }
  return BREADCRUMB_SEGMENT_FALLBACK[routeId] ?? 1;
}

export function isDashboardBreadcrumbPending(
  routeId: string,
  matches: DashboardMatch[],
  breadcrumbs: AppBreadcrumbItem[] | null,
  lastMatch: DashboardMatch | undefined,
): boolean {
  if (!lastMatch) {
    return true;
  }
  if (breadcrumbs === null) {
    return true;
  }
  if (lastMatch.status === "pending") {
    return true;
  }
  if (lastMatch.isFetching === "loader" || lastMatch.isFetching === "beforeLoad") {
    return true;
  }
  if (!areBreadcrumbParamsAligned(routeId, matches, lastMatch.params)) {
    return true;
  }
  return false;
}

export function resolveDashboardBreadcrumbs(
  routeId: string,
  isCompany: boolean,
  matches: DashboardMatch[],
): AppBreadcrumbItem[] | null {
  switch (routeId) {
    case "/_authenticated/dashboard/":
      return flatCrumb("Overview");
    case "/_authenticated/dashboard/jobs/":
      return flatCrumb(isCompany ? "Jobs" : "Browse jobs");
    case "/_authenticated/dashboard/applications":
      return flatCrumb("My applications");
    case "/_authenticated/dashboard/awaiting-review":
      return flatCrumb("Awaiting review");
    case "/_authenticated/dashboard/shortlisted":
      return flatCrumb("Shortlisted");
    case "/_authenticated/dashboard/billing":
      return flatCrumb("Billing");
    case "/_authenticated/dashboard/team":
      return flatCrumb("Team");
    case "/_authenticated/dashboard/support":
      return flatCrumb("Support");
    case "/_authenticated/dashboard/settings":
      return flatCrumb("Settings");
    case "/_authenticated/dashboard/jobs/new":
      return companyNewJobTrail();
    case "/_authenticated/dashboard/jobs/$jobId":
    case "/_authenticated/dashboard/jobs/$jobId/": {
      const job = readJobLoader(
        getMatchLoaderData(matches, "/_authenticated/dashboard/jobs/$jobId"),
      );
      if (!job) {
        return null;
      }
      return isCompany
        ? companyJobDetailTrail(job.id, job.title)
        : candidateJobDetailTrail(job.id, job.title);
    }
    case "/_authenticated/dashboard/jobs/$jobId/edit": {
      const job = readJobLoader(
        getMatchLoaderData(matches, "/_authenticated/dashboard/jobs/$jobId"),
      );
      if (!job) {
        return null;
      }
      return companyEditJobTrail(job.id, job.title);
    }
    case "/_authenticated/dashboard/job-applicants/$jobId": {
      const job = readJobLoader(
        getMatchLoaderData(matches, "/_authenticated/dashboard/job-applicants/$jobId"),
      );
      if (!job) {
        return null;
      }
      return companyJobApplicantsTrail(job.id, job.title);
    }
    case "/_authenticated/dashboard/applicants/$applicationId": {
      const application = readApplicationLoader(
        getMatchLoaderData(matches, "/_authenticated/dashboard/applicants/$applicationId"),
      );
      if (!application) {
        return null;
      }
      return companyApplicantReviewTrail(
        application.jobId,
        application.jobTitle,
        application.candidateName,
      );
    }
    case "/_authenticated/dashboard/applicant-reports/$applicationId/": {
      const application = readApplicationLoader(
        getMatchLoaderData(matches, "/_authenticated/dashboard/applicant-reports/$applicationId/"),
      );
      if (!application) {
        return null;
      }
      return companyApplicantReportTrail(
        application.jobId,
        application.jobTitle,
        application.id,
        application.candidateName,
      );
    }
    case "/_authenticated/dashboard/applicant-reports/$applicationId/full": {
      const application = readApplicationLoader(
        getMatchLoaderData(
          matches,
          "/_authenticated/dashboard/applicant-reports/$applicationId/full",
        ),
      );
      if (!application) {
        return null;
      }
      return companyApplicantFullReportTrail(
        application.jobId,
        application.jobTitle,
        application.id,
        application.candidateName,
      );
    }
    case "/_authenticated/dashboard/job-batches/$batchId": {
      const batch = readBatchLoader(
        getMatchLoaderData(matches, "/_authenticated/dashboard/job-batches/$batchId"),
      );
      if (!batch) {
        return null;
      }
      return companyJobBatchTrail(batch.jobId, batch.jobTitle);
    }
    case "/_authenticated/dashboard/application/$applicationId": {
      const application = readCandidateApplicationLoader(
        getMatchLoaderData(matches, "/_authenticated/dashboard/application/$applicationId"),
      );
      if (!application) {
        return null;
      }
      return candidateApplicationDetailTrail(application.jobTitle);
    }
    default:
      warnUnknownRoute(routeId);
      return flatCrumb("Dashboard");
  }
}
