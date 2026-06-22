import { Briefcase01Icon, RankingIcon, UserGroupIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute, Link, notFound, redirect, useNavigate } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { useState } from "react";
import { z } from "zod";
import { DashboardJobApplicantsSkeleton } from "@/components/route-skeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompanyJobApplicantsList } from "@/features/applications/components/company-job-applicants-list";
import { getJobApplicants } from "@/features/applications/server/functions";
import { getActiveBatchForJobServer } from "@/features/batches/server/functions";
import {
  CompanyJobActions,
  CompanyJobPostingPanel,
} from "@/features/jobs/components/company-job-posting-panel";
import { getJob } from "@/features/jobs/server/functions";
import type { JobStatus } from "@/shared/enums";
import { validateUuidParams } from "@/shared/validation";

type JobDetail = NonNullable<Awaited<ReturnType<typeof getJob>>>;
const jobStatusLabels = {
  draft: "Draft",
  open: "Open",
  closed: "Closed",
} as const;

const searchDefaults = { tab: "applicants" } as const;

const jobApplicantsSearchSchema = z.object({
  tab: z.enum(["applicants", "posting"]).default(searchDefaults.tab).catch(searchDefaults.tab),
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
    const jobResult = await getJob({ data: { id: params.jobId } });
    if (!jobResult) {
      throw notFound();
    }
    const job: JobDetail = jobResult;

    const [applicants, activeBatch] = await Promise.all([
      getJobApplicants({ data: { jobId: params.jobId } }),
      getActiveBatchForJobServer({ data: { jobId: params.jobId } }),
    ]);
    return { job, applicants, activeBatch };
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
  const { tab } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [view, setView] = useState<ApplicantsView>("ready");
  const [filter, setFilter] = useState<ApplicantsFilter>("all");

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
    setView(value as ApplicantsView);
  };
  const onFilterChange = (value: string) => {
    setFilter(value as ApplicantsFilter);
  };

  const readyForDecisionApplicants = applicants.filter(
    (a: (typeof applicants)[number]) => a.reportReleasedAt !== null,
  );
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">{job.title}</h2>
          <p className="text-sm text-muted-foreground">
            {tab === "posting"
              ? "Review and manage this job posting."
              : "Review and manage everyone who applied to this role."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {tab === "applicants" ? (
            <>
              <Badge variant="secondary" className="gap-1">
                <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} className="size-3" />
                {applicants.length} applicant{applicants.length !== 1 ? "s" : ""}
              </Badge>
              <Badge variant="outline" className="gap-1 text-[11px]">
                <HugeiconsIcon icon={Briefcase01Icon} strokeWidth={2} className="size-3" />
                {jobStatusLabels[job.status as JobStatus]}
              </Badge>
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
          readyForDecisionApplicants={readyForDecisionApplicants}
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
  readyForDecisionApplicants,
  activeInterviewApplicants,
  screeningApplicants,
  filteredApplicants,
  onViewChange,
  onFilterChange,
}: {
  applicants: Awaited<ReturnType<typeof getJobApplicants>>;
  activeBatch: Awaited<ReturnType<typeof getActiveBatchForJobServer>>;
  view: ApplicantsView;
  filter: ApplicantsFilter;
  readyForDecisionApplicants: Awaited<ReturnType<typeof getJobApplicants>>;
  activeInterviewApplicants: Awaited<ReturnType<typeof getJobApplicants>>;
  screeningApplicants: Awaited<ReturnType<typeof getJobApplicants>>;
  filteredApplicants: Awaited<ReturnType<typeof getJobApplicants>>;
  onViewChange: (value: string) => void;
  onFilterChange: (value: string) => void;
}) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        <Card size="sm" className="border-border/60">
          <CardContent className="py-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Total applicants
            </p>
            <p className="mt-1 font-mono text-xl font-semibold">{applicants.length}</p>
          </CardContent>
        </Card>
        <Card size="sm" className="border-border/60">
          <CardContent className="py-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Ready for decision
            </p>
            <p className="mt-1 font-mono text-xl font-semibold">
              {readyForDecisionApplicants.length}
            </p>
          </CardContent>
        </Card>
        <Card size="sm" className="border-border/60">
          <CardContent className="py-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Active interview
            </p>
            <p className="mt-1 font-mono text-xl font-semibold">
              {activeInterviewApplicants.length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={view} onValueChange={onViewChange}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="ready" className="gap-2">
              <HugeiconsIcon icon={RankingIcon} strokeWidth={2} className="size-4" />
              Ready for decision
              <Badge variant="secondary">{readyForDecisionApplicants.length}</Badge>
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
        <CompanyJobApplicantsList applicants={readyForDecisionApplicants} />
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
        <Card className="border-dashed border-border/60">
          <CardContent className="py-6 text-center">
            <p className="text-sm text-muted-foreground">No applicants in screening right now.</p>
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}

function ActiveBatchPanel({
  applicants,
  batchId,
}: {
  applicants: Awaited<ReturnType<typeof getJobApplicants>>;
  batchId: string | null;
}) {
  if (applicants.length === 0) {
    return (
      <Card className="border-dashed border-border/60">
        <CardContent className="py-6 text-center">
          <p className="text-sm text-muted-foreground">No active batch right now.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Candidates will appear here when a batch is launched.
          </p>
        </CardContent>
      </Card>
    );
  }

  const completed = applicants.filter((a) => a.status === "evaluated_held").length;
  const inProgress = applicants.filter((a) => a.status === "interview_in_progress").length;
  const invited = applicants.filter((a) => a.status === "interview_invited").length;

  return (
    <div className="space-y-4">
      <Card size="sm" className="border-border/60">
        <CardContent className="space-y-3 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Batch in progress</p>
              <p className="text-xs text-muted-foreground">
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
        </CardContent>
      </Card>
    </div>
  );
}
