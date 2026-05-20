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
  applicationStatusLabels,
  applicationStatusMeta,
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

// Compact 5-step stepper. Sub-states fold into a parent step.
type StepperStep = {
  key: "applied" | "screening" | "interview" | "evaluated" | "decision";
  label: string;
};

const stepperSteps: StepperStep[] = [
  { key: "applied", label: "Applied" },
  { key: "screening", label: "Screening" },
  { key: "interview", label: "Interview" },
  { key: "evaluated", label: "Evaluated" },
  { key: "decision", label: "Decision" },
];

function statusToStepIndex(status: ApplicationStatus): number {
  switch (status) {
    case "applied":
      return 0;
    case "pre_screening":
    case "queued_for_batch":
      return 1;
    case "interview_invited":
    case "interview_in_progress":
      return 2;
    case "evaluated_held":
    case "evaluated":
      return 3;
    case "shortlisted":
    case "rejected":
      return 4;
    case "withdrawn":
    case "evaluation_failed":
      return -1;
    default:
      return 0;
  }
}

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
    skills?: string[];
    links?: Record<string, string>;
  };

  const links = metadata.links
    ? Object.entries(metadata.links).map(([key, href]) => ({
        href,
        label: key.charAt(0).toUpperCase() + key.slice(1),
      }))
    : [];

  const skills = metadata.skills ?? [];
  const headline = metadata.headline ?? null;
  const currentStatus = applicationStatusSchema.parse(application.status);
  const isFailed = currentStatus === "evaluation_failed";
  const isWithdrawn = currentStatus === "withdrawn";
  const currentStepIndex = statusToStepIndex(currentStatus);
  const statusTone = applicationStatusMeta[currentStatus];
  const report = reportTimeline?.report ?? null;

  const allowedTransitions = APPLICATION_STATUS_TRANSITIONS[currentStatus] ?? [];
  const canShortlist =
    allowedTransitions.includes("shortlisted") && currentStatus !== "shortlisted";
  const canReject = allowedTransitions.includes("rejected") && currentStatus !== "rejected";

  const allowedStatusOptions: ApplicationStatus[] = [
    currentStatus,
    ...allowedTransitions.filter((s) => s !== currentStatus),
  ];

  const onStatusValueChange = async (value: string) => {
    const nextStatus = applicationStatusSchema.parse(value);
    if (nextStatus === currentStatus) return;
    if (nextStatus === "rejected" && currentStatus !== "rejected") {
      setPendingStatus(nextStatus);
      return;
    }

    await updateStatusMutation.mutateAsync({
      data: { applicationId: application.id, status: nextStatus },
    });
  };

  const onShortlist = async () => {
    await updateStatusMutation.mutateAsync({
      data: { applicationId: application.id, status: "shortlisted" },
    });
  };

  const onRejectClick = () => setPendingStatus("rejected");

  const onResumeView = async () => {
    await resumeDownloadMutation.mutateAsync({
      data: { applicationId: application.id },
    });
  };

  const onRejectConfirm = async () => {
    if (!pendingStatus) return;
    await updateStatusMutation.mutateAsync({
      data: { applicationId: application.id, status: pendingStatus },
    });
    setPendingStatus(null);
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Top breadcrumb / nav row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link to="/dashboard/jobs/$jobId" params={{ jobId: application.jobId }}>
            <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-4" />
            Back to role
          </Link>
        </Button>
        <div className="flex items-center gap-1.5">
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

      {/* Two-column layout: content + sticky decision panel */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6 min-w-0">
          {/* Candidate header */}
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
                <Badge variant="outline" className={statusTone.badge}>
                  {applicationStatusLabels[currentStatus]}
                </Badge>
                <Badge variant="outline" className="gap-1 font-mono text-[11px]">
                  <HugeiconsIcon icon={Calendar01Icon} strokeWidth={2} className="size-3" />
                  Applied {formatDate(application.createdAt)}
                </Badge>
              </div>
            </div>
          </div>

          {/* Compact 5-step stepper */}
          <CompactStepper
            currentIndex={currentStepIndex}
            isFailed={isFailed}
            isWithdrawn={isWithdrawn}
            isRejected={currentStatus === "rejected"}
          />

          {/* Report (if any) */}
          {report ? <ReportSnapshotCard report={report} applicationId={application.id} /> : null}

          {/* Pre-evaluation card — only when there's no full report yet */}
          {!report && preEvaluation ? (
            <Card>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
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
          ) : null}

          {!report && !preEvaluation ? (
            <Card className="border border-dashed border-border/70">
              <CardContent className="py-6 text-center text-sm text-muted-foreground">
                Pre-evaluation is in progress. Results will appear here once Zero finishes
                screening.
              </CardContent>
            </Card>
          ) : null}

          {/* Profile snapshot */}
          <SubmittedProfileSnapshot
            headline={headline}
            skills={skills}
            links={links}
            hasResume={Boolean(application.resumeKey)}
            headerExtra={
              preEvaluation && !report ? (
                <Badge variant="outline" className="font-mono text-[11px]">
                  Score: {preEvaluation.score}/100
                </Badge>
              ) : null
            }
          />
        </div>

        {/* Decision panel (sticky on large screens) */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <DecisionPanel
            currentStatus={currentStatus}
            canShortlist={canShortlist}
            canReject={canReject}
            isPending={updateStatusMutation.isPending}
            onShortlist={onShortlist}
            onReject={onRejectClick}
            allowedStatuses={allowedStatusOptions}
            onStatusChange={onStatusValueChange}
            hasResume={Boolean(application.resumeKey)}
            onResumeView={onResumeView}
            resumeLoading={resumeDownloadMutation.isPending}
            candidateEmail={application.candidateEmail}
          />
        </aside>
      </div>

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

function CompactStepper({
  currentIndex,
  isFailed,
  isWithdrawn,
  isRejected,
}: {
  currentIndex: number;
  isFailed: boolean;
  isWithdrawn: boolean;
  isRejected: boolean;
}) {
  return (
    <Card size="sm" className="border-border/60">
      <CardContent className="py-3">
        <div className="flex items-center">
          {stepperSteps.map((step, i) => {
            const isCurrent = !isFailed && !isWithdrawn && i === currentIndex;
            const isCompleted = !isFailed && !isWithdrawn && i < currentIndex;
            const isLast = i === stepperSteps.length - 1;
            // On "decision" step, color reflects shortlisted (primary) vs rejected (danger)
            const dotClass = isFailed
              ? "bg-danger"
              : isWithdrawn
                ? "bg-muted-foreground/30"
                : isCurrent
                  ? i === 4 && isRejected
                    ? "bg-danger"
                    : "bg-primary"
                  : isCompleted
                    ? "bg-primary/60"
                    : "bg-muted-foreground/25";

            return (
              <div key={step.key} className="flex flex-1 items-center last:flex-none">
                <div className="flex flex-col items-center gap-1.5">
                  <div className={`size-2.5 rounded-full ${dotClass}`} aria-hidden />
                  <span
                    className={`text-[11px] font-medium ${
                      isCurrent
                        ? "text-foreground"
                        : isCompleted
                          ? "text-muted-foreground"
                          : "text-muted-foreground/60"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {!isLast ? (
                  <div
                    className={`mx-2 h-px flex-1 ${isCompleted ? "bg-primary/40" : "bg-border/60"}`}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
        {isFailed ? (
          <p className="mt-2 text-center text-[11px] font-medium text-danger">
            Evaluation failed — manual review required.
          </p>
        ) : null}
        {isWithdrawn ? (
          <p className="mt-2 text-center text-[11px] font-medium text-muted-foreground">
            Candidate withdrew their application.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function DecisionPanel({
  currentStatus,
  canShortlist,
  canReject,
  isPending,
  onShortlist,
  onReject,
  allowedStatuses,
  onStatusChange,
  hasResume,
  onResumeView,
  resumeLoading,
  candidateEmail,
}: {
  currentStatus: ApplicationStatus;
  canShortlist: boolean;
  canReject: boolean;
  isPending: boolean;
  onShortlist: () => void | Promise<void>;
  onReject: () => void;
  allowedStatuses: ApplicationStatus[];
  onStatusChange: (value: string) => void | Promise<void>;
  hasResume: boolean;
  onResumeView: () => void | Promise<void>;
  resumeLoading: boolean;
  candidateEmail: string;
}) {
  const tone = applicationStatusMeta[currentStatus];

  return (
    <div className="space-y-3 rounded-xl border border-border/60 bg-card p-4">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          Decision
        </p>
        <div className="mt-1.5">
          <Badge variant="outline" className={tone.badge}>
            {applicationStatusLabels[currentStatus]}
          </Badge>
        </div>
      </div>

      <div className="space-y-2">
        {canShortlist ? (
          <Button
            className="w-full bg-success/80 text-success-foreground hover:bg-success/90"
            disabled={isPending}
            onClick={onShortlist}
          >
            <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} className="size-4" />
            Shortlist
          </Button>
        ) : null}
        {canReject ? (
          <Button variant="destructive" className="w-full" disabled={isPending} onClick={onReject}>
            Reject
          </Button>
        ) : null}
      </div>

      {allowedStatuses.length > 1 ? (
        <div className="space-y-1.5 border-t border-border/50 pt-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Move to
          </p>
          <Select value={currentStatus} onValueChange={onStatusChange} disabled={isPending}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {allowedStatuses.map((status) => (
                <SelectItem key={status} value={status}>
                  {applicationStatusLabels[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <div className="space-y-2 border-t border-border/50 pt-3">
        {hasResume ? (
          <Button
            variant="outline"
            className="w-full"
            onClick={onResumeView}
            disabled={resumeLoading}
          >
            <HugeiconsIcon icon={File02Icon} strokeWidth={2} className="size-4" />
            {resumeLoading ? "Opening…" : "View resume"}
          </Button>
        ) : null}
        <div className="text-[11px] text-muted-foreground">
          <p className="font-medium uppercase tracking-wide">Contact</p>
          <p className="mt-0.5 truncate font-mono text-xs text-foreground">{candidateEmail}</p>
        </div>
      </div>
    </div>
  );
}
