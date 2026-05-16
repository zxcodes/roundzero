import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Calendar01Icon,
  CheckmarkCircle02Icon,
  File02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link, notFound, redirect, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { format } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";
import { DashboardApplicantReviewSkeleton } from "@/components/route-skeletons";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Empty, EmptyDescription } from "@/components/ui/empty";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SubmittedProfileSnapshot } from "@/features/applications/components/submitted-profile-snapshot";
import {
  getApplicationResume,
  getCompanyApplicantReview,
  updateApplicationStatus,
} from "@/features/applications/server/functions";
import { getPreEvaluationForApplication } from "@/features/pre-evaluations/server/functions";
import { ReportSnapshotCard } from "@/features/reports/components/report-cards";
import { getCompanyApplicantReportTimeline } from "@/features/reports/server/functions";
import { formatDate } from "@/shared/date";
import {
  APPLICATION_STATUS_TRANSITIONS,
  type ApplicationStatus,
  applicationStatusSchema,
} from "@/shared/enums";
import { base64ToBlob } from "@/shared/resume";
import { validateUuidParams } from "@/shared/validation";

export const Route = createFileRoute("/_authenticated/dashboard/applicants/$applicationId")({
  beforeLoad: ({ context, params }) => {
    if (!context.isCompany) {
      throw redirect({ to: "/dashboard" });
    }
    validateUuidParams({ applicationId: params.applicationId });
  },
  loader: async ({ params }) => {
    const data = await getCompanyApplicantReview({
      data: { applicationId: params.applicationId },
    });
    if (!data) {
      throw notFound();
    }
    const preEvaluation = await getPreEvaluationForApplication({
      data: { applicationId: params.applicationId },
    });
    const reportTimeline = await getCompanyApplicantReportTimeline({
      data: { applicationId: params.applicationId },
    });
    return { ...data, preEvaluation, reportTimeline };
  },
  pendingComponent: DashboardApplicantReviewSkeleton,
  component: ApplicantReviewPage,
});

const APPLICATION_STAGES = [
  "applied",
  "pre_screening",
  "queued_for_batch",
  "interview_invited",
  "interview_in_progress",
  "evaluated_held",
  "evaluated",
  "shortlisted",
  "rejected",
] as const;

const STATUS_OPTIONS: { value: ApplicationStatus; label: string }[] = [
  { value: "applied", label: "Applied" },
  { value: "pre_screening", label: "Pre-screening" },
  { value: "queued_for_batch", label: "Queued for evaluation" },
  { value: "interview_invited", label: "Interview invited" },
  { value: "interview_in_progress", label: "Interview in progress" },
  { value: "evaluated_held", label: "Evaluation complete" },
  { value: "evaluated", label: "Evaluated" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "rejected", label: "Rejected" },
  { value: "evaluation_failed", label: "Evaluation failed" },
];

const stageCopy = {
  applied: {
    badge: "Applied",
    tone: "border-info/20 bg-info/10 text-info",
    dot: "bg-info",
  },
  pre_screening: {
    badge: "On hold",
    tone: "border-warning/20 bg-warning/10 text-warning",
    dot: "bg-warning",
  },
  queued_for_batch: {
    badge: "Queued",
    tone: "border-pending/20 bg-pending/10 text-pending",
    dot: "bg-pending",
  },
  interview_invited: {
    badge: "Interview invited",
    tone: "border-active/20 bg-active/10 text-active",
    dot: "bg-active",
  },
  interview_in_progress: {
    badge: "Interview in progress",
    tone: "border-warning/20 bg-warning/10 text-warning",
    dot: "bg-warning",
  },
  evaluated_held: {
    badge: "Evaluation complete",
    tone: "border-success/20 bg-success/10 text-success",
    dot: "bg-success",
  },
  evaluated: {
    badge: "Evaluated",
    tone: "border-success/20 bg-success/10 text-success",
    dot: "bg-success",
  },
  shortlisted: {
    badge: "Shortlisted",
    tone: "border-progress/20 bg-progress/10 text-progress",
    dot: "bg-progress",
  },
  rejected: {
    badge: "Rejected",
    tone: "border-danger/20 bg-danger/10 text-danger",
    dot: "bg-danger",
  },
  withdrawn: {
    badge: "Withdrawn",
    tone: "bg-muted text-muted-foreground",
    dot: "bg-muted-foreground/50",
  },
  evaluation_failed: {
    badge: "Evaluation failed",
    tone: "border-danger/20 bg-danger/10 text-danger",
    dot: "bg-danger",
  },
} as const;

const formatMonthRange = (entry: {
  startMonth: string | null;
  endMonth: string | null;
  currentlyWorkingHere: boolean;
}) => {
  const start = entry.startMonth ? formatMonth(entry.startMonth) : "Unknown start";
  const end = entry.currentlyWorkingHere
    ? "Present"
    : entry.endMonth
      ? formatMonth(entry.endMonth)
      : "Unknown end";

  return `${start} – ${end}`;
};

const formatMonth = (value: string) => {
  const [year, month] = value.split("-").map(Number);
  const date = new Date(year, (month || 1) - 1, 1);
  return format(date, "MMM yyyy");
};

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

function ApplicantReviewPage() {
  const { application, previousApplicant, nextApplicant, preEvaluation, reportTimeline } =
    Route.useLoaderData();
  const router = useRouter();
  const [pendingStatus, setPendingStatus] = useState<ApplicationStatus | null>(null);

  const updateStatusFn = useServerFn(updateApplicationStatus);
  const getResumeFn = useServerFn(getApplicationResume);

  const updateStatusMutation = useMutation({
    mutationFn: updateStatusFn,
    onSuccess: async () => {
      toast.success("Application status updated");
      await router.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update status. Please try again.");
    },
  });

  const resumeDownloadMutation = useMutation({
    mutationFn: getResumeFn,
    onSuccess: ({ base64, contentType }) => {
      const blob = base64ToBlob(base64, contentType);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
    },
    onError: () => {
      toast.error("Failed to open resume. Please try again.");
    },
  });

  const metadata = (application.metadata ?? {}) as {
    headline?: string | null;
    bio?: string | null;
    skills?: string[];
    links?: Record<string, string>;
    workHistory?: Array<{
      company?: string;
      title?: string;
      startMonth?: string | null;
      endMonth?: string | null;
      currentlyWorkingHere?: boolean;
      description?: string | null;
    }>;
  };

  const links = metadata.links
    ? Object.entries(metadata.links).map(([key, href]) => ({
        href,
        label: key.charAt(0).toUpperCase() + key.slice(1),
      }))
    : [];

  const skills = metadata.skills ?? [];
  const workHistory = (metadata.workHistory ?? [])
    .filter((entry): entry is NonNullable<typeof entry> => entry != null)
    .map((entry) => ({
      company: entry.company ?? "Unknown company",
      title: entry.title ?? "Untitled role",
      startMonth: entry.startMonth ?? null,
      endMonth: entry.endMonth ?? null,
      currentlyWorkingHere: entry.currentlyWorkingHere ?? false,
      description: entry.description ?? null,
    }));
  const headline = metadata.headline ?? null;
  const bio = metadata.bio ?? null;
  const currentStatus = applicationStatusSchema.parse(application.status);
  const currentStageIndex = APPLICATION_STAGES.indexOf(
    currentStatus as (typeof APPLICATION_STAGES)[number],
  );
  const isFailed = currentStatus === "evaluation_failed";
  const meta = stageCopy[currentStatus] ?? stageCopy.applied;
  const report = reportTimeline?.report ?? null;

  const onStatusValueChange = async (value: string) => {
    const nextStatus = applicationStatusSchema.parse(value);
    if (nextStatus === "rejected" && currentStatus !== "rejected") {
      setPendingStatus(nextStatus);
      return;
    }

    await updateStatusMutation.mutateAsync({
      data: { applicationId: application.id, status: nextStatus },
    });
  };

  const onResumeView = async () => {
    await resumeDownloadMutation.mutateAsync({
      data: { applicationId: application.id },
    });
  };

  const onRejectConfirm = async () => {
    if (!pendingStatus) {
      return;
    }

    await updateStatusMutation.mutateAsync({
      data: { applicationId: application.id, status: pendingStatus },
    });
    setPendingStatus(null);
  };

  const allowedStatuses = STATUS_OPTIONS.filter(
    (status) =>
      status.value === currentStatus ||
      APPLICATION_STATUS_TRANSITIONS[currentStatus]?.includes(status.value),
  );

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link to="/dashboard/jobs/$jobId" params={{ jobId: application.jobId }}>
            <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-4" />
            Back to role
          </Link>
        </Button>
        <div className="flex gap-2">
          {allowedStatuses.some((s) => s.value === "shortlisted") &&
          currentStatus !== "shortlisted" ? (
            <Button
              size="sm"
              className="bg-success text-success-foreground hover:bg-success/90 shadow-sm shadow-success/20"
              disabled={updateStatusMutation.isPending}
              onClick={async () => {
                await updateStatusMutation.mutateAsync({
                  data: { applicationId: application.id, status: "shortlisted" },
                });
              }}
            >
              <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} className="size-4" />
              Shortlist
            </Button>
          ) : null}
          {allowedStatuses.some((s) => s.value === "rejected") && currentStatus !== "rejected" ? (
            <Button
              size="sm"
              variant="destructive"
              disabled={updateStatusMutation.isPending}
              onClick={() => setPendingStatus("rejected")}
            >
              Reject
            </Button>
          ) : null}
          {previousApplicant ? (
            <Button variant="outline" size="sm" asChild>
              <Link
                to="/dashboard/applicants/$applicationId"
                params={{ applicationId: previousApplicant.id }}
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-4" />
                Previous
              </Link>
            </Button>
          ) : null}
          {nextApplicant ? (
            <Button variant="outline" size="sm" asChild>
              <Link
                to="/dashboard/applicants/$applicationId"
                params={{ applicationId: nextApplicant.id }}
              >
                Next
                <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-4" />
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-4">
        <Avatar className="size-14 ring-4 ring-background">
          <AvatarImage
            src={application.candidatePicture ?? undefined}
            alt={application.candidateName}
          />
          <AvatarFallback>{getInitials(application.candidateName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">{application.candidateName}</h2>
          <p className="text-sm text-muted-foreground">
            Reviewing for <span className="font-medium">{application.jobTitle}</span>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={meta.tone}>{meta.badge}</Badge>
            <Badge variant="outline" className="gap-1 font-mono text-[11px]">
              <HugeiconsIcon icon={Calendar01Icon} strokeWidth={2} className="size-3" />
              Applied {formatDate(application.createdAt)}
            </Badge>
          </div>
        </div>
      </div>

      <Card size="sm">
        <CardContent className="space-y-2 py-0">
          <div className="flex flex-wrap gap-2">
            {APPLICATION_STAGES.map((stage) => {
              const isCurrent = !isFailed && stage === currentStatus;
              const isCompleted =
                !isFailed &&
                APPLICATION_STAGES.indexOf(stage) < currentStageIndex &&
                currentStatus !== "rejected";
              const stageMeta = stageCopy[stage];

              return (
                <div key={stage} className="flex items-center gap-2">
                  <div
                    className={`size-2 rounded-full ${isCurrent ? stageMeta.dot : isCompleted ? "bg-primary" : "bg-muted-foreground/30"}`}
                  />
                  <span
                    className={`text-xs font-medium ${isCurrent ? "text-foreground" : isCompleted ? "text-muted-foreground" : "text-muted-foreground/60"}`}
                  >
                    {stageMeta.badge}
                  </span>
                </div>
              );
            })}
            {isFailed ? (
              <div className="flex items-center gap-2">
                <div className="size-2 rounded-full bg-danger" />
                <span className="text-xs font-medium text-danger">Evaluation failed</span>
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span>Contact: {application.candidateEmail}</span>
            {application.createdAt !== application.updatedAt ? (
              <span>Updated {formatDate(application.updatedAt)}</span>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {report ? <ReportSnapshotCard report={report} applicationId={application.id} /> : null}

      {preEvaluation ? (
        <Card
          className={
            report
              ? "border-border/40 bg-muted/20"
              : "border border-primary/10 bg-[radial-gradient(circle_at_top_left,var(--color-primary)/10,transparent_32%),var(--color-card)] shadow-lg shadow-primary/5"
          }
        >
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
                  Pre-screening
                </p>
                <h3 className="mt-1 text-base font-semibold tracking-tight">
                  Profile score: {preEvaluation.score}/100
                </h3>
              </div>
              <Badge variant="outline" className="text-[11px]">
                {preEvaluation.confidence}
              </Badge>
            </div>
            {preEvaluation.missingRequirements.length > 0 ? (
              <p className="text-sm text-muted-foreground">
                {preEvaluation.missingRequirements.length} gap
                {preEvaluation.missingRequirements.length === 1 ? "" : "s"} detected
              </p>
            ) : (
              <p className="text-sm text-success">All key requirements matched</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border border-dashed border-border/70">
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            Pre-evaluation is in progress. Results will appear here once Zero finishes screening.
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        {allowedStatuses.length > 1 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Move application to</p>
            <Select
              value={currentStatus}
              onValueChange={onStatusValueChange}
              disabled={updateStatusMutation.isPending}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allowedStatuses.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        {application.resumeKey ? (
          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={onResumeView}
              disabled={resumeDownloadMutation.isPending}
            >
              <HugeiconsIcon icon={File02Icon} strokeWidth={2} className="size-4" />
              {resumeDownloadMutation.isPending ? "Opening…" : "View resume"}
            </Button>
          </div>
        ) : null}

        <div className="flex items-end">
          <Button variant="outline" asChild>
            <Link to="/dashboard/jobs/$jobId" params={{ jobId: application.jobId }}>
              Open job details
            </Link>
          </Button>
        </div>
      </div>

      <Empty className="border">
        <EmptyDescription>
          This page shows the candidate snapshot attached at apply time and any available evaluation
          output.
        </EmptyDescription>
      </Empty>

      <SubmittedProfileSnapshot
        headline={headline}
        bio={bio}
        skills={skills}
        links={links}
        workHistory={workHistory}
        hasResume={Boolean(application.resumeKey)}
        headerExtra={
          preEvaluation ? (
            <Badge variant="outline" className="font-mono text-[11px]">
              Score: {preEvaluation.score}/100
            </Badge>
          ) : null
        }
        formatMonthRange={formatMonthRange}
      />

      <AlertDialog open={pendingStatus !== null} onOpenChange={() => setPendingStatus(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject this application?</AlertDialogTitle>
            <AlertDialogDescription>
              Rejection is treated as a terminal step in the current workflow. You can still review
              the application later, but it will leave the active pipeline.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onRejectConfirm}>Reject application</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
