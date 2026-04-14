import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Calendar01Icon,
  File02Icon,
  Link04Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link, notFound, redirect, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { DashboardApplicantReviewSkeleton } from "@/components/route-skeletons";
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
import { Card, CardContent } from "@/components/ui/card";
import { Empty, EmptyDescription } from "@/components/ui/empty";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getApplicationResumeDownloadUrl,
  getCompanyApplicantReview,
  updateApplicationStatus,
} from "@/features/applications/server/functions";
import {
  APPLICATION_STATUS_TRANSITIONS,
  type ApplicationStatus,
  applicationStatusSchema,
} from "@/shared/enums";
import { validateUuidParams } from "@/shared/validation";

export const Route = createFileRoute("/_authenticated/dashboard/applicants/$applicationId")({
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
  component: ApplicantReviewPage,
});

const APPLICATION_STAGES = ["applied", "interviewing", "evaluated", "rejected"] as const;

const STATUS_OPTIONS: { value: ApplicationStatus; label: string }[] = [
  { value: "applied", label: "Applied" },
  { value: "interviewing", label: "Interviewing" },
  { value: "evaluated", label: "Evaluated" },
  { value: "rejected", label: "Rejected" },
];

const stageCopy = {
  applied: {
    badge: "Applied",
    tone: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
    dot: "bg-sky-500",
  },
  interviewing: {
    badge: "Interviewing",
    tone: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  evaluated: {
    badge: "Evaluated",
    tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  rejected: {
    badge: "Rejected",
    tone: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
    dot: "bg-rose-500",
  },
} as const;

const formatDate = (date: Date | string) => {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

function toRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

const getStringValue = (value: unknown) => {
  return typeof value === "string" && value.length > 0 ? value : null;
};

const getSnapshotSkills = (value: unknown) => {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.length > 0)
    : [];
};

const getSnapshotLinks = (value: unknown) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [];
  }

  return Object.entries(value)
    .filter(
      (entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].length > 0,
    )
    .map(([key, href]) => ({
      href,
      label: key.charAt(0).toUpperCase() + key.slice(1),
    }));
};

const getSnapshotWorkHistory = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        return null;
      }

      const record = entry as Record<string, unknown>;
      return {
        company: typeof record.company === "string" ? record.company : "Unknown company",
        title: typeof record.title === "string" ? record.title : "Untitled role",
        startMonth: typeof record.startMonth === "string" ? record.startMonth : null,
        endMonth: typeof record.endMonth === "string" ? record.endMonth : null,
        currentlyWorkingHere: record.currentlyWorkingHere === true,
        description: typeof record.description === "string" ? record.description : null,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
};

const formatMonthRange = (entry: {
  startMonth: string | null;
  endMonth: string | null;
  currentlyWorkingHere: boolean;
}) => {
  const start = entry.startMonth ? formatMonth(entry.startMonth) : "Unknown start";
  const end = entry.currentlyWorkingHere
    ? "Present"
    : entry.endMonth
      ? formatMonth(entry.endMonth)
      : "Unknown end";

  return `${start} – ${end}`;
};

const formatMonth = (value: string) => {
  const [year, month] = value.split("-").map(Number);
  const date = new Date(year, (month || 1) - 1, 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
};

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

function ApplicantReviewPage() {
  const { application, previousApplicant, nextApplicant } = Route.useLoaderData();
  const router = useRouter();
  const [pendingStatus, setPendingStatus] = useState<ApplicationStatus | null>(null);

  const updateStatusFn = useServerFn(updateApplicationStatus);
  const getResumeUrlFn = useServerFn(getApplicationResumeDownloadUrl);

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

  const resumeDownloadMutation = useMutation({
    mutationFn: getResumeUrlFn,
    onSuccess: ({ url }) => {
      window.open(url, "_blank", "noopener,noreferrer");
    },
    onError: () => {
      toast.error("Failed to open resume. Please try again.");
    },
  });

  const metadata = toRecord(application.metadata);
  const links = getSnapshotLinks(metadata.links);
  const skills = getSnapshotSkills(metadata.skills);
  const workHistory = getSnapshotWorkHistory(metadata.workHistory);
  const headline = getStringValue(metadata.headline);
  const bio = getStringValue(metadata.bio);
  const currentStatus = applicationStatusSchema.parse(application.status);
  const currentStageIndex = APPLICATION_STAGES.indexOf(
    currentStatus as (typeof APPLICATION_STAGES)[number],
  );
  const meta = stageCopy[currentStatus as keyof typeof stageCopy] ?? stageCopy.applied;

  const onStatusValueChange = async (value: string) => {
    const nextStatus = applicationStatusSchema.parse(value);
    if (nextStatus === "rejected" && currentStatus !== "rejected") {
      setPendingStatus(nextStatus);
      return;
    }

    await updateStatusMutation.mutateAsync({
      data: { applicationId: application.id, status: nextStatus },
    });
  };

  const onResumeView = async () => {
    await resumeDownloadMutation.mutateAsync({
      data: { applicationId: application.id },
    });
  };

  const onRejectConfirm = async () => {
    if (!pendingStatus) {
      return;
    }

    await updateStatusMutation.mutateAsync({
      data: { applicationId: application.id, status: pendingStatus },
    });
    setPendingStatus(null);
  };

  const allowedStatuses = STATUS_OPTIONS.filter(
    (status) =>
      status.value === currentStatus ||
      APPLICATION_STATUS_TRANSITIONS[currentStatus]?.includes(status.value),
  );

  const hasSnapshotContent =
    headline ||
    application.resumeKey ||
    bio ||
    skills.length > 0 ||
    workHistory.length > 0 ||
    links.length > 0;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link to="/dashboard/jobs/$jobId" params={{ jobId: application.jobId }}>
            <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-4" />
            Back to role
          </Link>
        </Button>
        <div className="flex gap-2">
          {previousApplicant ? (
            <Button variant="outline" size="sm" asChild>
              <Link
                to="/dashboard/applicants/$applicationId"
                params={{ applicationId: previousApplicant.id }}
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-4" />
                Previous
              </Link>
            </Button>
          ) : null}
          {nextApplicant ? (
            <Button variant="outline" size="sm" asChild>
              <Link
                to="/dashboard/applicants/$applicationId"
                params={{ applicationId: nextApplicant.id }}
              >
                Next
                <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-4" />
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-4">
        <Avatar className="size-14 ring-4 ring-background">
          <AvatarImage
            src={application.candidatePicture ?? undefined}
            alt={application.candidateName}
          />
          <AvatarFallback>{getInitials(application.candidateName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">{application.candidateName}</h2>
          <p className="text-sm text-muted-foreground">
            Reviewing for <span className="font-medium">{application.jobTitle}</span>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={meta.tone}>{meta.badge}</Badge>
            <Badge variant="outline" className="gap-1 font-mono text-[11px]">
              <HugeiconsIcon icon={Calendar01Icon} strokeWidth={2} className="size-3" />
              Applied {formatDate(application.createdAt)}
            </Badge>
          </div>
        </div>
      </div>

      <Card size="sm">
        <CardContent className="space-y-2 py-0">
          <div className="flex flex-wrap gap-2">
            {APPLICATION_STAGES.map((stage) => {
              const isCurrent = stage === currentStatus;
              const isCompleted =
                APPLICATION_STAGES.indexOf(stage) < currentStageIndex &&
                currentStatus !== "rejected";
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
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span>Contact: {application.candidateEmail}</span>
            {application.createdAt !== application.updatedAt ? (
              <span>Updated {formatDate(application.updatedAt)}</span>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Move application to</p>
          <Select
            value={currentStatus}
            onValueChange={onStatusValueChange}
            disabled={updateStatusMutation.isPending}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {allowedStatuses.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {application.resumeKey ? (
          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={onResumeView}
              disabled={resumeDownloadMutation.isPending}
            >
              <HugeiconsIcon icon={File02Icon} strokeWidth={2} className="size-4" />
              {resumeDownloadMutation.isPending ? "Opening…" : "View resume"}
            </Button>
          </div>
        ) : null}

        <div className="flex items-end">
          <Button variant="outline" asChild>
            <Link to="/dashboard/jobs/$jobId" params={{ jobId: application.jobId }}>
              Open job details
            </Link>
          </Button>
        </div>
      </div>

      <Empty className="border">
        <EmptyDescription>
          This page shows the candidate snapshot that was attached at apply time, so later profile
          edits do not silently change what your team reviewed.
        </EmptyDescription>
      </Empty>

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

            {workHistory.length > 0 ? (
              <div className="space-y-3">
                <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                  Work history
                </p>
                {workHistory.map((entry, index) => (
                  <Card key={`${entry.company}-${entry.title}-${index}`} size="sm">
                    <CardContent className="py-0">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold">{entry.title}</p>
                          <p className="text-sm text-muted-foreground">{entry.company}</p>
                        </div>
                        <Badge variant="outline" className="font-mono text-[11px]">
                          {formatMonthRange(entry)}
                        </Badge>
                      </div>
                      {entry.description ? (
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                          {entry.description}
                        </p>
                      ) : null}
                    </CardContent>
                  </Card>
                ))}
              </div>
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
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
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

      <AlertDialog open={pendingStatus !== null} onOpenChange={() => setPendingStatus(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject this application?</AlertDialogTitle>
            <AlertDialogDescription>
              Rejection is treated as a terminal step in the current workflow. You can still review
              the application later, but it will leave the active pipeline.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onRejectConfirm}>Reject application</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
