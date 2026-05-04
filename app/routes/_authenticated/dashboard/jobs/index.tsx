import {
  Add01Icon,
  Alert01Icon,
  Archive01Icon,
  Briefcase01Icon,
  Location01Icon,
  MoneyBag02Icon,
  Rocket01Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation } from "@tanstack/react-query";
import {
  createFileRoute,
  Link,
  stripSearchParams,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { z } from "zod";
import { PaginationNav } from "@/components/pagination-nav";
import { DashboardJobsListSkeleton } from "@/components/route-skeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
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
import {
  getMyArchivedJobs,
  getMyJobsWithPipeline,
  getOpenJobsPaginated,
  publishJob,
} from "@/features/jobs/server/functions";
import { formatDate } from "@/shared/date";
import {
  type EmploymentType,
  type ExperienceLevel,
  employmentTypeLabels,
  employmentTypeSchema,
  experienceLevelLabels,
  experienceLevelSchema,
  type SalaryCurrency,
  salaryCurrencyLabels,
  salaryCurrencySchema,
  type WorkplaceType,
  workplaceTypeLabels,
  workplaceTypeSchema,
} from "@/shared/enums";
import { formatSalary, SALARY_BRACKETS } from "@/shared/format";

const searchDefaults = {
  tab: "active",
  search: "",
  type: "all",
  level: "all",
  workplace: "all",
  salaryMin: 0,
  salaryCurrency: "all",
  page: 1,
} as const;

const dashboardJobsSearchSchema = z.object({
  tab: z.enum(["active", "archived"]).default(searchDefaults.tab).catch(searchDefaults.tab),
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
  page: z.number().int().min(1).default(searchDefaults.page).catch(searchDefaults.page),
});

export const Route = createFileRoute("/_authenticated/dashboard/jobs/")({
  validateSearch: dashboardJobsSearchSchema,
  search: { middlewares: [stripSearchParams(searchDefaults)] },
  loaderDeps: ({ search }) => search,
  loader: async ({ context, deps }) => {
    if (context.isCompany) {
      const jobs =
        deps.tab === "archived" ? await getMyArchivedJobs() : await getMyJobsWithPipeline();
      return { type: "company" as const, jobs };
    }
    const paginatedJobs = await getOpenJobsPaginated({
      data: {
        search: deps.search,
        type: deps.type,
        level: deps.level,
        workplace: deps.workplace,
        salaryMin: deps.salaryMin,
        salaryCurrency: deps.salaryCurrency,
        page: deps.page,
      },
    });
    return { type: "candidate" as const, paginatedJobs };
  },
  pendingComponent: DashboardJobsListSkeleton,
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
    return <CompanyJobsList jobs={data.jobs} />;
  }

  return <CandidateJobsList data={data.paginatedJobs} />;
}

type PipelineJob = Awaited<ReturnType<typeof getMyJobsWithPipeline>>[number];

function CompanyJobsList({
  jobs,
}: {
  jobs:
    | Awaited<ReturnType<typeof getMyJobsWithPipeline>>
    | Awaited<ReturnType<typeof getMyArchivedJobs>>;
}) {
  const router = useRouter();
  const { tab } = Route.useSearch();
  const navigate = useNavigate({ from: "/dashboard/jobs/" });

  const publishJobFn = useServerFn(publishJob);
  const publishJobMutation = useMutation({
    mutationFn: publishJobFn,
    onSuccess: async () => {
      toast.success("Job published successfully");
      await router.invalidate();
    },
    onError: () => {
      toast.error("Failed to publish job. Please try again.");
    },
  });

  const onPublish = async (jobId: string) => {
    await publishJobMutation.mutateAsync({ data: { id: jobId } });
  };

  const onTabChange = (value: string) => {
    void navigate({ search: { tab: value as "active" | "archived" } });
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Jobs</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your job postings and track applicants.
          </p>
        </div>
        <Button asChild>
          <Link to="/dashboard/jobs/new">
            <HugeiconsIcon icon={Add01Icon} strokeWidth={2} className="size-4" />
            Post a job
          </Link>
        </Button>
      </div>

      <Tabs value={tab} onValueChange={onTabChange}>
        <TabsList>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="archived">
            <HugeiconsIcon icon={Archive01Icon} strokeWidth={2} className="size-3.5" />
            Archived
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <ActiveJobsTable
            jobs={tab === "active" ? (jobs as PipelineJob[]) : []}
            onPublish={onPublish}
            isPending={publishJobMutation.isPending}
          />
        </TabsContent>

        <TabsContent value="archived">
          <ArchivedJobsTable jobs={tab === "archived" ? jobs : []} isLoading={false} />
        </TabsContent>
      </Tabs>
    </div>
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

const pipelineSegments = [
  { key: "appliedCount", label: "Applied", tone: "bg-info" },
  { key: "preScreeningCount", label: "Pre-screening", tone: "bg-pending" },
  { key: "interviewInvitedCount", label: "Interview invited", tone: "bg-active" },
  { key: "interviewInProgressCount", label: "In progress", tone: "bg-warning" },
  { key: "evaluatedCount", label: "Evaluated", tone: "bg-success" },
  { key: "shortlistedCount", label: "Shortlisted", tone: "bg-progress" },
  { key: "rejectedCount", label: "Closed", tone: "bg-danger" },
] as const;

function ActiveJobsTable({
  jobs,
  onPublish,
  isPending,
}: {
  jobs: PipelineJob[];
  onPublish: (jobId: string) => Promise<void>;
  isPending: boolean;
}) {
  if (jobs.length === 0) {
    return (
      <Empty className="border">
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
    <div className="overflow-hidden rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Pipeline</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job) => {
            const stale = isStaleJob(job);

            const onPublishClick = () => {
              void onPublish(job.id);
            };

            return (
              <TableRow key={job.id}>
                <TableCell>
                  <div className="space-y-0.5">
                    <Link
                      to="/dashboard/jobs/$jobId"
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
                <TableCell>
                  <PipelineSummary job={job} />
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {formatDate(job.createdAt)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {job.status === "draft" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onPublishClick}
                        disabled={isPending}
                      >
                        <HugeiconsIcon icon={Rocket01Icon} strokeWidth={2} className="size-3.5" />
                        Publish
                      </Button>
                    ) : null}
                    <Button variant="outline" size="sm" asChild>
                      <Link to="/dashboard/job-applicants/$jobId" params={{ jobId: job.id }}>
                        Applicants
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link to="/dashboard/jobs/$jobId" params={{ jobId: job.id }}>
                        View
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

function PipelineSummary({ job }: { job: PipelineJob }) {
  if (job.totalApplicants === 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  const activeSegments = pipelineSegments.filter((s) => job[s.key] > 0);

  return (
    <div className="flex items-center gap-2">
      {activeSegments.map((segment, i) => (
        <span
          key={segment.key}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
        >
          {i > 0 ? <span className="text-border">·</span> : null}
          <span className={`size-1.5 rounded-full ${segment.tone}`} />
          <span className="tabular-nums">{job[segment.key]}</span>
          {segment.label.toLowerCase()}
        </span>
      ))}
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
      <Empty className="border">
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
    <div className="overflow-hidden rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Archived</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job) => (
            <TableRow key={job.id} className="opacity-70">
              <TableCell className="font-medium">
                <Link
                  to="/dashboard/jobs/$jobId"
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
              <TableCell className="font-mono text-xs text-muted-foreground">
                {job.archivedAt ? formatDate(job.archivedAt) : "\u2014"}
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/dashboard/jobs/$jobId" params={{ jobId: job.id }}>
                    View
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function CandidateJobsList({ data }: { data: Awaited<ReturnType<typeof getOpenJobsPaginated>> }) {
  const {
    search,
    type: typeFilter,
    level: levelFilter,
    workplace: workplaceFilter,
    salaryMin,
    salaryCurrency,
    page,
  } = Route.useSearch();
  const navigate = useNavigate({ from: "/dashboard/jobs/" });

  const hasFilters =
    search ||
    typeFilter !== "all" ||
    levelFilter !== "all" ||
    workplaceFilter !== "all" ||
    salaryCurrency !== "all" ||
    salaryMin > 0;
  const brackets =
    SALARY_BRACKETS[(salaryCurrency === "all" ? "USD" : salaryCurrency) as SalaryCurrency] ??
    SALARY_BRACKETS.USD;

  const onSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    void navigate({ search: (prev) => ({ ...prev, search: e.target.value, page: 1 }) });
  };

  const onTypeChange = (value: string) => {
    void navigate({ search: (prev) => ({ ...prev, type: value, page: 1 }) });
  };

  const onLevelChange = (value: string) => {
    void navigate({ search: (prev) => ({ ...prev, level: value, page: 1 }) });
  };

  const onWorkplaceChange = (value: string) => {
    void navigate({ search: (prev) => ({ ...prev, workplace: value, page: 1 }) });
  };

  const onCurrencyChange = (value: string) => {
    void navigate({
      search: (prev) => ({ ...prev, salaryCurrency: value, salaryMin: 0, page: 1 }),
    });
  };

  const onSalaryChange = (value: string) => {
    void navigate({ search: (prev) => ({ ...prev, salaryMin: Number(value), page: 1 }) });
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Browse Jobs</h2>
        <p className="mt-1 text-sm text-muted-foreground">Find open positions and apply.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <HugeiconsIcon
            icon={Search01Icon}
            strokeWidth={2}
            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Search by title, company, or location..."
            value={search}
            onChange={onSearchInputChange}
            className="pl-10"
          />
        </div>
        <Select value={typeFilter} onValueChange={onTypeChange}>
          <SelectTrigger className="w-full sm:w-36">
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
          <SelectTrigger className="w-full sm:w-36">
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
          <SelectTrigger className="w-full sm:w-36">
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
          <SelectTrigger className="w-full sm:w-36">
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
          <SelectTrigger className="w-full sm:w-36">
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

      {/* Results count */}
      <p className="text-xs font-medium text-muted-foreground">
        {data.total} {data.total === 1 ? "position" : "positions"}
        {hasFilters ? " matching your filters" : ""}
      </p>

      {data.items.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HugeiconsIcon icon={Briefcase01Icon} strokeWidth={2} />
            </EmptyMedia>
            <EmptyTitle>{hasFilters ? "No jobs found" : "No open jobs"}</EmptyTitle>
            <EmptyDescription>
              {hasFilters
                ? "Try adjusting your search or filters."
                : "There are no open positions right now. Check back later."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.items.map((job, i) => {
            const salary = formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency);
            return (
              <Link
                key={job.id}
                to="/dashboard/jobs/$jobId"
                params={{ jobId: job.id }}
                className={`animate-fade-in stagger-${Math.min(i + 1, 6)}`}
              >
                <Card className="group h-full ring-foreground/5 transition-all duration-200 hover:ring-primary/30 hover:shadow-md hover:shadow-primary/5">
                  <CardContent className="flex h-full flex-col space-y-3">
                    <div>
                      <p className="text-sm font-semibold transition-colors group-hover:text-primary">
                        {job.title}
                      </p>
                      <p className="text-xs text-muted-foreground">{job.companyName}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                      {job.location ? (
                        <span className="inline-flex items-center gap-1">
                          <HugeiconsIcon
                            icon={Location01Icon}
                            strokeWidth={2}
                            className="size-3.5"
                          />
                          {job.location}
                        </span>
                      ) : null}
                      {salary ? (
                        <span className="inline-flex items-center gap-1">
                          <HugeiconsIcon
                            icon={MoneyBag02Icon}
                            strokeWidth={2}
                            className="size-3.5"
                          />
                          {salary}
                        </span>
                      ) : null}
                    </div>

                    {job.description ? (
                      <p className="line-clamp-2 flex-1 text-[13px] leading-relaxed text-muted-foreground">
                        {job.description}
                      </p>
                    ) : null}

                    <div className="flex flex-wrap gap-1.5 border-t border-border/40 pt-3">
                      {job.employmentType ? (
                        <Badge variant="secondary" className="text-[11px]">
                          {employmentTypeLabels[job.employmentType as EmploymentType] ??
                            job.employmentType}
                        </Badge>
                      ) : null}
                      {job.experienceLevel ? (
                        <Badge variant="secondary" className="text-[11px]">
                          {experienceLevelLabels[job.experienceLevel as ExperienceLevel] ??
                            job.experienceLevel}
                        </Badge>
                      ) : null}
                      {job.workplaceType ? (
                        <Badge variant="outline" className="text-[11px]">
                          {workplaceTypeLabels[job.workplaceType as WorkplaceType] ??
                            job.workplaceType}
                        </Badge>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <PaginationNav currentPage={page} totalPages={data.totalPages} />
    </div>
  );
}
