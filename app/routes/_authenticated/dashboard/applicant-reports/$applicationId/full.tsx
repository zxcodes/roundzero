import {
  Alert02Icon,
  ArrowLeft01Icon,
  CheckmarkCircle02Icon,
  File02Icon,
  Loading03Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link, notFound, redirect, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { DashboardApplicantReportSkeleton } from "@/components/route-skeletons";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getApplicationResume,
  updateApplicationStatus,
} from "@/features/applications/server/functions";
import { ReportTimeline } from "@/features/reports/components/report-cards";
import { ScorePill } from "@/features/reports/components/score-pill";
import { getOverallScore } from "@/features/reports/schemas";
import { getCompanyApplicantReportTimeline } from "@/features/reports/server/functions";
import { formatDateTime } from "@/shared/date";
import {
  APPLICATION_STATUS_TRANSITIONS,
  type ApplicationStatus,
  applicationStatusLabels,
  applicationStatusMeta,
  applicationStatusSchema,
  recommendationSchema,
} from "@/shared/enums";
import { base64ToBlob } from "@/shared/resume";
import { validateUuidParams } from "@/shared/validation";

export const Route = createFileRoute(
  "/_authenticated/dashboard/applicant-reports/$applicationId/full",
)({
  beforeLoad: ({ context, params }) => {
    if (!context.isCompany) {
      throw redirect({ to: "/dashboard" });
    }
    validateUuidParams({ applicationId: params.applicationId });
  },
  loader: async ({ params }) => {
    const data = await getCompanyApplicantReportTimeline({
      data: { applicationId: params.applicationId },
    });
    if (!data) {
      throw notFound();
    }
    return data;
  },
  pendingComponent: DashboardApplicantReportSkeleton,
  component: ApplicantAiReportPage,
});

function ApplicantAiReportPage() {
  const {
    application,
    preEvaluation,
    interview,
    interviewState,
    report,
    reportCreatedAt,
    communicationAssessment,
  } = Route.useLoaderData();
  const router = useRouter();
  const [pendingStatus, setPendingStatus] = useState<ApplicationStatus | null>(null);

  const getResumeFn = useServerFn(getApplicationResume);
  const updateStatusFn = useServerFn(updateApplicationStatus);

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

  const onResumeView = async () => {
    await resumeDownloadMutation.mutateAsync({
      data: { applicationId: application.id },
    });
  };

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

  const currentStatus = applicationStatusSchema.parse(application.status);
  const statusTone = applicationStatusMeta[currentStatus];
  const allowedTransitions = APPLICATION_STATUS_TRANSITIONS[currentStatus] ?? [];
  const canShortlist =
    allowedTransitions.includes("shortlisted") && currentStatus !== "shortlisted";
  const canReject = allowedTransitions.includes("rejected") && currentStatus !== "rejected";
  const allowedStatusOptions: ApplicationStatus[] = [
    currentStatus,
    ...allowedTransitions.filter((status) => status !== currentStatus),
  ];

  const onStatusValueChange = async (value: string) => {
    const nextStatus = applicationStatusSchema.parse(value);
    if (nextStatus === currentStatus) return;
    if (nextStatus === "rejected") {
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

  const onRejectClick = () => {
    setPendingStatus("rejected");
  };

  const onStatusSelectValueChange = async (value: string) => {
    await onStatusValueChange(value);
  };

  const onRejectConfirm = async () => {
    if (!pendingStatus) return;
    await updateStatusMutation.mutateAsync({
      data: { applicationId: application.id, status: pendingStatus },
    });
    setPendingStatus(null);
  };

  const onPendingStatusChange = (open: boolean) => {
    if (!open) setPendingStatus(null);
  };

  if (!report) {
    const isInterviewCompleted = interview?.status === "completed";
    const isEvalFailed = application.status === "evaluation_failed";

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" size="sm" asChild className="-ml-2">
            <Link
              to="/dashboard/applicant-reports/$applicationId"
              params={{ applicationId: application.id }}
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-4" />
              Report summary
            </Link>
          </Button>
        </div>

        {isEvalFailed ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyTitle>Evaluation failed</EmptyTitle>
              <EmptyDescription>
                The AI evaluation could not be completed for this applicant. You can reject the
                application or wait for a manual review.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : isInterviewCompleted ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyTitle className="flex items-center gap-2">
                <HugeiconsIcon
                  icon={Loading03Icon}
                  strokeWidth={2}
                  className="size-4 animate-spin"
                />
                Evaluation in progress
              </EmptyTitle>
              <EmptyDescription>
                Zero is generating the post-interview report. Check back in a few minutes.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Empty className="border">
            <EmptyHeader>
              <EmptyTitle>No post-interview report yet</EmptyTitle>
              <EmptyDescription>
                This applicant does not have a generated post-evaluation report yet.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </div>
    );
  }

  const messages = interviewState?.messages ?? [];
  const score = getOverallScore(report.scores);
  const parsedRecommendation = recommendationSchema.safeParse(report.recommendation);
  const recommendation = parsedRecommendation.success ? parsedRecommendation.data : null;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link
            to="/dashboard/applicant-reports/$applicationId"
            params={{ applicationId: application.id }}
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-4" />
            Report summary
          </Link>
        </Button>
      </div>

      <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
        This is the full audit timeline — every step Zero took to evaluate{" "}
        <span className="font-medium text-foreground">{application.candidateName}</span>. For a
        polished, evidence-backed view, head back to the{" "}
        <Link
          to="/dashboard/applicant-reports/$applicationId"
          params={{ applicationId: application.id }}
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          report summary
        </Link>
        .
      </div>

      <div className="rounded-4xl border border-border/70 bg-card px-4 py-4 shadow-sm md:px-6 md:py-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-xl border border-border/70 bg-muted/30">
                <HugeiconsIcon
                  icon={SparklesIcon}
                  strokeWidth={2}
                  className="size-4 text-muted-foreground"
                />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight">{application.candidateName}</h1>
              <Badge variant="outline" className={statusTone.badge}>
                {applicationStatusLabels[currentStatus]}
              </Badge>
              <ScorePill score={score} recommendation={recommendation} size="default" />
            </div>
            <p className="text-sm text-muted-foreground">
              Post-interview report for{" "}
              <span className="font-medium text-foreground">{application.jobTitle}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Generated {reportCreatedAt ? formatDateTime(reportCreatedAt) : "N/A"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canShortlist ? (
              <Button onClick={onShortlist} disabled={updateStatusMutation.isPending}>
                <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} className="size-4" />
                Shortlist
              </Button>
            ) : null}
            {canReject ? (
              <Button
                variant="destructive"
                onClick={onRejectClick}
                disabled={updateStatusMutation.isPending}
              >
                <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} className="size-4" />
                Reject
              </Button>
            ) : null}
            <Select
              value={currentStatus}
              onValueChange={onStatusSelectValueChange}
              disabled={updateStatusMutation.isPending}
            >
              <SelectTrigger className="w-47.5">
                <SelectValue placeholder="Move to status" />
              </SelectTrigger>
              <SelectContent>
                {allowedStatusOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    Move to: {applicationStatusLabels[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {application.resumeKey ? (
              <Button
                variant="outline"
                size="sm"
                onClick={onResumeView}
                disabled={resumeDownloadMutation.isPending}
              >
                <HugeiconsIcon icon={File02Icon} strokeWidth={2} className="size-4" />
                {resumeDownloadMutation.isPending ? "Opening…" : "View submitted resume"}
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="rounded-4xl border border-border/60 bg-card/40 px-4 py-4 md:px-6 md:py-6">
        <ReportTimeline
          report={report}
          preEvaluation={preEvaluation}
          interview={interview}
          messages={messages}
          reportCreatedAt={reportCreatedAt}
          communicationAssessment={communicationAssessment}
          application={{
            candidateName: application.candidateName,
            candidatePicture: application.candidatePicture,
            jobTitle: application.jobTitle,
            createdAt: application.createdAt,
          }}
        />
      </div>

      <AlertDialog open={pendingStatus === "rejected"} onOpenChange={onPendingStatusChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject this applicant?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the application as rejected. You can still review the report later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onRejectConfirm}>Reject</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
