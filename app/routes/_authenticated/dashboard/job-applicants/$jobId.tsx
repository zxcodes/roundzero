import { Briefcase01Icon, RankingIcon, UserGroupIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute, Link, notFound, redirect, useNavigate } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";

import { z } from "zod";
import { PageInlineStats } from "@/components/page-inline-stats";
import { DashboardJobApplicantsSkeleton } from "@/components/route-skeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
type JobActiveBatch = JobApplicantsView["activeBatch"];
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
type ApplicantsFilter =
  | "all"
  | "screening"
  | "queued"
  | "active_interview"
  | "awaiting_decision"
  | "shortlisted"
  | "rejected"
  | "withdrawn"
  | "evaluation_failed";

function JobApplicantsPage() {
  const { job, applicants, activeBatch } = Route.useLoaderData();
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
  const activeInterviewApplicants = applicants.filter(
    (a: (typeof applicants)[number]) =>
      a.status === "interview_invited" ||
      a.status === "interview_in_progress" ||
      a.status === "evaluated_held",
  );
  const screeningApplicants = applicants.filter((a: (typeof applicants)[number]) => {
    return a.status === "pre_screening";
  });

  const filteredApplicants = applicants.filter((a: (typeof applicants)[number]) => {
    if (filter === "all") return true;
    if (filter === "screening") return a.status === "pre_screening";
    if (filter === "queued") return a.status === "queued_for_batch";
    if (filter === "active_interview") {
      return (
        a.status === "interview_invited" ||
        a.status === "interview_in_progress" ||
        a.status === "evaluated_held"
      );
    }
    if (filter === "awaiting_decision") return a.status === "evaluated";
    if (filter === "shortlisted") return a.status === "shortlisted";
    if (filter === "rejected") return a.status === "rejected";
    if (filter === "withdrawn") return a.status === "withdrawn";
    return a.status === "evaluation_failed";
  });

  const applicantStatItems =
    tab === "applicants" && applicants.length > 0
      ? [
          { value: applicants.length, label: "applicants" },
          { value: releasedReportApplicants.length, label: "reports released" },
          { value: activeInterviewApplicants.length, label: "active interview" },
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
          activeBatch={activeBatch}
          view={view}
          filter={filter}
          releasedReportApplicants={releasedReportApplicants}
          heldForReleaseCount={heldForReleaseCount}
          activeInterviewApplicants={activeInterviewApplicants}
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
  activeBatch,
  view,
  filter,
  releasedReportApplicants,
  heldForReleaseCount,
  activeInterviewApplicants,
  screeningApplicants,
  filteredApplicants,
  onViewChange,
  onFilterChange,
}: {
  applicants: JobApplicants;
  activeBatch: JobActiveBatch;
  view: ApplicantsView;
  filter: ApplicantsFilter;
  releasedReportApplicants: JobApplicants;
  heldForReleaseCount: number;
  activeInterviewApplicants: JobApplicants;
  screeningApplicants: JobApplicants;
  filteredApplicants: JobApplicants;
  onViewChange: (value: string) => void;
  onFilterChange: (value: string) => void;
}) {
  return (
    <div className="space-y-5">
      {heldForReleaseCount > 0 ? (
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{heldForReleaseCount}</span> held until
          batch completes
        </p>
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
        <CompanyJobApplicantsList applicants={filteredApplicants} />
      )}

      {view === "all" && activeInterviewApplicants.length > 0 ? (
        <ActiveBatchPanel
          applicants={activeInterviewApplicants}
          batchId={activeBatch?.id ?? null}
        />
      ) : null}

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

function ActiveBatchPanel({
  applicants,
  batchId,
}: {
  applicants: JobApplicants;
  batchId: string | null;
}) {
  if (applicants.length === 0) {
    return (
      <Empty className="rounded-2xl border-0 bg-muted/30">
        <EmptyHeader>
          <EmptyTitle>No active batch</EmptyTitle>
          <EmptyDescription>Candidates will appear here when a batch is launched.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const completed = applicants.filter((a) => a.status === "evaluated_held").length;
  const inProgress = applicants.filter((a) => a.status === "interview_in_progress").length;
  const invited = applicants.filter((a) => a.status === "interview_invited").length;

  return (
    <section className="space-y-4 rounded-3xl border border-border/60 px-5 py-4 md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-base font-semibold tracking-tight">Batch in progress</h2>
          <p className="text-sm text-muted-foreground">
            {completed} of {applicants.length} completed · {inProgress} in progress · {invited}{" "}
            invited
          </p>
        </div>
        {batchId ? (
          <Button variant="outline" size="sm" asChild>
            <Link to="/dashboard/job-batches/$batchId" params={{ batchId }}>
              Open batch
            </Link>
          </Button>
        ) : null}
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${(completed / applicants.length) * 100}%` }}
        />
      </div>
    </section>
  );
}
