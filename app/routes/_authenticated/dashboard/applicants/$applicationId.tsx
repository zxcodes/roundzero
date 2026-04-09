import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Briefcase01Icon,
  Clock01Icon,
  File02Icon,
  Link04Icon,
  Mail01Icon,
  NoteIcon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

export const Route = createFileRoute("/_authenticated/dashboard/applicants/$applicationId")({
  beforeLoad: ({ context }) => {
    if (!context.isCompany) {
      throw redirect({ to: "/dashboard" });
    }
  },
  loader: async ({ params }) => {
    return await getCompanyApplicantReview({
      data: { applicationId: params.applicationId },
    });
  },
  component: ApplicantReviewPage,
});

const APPLICATION_STATUSES: { value: ApplicationStatus; label: string; tone: string }[] = [
  { value: "applied", label: "Applied", tone: "bg-sky-500/10 text-sky-700 dark:text-sky-300" },
  {
    value: "interviewing",
    label: "Interviewing",
    tone: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  {
    value: "evaluated",
    label: "Evaluated",
    tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  {
    value: "rejected",
    label: "Rejected",
    tone: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  },
];

function ApplicantReviewPage() {
  const { application, applicantCount, previousApplicant, nextApplicant } = Route.useLoaderData();
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
  const currentStatus = applicationStatusSchema.parse(application.status);
  const statusMeta =
    APPLICATION_STATUSES.find((status) => status.value === currentStatus) ??
    APPLICATION_STATUSES[0];

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

  const onRejectCancel = () => {
    setPendingStatus(null);
  };

  const allowedStatuses = APPLICATION_STATUSES.filter(
    (status) =>
      status.value === currentStatus ||
      APPLICATION_STATUS_TRANSITIONS[currentStatus]?.includes(status.value),
  );

  return (
    <div className="animate-fade-in">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <Card size="sm" className="border-border/70 bg-card">
            <CardContent className="space-y-4 py-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="ghost" size="sm" asChild className="-ml-2">
                    <Link to="/dashboard/jobs/$jobId" params={{ jobId: application.jobId }}>
                      <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-4" />
                      Back to role
                    </Link>
                  </Button>
                  <Badge variant="outline" className="font-mono text-[11px]">
                    Applicant review
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-2">
                  {previousApplicant ? (
                    <Button variant="outline" asChild>
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
                    <Button variant="outline" asChild>
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

              <div className="rounded-2xl border border-border/70 bg-[radial-gradient(circle_at_top_left,var(--color-primary)/14%,transparent_48%),linear-gradient(160deg,color-mix(in_oklab,var(--color-primary)_8%,transparent),transparent_60%)] p-4">
                <div className="flex flex-wrap items-start gap-4">
                  <Avatar className="size-14 ring-4 ring-background">
                    <AvatarImage
                      src={application.candidatePicture ?? undefined}
                      alt={application.candidateName}
                    />
                    <AvatarFallback>{getInitials(application.candidateName)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 space-y-2.5">
                    <div className="space-y-1">
                      <h2 className="text-2xl font-bold tracking-tight">
                        {application.candidateName}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Reviewing for <span className="font-medium">{application.jobTitle}</span>
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={statusMeta.tone}>{statusMeta.label}</Badge>
                      <Badge variant="outline" className="gap-1 font-mono text-[11px]">
                        <HugeiconsIcon icon={Clock01Icon} strokeWidth={2} className="size-3" />
                        Applied {formatDate(application.createdAt)}
                      </Badge>
                      <Badge variant="outline" className="gap-1 text-[11px]">
                        <HugeiconsIcon icon={Briefcase01Icon} strokeWidth={2} className="size-3" />
                        {applicantCount} applicants on this role
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70">
            <CardHeader>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
                Snapshot
              </p>
              <CardTitle className="text-lg">Candidate profile at apply time</CardTitle>
              <CardDescription>
                Use this as the hiring record for the submission, not the candidate’s current live
                profile.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <InfoTile icon={Mail01Icon} label="Contact" value={application.candidateEmail} />
                <InfoTile
                  icon={UserIcon}
                  label="Headline"
                  value={getStringValue(metadata.headline) ?? "No headline submitted"}
                />
              </div>

              <SnapshotSection
                title="Bio"
                empty="The candidate did not attach a bio to this application."
                content={getStringValue(metadata.bio)}
              />

              <div className="space-y-3">
                <SectionHeading title="Skills" />
                {skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="px-2.5 py-1">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <EmptyStateText text="No skills were attached to this application snapshot." />
                )}
              </div>

              <div className="space-y-3">
                <SectionHeading title="Work history" />
                {workHistory.length > 0 ? (
                  <div className="space-y-3">
                    {workHistory.map((entry, index) => (
                      <div
                        key={`${entry.company}-${entry.title}-${index}`}
                        className="rounded-2xl border border-border/70 bg-muted/25 p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold">{entry.title}</p>
                            <p className="text-sm text-muted-foreground">{entry.company}</p>
                          </div>
                          <Badge variant="outline" className="font-mono text-[11px]">
                            {formatMonthRange(entry)}
                          </Badge>
                        </div>
                        {entry.description ? (
                          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                            {entry.description}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyStateText text="No work history was attached to this application snapshot." />
                )}
              </div>

              <div className="space-y-3">
                <SectionHeading title="Links" />
                {links.length > 0 ? (
                  <div className="space-y-2">
                    {links.map((link) => (
                      <a
                        key={link.href}
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between rounded-xl border border-border/70 bg-card px-3 py-3 text-sm transition-colors hover:bg-muted/40"
                      >
                        <span className="inline-flex items-center gap-2 truncate">
                          <HugeiconsIcon
                            icon={Link04Icon}
                            strokeWidth={2}
                            className="size-4 shrink-0 text-muted-foreground"
                          />
                          <span className="truncate">{link.label}</span>
                        </span>
                        <HugeiconsIcon
                          icon={ArrowRight01Icon}
                          strokeWidth={2}
                          className="size-4 shrink-0 text-muted-foreground"
                        />
                      </a>
                    ))}
                  </div>
                ) : (
                  <EmptyStateText text="No external links were attached to this application snapshot." />
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5 xl:sticky xl:top-6 xl:self-start">
          <Card className="border-primary/15 bg-card shadow-[0_18px_50px_-35px_color-mix(in_oklab,var(--color-primary)_35%,transparent)]">
            <CardHeader>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
                Review actions
              </p>
              <CardTitle className="text-lg">Decision panel</CardTitle>
              <CardDescription>
                Update status, open the submitted resume, and keep moving through applicants.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-border/70 bg-muted/30 p-3">
                <p className="text-xs font-medium text-muted-foreground">Current status</p>
                <p className="mt-1 text-sm font-semibold">{statusMeta.label}</p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Move application to</p>
                <Select
                  value={currentStatus}
                  onValueChange={onStatusValueChange}
                  disabled={updateStatusMutation.isPending}
                >
                  <SelectTrigger className="w-full">
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

              <Button
                className="w-full"
                variant="outline"
                onClick={onResumeView}
                disabled={!application.resumeKey || resumeDownloadMutation.isPending}
              >
                <HugeiconsIcon icon={File02Icon} strokeWidth={2} className="size-4" />
                {resumeDownloadMutation.isPending ? "Opening resume…" : "View submitted resume"}
              </Button>

              <div className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-3 text-xs text-muted-foreground">
                This page shows the candidate snapshot that was attached at apply time, so later
                profile edits do not silently change what your team reviewed.
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70">
            <CardHeader>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
                Context
              </p>
              <CardTitle className="text-lg">Application record</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <InfoTile icon={Briefcase01Icon} label="Role" value={application.jobTitle} />
              <InfoTile
                icon={Clock01Icon}
                label="Applied on"
                value={formatDate(application.createdAt)}
              />
              <InfoTile
                icon={NoteIcon}
                label="Last changed"
                value={formatDate(application.updatedAt)}
              />
              <Button variant="outline" className="w-full" asChild>
                <Link to="/dashboard/jobs/$jobId" params={{ jobId: application.jobId }}>
                  Open job details
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={pendingStatus !== null} onOpenChange={onRejectCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject this application?</AlertDialogTitle>
            <AlertDialogDescription>
              Rejection is treated as a terminal step in the current workflow. You can still review
              the application later, but it will leave the active pipeline.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={onRejectCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onRejectConfirm}>Reject application</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function InfoTile({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof HugeiconsIcon>["icon"];
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
      <div className="mb-2 inline-flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <HugeiconsIcon icon={icon} strokeWidth={2} className="size-4" />
      </div>
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium leading-relaxed">{value}</p>
    </div>
  );
}

function SectionHeading({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-px flex-1 bg-border/80" />
      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
        {title}
      </p>
      <div className="h-px flex-1 bg-border/80" />
    </div>
  );
}

function SnapshotSection({
  title,
  content,
  empty,
}: {
  title: string;
  content: string | null;
  empty: string;
}) {
  return (
    <div className="space-y-3">
      <SectionHeading title={title} />
      {content ? (
        <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 text-sm leading-relaxed text-muted-foreground">
          {content}
        </div>
      ) : (
        <EmptyStateText text={empty} />
      )}
    </div>
  );
}

function EmptyStateText({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border/80 bg-muted/10 px-4 py-3 text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function toRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function getStringValue(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function getSnapshotSkills(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.length > 0)
    : [];
}

function getSnapshotLinks(value: unknown) {
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
}

function getSnapshotWorkHistory(value: unknown) {
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
}

function formatMonthRange(entry: {
  startMonth: string | null;
  endMonth: string | null;
  currentlyWorkingHere: boolean;
}) {
  const start = entry.startMonth ? formatMonth(entry.startMonth) : "Unknown start";
  const end = entry.currentlyWorkingHere
    ? "Present"
    : entry.endMonth
      ? formatMonth(entry.endMonth)
      : "Unknown end";

  return `${start} – ${end}`;
}

function formatMonth(value: string) {
  const [year, month] = value.split("-").map(Number);
  const date = new Date(year, (month || 1) - 1, 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}
