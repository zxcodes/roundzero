import { ArrowRight01Icon, Briefcase01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";

import { CompanyInboxPageShell } from "@/components/company-inbox-page-shell";
import { DashboardApplicationsSkeleton } from "@/components/route-skeletons";
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
import { getMyApplications } from "@/features/applications/server/functions";
import { hasShortlistNextSteps, parseShortlistDetails } from "@/features/applications/shortlist";
import { resolveInterviewAwareCandidateMeta } from "@/features/interviews/shared/candidate-display";
import { formatDate, formatRelativeTime } from "@/shared/date";

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
    badge: "Application received",
    tone: "border-info/20 bg-info/10 text-info",
    blurb: "Waiting on first review",
  },
  company_review: {
    badge: "Company review",
    tone: "border-info/20 bg-info/10 text-info",
    blurb: "The company is reviewing whether to move your application forward",
  },
  queued_for_batch: {
    badge: "Under review",
    tone: "border-info/20 bg-info/10 text-info",
    blurb: "Strong fit — queued for the next evaluation batch",
  },
  interview_ready: {
    badge: "Interview ready",
    tone: "border-warning/20 bg-warning/10 text-warning",
    blurb: "You have been invited to a RoundZero interview",
  },
  interview_in_progress: {
    badge: "Interview in progress",
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

const toApplicationStage = (
  status: string,
  preEvaluationNextStep: string | null,
): keyof typeof stageCopy => {
  if (status === "pre_screening" && preEvaluationNextStep === "hold") {
    return "company_review";
  }

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
  const stage = toApplicationStage(application.status, application.preEvaluationNextStep);
  const baseMeta = stageCopy[stage];
  return resolveInterviewAwareCandidateMeta(
    application.status,
    application.interviewStatus ?? null,
    baseMeta,
  );
};

const isApplicationActive = (application: Application) =>
  application.status !== "rejected" &&
  application.status !== "withdrawn" &&
  !application.companyOwnerDeleted;

const isInInterviewStage = (application: Application) =>
  (application.status === "interview_invited" || application.status === "interview_in_progress") &&
  !application.companyOwnerDeleted;

function MyApplicationsPage() {
  const applications = Route.useLoaderData();
  const statItems = [
    { value: applications.length, label: "total applications" },
    { value: applications.filter(isApplicationActive).length, label: "still active" },
    { value: applications.filter(isInInterviewStage).length, label: "interview stage" },
  ];

  return (
    <CompanyInboxPageShell
      title="My applications"
      description="Scan your active submissions quickly, then open any application for the full record."
      statItems={statItems}
      headerAction={
        <Button size="sm" asChild>
          <Link to="/dashboard/jobs" className="no-underline hover:no-underline">
            Browse roles
            <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-3.5" />
          </Link>
        </Button>
      }
    >
      {applications.length === 0 ? (
        <Empty className="rounded-2xl border-0 bg-muted/30">
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
              <Link to="/dashboard/jobs">Browse roles</Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="divide-y divide-border/50 overflow-hidden rounded-3xl border border-border/60">
          {applications.map((application) => (
            <ApplicationRow key={application.id} application={application} />
          ))}
        </div>
      )}
    </CompanyInboxPageShell>
  );
}

function ApplicationRow({ application }: { application: Application }) {
  const statusMeta = getStatusMeta(application);
  const shortlistDetails =
    application.status === "shortlisted" && !application.companyOwnerDeleted
      ? parseShortlistDetails(application.metadata)
      : null;
  const hasNextSteps = hasShortlistNextSteps(shortlistDetails);
  const description = application.companyOwnerDeleted
    ? "The company account has been deleted — this application is no longer active"
    : hasNextSteps
      ? "The company added follow-up for your shortlisted application"
      : statusMeta.blurb;

  return (
    <Link
      to="/dashboard/application/$applicationId"
      params={{ applicationId: application.id }}
      className="group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/40 md:gap-4 md:px-5"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold group-hover:text-primary">
            {application.jobTitle}
          </p>
          <Badge variant="outline" className={statusMeta.tone}>
            {statusMeta.badge}
          </Badge>
          {hasNextSteps ? (
            <Badge variant="outline" className="border-success/20 text-success">
              Follow-up available
            </Badge>
          ) : null}
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{application.companyName}</p>
        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{description}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Applied {formatDate(application.createdAt)} · Updated{" "}
          {formatRelativeTime(application.updatedAt)}
        </p>
      </div>

      <HugeiconsIcon
        icon={ArrowRight01Icon}
        strokeWidth={2}
        className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
      />
    </Link>
  );
}
