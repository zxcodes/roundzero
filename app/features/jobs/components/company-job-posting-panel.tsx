import {
  Archive01Icon,
  Briefcase01Icon,
  Clock01Icon,
  Copy01Icon,
  Edit02Icon,
  EyeIcon,
  Link04Icon,
  Loading03Icon,
  Location01Icon,
  MoneyBag02Icon,
  MoreVerticalIcon,
  RankingIcon,
  Rocket01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { JobPreviewDialog } from "@/features/jobs/components/job-preview-dialog";
import { JobStatusBadge } from "@/features/jobs/components/job-status-badge";
import { canCopyPublicJobLink, copyPublicJobLink } from "@/features/jobs/copy-job-link";
import { archiveJob, type getJob, publishJob } from "@/features/jobs/server/functions";
import { formatDate, formatDaysLeft } from "@/shared/date";
import {
  type EmploymentType,
  type ExperienceLevel,
  employmentTypeLabels,
  experienceLevelLabels,
  type WorkplaceType,
  workplaceTypeLabels,
} from "@/shared/enums";
import { formatSalaryFull } from "@/shared/format";
import { publicJobUrl } from "@/shared/seo";

type JobDetail = NonNullable<Awaited<ReturnType<typeof getJob>>>;

export function JobMetaChip({
  icon,
  children,
  variant = "secondary",
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  variant?: "secondary" | "outline";
}) {
  return (
    <Badge variant={variant} className="h-8 gap-1.5 px-3 text-xs [&>svg]:size-3.5">
      {icon}
      {children}
    </Badge>
  );
}

export function CompanyJobActions({
  job,
  requirements,
}: {
  job: JobDetail;
  requirements: string[];
}) {
  const router = useRouter();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);

  const publishJobFn = useServerFn(publishJob);
  const publishJobMutation = useMutation({
    mutationFn: publishJobFn,
    onSuccess: async () => {
      toast.success("Job published successfully");
      await router.invalidate();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to publish job.");
    },
  });

  const archiveJobFn = useServerFn(archiveJob);
  const archiveJobMutation = useMutation({
    mutationFn: archiveJobFn,
    onSuccess: async () => {
      toast.success("Job archived successfully");
      await router.navigate({ to: "/dashboard/jobs" });
      await router.invalidate();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to archive job.");
    },
  });

  const onPublish = async () => {
    await publishJobMutation.mutateAsync({ data: { id: job.id } });
  };

  const onArchive = async () => {
    await archiveJobMutation.mutateAsync({ data: { id: job.id } });
  };

  const onOpenPreview = () => setPreviewOpen(true);
  const onOpenArchive = () => setArchiveOpen(true);

  const showCopyLink = canCopyPublicJobLink(job);

  const onCopyLink = () => {
    void copyPublicJobLink(job.id);
  };

  const previewData = {
    title: job.title,
    description: job.description,
    requirements,
    companyName: job.companyName ?? "",
    location: job.location,
    workplaceType: job.workplaceType,
    employmentType: job.employmentType,
    experienceLevel: job.experienceLevel,
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    salaryCurrency: job.salaryCurrency,
    teamSize: job.teamSize,
    headcount: job.headcount,
  };

  const isArchived = job.status === "closed" && job.archivedAt;
  const isDraft = job.status === "draft";

  if (isArchived) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={onOpenPreview}>
          <HugeiconsIcon icon={EyeIcon} strokeWidth={2} className="size-3.5" />
          Preview
        </Button>
        <JobPreviewDialog
          data={previewData}
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          showDefaultTrigger={false}
        />
      </div>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
      {isDraft ? (
        <Button size="sm" onClick={onPublish} disabled={publishJobMutation.isPending}>
          {publishJobMutation.isPending ? (
            <HugeiconsIcon icon={Loading03Icon} strokeWidth={2} className="size-3.5 animate-spin" />
          ) : (
            <HugeiconsIcon icon={Rocket01Icon} strokeWidth={2} className="size-3.5" />
          )}
          {publishJobMutation.isPending ? "Publishing" : "Publish"}
        </Button>
      ) : null}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" aria-label="Job actions">
            Manage
            <HugeiconsIcon
              icon={MoreVerticalIcon}
              strokeWidth={2}
              className="size-3.5 opacity-70"
            />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={onOpenPreview}>
            <HugeiconsIcon icon={EyeIcon} strokeWidth={2} className="size-3.5" />
            Preview
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/dashboard/jobs/$jobId/edit" params={{ jobId: job.id }}>
              <HugeiconsIcon icon={Edit02Icon} strokeWidth={2} className="size-3.5" />
              Edit
            </Link>
          </DropdownMenuItem>
          {showCopyLink ? (
            <>
              <DropdownMenuItem onSelect={onCopyLink}>
                <HugeiconsIcon icon={Copy01Icon} strokeWidth={2} className="size-3.5" />
                Copy job link
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href={publicJobUrl(job.id)} target="_blank" rel="noopener noreferrer">
                  <HugeiconsIcon icon={Link04Icon} strokeWidth={2} className="size-3.5" />
                  Open job page
                </a>
              </DropdownMenuItem>
            </>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={onOpenArchive}
            disabled={archiveJobMutation.isPending}
          >
            {archiveJobMutation.isPending ? (
              <HugeiconsIcon
                icon={Loading03Icon}
                strokeWidth={2}
                className="size-3.5 animate-spin"
              />
            ) : (
              <HugeiconsIcon icon={Archive01Icon} strokeWidth={2} className="size-3.5" />
            )}
            {archiveJobMutation.isPending ? "Archiving" : "Archive"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <JobPreviewDialog
        data={previewData}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        showDefaultTrigger={false}
      />

      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this job?</AlertDialogTitle>
            <AlertDialogDescription>
              This will close the job posting and hide it from candidates. Existing applications
              will be preserved. You can still view archived jobs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onArchive}>Archive</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function CompanyJobPostingPanel({ job }: { job: JobDetail }) {
  const requirements: string[] = Array.isArray(job.requirements) ? job.requirements : [];
  const salary = formatSalaryFull(job.salaryMin, job.salaryMax, job.salaryCurrency);

  return (
    <div className="space-y-5">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <JobStatusBadge job={job} />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          <span className="">{formatDate(job.createdAt)}</span>
          {new Date(job.updatedAt).getTime() !== new Date(job.createdAt).getTime() ? (
            <>
              {" "}
              · Updated <span className="">{formatDate(job.updatedAt)}</span>
            </>
          ) : null}
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <section className="rounded-2xl bg-muted/30 px-6 py-5">
            <h2 className="text-lg font-semibold tracking-tight">Description</h2>
            <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap">{job.description}</p>
          </section>

          {requirements.length > 0 ? (
            <section className="rounded-2xl bg-muted/30 px-6 py-5">
              <h2 className="text-lg font-semibold tracking-tight">Requirements</h2>
              <ul className="mt-3 space-y-2">
                {requirements.map((req, i) => (
                  <li key={`${req}-${i}`} className="flex items-start gap-2.5 text-sm">
                    <span className="mt-2 block size-1 shrink-0 rounded-full bg-primary" />
                    {req}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <div className="space-y-5">
          <section className="rounded-3xl border border-border/60 px-5 py-4 md:px-6">
            <h2 className="text-base font-semibold tracking-tight">Job details</h2>
            <div className="mt-4 space-y-4">
              {job.location ? (
                <div className="flex items-start gap-3">
                  <HugeiconsIcon
                    icon={Location01Icon}
                    strokeWidth={2}
                    className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  />
                  <div>
                    <p className="text-sm font-medium">{job.location}</p>
                    {job.workplaceType ? (
                      <p className="text-xs text-muted-foreground">
                        {workplaceTypeLabels[job.workplaceType as WorkplaceType]}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {job.employmentType ? (
                <div className="flex items-center gap-3">
                  <HugeiconsIcon
                    icon={Briefcase01Icon}
                    strokeWidth={2}
                    className="size-4 shrink-0 text-muted-foreground"
                  />
                  <p className="text-sm">
                    {employmentTypeLabels[job.employmentType as EmploymentType]}
                  </p>
                </div>
              ) : null}

              {job.experienceLevel ? (
                <div className="flex items-center gap-3">
                  <HugeiconsIcon
                    icon={RankingIcon}
                    strokeWidth={2}
                    className="size-4 shrink-0 text-muted-foreground"
                  />
                  <p className="text-sm">
                    {experienceLevelLabels[job.experienceLevel as ExperienceLevel]}
                  </p>
                </div>
              ) : null}

              {salary ? (
                <>
                  <Separator />
                  <div className="flex items-start gap-3">
                    <HugeiconsIcon
                      icon={MoneyBag02Icon}
                      strokeWidth={2}
                      className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                    />
                    <div>
                      <p className=" text-sm font-medium">{salary}</p>
                      <p className="text-xs text-muted-foreground">Annual compensation</p>
                    </div>
                  </div>
                </>
              ) : null}

              {job.teamSize || job.headcount ? (
                <>
                  <Separator />
                  <div className="flex items-start gap-3">
                    <HugeiconsIcon
                      icon={UserGroupIcon}
                      strokeWidth={2}
                      className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                    />
                    <div className="space-y-0.5">
                      {job.teamSize ? (
                        <p className="text-sm">
                          <span className=" font-medium">{job.teamSize}</span> people on team
                        </p>
                      ) : null}
                      {job.headcount ? (
                        <p className="text-xs text-muted-foreground">
                          <span className="">{job.headcount}</span> open{" "}
                          {job.headcount === 1 ? "position" : "positions"}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </>
              ) : null}

              <Separator />
              <div className="flex items-start gap-3">
                <HugeiconsIcon
                  icon={UserGroupIcon}
                  strokeWidth={2}
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                />
                <div>
                  <p className="text-sm font-medium">
                    {job.applicantCount} {job.applicantCount === 1 ? "applicant" : "applicants"}
                  </p>
                  <p className="text-xs text-muted-foreground">Total applications</p>
                </div>
              </div>

              {job.expiresAt ? (
                <>
                  <Separator />
                  <div className="flex items-start gap-3">
                    <HugeiconsIcon
                      icon={Clock01Icon}
                      strokeWidth={2}
                      className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                    />
                    <div>
                      <p className="text-sm font-medium">{formatDaysLeft(job.expiresAt)}</p>
                      <p className="text-xs text-muted-foreground">Application deadline</p>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
