import {
  ArrowLeft01Icon,
  Calendar01Icon,
  Cancel01Icon,
  File02Icon,
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
import { Card, CardContent } from "@/components/ui/card";
import { SubmittedProfileSnapshot } from "@/features/applications/components/submitted-profile-snapshot";
import {
  getApplicationResumeDownloadUrl,
  getMyApplicationDetail,
  withdrawApplication,
} from "@/features/applications/server/functions";
import { InterviewInvitationCard } from "@/features/interviews/components/interview-invitation-card";
import { getInterviewForApplication } from "@/features/interviews/server/functions";
import { getInterviewExpiresAt } from "@/features/interviews/shared/expiry";
import { validateUuidParams } from "@/shared/validation";

export const Route = createFileRoute("/_authenticated/dashboard/application/$applicationId")({
  beforeLoad: ({ context, params }) => {
    if (!context.isCandidate) {
      throw redirect({ to: "/dashboard" });
    }
    validateUuidParams({ applicationId: params.applicationId });
  },
  loader: async ({ params }) => {
    const application = await getMyApplicationDetail({
      data: { applicationId: params.applicationId },
    });
    if (!application) {
      throw notFound();
    }
    const interview = await getInterviewForApplication({
      data: { applicationId: params.applicationId },
    });
    return { application, interview };
  },
  pendingComponent: DashboardApplicationDetailSkeleton,
  component: CandidateApplicationDetailPage,
});

type Application = NonNullable<Awaited<ReturnType<typeof getMyApplicationDetail>>>;

const HAPPY_PATH_STAGES = ["applied", "interviewing", "evaluated"] as const;

const stageCopy = {
  applied: {
    label: "Applied",
    badge: "Applied",
    tone: "border-info/20 bg-info/10 text-info",
    summary: "Your application is in the review queue.",
    nextStep: "Keep your profile sharp - the next signal is typically a move to interview review.",
  },
  interviewing: {
    label: "Interviewing",
    badge: "Interviewing",
    tone: "border-warning/20 bg-warning/10 text-warning",
    summary: "You have been invited to a RoundZero interview for this role.",
    nextStep: "Complete the interview before the deadline to keep your evaluation slot.",
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

const underReviewMeta = {
  badge: "Awaiting company decision",
  tone: "border-success/20 bg-success/10 text-success",
  summary: "Your interview is complete and the company is now reviewing your evaluation.",
  nextStep: "You are waiting on a decision after review.",
} as const;

const formatDate = (date: Date | string) => {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatDateShort = (date: Date | string) => {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

const toApplicationStage = (status: string): keyof typeof stageCopy => {
  switch (status) {
    case "interview_invited":
    case "interview_in_progress":
      return "interviewing";
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
}: {
  status: string;
  interviewStatus: string | null;
}) => {
  if (status === "interview_in_progress" && interviewStatus === "completed") {
    return underReviewMeta;
  }

  return stageCopy[toApplicationStage(status)];
};

const isTerminalStage = (stage: string): stage is "rejected" | "withdrawn" => {
  return stage === "rejected" || stage === "withdrawn";
};

const toRecord = (value: unknown): Record<string, unknown> => {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return Object.fromEntries(Object.entries(value));
  }

  return {};
};

const getStringValue = (value: unknown) => {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  return null;
};

const getStringArray = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (entry): entry is string => typeof entry === "string" && entry.trim().length > 0,
  );
};

const getLinks = (value: unknown) => {
  const record = toRecord(value);

  return Object.entries(record)
    .map(([label, entry]) => ({ label, href: getStringValue(entry) }))
    .filter((entry): entry is { label: string; href: string } => entry.href !== null);
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
  const getResumeUrlFn = useServerFn(getApplicationResumeDownloadUrl);
  const router = useRouter();

  const resumeDownloadMutation = useMutation({
    mutationFn: getResumeUrlFn,
    onSuccess: ({ url }) => {
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
      router.invalidate();
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

  const metadata = toRecord(application.metadata);
  const currentStage = toApplicationStage(application.status);
  const progressStage = currentStage === "shortlisted" ? "evaluated" : currentStage;
  const meta = getDisplayMeta({
    status: application.status,
    interviewStatus: interview?.status ?? null,
  });
  const skills = getStringArray(metadata.skills);
  const links = getLinks(metadata.links);
  const headline = getStringValue(metadata.headline);
  const bio = getStringValue(metadata.bio);
  const jobStateLabel = getJobStateLabel(application);
  const canWithdraw =
    (application.status === "applied" ||
      application.status === "interview_invited" ||
      application.status === "interview_in_progress") &&
    !application.companyOwnerDeleted;

  const hasInterview = interview !== null;
  const interviewExpiresAt = interview ? getInterviewExpiresAt(interview.metadata) : null;

  const onResumeView = async () => {
    await resumeDownloadMutation.mutateAsync({
      data: { applicationId: application.id },
    });
  };

  return (
    <div className="animate-fade-in space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link to="/dashboard/applications">
          <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-4" />
          Applications
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
              {application.companyName}
            </p>
            <Badge variant="outline" className="font-mono text-[11px]">
              {jobStateLabel}
            </Badge>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">{application.jobTitle}</h2>
        </div>
        <Badge className={meta.tone}>{meta.badge}</Badge>
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

      {application.companyOwnerDeleted ? (
        <Card size="sm" className="border-destructive/30 bg-destructive/5">
          <CardContent className="space-y-1 py-0">
            <p className="text-sm font-medium text-destructive">
              This company account has been deleted
            </p>
            <p className="text-xs text-muted-foreground">
              The company that posted this role is no longer active on RoundZero. This application
              is no longer moving forward.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <div className="space-y-3">
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
                <p className={`text-[11px] font-medium uppercase tracking-widest ${labelClass}`}>
                  {stageCopy[stage].label}
                </p>
              </div>
            );
          })}
        </div>

        {isTerminalStage(currentStage) ? (
          <Badge className={`${meta.tone} text-xs`}>{meta.badge}</Badge>
        ) : null}

        <Card size="sm">
          <CardContent className="space-y-1 py-0">
            <p className="text-sm text-foreground">
              {application.companyOwnerDeleted ? "This application is closed." : meta.summary}
            </p>
            <p className="text-xs text-muted-foreground">
              {application.companyOwnerDeleted
                ? "The company account has been deleted. You can still view your submitted profile snapshot below."
                : meta.nextStep}
            </p>
          </CardContent>
        </Card>
      </div>

      {hasInterview && !application.companyOwnerDeleted ? (
        <InterviewInvitationCard
          interviewId={interview.id}
          interviewType={interview.type}
          status={interview.status}
          expiresAt={interviewExpiresAt}
        />
      ) : null}

      <div className="flex flex-wrap gap-2">
        {application.resumeKey ? (
          <Button
            variant="outline"
            size="sm"
            onClick={onResumeView}
            disabled={resumeDownloadMutation.isPending}
          >
            <HugeiconsIcon icon={File02Icon} strokeWidth={2} className="size-4" />
            View submitted resume
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
      </div>

      <SubmittedProfileSnapshot
        headline={headline}
        bio={bio}
        skills={skills}
        links={links}
        workHistory={[]}
        hasResume={Boolean(application.resumeKey)}
      />
    </div>
  );
}
