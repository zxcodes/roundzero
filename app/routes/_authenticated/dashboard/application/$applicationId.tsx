import {
  Calendar01Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  File02Icon,
  Loading03Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link, notFound, redirect, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { DashboardApplicationDetailSkeleton } from "@/components/route-skeletons";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getApplicationResume,
  getMyApplicationDetail,
  withdrawApplication,
} from "@/features/applications/server/functions";
import { hasShortlistNextSteps, parseShortlistDetails } from "@/features/applications/shortlist";
import { InterviewInvitationCard } from "@/features/interviews/components/interview-invitation-card";
import { resolveInterviewAwareCandidateMeta } from "@/features/interviews/shared/candidate-display";
import { formatDate, formatDateShort } from "@/shared/date";
import { base64ToBlob } from "@/shared/resume";
import { validateUuidParams } from "@/shared/validation";

export const Route = createFileRoute("/_authenticated/dashboard/application/$applicationId")({
  beforeLoad: ({ context, params }) => {
    if (!context.isCandidate) {
      throw redirect({ to: "/dashboard" });
    }
    validateUuidParams({ applicationId: params.applicationId });
  },
  loader: async ({ params }) => {
    const data = await getMyApplicationDetail({
      data: { applicationId: params.applicationId },
    });
    if (!data) {
      throw notFound();
    }
    return data;
  },
  pendingComponent: DashboardApplicationDetailSkeleton,
  component: CandidateApplicationDetailPage,
});

type Application = NonNullable<Awaited<ReturnType<typeof getMyApplicationDetail>>>["application"];

const HAPPY_PATH_STAGES = ["applied", "interviewing", "evaluated"] as const;

const stageCopy = {
  applied: {
    label: "Applied",
    badge: "Applied",
    tone: "border-info/20 bg-info/10 text-info",
    summary: "Your application is in the review queue.",
    nextStep: "Keep your profile sharp - the next signal is typically a move to interview review.",
  },
  company_review: {
    label: "Company review",
    badge: "Company review",
    tone: "border-info/20 bg-info/10 text-info",
    summary:
      "Your initial screening is complete, and the company is reviewing whether to move your application forward.",
    nextStep:
      "If they would like to continue, they may invite you to an interview. No action is needed right now.",
  },
  queued_for_batch: {
    label: "Under review",
    badge: "Under review",
    tone: "border-info/20 bg-info/10 text-info",
    summary: "You are a strong fit and have been queued for the next evaluation batch.",
    nextStep:
      "We'll send your interview invite when the next batch launches — typically within 12 hours.",
  },
  interviewing: {
    label: "Interviewing",
    badge: "Interviewing",
    tone: "border-warning/20 bg-warning/10 text-warning",
    summary: "You have been invited to a RoundZero interview for this role.",
    nextStep: "Complete the interview before the deadline to keep your evaluation slot.",
  },
  evaluated_held: {
    label: "Evaluation complete",
    badge: "Evaluation complete",
    tone: "border-success/20 bg-success/10 text-success",
    summary: "Your evaluation is complete. Releasing with the next batch of candidates.",
    nextStep: "The company reviews candidates side-by-side after each batch is released.",
  },
  evaluated: {
    label: "Awaiting company decision",
    badge: "Awaiting company decision",
    tone: "border-success/20 bg-success/10 text-success",
    summary: "Your evaluation is complete and is now with the company for a decision.",
    nextStep: "Expect either a final decision or a follow-up step from the company.",
  },
  shortlisted: {
    label: "Shortlisted",
    badge: "Shortlisted",
    tone: "border-success/20 bg-success/10 text-success",
    summary: "You have been shortlisted for this role.",
    nextStep: "The company may contact you directly with next steps.",
  },
  rejected: {
    label: "Closed",
    badge: "Closed",
    tone: "border-danger/20 bg-danger/10 text-danger",
    summary: "This application is no longer moving forward.",
    nextStep: "Use what you learned here and keep applying to roles that match your profile.",
  },
  withdrawn: {
    label: "Withdrawn",
    badge: "Withdrawn",
    tone: "bg-muted text-muted-foreground",
    summary: "You withdrew this application.",
    nextStep: "This decision is final. You can still apply to other roles from this company.",
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
    case "interview_in_progress":
      return "interviewing";
    case "evaluated_held":
      return "evaluated_held";
    case "evaluated":
    case "shortlisted":
    case "rejected":
    case "withdrawn":
      return status;
    default:
      return "applied";
  }
};

const getDisplayMeta = ({
  status,
  interviewStatus,
  preEvaluationNextStep,
}: {
  status: string;
  interviewStatus: string | null;
  preEvaluationNextStep: string | null;
}) => {
  const baseMeta = stageCopy[toApplicationStage(status, preEvaluationNextStep)];
  return resolveInterviewAwareCandidateMeta(status, interviewStatus, baseMeta);
};

const isTerminalStage = (stage: string): stage is "rejected" | "withdrawn" => {
  return stage === "rejected" || stage === "withdrawn";
};

const getJobStateLabel = (application: Application) => {
  if (application.companyOwnerDeleted) {
    return "Account deleted";
  }

  if (application.jobStatus === "closed") {
    return "Role closed";
  }

  if (application.jobStatus === "draft") {
    return "Role paused";
  }

  return "Role open";
};

function CandidateApplicationDetailPage() {
  const { application, interview } = Route.useLoaderData();
  const getResumeFn = useServerFn(getApplicationResume);
  const router = useRouter();

  const resumeDownloadMutation = useMutation({
    mutationFn: getResumeFn,
    onSuccess: ({ base64, contentType }) => {
      const blob = base64ToBlob(base64, contentType);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
    },
    onError: () => {
      toast.error("Failed to open the submitted resume. Please try again.");
    },
  });

  const withdrawFn = useServerFn(withdrawApplication);

  const withdrawMutation = useMutation({
    mutationFn: withdrawFn,
    onSuccess: (data) => {
      if (!data?.application?.id) return;
      toast.success("Application withdrawn.");
      void router.invalidate();
    },
    onError: () => {
      toast.error("Failed to withdraw application. Please try again.");
    },
  });

  const onWithdraw = async () => {
    await withdrawMutation.mutateAsync({
      data: { applicationId: application.id },
    });
  };

  const currentStage = toApplicationStage(application.status, application.preEvaluationNextStep);
  const progressStage =
    currentStage === "shortlisted"
      ? "evaluated"
      : currentStage === "company_review"
        ? "applied"
        : currentStage;
  const shortlistDetails =
    application.status === "shortlisted" && !application.companyOwnerDeleted
      ? parseShortlistDetails(application.metadata)
      : null;
  const hasShortlistActions = hasShortlistNextSteps(shortlistDetails);
  const meta = getDisplayMeta({
    status: application.status,
    interviewStatus: interview?.status ?? null,
    preEvaluationNextStep: application.preEvaluationNextStep,
  });
  const jobStateLabel = getJobStateLabel(application);
  const canWithdraw =
    (application.status === "applied" ||
      application.status === "interview_invited" ||
      application.status === "interview_in_progress") &&
    !application.companyOwnerDeleted;

  const interviewExpiresAt = interview?.expiresAt ?? null;

  const onResumeView = async () => {
    await resumeDownloadMutation.mutateAsync({
      data: { applicationId: application.id },
    });
  };

  return (
    <div className="space-y-5">
      <section className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm text-muted-foreground">{application.companyName}</p>
              <Badge variant="outline" className="text-[11px]">
                {jobStateLabel}
              </Badge>
            </div>
            <h1 className="text-xl font-semibold tracking-tight">{application.jobTitle}</h1>
          </div>
          <Badge variant="outline" className={meta.tone}>
            {meta.badge}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <HugeiconsIcon icon={Calendar01Icon} strokeWidth={2} className="size-3.5" />
            Applied {formatDate(application.createdAt)}
          </span>
          {application.createdAt !== application.updatedAt ? (
            <span>Updated {formatDateShort(application.updatedAt)}</span>
          ) : null}
        </div>
      </section>

      {application.companyOwnerDeleted ? (
        <section className="rounded-2xl border border-destructive/20 bg-destructive/5 px-5 py-4">
          <p className="text-sm font-medium text-destructive">
            This company account has been deleted
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            The company that posted this role is no longer active on RoundZero. This application is
            no longer moving forward.
          </p>
        </section>
      ) : null}

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">Application progress</h2>
          <p className="text-sm text-muted-foreground">
            Where this application sits in the pipeline.
          </p>
        </div>

        <div className="flex gap-8">
          {HAPPY_PATH_STAGES.map((stage) => {
            const stageIndex = HAPPY_PATH_STAGES.indexOf(stage);
            const currentIndex = isTerminalStage(progressStage)
              ? HAPPY_PATH_STAGES.length
              : HAPPY_PATH_STAGES.indexOf(progressStage as (typeof HAPPY_PATH_STAGES)[number]);
            const isCompleted = stageIndex < currentIndex;
            const isCurrent = stage === progressStage;

            const barClass = isCurrent ? "bg-primary" : isCompleted ? "bg-primary/35" : "bg-muted";

            const labelClass = isCurrent
              ? "text-foreground"
              : isCompleted
                ? "text-muted-foreground"
                : "text-muted-foreground/40";

            return (
              <div key={stage} className="flex-1 space-y-1.5">
                <div className={`h-1.5 rounded-full ${barClass}`} />
                <p className={`text-[11px] font-medium ${labelClass}`}>{stageCopy[stage].label}</p>
              </div>
            );
          })}
        </div>

        {isTerminalStage(currentStage) ? (
          <Badge variant="outline" className={`${meta.tone} text-xs`}>
            {meta.badge}
          </Badge>
        ) : null}

        <div className="rounded-2xl bg-muted/30 px-5 py-4">
          <p className="text-sm text-foreground">
            {application.companyOwnerDeleted ? "This application is closed." : meta.summary}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {application.companyOwnerDeleted
              ? "The company account has been deleted. This application is no longer moving forward."
              : meta.nextStep}
          </p>
        </div>
      </section>

      {hasShortlistActions ? (
        <section className="space-y-3 rounded-3xl border border-border/60 px-5 py-4 md:px-6">
          <div className="flex items-center gap-2">
            <HugeiconsIcon
              icon={CheckmarkCircle02Icon}
              strokeWidth={2}
              className="size-4 text-success"
            />
            <p className="text-sm font-semibold text-foreground">
              Follow-up from {application.companyName}
            </p>
          </div>

          {shortlistDetails?.note ? (
            <div className="rounded-2xl bg-muted/60 px-4 py-3 text-sm text-foreground">
              {shortlistDetails.note}
            </div>
          ) : null}
        </section>
      ) : null}

      {interview && !application.companyOwnerDeleted ? (
        <InterviewInvitationCard
          interviewId={interview.id}
          interviewType={interview.type}
          status={interview.status}
          expiresAt={interviewExpiresAt}
        />
      ) : null}

      <section className="flex flex-wrap gap-2">
        {application.resumeKey ? (
          <Button
            variant="outline"
            size="sm"
            onClick={onResumeView}
            disabled={resumeDownloadMutation.isPending}
          >
            {resumeDownloadMutation.isPending ? (
              <HugeiconsIcon icon={Loading03Icon} strokeWidth={2} className="size-4 animate-spin" />
            ) : (
              <HugeiconsIcon icon={File02Icon} strokeWidth={2} className="size-4" />
            )}
            {resumeDownloadMutation.isPending ? "Opening" : "View submitted resume"}
          </Button>
        ) : null}
        {application.companyOwnerDeleted ? null : (
          <Button variant="outline" size="sm" asChild>
            <Link to="/dashboard/jobs/$jobId" params={{ jobId: application.jobId }}>
              View job listing
            </Link>
          </Button>
        )}
        {canWithdraw ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:bg-destructive/10"
                disabled={withdrawMutation.isPending}
              >
                <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className="size-4" />
                Withdraw
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Withdraw application?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently withdraw your application for{" "}
                  <span className="font-medium text-foreground">{application.jobTitle}</span> at{" "}
                  {application.companyName}. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onWithdraw}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Withdraw application
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}
      </section>
    </div>
  );
}
