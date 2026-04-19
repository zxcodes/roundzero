import { ArrowLeft01Icon, File02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link, notFound, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { DashboardApplicantReviewSkeleton } from "@/components/route-skeletons";
import { Button } from "@/components/ui/button";
import { AiFullReport } from "@/features/ai/components/evaluation-cards";
import {
  getApplicationResumeDownloadUrl,
  getCompanyApplicantReview,
} from "@/features/applications/server/functions";
import { getMockAiEvaluation } from "@/mock/ai-evaluations";
import { validateUuidParams } from "@/shared/validation";

export const Route = createFileRoute("/_authenticated/dashboard/applicant-reports/$applicationId")({
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
    return data;
  },
  pendingComponent: DashboardApplicantReviewSkeleton,
  component: ApplicantAiReportPage,
});

function ApplicantAiReportPage() {
  const { application } = Route.useLoaderData();
  const getResumeUrlFn = useServerFn(getApplicationResumeDownloadUrl);
  const evaluation = getMockAiEvaluation(application.id);

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

      <AiFullReport
        application={{
          candidateName: application.candidateName,
          candidateEmail: application.candidateEmail,
          candidatePicture: application.candidatePicture,
          jobTitle: application.jobTitle,
          companyName: application.companyName,
          createdAt: application.createdAt,
        }}
        evaluation={evaluation}
      />
    </div>
  );
}
