import {
  ArrowLeft01Icon,
  Clock01Icon,
  File02Icon,
  Link04Icon,
  NoteIcon,
  Rocket01Icon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { DashboardApplicationDetailSkeleton } from "@/components/route-skeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getApplicationResumeDownloadUrl,
  getMyApplicationDetail,
} from "@/features/applications/server/functions";

export const Route = createFileRoute("/_authenticated/dashboard/application/$applicationId")({
  beforeLoad: ({ context }) => {
    if (!context.isCandidate) {
      throw redirect({ to: "/dashboard" });
    }
  },
  loader: async ({ params }) => {
    return await getMyApplicationDetail({
      data: { applicationId: params.applicationId },
    });
  },
  pendingComponent: DashboardApplicationDetailSkeleton,
  component: CandidateApplicationDetailPage,
});

type Application = Awaited<ReturnType<typeof getMyApplicationDetail>>;

const APPLICATION_STAGES = ["applied", "interviewing", "evaluated", "rejected"] as const;

const stageCopy = {
  applied: {
    badge: "Applied",
    tone: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
    title: "Submission received",
    description: "Your application is in the company’s review queue.",
    nextStep: "Keep your profile sharp. The next signal is typically a move to interview review.",
  },
  interviewing: {
    badge: "Interviewing",
    tone: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    title: "Moving through review",
    description: "The company has advanced this role into the interview stage.",
    nextStep:
      "Watch this application closely. This is the strongest signal that a live next step is coming.",
  },
  evaluated: {
    badge: "Evaluated",
    tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    title: "Reviewed by the hiring team",
    description: "The company has finished an evaluation pass on this application.",
    nextStep: "Expect either a final decision or a follow-up step from the company.",
  },
  rejected: {
    badge: "Closed",
    tone: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
    title: "No longer active",
    description: "This application is no longer moving forward.",
    nextStep: "Use what you learned here and keep applying to roles that match your profile.",
  },
} as const;

const formatDate = (date: Date | string) => {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatDateTime = (date: Date | string) => {
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const toApplicationStage = (status: string): (typeof APPLICATION_STAGES)[number] => {
  switch (status) {
    case "interviewing":
    case "evaluated":
    case "rejected":
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

const getStatusMeta = (status: string) => {
  const stage = toApplicationStage(status);
  return stageCopy[stage];
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

const getNextStepLabel = (application: Application) => {
  if (application.status === "rejected") {
    return "Browse more roles";
  }

  if (application.status === "interviewing") {
    return "Review role details";
  }

  if (application.status === "evaluated") {
    return "Stay ready for a decision";
  }

  if (application.jobStatus === "closed") {
    return "Track final outcome";
  }

  return "Keep profile ready";
};

function CandidateApplicationDetailPage() {
  const application = Route.useLoaderData();
  const getResumeUrlFn = useServerFn(getApplicationResumeDownloadUrl);

  const resumeDownloadMutation = useMutation({
    mutationFn: getResumeUrlFn,
    onSuccess: ({ url }) => {
      window.open(url, "_blank", "noopener,noreferrer");
    },
    onError: () => {
      toast.error("Failed to open the submitted resume. Please try again.");
    },
  });

  const metadata = toRecord(application.metadata);
  const statusMeta = getStatusMeta(application.status);
  const currentStage = toApplicationStage(application.status);
  const skills = getStringArray(metadata.skills);
  const links = getLinks(metadata.links);
  const headline = getStringValue(metadata.headline);
  const bio = getStringValue(metadata.bio);

  const onResumeView = async () => {
    await resumeDownloadMutation.mutateAsync({
      data: { applicationId: application.id },
    });
  };

  return (
    <div className="animate-fade-in grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-5">
        <Card size="sm" className="border-border/70 bg-card">
          <CardContent className="space-y-4 py-0">
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="ghost" size="sm" asChild className="-ml-2">
                <Link to="/dashboard/applications">
                  <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-4" />
                  Back to applications
                </Link>
              </Button>
              <Badge variant="outline" className="font-mono text-[11px]">
                Application detail
              </Badge>
            </div>

            <div className="rounded-2xl border border-border/70 p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
                      {application.companyName}
                    </p>
                    <Badge variant="outline" className="font-mono text-[11px]">
                      {getJobStateLabel(application.jobStatus)}
                    </Badge>
                  </div>

                  <div className="space-y-1">
                    <h2 className="text-2xl font-bold tracking-tight">{application.jobTitle}</h2>
                    <p className="text-sm text-muted-foreground">{statusMeta.title}</p>
                  </div>
                </div>

                <Badge className={statusMeta.tone}>{statusMeta.badge}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-3 md:grid-cols-3">
          <TimelineTile
            icon={Clock01Icon}
            label="Applied"
            value={formatDate(application.createdAt)}
            hint={`Submitted ${formatDateTime(application.createdAt)}`}
          />
          <TimelineTile
            icon={Rocket01Icon}
            label="Last activity"
            value={formatDate(application.updatedAt)}
            hint={`Updated ${formatDateTime(application.updatedAt)}`}
          />
          <TimelineTile
            icon={NoteIcon}
            label="Next step"
            value={getNextStepLabel(application)}
            hint={statusMeta.nextStep}
          />
        </div>

        <Card>
          <CardHeader>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
              Application progress
            </p>
            <CardTitle className="text-lg">{statusMeta.title}</CardTitle>
            <CardDescription>{statusMeta.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {APPLICATION_STAGES.map((stage) => {
                const stageMeta = getStatusMeta(stage);
                const isCurrent = stage === currentStage;
                const isCompleted =
                  APPLICATION_STAGES.indexOf(stage) < APPLICATION_STAGES.indexOf(currentStage) &&
                  currentStage !== "rejected";

                return (
                  <Badge
                    key={stage}
                    variant={isCurrent || isCompleted ? "secondary" : "outline"}
                    className={
                      isCurrent
                        ? stageMeta.tone
                        : isCompleted
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground"
                    }
                  >
                    {stageMeta.badge}
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
              Submitted snapshot
            </p>
            <CardTitle className="text-lg">What the company received</CardTitle>
            <CardDescription>
              This is the profile snapshot that was attached when you applied.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <InfoTile
                icon={UserIcon}
                label="Headline"
                value={headline ?? "No headline was attached to this submission."}
              />
              <InfoTile
                icon={File02Icon}
                label="Resume"
                value={
                  application.resumeKey
                    ? "Resume attached to this application"
                    : "No resume snapshot"
                }
              />
            </div>

            {bio ? (
              <div className="rounded-2xl border border-border/70 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Bio
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{bio}</p>
              </div>
            ) : null}

            {skills.length > 0 ? (
              <div className="rounded-2xl border border-border/70 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Skills
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <Badge key={skill} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}

            {links.length > 0 ? (
              <div className="rounded-2xl border border-border/70 p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Links
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {links.map((link) => (
                    <a
                      key={link.label}
                      href={link.value}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                    >
                      <HugeiconsIcon icon={Link04Icon} strokeWidth={2} className="size-3" />
                      {link.label}
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-5 xl:sticky xl:top-6 xl:self-start">
        <Card>
          <CardHeader>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
              Context
            </p>
            <CardTitle className="text-lg">Application record</CardTitle>
            <CardDescription>
              Track timing and open the exact resume that was attached at apply time.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <InfoTile
              icon={Clock01Icon}
              label="Applied"
              value={formatDateTime(application.createdAt)}
            />
            <InfoTile
              icon={Rocket01Icon}
              label="Last updated"
              value={formatDateTime(application.updatedAt)}
            />
            <Button
              variant="outline"
              className="w-full"
              onClick={onResumeView}
              disabled={!application.resumeKey || resumeDownloadMutation.isPending}
            >
              <HugeiconsIcon icon={File02Icon} strokeWidth={2} className="size-4" />
              View submitted resume
            </Button>
            <Button variant="outline" className="w-full" asChild>
              <Link to="/dashboard/jobs/$jobId" params={{ jobId: application.jobId }}>
                View job
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function TimelineTile({
  icon,
  label,
  value,
  hint,
}: {
  icon: typeof Clock01Icon;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card size="sm">
      <CardContent className="space-y-3 py-0">
        <div className="flex size-10 items-center justify-center rounded-xl bg-muted">
          <HugeiconsIcon icon={icon} strokeWidth={2} className="size-4 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            {label}
          </p>
          <p className="text-base font-semibold text-foreground">{value}</p>
          <p className="text-xs leading-5 text-muted-foreground">{hint}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function InfoTile({ icon, label, value }: { icon: typeof UserIcon; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 p-4">
      <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-muted">
        <HugeiconsIcon icon={icon} strokeWidth={2} className="size-4 text-muted-foreground" />
      </div>
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-sm leading-6 text-foreground">{value}</p>
    </div>
  );
}
