import {
  Add01Icon,
  Alert01Icon,
  Archive01Icon,
  Briefcase01Icon,
  Copy01Icon,
  InformationCircleIcon,
  Loading03Icon,
  Rocket01Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation } from "@tanstack/react-query";
import {
  Await,
  createFileRoute,
  Link,
  stripSearchParams,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { z } from "zod";

import { CompanyInboxPageShell } from "@/components/company-inbox-page-shell";
import { DeferredSection } from "@/components/deferred-section";
import { PaginationNav } from "@/components/pagination-nav";
import {
  CandidateJobsResultsSkeleton,
  CompanyJobsTableSkeleton,
} from "@/components/route-skeletons";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useEntitlements } from "@/features/entitlements/hooks/use-entitlements";
import { CandidateMatchFeed } from "@/features/job-matching/components/candidate-match-feed";
import { getMyCandidateMatches } from "@/features/job-matching/server/functions";
import { JobListRow } from "@/features/jobs/components/job-list-row";
import { isJobClosingSoon } from "@/features/jobs/components/job-status-badge";
import { canCopyPublicJobLink, copyPublicJobLink } from "@/features/jobs/copy-job-link";
import {
  getCandidateOpenJobsPaginated,
  getMyArchivedJobs,
  type getMyJobCounts,
  getMyJobsWithPipeline,
  publishJob,
} from "@/features/jobs/server/functions";
import { useDebouncedSearchInput } from "@/hooks/use-debounced-search-input";
import { formatDate, formatDaysLeft } from "@/shared/date";
import {
  type EmploymentType,
  employmentTypeLabels,
  employmentTypeSchema,
  experienceLevelLabels,
  experienceLevelSchema,
  type SalaryCurrency,
  salaryCurrencyLabels,
  salaryCurrencySchema,
  workplaceTypeLabels,
  workplaceTypeSchema,
} from "@/shared/enums";
import { SALARY_BRACKETS } from "@/shared/format";
import { publicJobUrl } from "@/shared/seo";

const searchDefaults = {
  tab: "active",
  candidateTab: "for-you",
  search: "",
  type: "all",
  level: "all",
  workplace: "all",
  salaryMin: 0,
  salaryCurrency: "all",
  company: "all",
  page: 1,
} as const;

const dashboardJobsSearchSchema = z.object({
  tab: z.enum(["active", "archived"]).default(searchDefaults.tab).catch(searchDefaults.tab),
  candidateTab: z
    .enum(["for-you", "all"])
    .default(searchDefaults.candidateTab)
    .catch(searchDefaults.candidateTab),
  search: z.string().default(searchDefaults.search).catch(searchDefaults.search),
  type: z.string().default(searchDefaults.type).catch(searchDefaults.type),
  level: z.string().default(searchDefaults.level).catch(searchDefaults.level),
  workplace: z.string().default(searchDefaults.workplace).catch(searchDefaults.workplace),
  salaryMin: z
    .number()
    .int()
    .min(0)
    .default(searchDefaults.salaryMin)
    .catch(searchDefaults.salaryMin),
  salaryCurrency: z
    .string()
    .default(searchDefaults.salaryCurrency)
    .catch(searchDefaults.salaryCurrency),
  company: z.string().default(searchDefaults.company).catch(searchDefaults.company),
  page: z.number().int().min(1).default(searchDefaults.page).catch(searchDefaults.page),
});

export const Route = createFileRoute("/_authenticated/dashboard/jobs/")({
  validateSearch: dashboardJobsSearchSchema,
  search: { middlewares: [stripSearchParams(searchDefaults)] },
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => {
    if (context.isCompany) {
      const jobs = deps.tab === "archived" ? getMyArchivedJobs() : getMyJobsWithPipeline();
      const counts = context.jobCounts ?? { openCount: 0, draftCount: 0, totalCount: 0 };
      return { type: "company" as const, jobs, counts };
    }
    if (deps.candidateTab === "for-you") {
      return {
        type: "candidate" as const,
        view: "for-you" as const,
        matches: getMyCandidateMatches(),
      };
    }
    return {
      type: "candidate" as const,
      view: "all" as const,
      paginatedJobs: getCandidateOpenJobsPaginated({
        data: {
          search: deps.search,
          type: deps.type,
          level: deps.level,
          workplace: deps.workplace,
          salaryMin: deps.salaryMin,
          salaryCurrency: deps.salaryCurrency,
          company: deps.company,
          page: deps.page,
        },
      }),
    };
  },
  component: JobsListPage,
});

const statusVariant = (status: string) => {
  switch (status) {
    case "open":
      return "default";
    case "draft":
      return "secondary";
    case "closed":
      return "outline";
    default:
      return "secondary";
  }
};

function JobsListPage() {
  const data = Route.useLoaderData();

  if (data.type === "company") {
    return <CompanyJobsList jobs={data.jobs} counts={data.counts} />;
  }

  return <CandidateJobsPage data={data} />;
}

type PipelineJob = Awaited<ReturnType<typeof getMyJobsWithPipeline>>[number];

type JobCounts = Awaited<ReturnType<typeof getMyJobCounts>>;

type CompanyJobs =
  | Awaited<ReturnType<typeof getMyJobsWithPipeline>>
  | Awaited<ReturnType<typeof getMyArchivedJobs>>;

function CompanyJobsList({ jobs, counts }: { jobs: Promise<CompanyJobs>; counts: JobCounts }) {
  const router = useRouter();
  const { tab } = Route.useSearch();
  const navigate = useNavigate({ from: "/dashboard/jobs/" });
  const entitlements = useEntitlements();
  const jobLimit = entitlements?.jobs.active.limit ?? counts.openCount;
  const atLimit = entitlements?.jobs.active.atLimit ?? false;

  const publishJobFn = useServerFn(publishJob);
  const publishJobMutation = useMutation({
    mutationFn: publishJobFn,
    onSuccess: async () => {
      toast.success("Job published successfully");
      await router.invalidate();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to publish job.");
    },
  });

  const onPublish = async (jobId: string) => {
    await publishJobMutation.mutateAsync({ data: { id: jobId } });
  };

  const onTabChange = (value: string) => {
    void navigate({ search: { tab: value as "active" | "archived" } });
  };

  const statItems = [
    { value: counts.openCount, label: counts.openCount === 1 ? "open job" : "open jobs" },
    { value: counts.draftCount, label: counts.draftCount === 1 ? "draft" : "drafts" },
    { value: counts.totalCount, label: "total" },
  ];

  return (
    <CompanyInboxPageShell
      title="Jobs"
      description="Manage your job postings and track applicants."
      statItems={statItems}
      headerAction={
        <Button size="sm" asChild>
          <Link to="/dashboard/jobs/new" className="no-underline hover:no-underline">
            <HugeiconsIcon icon={Add01Icon} strokeWidth={2} className="size-3.5" />
            Post a job
          </Link>
        </Button>
      }
    >
      {atLimit ? (
        <Alert variant="destructive">
          <AlertTitle>
            Job limit reached ({counts.openCount} of {jobLimit} active jobs)
          </AlertTitle>
          <AlertDescription>
            You've used all your active job slots on your current plan. Archive an existing job or{" "}
            <Link to="/dashboard/billing" className="font-medium underline underline-offset-4">
              upgrade your plan
            </Link>{" "}
            to post more.
          </AlertDescription>
        </Alert>
      ) : null}

      <Tabs value={tab} onValueChange={onTabChange}>
        <TabsList>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="archived">
            <HugeiconsIcon icon={Archive01Icon} strokeWidth={2} className="size-3.5" />
            Archived
          </TabsTrigger>
        </TabsList>

        <DeferredSection
          promise={jobs}
          resetKey={tab}
          fallback={<CompanyJobsTableSkeleton />}
          sectionLabel="jobs"
        >
          {(resolvedJobs) => (
            <>
              <TabsContent value="active">
                <ActiveJobsTable
                  jobs={tab === "active" ? (resolvedJobs as PipelineJob[]) : []}
                  onPublish={onPublish}
                  isPending={publishJobMutation.isPending}
                  atLimit={atLimit}
                  jobLimit={jobLimit}
                />
              </TabsContent>

              <TabsContent value="archived">
                <ArchivedJobsTable
                  jobs={tab === "archived" ? resolvedJobs : []}
                  isLoading={false}
                />
              </TabsContent>
            </>
          )}
        </DeferredSection>
      </Tabs>
    </CompanyInboxPageShell>
  );
}

const STALE_DAYS = 7;

const isStaleJob = (job: PipelineJob) => {
  if (job.status !== "open" || job.totalApplicants > 0) {
    return false;
  }
  const age = Date.now() - new Date(job.createdAt).getTime();
  return age > STALE_DAYS * 24 * 60 * 60 * 1000;
};

function ActiveJobsTable({
  jobs,
  onPublish,
  isPending,
  atLimit,
  jobLimit,
}: {
  jobs: PipelineJob[];
  onPublish: (jobId: string) => Promise<void>;
  isPending: boolean;
  atLimit: boolean;
  jobLimit: number;
}) {
  if (jobs.length === 0) {
    return (
      <Empty className="rounded-2xl border-0 bg-muted/30">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <HugeiconsIcon icon={Briefcase01Icon} strokeWidth={2} />
          </EmptyMedia>
          <EmptyTitle>No active jobs</EmptyTitle>
          <EmptyDescription>
            Create your first job posting to start receiving applications.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button size="sm" asChild>
            <Link to="/dashboard/jobs/new">
              <HugeiconsIcon icon={Add01Icon} strokeWidth={2} className="size-3.5" />
              Post a job
            </Link>
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="min-w-0 overflow-hidden rounded-3xl border border-border/60">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-48">Title</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Applicants</TableHead>
            <TableHead className="text-right">Reports</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Expires</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job) => {
            const stale = isStaleJob(job);
            const closingLabel = formatDaysLeft(job.expiresAt);
            const closingSoon = isJobClosingSoon(job);

            const onPublishClick = () => {
              void onPublish(job.id);
            };

            const showCopyLink = canCopyPublicJobLink(job);

            const onCopyLinkClick = () => {
              void copyPublicJobLink(job.id);
            };

            return (
              <TableRow key={job.id}>
                <TableCell className="whitespace-normal">
                  <div className="space-y-0.5">
                    <Link
                      to="/dashboard/job-applicants/$jobId"
                      params={{ jobId: job.id }}
                      className="font-medium hover:underline"
                    >
                      {job.title}
                    </Link>
                    {job.location ? (
                      <p className="text-xs text-muted-foreground">{job.location}</p>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <Badge variant={statusVariant(job.status)} className="capitalize">
                      {job.status}
                    </Badge>
                    {stale ? (
                      <span
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-warning"
                        title={`Open ${STALE_DAYS}+ days with no applicants`}
                      >
                        <HugeiconsIcon icon={Alert01Icon} strokeWidth={2.5} className="size-3" />
                        Stale
                      </span>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums">
                  {job.totalApplicants > 0 ? job.totalApplicants : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <JobReportsCell job={job} />
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatDate(job.createdAt)}
                </TableCell>
                <TableCell
                  className={`text-xs ${closingSoon ? "font-medium text-destructive" : "text-muted-foreground"}`}
                >
                  {closingLabel ?? "—"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {job.status === "draft" ? (
                      atLimit ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <Button variant="outline" size="sm" disabled>
                                <HugeiconsIcon
                                  icon={Rocket01Icon}
                                  strokeWidth={2}
                                  className="size-3.5"
                                />
                                Publish
                              </Button>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              You've reached the {jobLimit} active job limit on your current plan
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={onPublishClick}
                          disabled={isPending}
                        >
                          {isPending ? (
                            <HugeiconsIcon
                              icon={Loading03Icon}
                              strokeWidth={2}
                              className="size-3.5 animate-spin"
                            />
                          ) : (
                            <HugeiconsIcon
                              icon={Rocket01Icon}
                              strokeWidth={2}
                              className="size-3.5"
                            />
                          )}
                          {isPending ? "Publishing" : "Publish"}
                        </Button>
                      )
                    ) : null}
                    {showCopyLink ? (
                      <>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="outline" size="sm" onClick={onCopyLinkClick}>
                              <HugeiconsIcon
                                icon={Copy01Icon}
                                strokeWidth={2}
                                className="size-3.5"
                              />
                              Copy link
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Copy public job link</p>
                          </TooltipContent>
                        </Tooltip>
                        <Button variant="outline" size="sm" asChild>
                          <a href={publicJobUrl(job.id)} target="_blank" rel="noopener noreferrer">
                            Open
                          </a>
                        </Button>
                      </>
                    ) : null}
                    <Button variant="outline" size="sm" asChild>
                      <Link
                        to="/dashboard/job-applicants/$jobId"
                        params={{ jobId: job.id }}
                        search={{ tab: "posting" }}
                      >
                        Job posting
                      </Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function JobReportsCell({ job }: { job: PipelineJob }) {
  if (job.reportsReadyCount === 0 && job.evaluatedHeldCount === 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  return (
    <div className="space-y-0.5 text-right">
      {job.reportsReadyCount > 0 ? (
        <span className="text-sm tabular-nums">{job.reportsReadyCount}</span>
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      )}
      {job.evaluatedHeldCount > 0 ? (
        <p className="text-[11px] text-muted-foreground">{job.evaluatedHeldCount} evaluating</p>
      ) : null}
    </div>
  );
}

function ArchivedJobsTable({
  jobs,
  isLoading,
}: {
  jobs: Awaited<ReturnType<typeof getMyArchivedJobs>>;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed py-16">
        <p className="text-sm text-muted-foreground">Loading archived jobs...</p>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <Empty className="rounded-2xl border-0 bg-muted/30">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <HugeiconsIcon icon={Archive01Icon} strokeWidth={2} />
          </EmptyMedia>
          <EmptyTitle>No archived jobs</EmptyTitle>
          <EmptyDescription>Archived jobs will appear here.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="min-w-0 overflow-hidden rounded-3xl border border-border/60">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-48">Title</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Archived</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job) => (
            <TableRow key={job.id} className="opacity-70">
              <TableCell className="whitespace-normal font-medium">
                <Link
                  to="/dashboard/job-applicants/$jobId"
                  params={{ jobId: job.id }}
                  className="hover:underline"
                >
                  {job.title}
                </Link>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {job.location || "\u2014"}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {job.employmentType
                  ? employmentTypeLabels[job.employmentType as EmploymentType]
                  : "\u2014"}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {job.archivedAt ? formatDate(job.archivedAt) : "\u2014"}
              </TableCell>
              <TableCell className="text-right text-xs text-muted-foreground">{"\u2014"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

type PaginatedJobs = Awaited<ReturnType<typeof getCandidateOpenJobsPaginated>>;

type CandidateRouteData =
  | {
      type: "candidate";
      view: "for-you";
      matches: ReturnType<typeof getMyCandidateMatches>;
    }
  | {
      type: "candidate";
      view: "all";
      paginatedJobs: ReturnType<typeof getCandidateOpenJobsPaginated>;
    };

function CandidateJobsPage({ data }: { data: CandidateRouteData }) {
  const { candidateTab } = Route.useSearch();
  const navigate = useNavigate({ from: "/dashboard/jobs/" });
  const onTabChange = (value: string) => {
    void navigate({
      search: (previous) => ({
        ...previous,
        candidateTab: value as "for-you" | "all",
        page: 1,
      }),
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Jobs</h1>
        <p className="text-sm text-muted-foreground">
          Personalized recommendations and every open role.
        </p>
      </section>
      <Tabs value={candidateTab} onValueChange={onTabChange}>
        <TabsList>
          <TabsTrigger value="for-you">For you</TabsTrigger>
          <TabsTrigger value="all">All jobs</TabsTrigger>
        </TabsList>
      </Tabs>
      {data.view === "for-you" ? (
        <DeferredSection
          promise={data.matches}
          resetKey="for-you"
          fallback={<CandidateJobsResultsSkeleton />}
          sectionLabel="matches"
        >
          {(matches) => <CandidateMatchFeed data={matches} />}
        </DeferredSection>
      ) : (
        <CandidateJobsList paginatedJobs={data.paginatedJobs} />
      )}
    </div>
  );
}

function CandidateJobsList({ paginatedJobs }: { paginatedJobs: Promise<PaginatedJobs> }) {
  const {
    search,
    type: typeFilter,
    level: levelFilter,
    workplace: workplaceFilter,
    salaryMin,
    salaryCurrency,
    company: companyFilter,
    page,
  } = Route.useSearch();
  const navigate = useNavigate({ from: "/dashboard/jobs/" });

  const hasFilters = Boolean(
    search ||
    typeFilter !== "all" ||
    levelFilter !== "all" ||
    workplaceFilter !== "all" ||
    salaryCurrency !== "all" ||
    companyFilter !== "all" ||
    salaryMin > 0,
  );
  const brackets =
    SALARY_BRACKETS[(salaryCurrency === "all" ? "USD" : salaryCurrency) as SalaryCurrency] ??
    SALARY_BRACKETS.USD;

  const [searchInput, onSearchInputChange] = useDebouncedSearchInput(search, (next) => {
    void navigate({ search: (prev) => ({ ...prev, search: next, page: 1 }) });
  });

  const onTypeChange = (value: string) => {
    void navigate({ search: (prev) => ({ ...prev, type: value, page: 1 }) });
  };

  const onLevelChange = (value: string) => {
    void navigate({ search: (prev) => ({ ...prev, level: value, page: 1 }) });
  };

  const onWorkplaceChange = (value: string) => {
    void navigate({ search: (prev) => ({ ...prev, workplace: value, page: 1 }) });
  };

  const onCompanyChange = (value: string) => {
    void navigate({ search: (prev) => ({ ...prev, company: value, page: 1 }) });
  };

  const onCurrencyChange = (value: string) => {
    void navigate({
      search: (prev) => ({ ...prev, salaryCurrency: value, salaryMin: 0, page: 1 }),
    });
  };

  const onSalaryChange = (value: string) => {
    void navigate({ search: (prev) => ({ ...prev, salaryMin: Number(value), page: 1 }) });
  };

  const resultsResetKey = `${typeFilter}-${levelFilter}-${workplaceFilter}-${salaryMin}-${salaryCurrency}-${companyFilter}-${page}`;

  return (
    <div className="space-y-6">
      <section className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Browse roles</h1>
        <p className="text-sm text-muted-foreground">Find open positions and apply.</p>
        <p className="flex items-center gap-1.5 pt-1 text-xs text-muted-foreground">
          <HugeiconsIcon icon={InformationCircleIcon} strokeWidth={2} className="size-3.5" />
          Jobs you’ve already applied to are hidden.
        </p>
      </section>

      <section className="space-y-5">
        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 shrink-0 sm:shrink">
            <HugeiconsIcon
              icon={Search01Icon}
              strokeWidth={2}
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              placeholder="Search by title, company, or location..."
              value={searchInput}
              onChange={onSearchInputChange}
              className="pl-10"
            />
          </div>
          <ScrollArea orientation="horizontal" className="h-9">
            <div className="flex gap-3">
              <Await
                promise={paginatedJobs}
                fallback={
                  <Select disabled>
                    <SelectTrigger className="w-44 shrink-0">
                      <SelectValue placeholder="Company" />
                    </SelectTrigger>
                  </Select>
                }
              >
                {(data) => {
                  const hasSelectedCompany = data.companies.some(
                    (company) => company.slug === companyFilter,
                  );
                  const showStaleCompany = companyFilter !== "all" && !hasSelectedCompany;

                  return (
                    <Select value={companyFilter} onValueChange={onCompanyChange}>
                      <SelectTrigger className="w-44 shrink-0">
                        <SelectValue placeholder="Company" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="all">All companies</SelectItem>
                          {showStaleCompany ? (
                            <SelectItem value={companyFilter}>Unknown company</SelectItem>
                          ) : null}
                          {data.companies.map((company) => (
                            <SelectItem key={company.slug} value={company.slug}>
                              {company.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  );
                }}
              </Await>
              <Select value={typeFilter} onValueChange={onTypeChange}>
                <SelectTrigger className="w-36 shrink-0">
                  <SelectValue placeholder="Job type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {employmentTypeSchema.options.map((value) => (
                    <SelectItem key={value} value={value}>
                      {employmentTypeLabels[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={levelFilter} onValueChange={onLevelChange}>
                <SelectTrigger className="w-36 shrink-0">
                  <SelectValue placeholder="Experience" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All levels</SelectItem>
                  {experienceLevelSchema.options.map((value) => (
                    <SelectItem key={value} value={value}>
                      {experienceLevelLabels[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={workplaceFilter} onValueChange={onWorkplaceChange}>
                <SelectTrigger className="w-36 shrink-0">
                  <SelectValue placeholder="Workplace" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All workplaces</SelectItem>
                  {workplaceTypeSchema.options.map((value) => (
                    <SelectItem key={value} value={value}>
                      {workplaceTypeLabels[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={salaryCurrency} onValueChange={onCurrencyChange}>
                <SelectTrigger className="w-36 shrink-0">
                  <SelectValue placeholder="Currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All currencies</SelectItem>
                  {salaryCurrencySchema.options.map((value) => (
                    <SelectItem key={value} value={value}>
                      {salaryCurrencyLabels[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(salaryMin)} onValueChange={onSalaryChange}>
                <SelectTrigger className="w-36 shrink-0">
                  <SelectValue placeholder="Salary" />
                </SelectTrigger>
                <SelectContent>
                  {brackets.map((bracket) => (
                    <SelectItem key={bracket.value} value={bracket.value}>
                      {bracket.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </ScrollArea>
        </div>

        <DeferredSection
          promise={paginatedJobs}
          resetKey={resultsResetKey}
          fallback={<CandidateJobsResultsSkeleton />}
          sectionLabel="job listings"
        >
          {(data) => <CandidateJobsResults data={data} page={page} hasFilters={hasFilters} />}
        </DeferredSection>
      </section>
    </div>
  );
}

function CandidateJobsResults({
  data,
  page,
  hasFilters,
}: {
  data: PaginatedJobs;
  page: number;
  hasFilters: boolean;
}) {
  const hasAppliedToAll = data.total === 0 && data.totalIncludingApplied > 0;

  return (
    <>
      <p className="text-xs font-medium text-muted-foreground">
        {data.total} {data.total === 1 ? "position" : "positions"}
        {hasFilters ? " matching your filters" : ""}
      </p>

      {data.items.length === 0 ? (
        <Empty className="rounded-2xl border-0 bg-muted/30">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HugeiconsIcon icon={Briefcase01Icon} strokeWidth={2} />
            </EmptyMedia>
            <EmptyTitle>
              {hasAppliedToAll
                ? hasFilters
                  ? "You’ve applied to all matching roles"
                  : "You’ve applied to all available roles"
                : hasFilters
                  ? "No jobs found"
                  : "No open jobs"}
            </EmptyTitle>
            <EmptyDescription>
              {hasAppliedToAll
                ? hasFilters
                  ? "Try adjusting your search or filters to discover other opportunities."
                  : "You’re all caught up. New openings will appear here when they’re posted."
                : hasFilters
                  ? "Try adjusting your search or filters."
                  : "There are no open positions right now. Check back later."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="divide-y divide-border/50 overflow-hidden rounded-3xl border border-border/60">
          {data.items.map((job) => (
            <JobListRow key={job.id} job={job} jobTo="/dashboard/jobs/$jobId" showCompanyName />
          ))}
        </div>
      )}

      <PaginationNav currentPage={page} totalPages={data.totalPages} />
    </>
  );
}
