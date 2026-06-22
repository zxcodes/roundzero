import type { AppBreadcrumbItem } from "@/components/app-breadcrumbs";

const companyJobsRoot: AppBreadcrumbItem = { label: "Jobs", to: "/dashboard/jobs" };
const candidateBrowseJobsRoot: AppBreadcrumbItem = {
  label: "Browse jobs",
  to: "/dashboard/jobs",
};
const candidateApplicationsRoot: AppBreadcrumbItem = {
  label: "My applications",
  to: "/dashboard/applications",
};
const publicJobsRoot: AppBreadcrumbItem = { label: "Jobs", to: "/jobs" };
const publicCompaniesRoot: AppBreadcrumbItem = { label: "Companies", to: "/companies" };

function companyJobCrumb(jobId: string, jobTitle: string): AppBreadcrumbItem {
  return { label: jobTitle, to: "/dashboard/job-applicants/$jobId", params: { jobId } };
}

function companyApplicantCrumb(applicationId: string, candidateName: string): AppBreadcrumbItem {
  return {
    label: candidateName,
    to: "/dashboard/applicants/$applicationId",
    params: { applicationId },
  };
}

export function companyJobDetailTrail(_jobId: string, jobTitle: string): AppBreadcrumbItem[] {
  return [companyJobsRoot, { label: jobTitle }];
}

export function candidateJobDetailTrail(_jobId: string, jobTitle: string): AppBreadcrumbItem[] {
  return [candidateBrowseJobsRoot, { label: jobTitle }];
}

export function companyEditJobTrail(jobId: string, jobTitle: string): AppBreadcrumbItem[] {
  return [
    ...companyJobDetailTrail(jobId, jobTitle).slice(0, -1),
    companyJobCrumb(jobId, jobTitle),
    { label: "Edit" },
  ];
}

export function companyNewJobTrail(): AppBreadcrumbItem[] {
  return [companyJobsRoot, { label: "Post a job" }];
}

export function companyJobApplicantsTrail(jobId: string, jobTitle: string): AppBreadcrumbItem[] {
  return [companyJobsRoot, companyJobCrumb(jobId, jobTitle)];
}

export function companyApplicantReviewTrail(
  jobId: string,
  jobTitle: string,
  candidateName: string,
): AppBreadcrumbItem[] {
  return [companyJobsRoot, companyJobCrumb(jobId, jobTitle), { label: candidateName }];
}

export function companyApplicantReportTrail(
  jobId: string,
  jobTitle: string,
  applicationId: string,
  candidateName: string,
): AppBreadcrumbItem[] {
  return [
    ...companyJobDetailTrail(jobId, jobTitle).slice(0, -1),
    companyJobCrumb(jobId, jobTitle),
    companyApplicantCrumb(applicationId, candidateName),
    { label: "Report" },
  ];
}

export function companyApplicantFullReportTrail(
  jobId: string,
  jobTitle: string,
  applicationId: string,
  candidateName: string,
): AppBreadcrumbItem[] {
  return [
    ...companyApplicantReportTrail(jobId, jobTitle, applicationId, candidateName).slice(0, -1),
    {
      label: "Report",
      to: "/dashboard/applicant-reports/$applicationId",
      params: { applicationId },
    },
    { label: "Full audit" },
  ];
}

export function companyJobBatchTrail(jobId: string, jobTitle: string): AppBreadcrumbItem[] {
  return [
    ...companyJobDetailTrail(jobId, jobTitle).slice(0, -1),
    companyJobCrumb(jobId, jobTitle),
    { label: "Batch" },
  ];
}

export function candidateApplicationDetailTrail(jobTitle: string): AppBreadcrumbItem[] {
  return [candidateApplicationsRoot, { label: jobTitle }];
}

export function publicJobDetailTrail(jobTitle: string): AppBreadcrumbItem[] {
  return [publicJobsRoot, { label: jobTitle }];
}

export function publicCompanyDetailTrail(companyName: string): AppBreadcrumbItem[] {
  return [publicCompaniesRoot, { label: companyName }];
}
