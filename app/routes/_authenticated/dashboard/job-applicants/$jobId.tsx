import { Briefcase01Icon, RankingIcon, UserGroupIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute, notFound, redirect, useNavigate } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

import { PageInlineStats } from "@/components/page-inline-stats";
import { DashboardJobApplicantsSkeleton } from "@/components/route-skeletons";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  type JobApplicantsFilter,
  matchesJobApplicantsFilter,
} from "@/features/applications/applicant-filters";
import { CompanyJobApplicantsList } from "@/features/applications/components/company-job-applicants-list";
import { getJobApplicantsView } from "@/features/applications/server/functions";
import {
  CompanyJobActions,
  CompanyJobPostingPanel,
  JobMetaChip,
} from "@/features/jobs/components/company-job-posting-panel";
import type { JobStatus } from "@/shared/enums";
import { buildJobPageSeo } from "@/shared/seo";
import { validateUuidParams } from "@/shared/validation";

type JobApplicantsView = NonNullable<Awaited<ReturnType<typeof getJobApplicantsView>>>;
type JobApplicants = JobApplicantsView["applicants"];
const jobStatusLabels = {
  draft: "Draft",
  open: "Open",
  closed: "Closed",
} as const;

const searchDefaults = { tab: "applicants" } as const;

const applicantsViewSchema = z.enum(["ready", "all"]);
const applicantsFilterSchema = z.enum([
  "all",
  "screening",
  "queued",
  "active_interview",
  "awaiting_decision",
  "shortlisted",
  "rejected",
  "withdrawn",
  "evaluation_failed",
]);

const jobApplicantsSearchSchema = z.object({
  tab: z.enum(["applicants", "posting"]).default(searchDefaults.tab).catch(searchDefaults.tab),
  view: applicantsViewSchema.optional().catch(undefined),
  filter: applicantsFilterSchema.optional().catch(undefined),
});

export const Route = createFileRoute("/_authenticated/dashboard/job-applicants/$jobId")({
  validateSearch: zodValidator(jobApplicantsSearchSchema),
  beforeLoad: ({ context, params }) => {
    if (!context.isCompany) {
      throw redirect({ to: "/dashboard" });
    }
    validateUuidParams({ jobId: params.jobId });
  },
  loader: async ({ params }) => {
    const view = await getJobApplicantsView({ data: { jobId: params.jobId } });
    if (!view) {
      throw notFound();
    }
    return view;
  },
  head: ({ loaderData }) => {
    const job = loaderData?.job ?? null;
    if (!job) {
      return { meta: [{ title: "Job | RoundZero" }] };
    }

    return { meta: [{ title: buildJobPageSeo(job).title }] };
  },
  pendingComponent: DashboardJobApplicantsSkeleton,
  component: JobApplicantsPage,
});

type ApplicantsView = "ready" | "all";
type ApplicantsFilter = JobApplicantsFilter;

function JobApplicantsPage() {
  const { job, applicants, reportProgress } = Route.useLoaderData();
  const { tab, view: searchView, filter: searchFilter } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const view: ApplicantsView = searchView ?? (searchFilter ? "all" : "ready");
  const filter: ApplicantsFilter = searchFilter ?? "all";

  const requirements: string[] = Array.isArray(job.requirements) ? job.requirements : [];

  const onPageTabChange = (value: string) => {
    void navigate({
      search: (prev) => ({
        ...prev,
        tab: value as "applicants" | "posting",
      }),
    });
  };

  const onViewChange = (value: string) => {
    const nextView = value as ApplicantsView;
    void navigate({
      search: (prev) => ({
        ...prev,
        view: nextView === "ready" ? undefined : nextView,
        filter: nextView === "ready" ? undefined : prev.filter,
      }),
    });
  };
  const onFilterChange = (value: string) => {
    const nextFilter = value as ApplicantsFilter;
    void navigate({
      search: (prev) => ({
        ...prev,
        view: "all",
        filter: nextFilter === "all" ? undefined : nextFilter,
      }),
    });
  };

  const releasedReportApplicants = applicants.filter(
    (a: (typeof applicants)[number]) => a.reportReleasedAt !== null,
  );
  const heldForReleaseCount = applicants.filter(
    (a: (typeof applicants)[number]) =>
      a.status === "evaluated_held" || (a.reportId !== null && a.reportReleasedAt === null),
  ).length;
  const screeningApplicants = applicants.filter((a: (typeof applicants)[number]) => {
    return a.status === "pre_screening";
  });

  const filteredApplicants = applicants.filter((applicant) =>
    matchesJobApplicantsFilter(applicant, filter),
  );

  const applicantStatItems =
    tab === "applicants"
      ? [
          {
            value: `${reportProgress.delivered} of ${reportProgress.target}`,
            label: "Reports delivered",
          },
          { value: reportProgress.processing, label: "Reports pending" },
          {
            value: reportProgress.underway,
            label: reportProgress.underway === 1 ? "Active interview" : "Active interviews",
          },
          { value: reportProgress.waitlisted, label: "Awaiting invitation" },
        ]
      : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <h1 className="text-xl font-semibold tracking-tight">{job.title}</h1>
          <p className="text-sm text-muted-foreground">
            {tab === "posting"
              ? "Review and manage this job posting."
              : "Review and manage everyone who applied to this role."}
          </p>
          {applicantStatItems.length > 0 ? <PageInlineStats items={applicantStatItems} /> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {tab === "applicants" ? (
            <>
              <JobMetaChip
                icon={<HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} />}
                variant="secondary"
              >
                {applicants.length} applicant{applicants.length !== 1 ? "s" : ""}
              </JobMetaChip>
              <JobMetaChip
                icon={<HugeiconsIcon icon={Briefcase01Icon} strokeWidth={2} />}
                variant="outline"
              >
                {jobStatusLabels[job.status as JobStatus]}
              </JobMetaChip>
            </>
          ) : null}
          <CompanyJobActions job={job} requirements={requirements} />
        </div>
      </div>

      <Tabs value={tab} onValueChange={onPageTabChange}>
        <TabsList>
          <TabsTrigger value="applicants" className="gap-2">
            <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} className="size-4" />
            Applicants
            <Badge variant="secondary">{applicants.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="posting" className="gap-2">
            <HugeiconsIcon icon={Briefcase01Icon} strokeWidth={2} className="size-4" />
            Job posting
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "posting" ? (
        <CompanyJobPostingPanel job={job} />
      ) : (
        <ApplicantsTabContent
          applicants={applicants}
          reportProgress={reportProgress}
          view={view}
          filter={filter}
          releasedReportApplicants={releasedReportApplicants}
          heldForReleaseCount={heldForReleaseCount}
          screeningApplicants={screeningApplicants}
          filteredApplicants={filteredApplicants}
          onViewChange={onViewChange}
          onFilterChange={onFilterChange}
        />
      )}
    </div>
  );
}

function ApplicantsTabContent({
  applicants,
  reportProgress,
  view,
  filter,
  releasedReportApplicants,
  heldForReleaseCount,
  screeningApplicants,
  filteredApplicants,
  onViewChange,
  onFilterChange,
}: {
  applicants: JobApplicants;
  reportProgress: JobApplicantsView["reportProgress"];
  view: ApplicantsView;
  filter: ApplicantsFilter;
  releasedReportApplicants: JobApplicants;
  heldForReleaseCount: number;
  screeningApplicants: JobApplicants;
  filteredApplicants: JobApplicants;
  onViewChange: (value: string) => void;
  onFilterChange: (value: string) => void;
}) {
  return (
    <div className="space-y-5">
      {reportProgress.processing + reportProgress.underway > 0 ? (
        <EvaluationProgressAlert
          processing={reportProgress.processing}
          activeInterviews={reportProgress.underway}
        />
      ) : null}

      <Tabs value={view} onValueChange={onViewChange}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="ready" className="gap-2">
              <HugeiconsIcon icon={RankingIcon} strokeWidth={2} className="size-4" />
              Released reports
              <Badge variant="secondary">{releasedReportApplicants.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="all" className="gap-2">
              <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} className="size-4" />
              All applicants
              <Badge variant="secondary">{applicants.length}</Badge>
            </TabsTrigger>
          </TabsList>

          {view === "all" ? (
            <Select value={filter} onValueChange={onFilterChange}>
              <SelectTrigger className="w-52.5">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="screening">Screening</SelectItem>
                <SelectItem value="queued">Queued</SelectItem>
                <SelectItem value="active_interview">Active interview</SelectItem>
                <SelectItem value="awaiting_decision">Awaiting decision</SelectItem>
                <SelectItem value="shortlisted">Shortlisted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="withdrawn">Withdrawn</SelectItem>
                <SelectItem value="evaluation_failed">Evaluation failed</SelectItem>
              </SelectContent>
            </Select>
          ) : null}
        </div>
      </Tabs>

      {view === "ready" ? (
        <CompanyJobApplicantsList
          applicants={releasedReportApplicants}
          emptyTitle="No reports released yet"
          emptyDescription={
            heldForReleaseCount > 0
              ? `${heldForReleaseCount} candidate${heldForReleaseCount === 1 ? " has" : "s have"} finished interviews in the current batch. Ranked reports appear here when the batch completes and releases them to your team.`
              : "Ranked evaluation reports show up here once interviews finish and reports are released to your team."
          }
        />
      ) : (
        <CompanyJobApplicantsList
          applicants={filteredApplicants}
          emptyTitle={
            filter === "awaiting_decision" ? "No candidates awaiting decision" : undefined
          }
          emptyDescription={
            filter === "awaiting_decision"
              ? "Released reports waiting for a shortlist or reject decision will show up here."
              : undefined
          }
        />
      )}

      {view === "all" && filter === "screening" && screeningApplicants.length === 0 ? (
        <Empty className="rounded-2xl border-0 bg-muted/30">
          <EmptyHeader>
            <EmptyTitle>No applicants in screening</EmptyTitle>
            <EmptyDescription>
              Candidates in AI pre-screening will show up here while Zero reviews their profiles.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}
    </div>
  );
}

function EvaluationProgressAlert({
  processing,
  activeInterviews,
}: {
  processing: number;
  activeInterviews: number;
}) {
  const title = processing > 0 ? "Reports are on the way" : "Interviews are awaiting completion";

  return (
    <Alert className="border-border/60 bg-muted/30">
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        {processing > 0 ? (
          <>
            {processing} completed interview{processing === 1 ? " is" : "s are"} awaiting report
            delivery.
          </>
        ) : null}{" "}
        {activeInterviews > 0 ? (
          <>
            {activeInterviews} candidate{activeInterviews === 1 ? " has" : "s have"}{" "}
            {activeInterviews === 1 ? "an active interview" : "active interviews"}. If{" "}
            {activeInterviews === 1 ? "the candidate completes it" : "they complete them"}, the
            resulting {activeInterviews === 1 ? "report" : "reports"} will appear here
            automatically. Candidates who do not complete their interviews will not count toward
            your report target.
          </>
        ) : (
          <>Completed reports will appear here automatically when they are ready.</>
        )}
      </AlertDescription>
    </Alert>
  );
}
