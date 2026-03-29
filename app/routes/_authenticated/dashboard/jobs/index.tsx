import {
  Add01Icon,
  Briefcase01Icon,
  Location01Icon,
  Rocket01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getMyJobs, getOpenJobs, publishJob } from "@/features/jobs/server/functions";
import {
  type EmploymentType,
  type ExperienceLevel,
  employmentTypeLabels,
  experienceLevelLabels,
  type WorkplaceType,
  workplaceTypeLabels,
} from "@/shared/enums";

export const Route = createFileRoute("/_authenticated/dashboard/jobs/")({
  loader: async ({ context }) => {
    if (context.isCompany) {
      const jobs = await getMyJobs();
      return { jobs, isCompany: true as const };
    }
    const jobs = await getOpenJobs();
    return { jobs, isCompany: false as const };
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

const formatDate = (date: Date | string) => {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatSalaryCompact = (min: number | null, max: number | null, currency: string) => {
  if (!min && !max) return null;
  const fmt = (n: number) => {
    if (n >= 1000) return `${Math.round(n / 1000)}k`;
    return String(n);
  };
  if (min && max) return `${currency} ${fmt(min)}-${fmt(max)}`;
  if (min) return `${currency} ${fmt(min)}+`;
  return `Up to ${currency} ${fmt(max!)}`;
};

function JobsListPage() {
  const { jobs, isCompany } = Route.useLoaderData();

  if (isCompany) {
    return <CompanyJobsList jobs={jobs} />;
  }

  return <CandidateJobsList jobs={jobs as Awaited<ReturnType<typeof getOpenJobs>>} />;
}

function CompanyJobsList({ jobs }: { jobs: Awaited<ReturnType<typeof getMyJobs>> }) {
  const router = useRouter();

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

      {jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16">
          <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-muted">
            <HugeiconsIcon
              icon={Briefcase01Icon}
              strokeWidth={2}
              className="size-6 text-muted-foreground"
            />
          </div>
          <h3 className="text-sm font-semibold">No jobs yet</h3>
          <p className="mt-1 mb-4 text-xs text-muted-foreground">
            Create your first job posting to start receiving applications.
          </p>
          <Button size="sm" asChild>
            <Link to="/dashboard/jobs/new">
              <HugeiconsIcon icon={Add01Icon} strokeWidth={2} className="size-3.5" />
              Post a job
            </Link>
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => (
                <TableRow key={job.id}>
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
                  <TableCell>
                    <Badge variant={statusVariant(job.status)} className="capitalize">
                      {job.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {formatDate(job.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {job.status === "draft" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onPublish(job.id)}
                          disabled={publishJobMutation.isPending}
                        >
                          <HugeiconsIcon icon={Rocket01Icon} strokeWidth={2} className="size-3.5" />
                          Publish
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" asChild>
                        <Link to="/dashboard/jobs/$jobId" params={{ jobId: job.id }}>
                          View
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function CandidateJobsList({ jobs }: { jobs: Awaited<ReturnType<typeof getOpenJobs>> }) {
  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Browse Jobs</h2>
        <p className="mt-1 text-sm text-muted-foreground">Find open positions and apply.</p>
      </div>

      {jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16">
          <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-muted">
            <HugeiconsIcon
              icon={Briefcase01Icon}
              strokeWidth={2}
              className="size-6 text-muted-foreground"
            />
          </div>
          <h3 className="text-sm font-semibold">No open jobs</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            There are no open positions right now. Check back later.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {jobs.map((job, i) => {
            const salary = formatSalaryCompact(job.salaryMin, job.salaryMax, job.salaryCurrency);
            return (
              <Link
                key={job.id}
                to="/dashboard/jobs/$jobId"
                params={{ jobId: job.id }}
                className={`animate-fade-in stagger-${Math.min(i + 1, 6)} group flex flex-col rounded-xl border bg-card p-4 ring-1 ring-foreground/3 transition-all hover:border-primary/30 hover:shadow-sm`}
              >
                <div className="mb-2.5">
                  <h3 className="text-sm font-semibold leading-tight group-hover:text-primary transition-colors">
                    {job.title}
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">{job.companyName}</p>
                </div>

                <div className="mb-2.5 flex flex-wrap gap-1">
                  {job.location && (
                    <Badge variant="secondary" className="gap-1 text-[11px] font-normal">
                      <HugeiconsIcon icon={Location01Icon} strokeWidth={2} className="size-2.5" />
                      {job.location}
                    </Badge>
                  )}
                  {job.workplaceType && (
                    <Badge variant="secondary" className="text-[11px] font-normal">
                      {workplaceTypeLabels[job.workplaceType as WorkplaceType]}
                    </Badge>
                  )}
                  {job.employmentType && (
                    <Badge variant="secondary" className="text-[11px] font-normal">
                      {employmentTypeLabels[job.employmentType as EmploymentType]}
                    </Badge>
                  )}
                  {job.experienceLevel && (
                    <Badge variant="outline" className="text-[11px] font-normal">
                      {experienceLevelLabels[job.experienceLevel as ExperienceLevel]}
                    </Badge>
                  )}
                </div>

                <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                  {job.description}
                </p>

                <div className="mt-auto flex items-center justify-between">
                  {salary ? (
                    <span className="font-mono text-xs font-medium">{salary}</span>
                  ) : (
                    <span />
                  )}
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {formatDate(job.createdAt)}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
