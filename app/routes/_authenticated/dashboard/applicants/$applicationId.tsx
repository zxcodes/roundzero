import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Calendar01Icon,
  File02Icon,
  Loading03Icon,
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
import { ShortlistDialog } from "@/features/applications/components/shortlist-dialog";
import {
  getApplicationResume,
  getCompanyApplicantReview,
  retryApplicationEvaluation,
  updateApplicationStatus,
} from "@/features/applications/server/functions";
import { parseShortlistDetails } from "@/features/applications/shortlist";
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
    const [data, preEvaluation, reportTimeline] = await Promise.all([
      getCompanyApplicantReview({ data: { applicationId: params.applicationId } }),
      getPreEvaluationForApplication({ data: { applicationId: params.applicationId } }),
      getCompanyApplicantReportTimeline({ data: { applicationId: params.applicationId } }),
    ]);
    if (!data) {
      throw notFound();
    }
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
  const {
    application,
    previousApplicant,
    nextApplicant,
    preEvaluation,
    reportTimeline,
    evaluationRetry,
  } = Route.useLoaderData();
  const router = useRouter();
  const [pendingStatus, setPendingStatus] = useState<ApplicationStatus | null>(null);

  const updateStatusFn = useServerFn(updateApplicationStatus);
  const getResumeFn = useServerFn(getApplicationResume);
  const retryEvaluationFn = useServerFn(retryApplicationEvaluation);

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

  const retryEvaluationMutation = useMutation({
    mutationFn: retryEvaluationFn,
    onSuccess: async (result) => {
      if (!result) {
        toast.error("Application no longer exists.");
        return;
      }
      if (result.kind === "skipped") {
        toast.message("Retry skipped", { description: result.reason });
        return;
      }
      toast.success(
        result.kind === "pre_eval"
          ? "Re-running pre-evaluation"
          : `Re-running post-evaluation (${result.action})`,
      );
      await router.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to retry evaluation. Please try again.");
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

  const currentStatus = applicationStatusSchema.parse(application.status);
  const isFailed = currentStatus === "evaluation_failed";
  const isWithdrawn = currentStatus === "withdrawn";
  const currentStepIndex = statusToStepIndex(currentStatus);
  const report = reportTimeline?.report ?? null;

  const allowedTransitions = APPLICATION_STATUS_TRANSITIONS[currentStatus] ?? [];
  const canShortlist =
    allowedTransitions.includes("shortlisted") && currentStatus !== "shortlisted";
  const canReject = allowedTransitions.includes("rejected") && currentStatus !== "rejected";
  const isShortlisted = currentStatus === "shortlisted";
  const shortlistDetails = parseShortlistDetails(application.metadata);

  // Shortlisting goes through the dedicated dialog (note + link), so it is
  // excluded from the generic "Move to" dropdown to avoid a second code path.
  const allowedStatusOptions: ApplicationStatus[] = [
    currentStatus,
    ...allowedTransitions.filter((s) => s !== currentStatus && s !== "shortlisted"),
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

  const onRejectClick = () => setPendingStatus("rejected");

  const onRetryEvaluation = async () => {
    await retryEvaluationMutation.mutateAsync({
      data: { applicationId: application.id },
    });
  };

  const onReinviteToInterview = async () => {
    await updateStatusMutation.mutateAsync({
      data: { applicationId: application.id, status: "interview_invited" },
    });
  };

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

  const hasApplicantNavigation = previousApplicant !== null || nextApplicant !== null;

  return (
    <div className="space-y-6">
      <div className="space-y-6 min-w-0">
        {/* Candidate header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 flex-wrap items-start gap-4">
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
            </div>
          </div>
          {hasApplicantNavigation ? (
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
          ) : null}
        </div>

        <ApplicationStatusSection
          currentStatus={currentStatus}
          applicationId={application.id}
          candidateName={application.candidateName}
          canShortlist={canShortlist}
          isShortlisted={isShortlisted}
          shortlistNote={shortlistDetails?.note ?? null}
          canReject={canReject}
          isPending={updateStatusMutation.isPending}
          isRejectPending={pendingStatus !== null}
          onReject={onRejectClick}
          onRetryEvaluation={onRetryEvaluation}
          retryEvaluationPending={retryEvaluationMutation.isPending}
          evaluationRetry={evaluationRetry}
          onReinviteToInterview={onReinviteToInterview}
          canReinviteToInterview={allowedTransitions.includes("interview_invited")}
          allowedStatuses={allowedStatusOptions}
          onStatusChange={onStatusValueChange}
          hasResume={Boolean(application.resumeKey)}
          onResumeView={onResumeView}
          resumeLoading={resumeDownloadMutation.isPending}
          candidateEmail={application.candidateEmail}
          createdAt={application.createdAt}
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
              Pre-evaluation is in progress. Results will appear here once Zero finishes screening.
            </CardContent>
          </Card>
        ) : null}
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

function ApplicationStatusSection({
  currentStatus,
  applicationId,
  candidateName,
  canShortlist,
  isShortlisted,
  shortlistNote,
  canReject,
  isPending,
  isRejectPending,
  onReject,
  onRetryEvaluation,
  retryEvaluationPending,
  evaluationRetry,
  onReinviteToInterview,
  canReinviteToInterview,
  allowedStatuses,
  onStatusChange,
  hasResume,
  onResumeView,
  resumeLoading,
  candidateEmail,
  currentIndex,
  isFailed,
  isWithdrawn,
  isRejected,
  createdAt,
}: {
  currentStatus: ApplicationStatus;
  applicationId: string;
  candidateName: string;
  canShortlist: boolean;
  isShortlisted: boolean;
  shortlistNote: string | null;
  canReject: boolean;
  isPending: boolean;
  isRejectPending: boolean;
  onReject: () => void;
  onRetryEvaluation: () => void | Promise<void>;
  retryEvaluationPending: boolean;
  evaluationRetry: NonNullable<
    Awaited<ReturnType<typeof getCompanyApplicantReview>>
  >["evaluationRetry"];
  onReinviteToInterview: () => void | Promise<void>;
  canReinviteToInterview: boolean;
  allowedStatuses: ApplicationStatus[];
  onStatusChange: (value: string) => void | Promise<void>;
  hasResume: boolean;
  onResumeView: () => void | Promise<void>;
  resumeLoading: boolean;
  candidateEmail: string;
  createdAt: Date;
  currentIndex: number;
  isFailed: boolean;
  isWithdrawn: boolean;
  isRejected: boolean;
}) {
  const tone = applicationStatusMeta[currentStatus];

  return (
    <Card size="sm" className="border-border/60">
      <CardContent className="space-y-4 py-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="space-y-1.5">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Application status
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className={tone.badge}>
                {applicationStatusLabels[currentStatus]}
              </Badge>
              <Badge variant="outline" className="gap-1 font-mono text-[11px]">
                <HugeiconsIcon icon={Calendar01Icon} strokeWidth={2} className="size-3" />
                Applied {formatDate(createdAt)}
              </Badge>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {hasResume ? (
              <Button variant="outline" onClick={onResumeView} disabled={resumeLoading}>
                {resumeLoading ? (
                  <HugeiconsIcon
                    icon={Loading03Icon}
                    strokeWidth={2}
                    className="size-4 animate-spin"
                  />
                ) : (
                  <HugeiconsIcon icon={File02Icon} strokeWidth={2} className="size-4" />
                )}
                {resumeLoading ? "Opening..." : "View resume"}
              </Button>
            ) : null}

            {isFailed && evaluationRetry?.actionable ? (
              <Button
                variant="outline"
                disabled={retryEvaluationPending}
                onClick={onRetryEvaluation}
              >
                {retryEvaluationPending ? (
                  <HugeiconsIcon
                    icon={Loading03Icon}
                    strokeWidth={2}
                    className="size-4 animate-spin"
                  />
                ) : null}
                {retryEvaluationPending ? "Retrying..." : "Retry evaluation"}
              </Button>
            ) : null}

            {isFailed &&
            evaluationRetry?.actionable === false &&
            evaluationRetry.suggestedAction === "reinvite" &&
            canReinviteToInterview ? (
              <Button variant="outline" disabled={isPending} onClick={onReinviteToInterview}>
                {isPending ? (
                  <HugeiconsIcon
                    icon={Loading03Icon}
                    strokeWidth={2}
                    className="size-4 animate-spin"
                  />
                ) : null}
                {isPending ? "Inviting..." : "Re-invite to interview"}
              </Button>
            ) : null}

            {canReject ? (
              <Button variant="destructive" disabled={isPending} onClick={onReject}>
                {isPending && isRejectPending ? (
                  <HugeiconsIcon
                    icon={Loading03Icon}
                    strokeWidth={2}
                    className="size-4 animate-spin"
                  />
                ) : null}
                {isPending && isRejectPending ? "Rejecting..." : "Reject"}
              </Button>
            ) : null}

            {canShortlist ? (
              <ShortlistDialog
                applicationId={applicationId}
                candidateName={candidateName}
                mode="create"
                trigger={<Button disabled={isPending}>Shortlist</Button>}
              />
            ) : null}

            {isShortlisted ? (
              <ShortlistDialog
                applicationId={applicationId}
                candidateName={candidateName}
                mode="edit"
                defaultNote={shortlistNote}
                trigger={<Button variant="outline">Edit note</Button>}
              />
            ) : null}
          </div>
        </div>

        <div className="grid gap-3 border-y border-border/50 py-3 lg:grid-cols-[minmax(0,1fr)_280px]">
          <CompactStepper
            currentIndex={currentIndex}
            isFailed={isFailed}
            isWithdrawn={isWithdrawn}
            isRejected={isRejected}
          />
          <div className="space-y-2 lg:border-l lg:border-border/50 lg:pl-3">
            {allowedStatuses.length > 1 ? (
              <div className="space-y-1.5">
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
            <div className="text-[11px] text-muted-foreground">
              <p className="font-medium uppercase tracking-wide">Contact</p>
              <a
                href={`mailto:${candidateEmail}`}
                className="mt-0.5 truncate font-mono text-xs text-foreground hover:underline"
              >
                {candidateEmail}
              </a>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
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
  const progressWidth = currentIndex > 0 ? `${currentIndex * 20}%` : "0%";
  const progressTone = currentIndex === 4 && isRejected ? "bg-danger/60" : "bg-primary/50";

  return (
    <div className="relative w-full self-center">
      <div className="pointer-events-none absolute left-[10%] right-[10%] top-1.25 h-px bg-border/60" />
      {!isFailed && !isWithdrawn ? (
        <div
          className={`pointer-events-none absolute left-[10%] top-1.25 h-px ${progressTone}`}
          style={{ width: progressWidth }}
        />
      ) : null}
      <div className="relative z-10 grid grid-cols-5 gap-0">
        {stepperSteps.map((step, i) => {
          const isCurrent = !isFailed && !isWithdrawn && i === currentIndex;
          const isCompleted = !isFailed && !isWithdrawn && i < currentIndex;
          // On "decision" step, color reflects shortlisted (primary) vs rejected (danger)
          const dotClass = isFailed
            ? "bg-danger"
            : isWithdrawn
              ? "bg-muted"
              : isCurrent
                ? i === 4 && isRejected
                  ? "bg-danger"
                  : "bg-primary"
                : isCompleted
                  ? "bg-primary"
                  : "bg-muted";

          return (
            <div key={step.key} className="flex flex-col items-center gap-1.5">
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
    </div>
  );
}
