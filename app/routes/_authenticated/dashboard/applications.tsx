import { Briefcase01Icon } from "@hugeicons/core-free-icons";
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
import { getMyApplications } from "@/features/applications/server-fns";

export const Route = createFileRoute("/_authenticated/dashboard/applications")({
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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">My Applications</h2>
        <p className="text-muted-foreground">Track the status of your job applications.</p>
      </div>

      {applications.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
          <HugeiconsIcon
            icon={Briefcase01Icon}
            strokeWidth={2}
            className="text-muted-foreground mb-4 size-12"
          />
          <h3 className="text-lg font-semibold">No applications yet</h3>
          <p className="text-muted-foreground mt-1 mb-4 text-sm">
            Browse open jobs and submit your first application.
          </p>
          <Button asChild>
            <Link to="/dashboard/jobs">Browse Jobs</Link>
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border">
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
                      className="hover:underline"
                    >
                      {app.jobTitle}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{app.companyName}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(app.status)} className="capitalize">
                      {formatStatus(app.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
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
