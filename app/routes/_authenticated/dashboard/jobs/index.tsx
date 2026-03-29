import { Add01Icon, Briefcase01Icon, Location01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute, Link } from "@tanstack/react-router";
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
import { getMyJobs, getOpenJobs } from "@/features/jobs/server-fns";
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
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Jobs</h2>
          <p className="text-muted-foreground">Manage your job postings and track applicants.</p>
        </div>
        <Button asChild>
          <Link to="/dashboard/jobs/new">
            <HugeiconsIcon icon={Add01Icon} strokeWidth={2} className="size-4" />
            Post a job
          </Link>
        </Button>
      </div>

      {jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <HugeiconsIcon
            icon={Briefcase01Icon}
            strokeWidth={2}
            className="text-muted-foreground mb-4 size-12"
          />
          <h3 className="text-lg font-semibold">No jobs yet</h3>
          <p className="text-muted-foreground mt-1 mb-4 text-sm">
            Create your first job posting to start receiving applications.
          </p>
          <Button asChild>
            <Link to="/dashboard/jobs/new">
              <HugeiconsIcon icon={Add01Icon} strokeWidth={2} className="size-4" />
              Post a job
            </Link>
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border">
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
                  <TableCell className="text-muted-foreground text-sm">
                    {job.location || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {job.employmentType
                      ? employmentTypeLabels[job.employmentType as EmploymentType]
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(job.status)} className="capitalize">
                      {job.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(job.createdAt)}
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
      )}
    </div>
  );
}

function CandidateJobsList({ jobs }: { jobs: Awaited<ReturnType<typeof getOpenJobs>> }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Browse Jobs</h2>
        <p className="text-muted-foreground">Find open positions and apply.</p>
      </div>

      {jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <HugeiconsIcon
            icon={Briefcase01Icon}
            strokeWidth={2}
            className="text-muted-foreground mb-4 size-12"
          />
          <h3 className="text-lg font-semibold">No open jobs</h3>
          <p className="text-muted-foreground mt-1 text-sm">
            There are no open positions right now. Check back later.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {jobs.map((job) => {
            const salary = formatSalaryCompact(job.salaryMin, job.salaryMax, job.salaryCurrency);
            return (
              <Link
                key={job.id}
                to="/dashboard/jobs/$jobId"
                params={{ jobId: job.id }}
                className="group flex flex-col rounded-lg border p-5 transition-colors hover:border-foreground/20 hover:bg-muted/40"
              >
                {/* Top: title + company */}
                <div className="mb-3">
                  <h3 className="font-semibold leading-tight group-hover:underline">{job.title}</h3>
                  <p className="text-muted-foreground mt-0.5 text-sm">{job.companyName}</p>
                </div>

                {/* Metadata tags */}
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {job.location && (
                    <Badge variant="secondary" className="gap-1 font-normal">
                      <HugeiconsIcon icon={Location01Icon} strokeWidth={2} className="size-3" />
                      {job.location}
                    </Badge>
                  )}
                  {job.workplaceType && (
                    <Badge variant="secondary" className="font-normal">
                      {workplaceTypeLabels[job.workplaceType as WorkplaceType]}
                    </Badge>
                  )}
                  {job.employmentType && (
                    <Badge variant="secondary" className="font-normal">
                      {employmentTypeLabels[job.employmentType as EmploymentType]}
                    </Badge>
                  )}
                  {job.experienceLevel && (
                    <Badge variant="outline" className="font-normal">
                      {experienceLevelLabels[job.experienceLevel as ExperienceLevel]}
                    </Badge>
                  )}
                </div>

                {/* Description snippet */}
                <p className="text-muted-foreground mb-4 line-clamp-2 text-sm leading-relaxed">
                  {job.description}
                </p>

                {/* Bottom: salary + date */}
                <div className="mt-auto flex items-center justify-between">
                  {salary ? <span className="text-sm font-medium">{salary}</span> : <span />}
                  <span className="text-muted-foreground text-xs">{formatDate(job.createdAt)}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
