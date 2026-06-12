import {
  AiMagicIcon,
  Alert02Icon,
  AnalyticsUpIcon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  BubbleChatIcon,
  CheckmarkCircle02Icon,
  ClipboardIcon,
  File02Icon,
  FileSearchIcon,
  FlagIcon,
  HelpCircleIcon,
  Loading03Icon,
  Mic01Icon,
  RankingIcon,
  SparklesIcon,
  Target02Icon,
  TickDouble01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link, notFound, redirect, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { DashboardApplicantReportSkeleton } from "@/components/route-skeletons";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
import { Separator } from "@/components/ui/separator";
import {
  getApplicationResume,
  updateApplicationStatus,
} from "@/features/applications/server/functions";
import { ScorePill } from "@/features/reports/components/score-pill";
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

export const Route = createFileRoute("/_authenticated/dashboard/applicant-reports/$applicationId/")(
  {
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
    component: ApplicantReportSummaryPage,
  },
);

type LoaderData = Awaited<ReturnType<typeof getCompanyApplicantReportTimeline>>;
type ReportData = NonNullable<NonNullable<LoaderData>["report"]>;

const dimensionMeta: Record<
  keyof Omit<ReportData["scores"], "overall">,
  { label: string; icon: typeof Target02Icon }
> = {
  communication: { label: "Communication", icon: BubbleChatIcon },
  problemSolving: { label: "Problem solving", icon: AnalyticsUpIcon },
  ownership: { label: "Ownership", icon: RankingIcon },
  roleFit: { label: "Role fit", icon: Target02Icon },
};

const concernMeta: Record<
  ReportData["screeningAnswers"][number]["concern"],
  { label: string; tone: string; icon: typeof CheckmarkCircle02Icon }
> = {
  none: {
    label: "OK",
    tone: "border-success/20 bg-success/10 text-success",
    icon: CheckmarkCircle02Icon,
  },
  minor: {
    label: "Flag",
    tone: "border-warning/20 bg-warning/10 text-warning",
    icon: HelpCircleIcon,
  },
  dealbreaker: {
    label: "Dealbreaker",
    tone: "border-danger/20 bg-danger/10 text-danger",
    icon: Alert02Icon,
  },
};

const getInitials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);

function ApplicantReportSummaryPage() {
  const {
    application,
    preEvaluation,
    report,
    reportCreatedAt,
    communicationAssessment,
    batchNavigation,
    interview,
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

  const onPendingStatusChange = (open: boolean) => {
    if (!open) setPendingStatus(null);
  };

  // ---- Empty / pending states ----

  if (!report) {
    const isInterviewCompleted = interview?.status === "completed";
    const isEvalFailed = application.status === "evaluation_failed";

    return (
      <div className="space-y-6">
        <BreadcrumbRow
          applicationId={application.id}
          batchNavigation={batchNavigation}
          showFullLink={false}
        />

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

  const parsedRecommendation = recommendationSchema.safeParse(report.recommendation);
  const recommendation = parsedRecommendation.success ? parsedRecommendation.data : null;

  const authenticity = report.answerAuthenticity;
  const showAuthenticity =
    authenticity?.riskLevel === "medium" || authenticity?.riskLevel === "high";

  return (
    <div className="space-y-6">
      <BreadcrumbRow
        applicationId={application.id}
        batchNavigation={batchNavigation}
        showFullLink
      />

      {/* Hero — candidate, score, recommendation */}
      <div className="rounded-4xl border border-border/70 bg-card px-5 py-5 shadow-sm md:px-7 md:py-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar className="size-14 shrink-0 ring-4 ring-background">
              <AvatarImage
                src={application.candidatePicture ?? undefined}
                alt={application.candidateName}
              />
              <AvatarFallback className="text-sm">
                {getInitials(application.candidateName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-2xl font-semibold tracking-tight">
                  {application.candidateName}
                </h1>
                <Badge variant="outline" className={statusTone.badge}>
                  {applicationStatusLabels[currentStatus]}
                </Badge>
                {showAuthenticity ? (
                  <Badge
                    variant="outline"
                    className="gap-1 border-amber-500/30 bg-amber-500/10 text-amber-600"
                  >
                    <HugeiconsIcon icon={AiMagicIcon} strokeWidth={2} className="size-3" />
                    {authenticity.riskLevel === "high"
                      ? "Likely AI answers"
                      : "Possible AI answers"}
                  </Badge>
                ) : null}
              </div>
              <p className="truncate text-sm text-muted-foreground">
                Post-interview report for{" "}
                <span className="font-medium text-foreground">{application.jobTitle}</span>
              </p>
              <p className="font-mono text-[11px] text-muted-foreground">
                Generated {reportCreatedAt ? formatDateTime(reportCreatedAt) : "—"}
              </p>
            </div>
          </div>

          <div className="md:shrink-0">
            <ScorePill score={report.scores.overall} recommendation={recommendation} size="lg" />
          </div>
        </div>

        <Separator className="my-5" />

        <div className="flex flex-wrap items-center gap-2">
          {canShortlist ? (
            <Button onClick={onShortlist} disabled={updateStatusMutation.isPending}>
              {updateStatusMutation.isPending && pendingStatus === null ? (
                <HugeiconsIcon
                  icon={Loading03Icon}
                  strokeWidth={2}
                  className="size-4 animate-spin"
                />
              ) : (
                <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} className="size-4" />
              )}
              {updateStatusMutation.isPending && pendingStatus === null
                ? "Shortlisting..."
                : "Shortlist"}
            </Button>
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
              {updateStatusMutation.isPending && pendingStatus !== null ? "Rejecting..." : "Reject"}
            </Button>
          ) : null}
          {allowedStatusOptions.length > 1 ? (
            <Select
              value={currentStatus}
              onValueChange={onStatusValueChange}
              disabled={updateStatusMutation.isPending}
            >
              <SelectTrigger className="w-50">
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
              {resumeDownloadMutation.isPending ? "Opening..." : "View resume"}
            </Button>
          ) : null}
        </div>
      </div>

      {/* Summary + dimension scores */}
      <section className="rounded-4xl border border-border/70 bg-card px-5 py-6 shadow-sm md:px-7">
        <div className="flex items-center gap-2">
          <HugeiconsIcon
            icon={SparklesIcon}
            strokeWidth={2}
            className="size-4 text-muted-foreground"
          />
          <h2 className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
            Summary
          </h2>
        </div>
        <p className="mt-3 text-sm leading-6 text-foreground">{report.summary}</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(Object.keys(dimensionMeta) as Array<keyof typeof dimensionMeta>).map((key) => {
            const dim = dimensionMeta[key];
            const score = Math.round(report.scores[key]);
            return (
              <div key={key} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <HugeiconsIcon
                      icon={dim.icon}
                      strokeWidth={2}
                      className="size-3.5 text-muted-foreground"
                    />
                    <span className="text-xs font-medium">{dim.label}</span>
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">{score}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-foreground/80"
                    style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Answer authenticity — surfaced prominently because it can flip a decision */}
      {showAuthenticity ? (
        <section className="rounded-4xl border border-amber-500/30 bg-amber-500/3 px-5 py-5 shadow-sm md:px-7 md:py-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="flex size-7 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10">
                <HugeiconsIcon
                  icon={AiMagicIcon}
                  strokeWidth={2}
                  className="size-3.5 text-amber-600"
                />
              </div>
              <div>
                <h2 className="text-[11px] font-bold uppercase tracking-[0.22em] text-amber-600">
                  Answer authenticity ·{" "}
                  {authenticity.riskLevel === "high" ? "High risk" : "Medium risk"}
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Independent check for AI-generated answers
                </p>
              </div>
            </div>
            <span className="shrink-0 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 font-mono text-xs font-bold uppercase text-amber-600">
              {authenticity.signals.length} signal{authenticity.signals.length === 1 ? "" : "s"}
            </span>
          </div>
          <p className="mt-3 text-sm leading-6 text-foreground">{authenticity.explanation}</p>
          {authenticity.signals.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {authenticity.signals.map((signal) => (
                <li
                  key={signal.signal}
                  className="rounded-lg border border-border/60 bg-background/50 p-3"
                >
                  <p className="text-sm font-medium text-foreground">{signal.signal}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    <span className="font-medium">Evidence:</span> &ldquo;{signal.evidence}&rdquo;
                  </p>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      {/* Strengths + Weaknesses */}
      <section className="grid gap-4 lg:grid-cols-2">
        <SignalPanel
          title="Strengths"
          icon={CheckmarkCircle02Icon}
          tone="text-success"
          items={report.strengths}
          emptyText="No strengths captured."
        />
        <SignalPanel
          title="Weaknesses"
          icon={FlagIcon}
          tone="text-danger"
          items={report.weaknesses}
          emptyText="No weaknesses captured."
        />
      </section>

      {/* Evidence */}
      {report.evidence.length > 0 ? (
        <section className="rounded-4xl border border-border/70 bg-card px-5 py-5 shadow-sm md:px-7 md:py-6">
          <div className="flex items-center gap-2">
            <HugeiconsIcon
              icon={TickDouble01Icon}
              strokeWidth={2}
              className="size-4 text-muted-foreground"
            />
            <h2 className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
              Evidence
            </h2>
          </div>
          <ul className="mt-4 space-y-2.5">
            {report.evidence.map((item, index) => (
              <li
                key={index}
                className="border-l-2 border-border/80 bg-muted/30 px-4 py-2.5 text-sm leading-6 text-foreground"
              >
                {item}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Insights */}
      {report.insights.length > 0 ? (
        <section className="rounded-4xl border border-border/70 bg-card px-5 py-5 shadow-sm md:px-7 md:py-6">
          <div className="flex items-center gap-2">
            <HugeiconsIcon
              icon={FileSearchIcon}
              strokeWidth={2}
              className="size-4 text-muted-foreground"
            />
            <h2 className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
              Insights
            </h2>
          </div>
          <ul className="mt-3 space-y-1.5">
            {report.insights.map((item, index) => (
              <li key={index} className="flex gap-2 text-sm leading-6 text-foreground">
                <span className="mt-2.5 size-1 shrink-0 rounded-full bg-muted-foreground/60" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Screening answers */}
      {report.screeningAnswers.length > 0 ? (
        <section className="rounded-4xl border border-border/70 bg-card px-5 py-5 shadow-sm md:px-7 md:py-6">
          <div className="flex items-center gap-2">
            <HugeiconsIcon
              icon={ClipboardIcon}
              strokeWidth={2}
              className="size-4 text-muted-foreground"
            />
            <h2 className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
              Screening questions
            </h2>
          </div>
          <ul className="mt-4 space-y-3">
            {report.screeningAnswers.map((entry) => {
              const cm = concernMeta[entry.concern];
              return (
                <li key={entry.question} className="space-y-1.5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <p className="max-w-2xl text-sm font-medium leading-6">{entry.question}</p>
                    <Badge variant="outline" className={cn("gap-1", cm.tone)}>
                      <HugeiconsIcon icon={cm.icon} strokeWidth={2} className="size-3" />
                      {cm.label}
                    </Badge>
                  </div>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {entry.answer ?? (
                      <span className="italic">Not asked or candidate did not answer.</span>
                    )}
                  </p>
                  {entry.notes ? (
                    <p className="border-l-2 border-border bg-muted/30 px-3 py-1.5 text-xs leading-5 text-muted-foreground">
                      {entry.notes}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {/* Pre-screening + Voice — collapsed by default */}
      {preEvaluation || communicationAssessment?.status === "completed" ? (
        <Accordion type="multiple" className="bg-card">
          {preEvaluation ? (
            <AccordionItem value="pre-screening">
              <AccordionTrigger className="px-5 py-3.5 text-sm md:px-7">
                <div className="flex items-center gap-2">
                  <HugeiconsIcon
                    icon={Target02Icon}
                    strokeWidth={2}
                    className="size-4 text-muted-foreground"
                  />
                  Pre-screening
                  <Badge variant="outline" className="ml-1 font-mono text-[11px]">
                    {preEvaluation.score}/100
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-4 md:px-7">
                <PreScreeningPanel preEvaluation={preEvaluation} />
              </AccordionContent>
            </AccordionItem>
          ) : null}

          {communicationAssessment?.status === "completed" ? (
            <AccordionItem value="voice">
              <AccordionTrigger className="px-5 py-3.5 text-sm md:px-7">
                <div className="flex items-center gap-2">
                  <HugeiconsIcon
                    icon={Mic01Icon}
                    strokeWidth={2}
                    className="size-4 text-muted-foreground"
                  />
                  Voice communication assessment
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-4 md:px-7">
                <VoiceSummary analysis={communicationAssessment.analysis} />
              </AccordionContent>
            </AccordionItem>
          ) : null}
        </Accordion>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <p className="text-xs text-muted-foreground">
          Need the full audit trail of every step Zero took?
        </p>
        <Button asChild variant="outline" size="sm">
          <Link
            to="/dashboard/applicant-reports/$applicationId/full"
            params={{ applicationId: application.id }}
          >
            View full audit timeline
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

function BreadcrumbRow({
  applicationId,
  batchNavigation,
  showFullLink,
}: {
  applicationId: string;
  batchNavigation: NonNullable<LoaderData>["batchNavigation"];
  showFullLink: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link to="/dashboard/applicants/$applicationId" params={{ applicationId }}>
          <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-4" />
          Applicant detail
        </Link>
      </Button>

      <div className="flex flex-wrap items-center gap-2">
        {batchNavigation ? (
          <>
            <Button
              variant="outline"
              size="sm"
              asChild={batchNavigation.previousApplicationId !== null}
              disabled={batchNavigation.previousApplicationId === null}
            >
              {batchNavigation.previousApplicationId ? (
                <Link
                  to="/dashboard/applicant-reports/$applicationId"
                  params={{ applicationId: batchNavigation.previousApplicationId }}
                >
                  <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-4" />
                  Previous
                </Link>
              ) : (
                <>
                  <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-4" />
                  Previous
                </>
              )}
            </Button>
            <span className="font-mono text-[11px] text-muted-foreground">
              #{batchNavigation.position} of {batchNavigation.total} in batch
            </span>
            <Button
              variant="outline"
              size="sm"
              asChild={batchNavigation.nextApplicationId !== null}
              disabled={batchNavigation.nextApplicationId === null}
            >
              {batchNavigation.nextApplicationId ? (
                <Link
                  to="/dashboard/applicant-reports/$applicationId"
                  params={{ applicationId: batchNavigation.nextApplicationId }}
                >
                  Next
                  <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-4" />
                </Link>
              ) : (
                <>
                  Next
                  <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-4" />
                </>
              )}
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link
                to="/dashboard/job-batches/$batchId"
                params={{ batchId: batchNavigation.batchId }}
              >
                Batch
              </Link>
            </Button>
          </>
        ) : null}
        {showFullLink ? (
          <Button asChild variant="ghost" size="sm">
            <Link to="/dashboard/applicant-reports/$applicationId/full" params={{ applicationId }}>
              Full audit
            </Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function SignalPanel({
  title,
  icon,
  tone,
  items,
  emptyText,
}: {
  title: string;
  icon: typeof CheckmarkCircle02Icon;
  tone: string;
  items: string[];
  emptyText: string;
}) {
  return (
    <div className="rounded-4xl border border-border/70 bg-card px-5 py-5 shadow-sm md:px-7 md:py-6">
      <div className="flex items-center gap-2">
        <HugeiconsIcon icon={icon} strokeWidth={2} className={cn("size-4", tone)} />
        <h2 className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
          {title}
        </h2>
      </div>
      {items.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {items.map((item, index) => (
            <li key={index} className="flex gap-2 text-sm leading-6 text-foreground">
              <span className={cn("mt-2.5 size-1 shrink-0 rounded-full", tone, "opacity-70")} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PreScreeningPanel({
  preEvaluation,
}: {
  preEvaluation: NonNullable<NonNullable<LoaderData>["preEvaluation"]>;
}) {
  const missingRequirements = Array.isArray(preEvaluation.missingRequirements)
    ? (preEvaluation.missingRequirements.filter(
        (item) => typeof item === "string" && item.length > 0,
      ) as string[])
    : [];

  return (
    <div className="space-y-3 text-sm">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs text-muted-foreground">Confidence</span>
        <span className="font-medium">{preEvaluation.confidence}</span>
        <Separator orientation="vertical" className="h-4" />
        <span className="text-xs text-muted-foreground">Next step</span>
        <span className="font-medium capitalize">{preEvaluation.nextStep.replace(/_/g, " ")}</span>
      </div>
      {missingRequirements.length > 0 ? (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            {missingRequirements.length} gap{missingRequirements.length === 1 ? "" : "s"} detected
          </p>
          <ul className="mt-1.5 space-y-1">
            {missingRequirements.map((req) => (
              <li key={req} className="text-xs text-foreground">
                • {req}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-xs text-success">All key requirements matched.</p>
      )}
    </div>
  );
}

type VoiceDimension = { score: number; evidence: string[] };

function VoiceSummary({ analysis }: { analysis: unknown }) {
  if (!analysis || typeof analysis !== "object") {
    return <p className="text-sm text-muted-foreground">No voice analysis captured.</p>;
  }
  const a = analysis as Record<string, unknown>;
  const overall = typeof a.overallScore === "number" ? Math.round(a.overallScore as number) : null;
  const summary = typeof a.summary === "string" ? a.summary : "";
  const dimensions: Array<{ key: string; label: string; dim: VoiceDimension }> = [
    { key: "clarity", label: "Clarity" },
    { key: "articulation", label: "Articulation" },
    { key: "conciseness", label: "Conciseness" },
    { key: "listening", label: "Listening" },
    { key: "confidence", label: "Confidence" },
  ]
    .map((d) => ({
      ...d,
      dim: (a[d.key] ?? { score: 0, evidence: [] }) as VoiceDimension,
    }))
    .filter((d) => d.dim);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        {summary ? <p className="text-sm leading-6 text-foreground">{summary}</p> : null}
        {overall !== null ? (
          <Badge variant="outline" className="font-mono text-xs">
            {overall}/100
          </Badge>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {dimensions.map(({ key, label, dim }) => {
          const score = Math.round(dim.score ?? 0);
          return (
            <div key={key} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">{label}</span>
                <span className="font-mono text-muted-foreground">{score}/100</span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-foreground/80"
                  style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
