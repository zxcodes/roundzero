import { Briefcase01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
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
import { getMyApplications } from "@/features/applications/server-fns";

export const Route = createFileRoute("/_authenticated/dashboard/applications")({
  beforeLoad: ({ context }) => {
    if (!context.isCandidate) {
      throw redirect({ to: "/dashboard" });
    }
  },
  loader: () => getMyApplications(),
  component: MyApplicationsPage,
});

const statusVariant = (status: string) => {
  switch (status) {
    case "applied":
      return "default" as const;
    case "interviewing":
      return "secondary" as const;
    case "evaluated":
      return "outline" as const;
    case "rejected":
      return "destructive" as const;
    default:
      return "secondary" as const;
  }
};

const formatDate = (date: Date | string) => {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatStatus = (status: string) => {
  return status.charAt(0).toUpperCase() + status.slice(1);
};

function MyApplicationsPage() {
  const applications = Route.useLoaderData();

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">My Applications</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Track the status of your job applications.
        </p>
      </div>

      {applications.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16">
          <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-muted">
            <HugeiconsIcon
              icon={Briefcase01Icon}
              strokeWidth={2}
              className="size-6 text-muted-foreground"
            />
          </div>
          <h3 className="text-sm font-semibold">No applications yet</h3>
          <p className="mt-1 mb-4 text-xs text-muted-foreground">
            Browse open jobs and submit your first application.
          </p>
          <Button size="sm" asChild>
            <Link to="/dashboard/jobs">Browse Jobs</Link>
          </Button>
        </div>
      ) : (
        <div className="animate-fade-in stagger-1 overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Applied</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applications.map((app) => (
                <TableRow key={app.id}>
                  <TableCell className="font-medium">
                    <Link
                      to="/dashboard/jobs/$jobId"
                      params={{ jobId: app.jobId }}
                      className="transition-colors hover:text-primary hover:underline"
                    >
                      {app.jobTitle}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{app.companyName}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(app.status)} className="capitalize">
                      {formatStatus(app.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {formatDate(app.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link to="/dashboard/jobs/$jobId" params={{ jobId: app.jobId }}>
                        View Job
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
