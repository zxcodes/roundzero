import {
  ArrowLeft01Icon,
  File02Icon,
  Loading03Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link, notFound, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { DashboardApplicantReviewSkeleton } from "@/components/route-skeletons";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { getApplicationResumeDownloadUrl } from "@/features/applications/server/functions";
import { parseReportData, ReportTimeline } from "@/features/reports/components/report-cards";
import { getCompanyApplicantReportTimeline } from "@/features/reports/server/functions";
import { validateUuidParams } from "@/shared/validation";

export const Route = createFileRoute("/_authenticated/dashboard/applicant-reports/$applicationId")({
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
  pendingComponent: DashboardApplicantReviewSkeleton,
  component: ApplicantAiReportPage,
});

function ApplicantAiReportPage() {
  const { application, preEvaluation, interview, interviewState, report } = Route.useLoaderData();
  const getResumeUrlFn = useServerFn(getApplicationResumeDownloadUrl);

  const resumeDownloadMutation = useMutation({
    mutationFn: getResumeUrlFn,
    onSuccess: ({ url }) => {
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

  if (!report) {
    const isInterviewCompleted = interview?.status === "completed";
    const isEvalFailed = application.status === "evaluation_failed";

    return (
      <div className="animate-fade-in space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" size="sm" asChild className="-ml-2">
            <Link
              to="/dashboard/applicants/$applicationId"
              params={{ applicationId: application.id }}
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-4" />
              Applicant detail
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

  const parsedReport = parseReportData(report);
  const messages = interviewState?.messages ?? [];

  return (
    <div className="animate-fade-in space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link
            to="/dashboard/applicants/$applicationId"
            params={{ applicationId: application.id }}
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-4" />
            Applicant detail
          </Link>
        </Button>
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

      <div className="rounded-4xl border border-border/70 bg-card px-6 py-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-muted/30">
              <HugeiconsIcon
                icon={SparklesIcon}
                strokeWidth={2}
                className="size-5 text-muted-foreground"
              />
            </div>
            <div className="min-w-0 space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                Full evaluation
              </p>
              <div className="space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight">
                  {application.candidateName}
                </h1>
                <p className="text-sm text-muted-foreground">
                  Post-interview report for{" "}
                  <span className="font-medium text-foreground">{application.jobTitle}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-full border border-border/70 bg-muted/20 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Generated by Zero
            </div>
            <div className="rounded-full border border-border/70 bg-muted/20 px-3 py-1.5 font-mono text-[11px] text-muted-foreground">
              {report.createdAt.toUTCString().replace("GMT", "UTC")}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-4xl border border-border/60 bg-card/40 px-6 py-6">
        <ReportTimeline
          report={parsedReport}
          preEvaluation={preEvaluation}
          interview={interview}
          messages={messages}
          reportCreatedAt={report.createdAt}
          application={{
            candidateName: application.candidateName,
            candidatePicture: application.candidatePicture,
            jobTitle: application.jobTitle,
            createdAt: application.createdAt,
          }}
        />
      </div>
    </div>
  );
}
