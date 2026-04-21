import {
  ArrowLeft01Icon,
  Calendar01Icon,
  Cancel01Icon,
  File02Icon,
  Link04Icon,
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
import { CandidateAiNextStepCard } from "@/features/ai/components/evaluation-cards";
import {
  getApplicationResumeDownloadUrl,
  getMyApplicationDetail,
  withdrawApplication,
} from "@/features/applications/server/functions";
import { getMockAiEvaluation } from "@/mock/ai-evaluations";
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
    return application;
  },
  pendingComponent: DashboardApplicationDetailSkeleton,
  component: CandidateApplicationDetailPage,
});

type Application = NonNullable<Awaited<ReturnType<typeof getMyApplicationDetail>>>;

const APPLICATION_STAGES = [
  "applied",
  "interviewing",
  "evaluated",
  "rejected",
  "withdrawn",
] as const;

const stageCopy = {
  applied: {
    badge: "Applied",
    tone: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
    dot: "bg-sky-500",
    summary: "Your application is in the review queue.",
    nextStep: "Keep your profile sharp — the next signal is typically a move to interview review.",
  },
  interviewing: {
    badge: "Interviewing",
    tone: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    dot: "bg-amber-500",
    summary: "The company has advanced this role into the interview stage.",
    nextStep:
      "Watch this application closely. This is the strongest signal that a live next step is coming.",
  },
  evaluated: {
    badge: "Evaluated",
    tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
    summary: "The company has finished an evaluation pass on this application.",
    nextStep: "Expect either a final decision or a follow-up step from the company.",
  },
  rejected: {
    badge: "Closed",
    tone: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
    dot: "bg-rose-500",
    summary: "This application is no longer moving forward.",
    nextStep: "Use what you learned here and keep applying to roles that match your profile.",
  },
  withdrawn: {
    badge: "Withdrawn",
    tone: "bg-muted text-muted-foreground",
    dot: "bg-muted-foreground/50",
    summary: "You withdrew this application.",
    nextStep: "This decision is final. You can still apply to other roles from this company.",
  },
} as const;

const formatDate = (date: Date | string) => {
  return new Date(date).toLocaleDateString("en-US", {
    month: "long",
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

const toApplicationStage = (status: string): (typeof APPLICATION_STAGES)[number] => {
  switch (status) {
    case "interviewing":
    case "evaluated":
    case "rejected":
    case "withdrawn":
      return status;
    default:
      return "applied";
  }
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
    .map(([label, entry]) => ({ label, value: getStringValue(entry) }))
    .filter((entry): entry is { label: string; value: string } => entry.value !== null);
};

const getJobStateLabel = (jobStatus: Application["jobStatus"]) => {
  if (jobStatus === "closed") {
    return "Role closed";
  }

  if (jobStatus === "draft") {
    return "Role paused";
  }

  return "Role open";
};

function CandidateApplicationDetailPage() {
  const application = Route.useLoaderData();
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
  const aiEvaluation = getMockAiEvaluation(application.id);
  const meta = stageCopy[currentStage];
  const skills = getStringArray(metadata.skills);
  const links = getLinks(metadata.links);
  const headline = getStringValue(metadata.headline);
  const bio = getStringValue(metadata.bio);
  const jobStateLabel = getJobStateLabel(application.jobStatus);
  const canWithdraw = application.status === "applied" || application.status === "interviewing";

  const onResumeView = async () => {
    await resumeDownloadMutation.mutateAsync({
      data: { applicationId: application.id },
    });
  };

  const hasSnapshotContent =
    headline || application.resumeKey || bio || skills.length > 0 || links.length > 0;

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

      <Card size="sm">
        <CardContent className="space-y-2 py-0">
          <div className="flex flex-wrap gap-2">
            {APPLICATION_STAGES.map((stage) => {
              const isCurrent = stage === currentStage;
              const isCompleted =
                APPLICATION_STAGES.indexOf(stage) < APPLICATION_STAGES.indexOf(currentStage) &&
                currentStage !== "rejected";
              const stageMeta = stageCopy[stage];

              return (
                <div key={stage} className="flex items-center gap-2">
                  <div
                    className={`size-2 rounded-full ${isCurrent ? stageMeta.dot : isCompleted ? "bg-primary" : "bg-muted-foreground/30"}`}
                  />
                  <span
                    className={`text-xs font-medium ${isCurrent ? "text-foreground" : isCompleted ? "text-muted-foreground" : "text-muted-foreground/60"}`}
                  >
                    {stageMeta.badge}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-sm text-muted-foreground">{meta.summary}</p>
          <p className="text-xs text-muted-foreground/80">{meta.nextStep}</p>
        </CardContent>
      </Card>

      <CandidateAiNextStepCard evaluation={aiEvaluation} />

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
        <Button variant="outline" size="sm" asChild>
          <Link to="/dashboard/jobs/$jobId" params={{ jobId: application.jobId }}>
            View job listing
          </Link>
        </Button>
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

      {hasSnapshotContent ? (
        <div className="space-y-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
            Submitted profile
          </p>
          <div className="space-y-3">
            {headline || application.resumeKey ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {headline ? (
                  <Card size="sm">
                    <CardContent className="py-0">
                      <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                        Headline
                      </p>
                      <p className="mt-1 text-sm text-foreground">{headline}</p>
                    </CardContent>
                  </Card>
                ) : null}
                {application.resumeKey ? (
                  <Card size="sm">
                    <CardContent className="py-0">
                      <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                        Resume
                      </p>
                      <p className="mt-1 text-sm text-foreground">Attached at apply time</p>
                    </CardContent>
                  </Card>
                ) : null}
              </div>
            ) : null}

            {bio ? (
              <Card size="sm">
                <CardContent className="py-0">
                  <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                    Bio
                  </p>
                  <p className="mt-1 text-sm leading-6 text-foreground">{bio}</p>
                </CardContent>
              </Card>
            ) : null}

            {skills.length > 0 ? (
              <Card size="sm">
                <CardContent className="py-0">
                  <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                    Skills
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {skills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {links.length > 0 ? (
              <Card size="sm">
                <CardContent className="py-0">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    Links
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {links.map((link) => (
                      <a
                        key={link.label}
                        href={link.value}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                      >
                        <HugeiconsIcon icon={Link04Icon} strokeWidth={2} className="size-3" />
                        {link.label}
                      </a>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
