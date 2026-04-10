import {
  ArrowRight01Icon,
  File02Icon,
  Link04Icon,
  Mail01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getApplicationResumeDownloadUrl,
  type getJobApplicants,
  updateApplicationStatus,
} from "@/features/applications/server/functions";
import {
  APPLICATION_STATUS_TRANSITIONS,
  type ApplicationStatus,
  applicationStatusSchema,
} from "@/shared/enums";

const APPLICATION_STATUSES: { value: ApplicationStatus; label: string }[] = [
  { value: "applied", label: "Applied" },
  { value: "interviewing", label: "Interviewing" },
  { value: "evaluated", label: "Evaluated" },
  { value: "rejected", label: "Rejected" },
];

export function CompanyJobApplicantsList({
  jobId,
  applicants,
}: {
  jobId: string;
  applicants: Awaited<ReturnType<typeof getJobApplicants>>;
}) {
  const router = useRouter();

  const getApplicationResumeDownloadUrlFn = useServerFn(getApplicationResumeDownloadUrl);
  const updateStatusFn = useServerFn(updateApplicationStatus);
  const updateStatusMutation = useMutation({
    mutationFn: updateStatusFn,
    onSuccess: async () => {
      toast.success("Application status updated");
      await router.invalidate();
    },
    onError: () => {
      toast.error("Failed to update status. Please try again.");
    },
  });

  const resumeDownloadMutation = useMutation({
    mutationFn: getApplicationResumeDownloadUrlFn,
    onSuccess: ({ url }) => {
      window.open(url, "_blank", "noopener,noreferrer");
    },
    onError: () => {
      toast.error("Failed to open resume. Please try again.");
    },
  });

  const onStatusChange = async (applicationId: string, status: ApplicationStatus) => {
    await updateStatusMutation.mutateAsync({
      data: { applicationId, status },
    });
  };

  const onViewResume = async (applicationId: string) => {
    await resumeDownloadMutation.mutateAsync({
      data: { applicationId },
    });
  };

  return (
    <Card className="border-border/70">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CardTitle>Applicants</CardTitle>
            <Badge variant="secondary" className="font-mono text-[11px]">
              {applicants.length}
            </Badge>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/dashboard/jobs/$jobId" params={{ jobId }}>
              Job details
            </Link>
          </Button>
        </div>
        <CardDescription className="text-xs">
          Review candidates, open submitted resumes, and move applications through the pipeline.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {applicants.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} />
              </EmptyMedia>
              <EmptyTitle>No applicants yet</EmptyTitle>
              <EmptyDescription>
                Candidate submissions for this role will show up here.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="space-y-2">
            {applicants.map((applicant) => {
              const metadata =
                applicant.metadata && typeof applicant.metadata === "object"
                  ? applicant.metadata
                  : {};
              const links =
                metadata.links &&
                typeof metadata.links === "object" &&
                !Array.isArray(metadata.links)
                  ? Object.values(metadata.links).filter(
                      (value): value is string => typeof value === "string" && value.length > 0,
                    )
                  : [];

              const onStatusValueChange = (value: string) => {
                onStatusChange(applicant.id, applicationStatusSchema.parse(value));
              };

              const onApplicantResumeViewClick = () => {
                onViewResume(applicant.id);
              };

              return (
                <Card
                  key={applicant.id}
                  className="ring-foreground/5 transition-colors hover:bg-muted/30 hover:ring-primary/20"
                >
                  <CardContent className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar className="size-10">
                          <AvatarImage
                            src={applicant.candidatePicture ?? undefined}
                            alt={applicant.candidateName}
                          />
                          <AvatarFallback className="text-[10px]">
                            {getInitials(applicant.candidateName)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <Link
                            to="/dashboard/applicants/$applicationId"
                            params={{ applicationId: applicant.id }}
                            className="truncate text-sm font-medium transition-colors hover:text-primary"
                          >
                            {applicant.candidateName}
                          </Link>
                          <div className="mt-1 flex items-center gap-1">
                            <HugeiconsIcon
                              icon={Mail01Icon}
                              strokeWidth={2}
                              className="size-3 text-muted-foreground"
                            />
                            <p className="truncate text-xs text-muted-foreground">
                              {applicant.candidateEmail}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Select
                          value={applicant.status}
                          onValueChange={onStatusValueChange}
                          disabled={updateStatusMutation.isPending}
                        >
                          <SelectTrigger className="w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {APPLICATION_STATUSES.filter(
                              (status) =>
                                status.value === applicant.status ||
                                APPLICATION_STATUS_TRANSITIONS[
                                  applicant.status as ApplicationStatus
                                ]?.includes(status.value),
                            ).map((status) => (
                              <SelectItem key={status.value} value={status.value}>
                                {status.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button variant="ghost" size="sm" asChild>
                          <Link
                            to="/dashboard/applicants/$applicationId"
                            params={{ applicationId: applicant.id }}
                          >
                            Review
                            <HugeiconsIcon
                              icon={ArrowRight01Icon}
                              strokeWidth={2}
                              className="size-3.5"
                            />
                          </Link>
                        </Button>
                      </div>
                    </div>

                    {applicant.resumeKey || links.length > 0 ? (
                      <div className="mt-3 flex flex-wrap items-center gap-2 pl-13">
                        {applicant.resumeKey ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={onApplicantResumeViewClick}
                            className="h-auto gap-1.5 px-2.5 py-1.5 text-xs text-muted-foreground"
                          >
                            <HugeiconsIcon icon={File02Icon} strokeWidth={2} className="size-3" />
                            View resume
                          </Button>
                        ) : null}
                        {links.map((link, index) => (
                          <Button
                            key={`${link}-${index}`}
                            variant="outline"
                            size="sm"
                            asChild
                            className="h-auto gap-1.5 px-2.5 py-1.5 text-xs text-muted-foreground"
                          >
                            <a href={link} target="_blank" rel="noopener noreferrer">
                              <HugeiconsIcon icon={Link04Icon} strokeWidth={2} className="size-3" />
                              {getLinkLabel(link)}
                            </a>
                          </Button>
                        ))}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
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

function getLinkLabel(link: string) {
  try {
    return new URL(link).hostname;
  } catch {
    return "Link";
  }
}
