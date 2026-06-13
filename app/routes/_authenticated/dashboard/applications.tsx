import {
  ArrowRight01Icon,
  Briefcase01Icon,
  Clock01Icon,
  Rocket01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { DashboardApplicationsSkeleton } from "@/components/route-skeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { getMyApplications } from "@/features/applications/server/functions";
import { hasShortlistNextSteps, parseShortlistDetails } from "@/features/applications/shortlist";
import { formatDate } from "@/shared/date";

export const Route = createFileRoute("/_authenticated/dashboard/applications")({
  beforeLoad: ({ context }) => {
    if (!context.isCandidate) {
      throw redirect({ to: "/dashboard" });
    }
  },
  loader: () => getMyApplications(),
  pendingComponent: DashboardApplicationsSkeleton,
  component: MyApplicationsPage,
});

type Applications = Awaited<ReturnType<typeof getMyApplications>>;
type Application = Applications[number];

const stageCopy = {
  applied: {
    badge: "Application Received",
    tone: "border-info/20 bg-info/10 text-info",
    blurb: "Waiting on first review",
  },
  queued_for_batch: {
    badge: "Under review",
    tone: "border-info/20 bg-info/10 text-info",
    blurb: "Strong fit — queued for the next evaluation batch",
  },
  interview_ready: {
    badge: "Interview Ready",
    tone: "border-warning/20 bg-warning/10 text-warning",
    blurb: "You have been invited to a RoundZero interview",
  },
  interview_in_progress: {
    badge: "Interview in Progress",
    tone: "border-warning/20 bg-warning/10 text-warning",
    blurb: "Your RoundZero interview is in progress",
  },
  under_review: {
    badge: "Awaiting company decision",
    tone: "border-success/20 bg-success/10 text-success",
    blurb: "Interview completed. Awaiting company decision",
  },
  evaluated_held: {
    badge: "Evaluation complete",
    tone: "border-success/20 bg-success/10 text-success",
    blurb: "Evaluation complete. Releasing with the next batch",
  },
  evaluated: {
    badge: "Awaiting company decision",
    tone: "border-success/20 bg-success/10 text-success",
    blurb: "Evaluation complete. Awaiting company decision",
  },
  shortlisted: {
    badge: "Shortlisted",
    tone: "border-success/20 bg-success/10 text-success",
    blurb: "You have been shortlisted for this role",
  },
  rejected: {
    badge: "Closed",
    tone: "border-danger/20 bg-danger/10 text-danger",
    blurb: "No longer moving forward",
  },
  withdrawn: {
    badge: "Withdrawn",
    tone: "bg-muted text-muted-foreground",
    blurb: "You withdrew this application",
  },
} as const;

const toApplicationStage = (status: string): keyof typeof stageCopy => {
  switch (status) {
    case "queued_for_batch":
      return "queued_for_batch";
    case "interview_invited":
      return "interview_ready";
    case "interview_in_progress":
      return "interview_in_progress";
    case "evaluated_held":
      return "evaluated_held";
    case "evaluated":
      return "evaluated";
    case "shortlisted":
      return "shortlisted";
    case "rejected":
      return "rejected";
    case "withdrawn":
      return "withdrawn";
    default:
      return "applied";
  }
};

const getStatusMeta = (application: Application) => {
  if (
    application.status === "interview_in_progress" &&
    application.interviewStatus === "completed"
  ) {
    return stageCopy.under_review;
  }

  const stage = toApplicationStage(application.status);
  return stageCopy[stage];
};

const getJobStateLabel = (application: Application) => {
  if (application.companyOwnerDeleted) {
    return "Account deleted";
  }

  if (application.jobStatus === "closed") {
    return "Role closed";
  }

  if (application.jobStatus === "draft") {
    return "Role paused";
  }

  return "Role open";
};

const isApplicationActive = (application: Application) =>
  application.status !== "rejected" &&
  application.status !== "withdrawn" &&
  !application.companyOwnerDeleted;

const isInInterviewStage = (application: Application) =>
  (application.status === "interview_invited" || application.status === "interview_in_progress") &&
  !application.companyOwnerDeleted;

const buildMetrics = (applications: Applications) => {
  return [
    {
      label: "Total applications",
      value: String(applications.length),
      description: "Everything you have submitted so far.",
      icon: Briefcase01Icon,
    },
    {
      label: "Still active",
      value: String(applications.filter(isApplicationActive).length),
      description: "Applications still moving through review.",
      icon: Rocket01Icon,
    },
    {
      label: "Interview stage",
      value: String(applications.filter(isInInterviewStage).length),
      description: "The strongest sign of real traction.",
      icon: Clock01Icon,
    },
  ];
};

function MyApplicationsPage() {
  const applications = Route.useLoaderData();
  const metrics = buildMetrics(applications);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">My Applications</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Scan your active submissions quickly, then open any application for the full record.
          </p>
        </div>
        <Button asChild>
          <Link to="/dashboard/jobs">
            Browse Jobs
            <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-4" />
          </Link>
        </Button>
      </div>

      {applications.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HugeiconsIcon icon={Briefcase01Icon} strokeWidth={2} />
            </EmptyMedia>
            <EmptyTitle>No applications yet</EmptyTitle>
            <EmptyDescription>
              Browse open roles, submit your first application, and this page will turn into your
              tracking list.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link to="/dashboard/jobs">Browse Jobs</Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            {metrics.map((metric, index) => (
              <Card key={metric.label} size="sm" className={`stagger-${index + 1}`}>
                <CardHeader className="gap-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                      {metric.label}
                    </p>
                    <div className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <HugeiconsIcon icon={metric.icon} strokeWidth={2} className="size-4" />
                    </div>
                  </div>
                  <CardTitle className="font-mono text-3xl font-semibold tracking-tight">
                    {metric.value}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">{metric.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="space-y-3">
            {applications.map((application, index) => (
              <ApplicationListCard
                key={application.id}
                application={application}
                className={`stagger-${Math.min(index + 1, 5)}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ApplicationListCard({
  application,
  className,
}: {
  application: Application;
  className?: string;
}) {
  const statusMeta = getStatusMeta(application);
  const shortlistDetails =
    application.status === "shortlisted" && !application.companyOwnerDeleted
      ? parseShortlistDetails(application.metadata)
      : null;
  const hasNextSteps = hasShortlistNextSteps(shortlistDetails);
  const description = application.companyOwnerDeleted
    ? "The company account has been deleted — this application is no longer active"
    : hasNextSteps
      ? "You have been shortlisted and the company added next steps for you"
      : statusMeta.blurb;

  return (
    <Card size="sm" className={className}>
      <CardContent>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">
                {application.companyName}
              </p>
              <Badge variant="outline" className="font-mono text-[11px]">
                {getJobStateLabel(application)}
              </Badge>
              <Badge className={`${statusMeta.tone} text-[11px]`}>{statusMeta.badge}</Badge>
              {hasNextSteps ? <Badge variant="secondary">Next steps ready</Badge> : null}
            </div>

            <div className="space-y-1">
              <CardTitle className="text-lg">{application.jobTitle}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>

            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span>Applied {formatDate(application.createdAt)}</span>
              <span>Last updated {formatDate(application.updatedAt)}</span>
            </div>
          </div>

          <Button variant="outline" asChild>
            <Link
              to="/dashboard/application/$applicationId"
              params={{ applicationId: application.id }}
            >
              View application
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
