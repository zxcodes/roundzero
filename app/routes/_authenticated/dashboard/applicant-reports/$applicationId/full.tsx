import {
  AiMagicIcon,
  Alert02Icon,
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
  File02Icon,
  Loading03Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link, notFound, redirect, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { DashboardApplicantReportTimelineSkeleton } from "@/components/route-skeletons";
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
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
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
  updateApplicationStatus,
} from "@/features/applications/server/functions";
import { parseShortlistDetails } from "@/features/applications/shortlist";
import { ReportTimeline } from "@/features/reports/components/report-cards";
import {
  getReportInitials,
  ReportActionsRow,
  ReportKeyboardLegend,
  verdictBandTone,
} from "@/features/reports/components/report-page-ui";
import { ScorePill } from "@/features/reports/components/score-pill";
import { useReportKeyboardShortcuts } from "@/features/reports/hooks/use-report-keyboard-shortcuts";
import { getCompanyApplicantReportTimeline } from "@/features/reports/server/functions";
import { cn } from "@/lib/utils";
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
  pendingComponent: DashboardApplicantReportTimelineSkeleton,
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
    batchNavigation,
  } = Route.useLoaderData();
  const router = useRouter();
  const [pendingStatus, setPendingStatus] = useState<ApplicationStatus | null>(null);
  const [shortlistOpen, setShortlistOpen] = useState(false);

  // This route reuses the component instance across applicationId changes, so any
  // open dialog would otherwise act on the newly loaded profile. Close them on nav.
  const [renderedApplicationId, setRenderedApplicationId] = useState(application.id);
  if (renderedApplicationId !== application.id) {
    setRenderedApplicationId(application.id);
    setPendingStatus(null);
    setShortlistOpen(false);
  }

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
  const isShortlisted = currentStatus === "shortlisted";
  const shortlistDetails = parseShortlistDetails(application.metadata);
  const statusMoveOptions = allowedTransitions.filter(
    (status) => status !== "shortlisted" && status !== "rejected",
  );

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

  const onRejectClick = () => {
    setPendingStatus("rejected");
  };
  const onShortlistShortcut = () => setShortlistOpen(true);

  useReportKeyboardShortcuts({
    batchNavigation,
    linkTarget: "full",
    onShortlist: canShortlist ? onShortlistShortcut : undefined,
    onReject: canReject ? onRejectClick : undefined,
  });

  const shortcutItems = [
    { key: "S", label: "Shortlist", disabled: !canShortlist },
    { key: "R", label: "Reject", disabled: !canReject },
    { key: "←", label: "Previous", disabled: !batchNavigation?.previousApplicationId },
    { key: "→", label: "Next", disabled: !batchNavigation?.nextApplicationId },
  ];

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
    const isAwaitingVoice = interview?.status === "awaiting_voice";
    const isEvalFailed = application.status === "evaluation_failed";

    const emptyState = isEvalFailed ? (
      <Empty
        className={
          batchNavigation ? "border-0 p-0 shadow-none" : "rounded-2xl border-0 bg-muted/30"
        }
      >
        <EmptyHeader>
          <EmptyTitle>Evaluation failed</EmptyTitle>
          <EmptyDescription>
            The AI evaluation could not be completed for this applicant. You can reject the
            application or wait for a manual review.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    ) : isAwaitingVoice ? (
      <Empty
        className={
          batchNavigation ? "border-0 p-0 shadow-none" : "rounded-2xl border-0 bg-muted/30"
        }
      >
        <EmptyHeader>
          <EmptyTitle>Waiting for voice assessment</EmptyTitle>
          <EmptyDescription>
            The candidate finished the chat interview and still needs to complete the required voice
            assessment before Zero generates the report.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    ) : isInterviewCompleted ? (
      <Empty
        className={
          batchNavigation ? "border-0 p-0 shadow-none" : "rounded-2xl border-0 bg-muted/30"
        }
      >
        <EmptyHeader>
          <EmptyTitle className="flex items-center gap-2">
            <HugeiconsIcon icon={Loading03Icon} strokeWidth={2} className="size-4 animate-spin" />
            Evaluation in progress
          </EmptyTitle>
          <EmptyDescription>
            Zero is generating the post-interview report. Check back in a few minutes.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    ) : (
      <Empty
        className={
          batchNavigation ? "border-0 p-0 shadow-none" : "rounded-2xl border-0 bg-muted/30"
        }
      >
        <EmptyHeader>
          <EmptyTitle>No post-interview report yet</EmptyTitle>
          <EmptyDescription>
            This applicant does not have a generated post-evaluation report yet.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );

    return (
      <div className="overflow-hidden rounded-3xl border border-border/60">
        {batchNavigation ? (
          <div className="px-5 py-4 md:px-6">
            <ReportActionsRow
              applicationId={application.id}
              batchNavigation={batchNavigation}
              linkTarget="summary"
            />
          </div>
        ) : null}
        <div
          className={cn("px-5 py-8 md:px-6", batchNavigation ? "border-t border-border/60" : "")}
        >
          {emptyState}
        </div>
      </div>
    );
  }

  const messages = interviewState?.messages ?? [];
  const parsedRecommendation = recommendationSchema.safeParse(report.recommendation);
  const recommendation = parsedRecommendation.success ? parsedRecommendation.data : null;

  const authenticity = report.answerAuthenticity;
  const showAuthenticity =
    authenticity?.riskLevel === "medium" || authenticity?.riskLevel === "high";
  const authenticityRiskTone =
    authenticity?.riskLevel === "high"
      ? "border-danger/20 bg-danger/10 text-danger"
      : "border-border/60 bg-muted/30 text-muted-foreground";
  const verdictTone = recommendation !== null ? verdictBandTone[recommendation] : "bg-muted/25";

  return (
    <div className="overflow-hidden rounded-3xl border border-border/60">
      <section className={cn(verdictTone)}>
        <div className="px-5 py-4 md:px-6">
          <ReportActionsRow
            applicationId={application.id}
            batchNavigation={batchNavigation}
            linkTarget="summary"
          />

          <div className="flex flex-col gap-4 pt-4 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <Avatar className="size-14 shrink-0">
                <AvatarImage
                  src={application.candidatePicture ?? undefined}
                  alt={application.candidateName}
                />
                <AvatarFallback className="text-sm">
                  {getReportInitials(application.candidateName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-xl font-semibold tracking-tight">
                    {application.candidateName}
                  </h1>
                  <Badge variant="outline" className={statusTone.badge}>
                    {applicationStatusLabels[currentStatus]}
                  </Badge>
                  {showAuthenticity ? (
                    <Badge variant="outline" className={cn("gap-1", authenticityRiskTone)}>
                      <HugeiconsIcon icon={AiMagicIcon} strokeWidth={2} className="size-3" />
                      {authenticity.riskLevel === "high"
                        ? "Likely AI answers"
                        : "Possible AI answers"}
                    </Badge>
                  ) : null}
                </div>
                <p className="truncate text-sm text-muted-foreground">
                  Full audit timeline for{" "}
                  <span className="font-medium text-foreground">{application.jobTitle}</span>
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Generated {reportCreatedAt ? formatDateTime(reportCreatedAt) : "—"}
                </p>
              </div>
            </div>

            <div className="md:shrink-0">
              <ScorePill score={report.scores.overall} recommendation={recommendation} size="lg" />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/30 pt-4">
            {canShortlist ? (
              <ShortlistDialog
                applicationId={application.id}
                candidateName={application.candidateName}
                mode="create"
                open={shortlistOpen}
                onOpenChange={setShortlistOpen}
                trigger={
                  <Button>
                    <HugeiconsIcon
                      icon={CheckmarkCircle02Icon}
                      strokeWidth={2}
                      className="size-4"
                    />
                    Shortlist
                  </Button>
                }
              />
            ) : null}
            {isShortlisted ? (
              <ShortlistDialog
                applicationId={application.id}
                candidateName={application.candidateName}
                mode="edit"
                defaultNote={shortlistDetails?.note ?? null}
                trigger={<Button variant="outline">Edit note</Button>}
              />
            ) : null}
            {canReject ? (
              <Button
                variant="destructive"
                onClick={onRejectClick}
                disabled={updateStatusMutation.isPending}
              >
                {updateStatusMutation.isPending && pendingStatus !== null ? (
                  <HugeiconsIcon
                    icon={Loading03Icon}
                    strokeWidth={2}
                    className="size-4 animate-spin"
                  />
                ) : (
                  <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} className="size-4" />
                )}
                {updateStatusMutation.isPending && pendingStatus !== null ? "Rejecting" : "Reject"}
              </Button>
            ) : null}
            {statusMoveOptions.length > 0 ? (
              <Select onValueChange={onStatusValueChange} disabled={updateStatusMutation.isPending}>
                <SelectTrigger className="w-50">
                  <SelectValue placeholder="Move to status" />
                </SelectTrigger>
                <SelectContent>
                  {statusMoveOptions.map((status) => (
                    <SelectItem key={status} value={status}>
                      Move to: {applicationStatusLabels[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
            {application.resumeKey ? (
              <Button
                variant="outline"
                size="sm"
                onClick={onResumeView}
                disabled={resumeDownloadMutation.isPending}
              >
                {resumeDownloadMutation.isPending ? (
                  <HugeiconsIcon
                    icon={Loading03Icon}
                    strokeWidth={2}
                    className="size-4 animate-spin"
                  />
                ) : (
                  <HugeiconsIcon icon={File02Icon} strokeWidth={2} className="size-4" />
                )}
                {resumeDownloadMutation.isPending ? "Opening" : "View resume"}
              </Button>
            ) : null}
          </div>

          {shortcutItems.length > 0 ? (
            <div className="mt-4 border-t border-border/30 pt-4">
              <ReportKeyboardLegend items={shortcutItems} />
            </div>
          ) : null}
        </div>
      </section>

      <section className="border-t border-border/60 px-5 py-5 md:px-6">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Audit timeline
        </p>
        <div className="mt-5">
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
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 px-5 py-4 md:px-6">
        <p className="text-xs text-muted-foreground">Prefer the condensed executive brief?</p>
        <Button asChild variant="outline" size="sm">
          <Link
            to="/dashboard/applicant-reports/$applicationId"
            params={{ applicationId: application.id }}
          >
            Report summary
            <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-4" />
          </Link>
        </Button>
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
