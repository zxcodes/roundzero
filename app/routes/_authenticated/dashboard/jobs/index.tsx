import { Briefcase, Plus } from "@phosphor-icons/react";
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

export const Route = createFileRoute("/_authenticated/dashboard/jobs/")({
  loader: async ({ context }) => {
    const isCompany = context.user?.role === "company";
    if (isCompany) {
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
            <Plus className="size-4" />
            Post a job
          </Link>
        </Button>
      </div>

      {jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <Briefcase className="text-muted-foreground mb-4 size-12" />
          <h3 className="text-lg font-semibold">No jobs yet</h3>
          <p className="text-muted-foreground mt-1 mb-4 text-sm">
            Create your first job posting to start receiving applications.
          </p>
          <Button asChild>
            <Link to="/dashboard/jobs/new">
              <Plus className="size-4" />
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
          <Briefcase className="text-muted-foreground mb-4 size-12" />
          <h3 className="text-lg font-semibold">No open jobs</h3>
          <p className="text-muted-foreground mt-1 text-sm">
            There are no open positions right now. Check back later.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {jobs.map((job) => (
            <Link
              key={job.id}
              to="/dashboard/jobs/$jobId"
              params={{ jobId: job.id }}
              className="hover:bg-muted/50 block rounded-lg border p-4 transition-colors"
            >
              <h3 className="font-semibold">{job.title}</h3>
              <p className="text-muted-foreground text-sm">
                {"companyName" in job ? job.companyName : ""}
              </p>
              <p className="text-muted-foreground mt-2 line-clamp-2 text-sm">{job.description}</p>
              <p className="text-muted-foreground mt-3 text-xs">{formatDate(job.createdAt)}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
