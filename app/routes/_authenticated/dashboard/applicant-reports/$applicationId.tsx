import { ArrowLeft01Icon, File02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link, notFound, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { DashboardApplicantReviewSkeleton } from "@/components/route-skeletons";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { getApplicationResumeDownloadUrl } from "@/features/applications/server/functions";
import {
  parseReportData,
  ReportInsightsCard,
  ReportScreeningCard,
  ReportSummaryCard,
  ReportTimelineCard,
} from "@/features/reports/components/report-cards";
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

        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>No post-interview report yet</EmptyTitle>
            <EmptyDescription>
              This applicant does not have a generated post-evaluation report yet.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  const parsedReport = parseReportData(report);
  const messages = interviewState?.messages ?? [];

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

      <ReportSummaryCard report={parsedReport} />
      <ReportScreeningCard report={parsedReport} />
      <ReportInsightsCard report={parsedReport} />
      <ReportTimelineCard
        preEvaluation={preEvaluation}
        interview={interview}
        messages={messages}
        reportCreatedAt={report.createdAt}
      />

      <Card className="border border-dashed border-border/70">
        <CardContent className="py-4 text-sm text-muted-foreground">
          Scoring shown here is the persisted post-evaluation output from the completed interview
          report.
        </CardContent>
      </Card>
    </div>
  );
}
