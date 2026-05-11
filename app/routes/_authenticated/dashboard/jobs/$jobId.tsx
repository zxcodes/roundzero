import {
  Archive01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Clock01Icon,
  Edit02Icon,
  Location01Icon,
  MoneyBag02Icon,
  RankingIcon,
  Rocket01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { DashboardJobDetailSkeleton } from "@/components/route-skeletons";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { CandidateApplySection } from "@/features/applications/components/candidate-apply-section";
import { getJobApplicants, hasApplied } from "@/features/applications/server/functions";
import { getMyCandidateProfile } from "@/features/candidates/server/functions";
import { JobForm, type JobFormData } from "@/features/jobs/components/job-form";
import { JobPreviewDialog } from "@/features/jobs/components/job-preview-dialog";
import { JobStatusBadge } from "@/features/jobs/components/job-status-badge";
import { archiveJob, getJob, publishJob, updateJob } from "@/features/jobs/server/functions";
import { formatDate, formatDaysLeft } from "@/shared/date";
import {
  type EmploymentType,
  type ExperienceLevel,
  employmentTypeLabels,
  experienceLevelLabels,
  type JobStatus,
  type WorkplaceType,
  workplaceTypeLabels,
} from "@/shared/enums";
import { formatSalaryFull } from "@/shared/format";
import { validateUuidParams } from "@/shared/validation";

type JobDetail = NonNullable<Awaited<ReturnType<typeof getJob>>>;

export const Route = createFileRoute("/_authenticated/dashboard/jobs/$jobId")({
  beforeLoad: ({ params }) => {
    validateUuidParams({ jobId: params.jobId });
  },
  loader: async ({ params, context }) => {
    const jobResult = await getJob({ data: { id: params.jobId } });
    if (!jobResult) {
      throw notFound();
    }
    const job: JobDetail = jobResult;

    if (context.isCompany) {
      const applicants = await getJobApplicants({ data: { jobId: params.jobId } });
      return { type: "company" as const, job, applicants };
    }

    const alreadyApplied =
      job.status === "open" ? await hasApplied({ data: { jobId: params.jobId } }) : false;
    const candidateProfile = await getMyCandidateProfile();
    return { type: "candidate" as const, job, alreadyApplied, candidateProfile };
  },
  pendingComponent: DashboardJobDetailSkeleton,
  component: JobDetailPage,
});

function JobDetailPage() {
  const data = Route.useLoaderData();
  const { job } = data;
  const isCompany = data.type === "company";

  const requirements: string[] = Array.isArray(job.requirements) ? job.requirements : [];
  const salary = formatSalaryFull(job.salaryMin, job.salaryMax, job.salaryCurrency);

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" className="mt-0.5 shrink-0" asChild>
          <Link to="/dashboard/jobs">
            <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-4" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight">{job.title}</h2>
            <JobStatusBadge job={job} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {job.companyName ? (
              <>
                <span className="font-medium text-foreground">{job.companyName}</span>
                {" \u00B7 "}
              </>
            ) : null}
            <span className="font-mono">{formatDate(job.createdAt)}</span>
            {new Date(job.updatedAt).getTime() !== new Date(job.createdAt).getTime() ? (
              <>
                {" "}
                · Updated <span className="font-mono">{formatDate(job.updatedAt)}</span>
              </>
            ) : null}
          </p>
        </div>
      </div>

      {isCompany ? <CompanyActions job={job} requirements={requirements} /> : null}

      {/* Main content — two-column on large screens */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Left column — description + requirements */}
        <div className="space-y-5 lg:col-span-2">
          <Card className="animate-fade-in stagger-1">
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{job.description}</p>
            </CardContent>
          </Card>

          {requirements.length > 0 ? (
            <Card className="animate-fade-in stagger-2">
              <CardHeader>
                <CardTitle>Requirements</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {requirements.map((req, i) => (
                    <li key={`${req}-${i}`} className="flex items-start gap-2.5 text-sm">
                      <span className="mt-2 block size-1 shrink-0 rounded-full bg-primary" />
                      {req}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          {isCompany ? (
            <ApplicantsSummaryCard
              jobId={job.id}
              applicantsCount={data.applicants.length}
              evaluatedCount={
                data.type === "company"
                  ? data.applicants.filter((a) => a.reportId !== null).length
                  : 0
              }
            />
          ) : null}
        </div>

        {/* Right column — metadata sidebar */}
        <div className="space-y-5">
          {/* Job metadata card */}
          <Card className="animate-fade-in stagger-2">
            <CardHeader>
              <p className="text-[11px] font-bold uppercase tracking-widest text-primary">
                Job details
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
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
                  <div className="flex size-4 shrink-0 items-center justify-center rounded bg-muted text-[10px] font-bold text-muted-foreground">
                    E
                  </div>
                  <p className="text-sm">
                    {employmentTypeLabels[job.employmentType as EmploymentType]}
                  </p>
                </div>
              ) : null}

              {job.experienceLevel ? (
                <div className="flex items-center gap-3">
                  <div className="flex size-4 shrink-0 items-center justify-center rounded bg-muted text-[10px] font-bold text-muted-foreground">
                    L
                  </div>
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
                      <p className="font-mono text-sm font-medium">{salary}</p>
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
                          <span className="font-mono font-medium">{job.teamSize}</span> people on
                          team
                        </p>
                      ) : null}
                      {job.headcount ? (
                        <p className="text-xs text-muted-foreground">
                          <span className="font-mono">{job.headcount}</span> open{" "}
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
            </CardContent>
          </Card>

          {/* Apply section for candidates */}
          {!isCompany ? (
            job.status === "open" ? (
              <CandidateApplySection
                jobId={job.id}
                jobTitle={job.title}
                companyName={job.companyName ?? "the company"}
                alreadyApplied={data.alreadyApplied}
                hasResume={Boolean(data.candidateProfile?.resumeKey)}
              />
            ) : (
              <Card className="animate-scale-in">
                <CardHeader>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    No longer accepting applications
                  </p>
                  <CardDescription className="text-xs">
                    {job.status === "closed"
                      ? "This position has been closed by the company."
                      : "This job is currently in draft status."}
                  </CardDescription>
                </CardHeader>
              </Card>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ApplicantsSummaryCard({
  jobId,
  applicantsCount,
  evaluatedCount,
}: {
  jobId: string;
  applicantsCount: number;
  evaluatedCount: number;
}) {
  return (
    <Card className="animate-fade-in stagger-3 border-border/70">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CardTitle>Applicants</CardTitle>
            <Badge variant="secondary" className="font-mono text-[11px]">
              {applicantsCount}
            </Badge>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/dashboard/job-applicants/$jobId" params={{ jobId }}>
              View applicants
              <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-3.5" />
            </Link>
          </Button>
        </div>
        <CardDescription className="text-xs">
          Review candidate snapshots, submitted resumes, and application status in the dedicated
          applicants view.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {applicantsCount > 0 ? (
          <Card className="bg-muted/20 border-border/70">
            <CardContent className="space-y-2 p-4">
              <p className="text-sm font-medium">
                {applicantsCount} {applicantsCount === 1 ? "candidate has" : "candidates have"}{" "}
                applied
              </p>
              {evaluatedCount > 0 ? (
                <Badge variant="outline" className="gap-1 text-[11px]">
                  <HugeiconsIcon icon={RankingIcon} strokeWidth={2} className="size-3" />
                  {evaluatedCount} evaluated
                </Badge>
              ) : null}
              <p className="text-xs text-muted-foreground">
                Open the applicants page to move through each submission with direct access to
                resume, profile snapshot, and status controls.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} />
              </EmptyMedia>
              <EmptyTitle>No applicants yet</EmptyTitle>
              <EmptyDescription>
                When candidates apply, they will appear in the applicants view for this role.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </CardContent>
    </Card>
  );
}

function CompanyActions({ job, requirements }: { job: JobDetail; requirements: string[] }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);

  const updateJobFn = useServerFn(updateJob);
  const updateJobMutation = useMutation({
    mutationFn: updateJobFn,
    onSuccess: async () => {
      toast.success("Job updated successfully");
      setIsEditing(false);
      await router.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update job. Please try again.");
    },
  });

  const publishJobFn = useServerFn(publishJob);
  const publishJobMutation = useMutation({
    mutationFn: publishJobFn,
    onSuccess: async () => {
      toast.success("Job published successfully");
      await router.invalidate();
    },
    onError: () => {
      toast.error("Failed to publish job. Please try again.");
    },
  });

  const archiveJobFn = useServerFn(archiveJob);
  const archiveJobMutation = useMutation({
    mutationFn: archiveJobFn,
    onSuccess: async () => {
      toast.success("Job archived successfully");
      await router.invalidate();
      await router.navigate({ to: "/dashboard/jobs" });
    },
    onError: () => {
      toast.error("Failed to archive job. Please try again.");
    },
  });

  const onPublish = async () => {
    await publishJobMutation.mutateAsync({ data: { id: job.id } });
  };

  const onUpdate = async (data: JobFormData) => {
    await updateJobMutation.mutateAsync({
      data: {
        id: job.id,
        ...data,
      },
    });
  };

  const onArchive = async () => {
    await archiveJobMutation.mutateAsync({ data: { id: job.id } });
  };
  const isArchived = job.status === "closed" && job.archivedAt;

  const onCancelEdit = () => {
    setIsEditing(false);
  };
  const onStartEdit = () => {
    setIsEditing(true);
  };

  if (isEditing) {
    return (
      <Card className="animate-scale-in">
        <CardHeader>
          <CardTitle>Edit job</CardTitle>
          <CardDescription className="text-xs">
            Make changes to the job posting. Only &quot;Open&quot; jobs are visible to candidates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <JobForm
            defaultValues={{
              title: job.title,
              description: job.description,
              requirements,
              interviewQuestions: Array.isArray(job.interviewQuestions)
                ? job.interviewQuestions
                : [],
              status: job.status as JobStatus,
              location: job.location,
              workplaceType: (job.workplaceType ?? undefined) as WorkplaceType | undefined,
              employmentType: (job.employmentType ?? undefined) as EmploymentType | undefined,
              experienceLevel: (job.experienceLevel ?? undefined) as ExperienceLevel | undefined,
              salaryMin: job.salaryMin,
              salaryMax: job.salaryMax,
              salaryCurrency: job.salaryCurrency,
              teamSize: job.teamSize,
              headcount: job.headcount,
              finalReportTarget: job.finalReportTarget,
            }}
            onSubmit={onUpdate}
            submitLabel="Save changes"
            companyName={job.companyName ?? ""}
          />
          <Button variant="ghost" className="mt-3 w-full" onClick={onCancelEdit}>
            Cancel
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Archived jobs are read-only
  if (isArchived) {
    return (
      <div className="flex gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link to="/dashboard/job-applicants/$jobId" params={{ jobId: job.id }}>
            <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} className="size-3.5" />
            View applicants
          </Link>
        </Button>
        <Button variant="outline" size="sm" disabled title="Archived jobs cannot be edited">
          <HugeiconsIcon icon={Edit02Icon} strokeWidth={2} className="size-3.5" />
          Archived
        </Button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" asChild>
        <Link to="/dashboard/job-applicants/$jobId" params={{ jobId: job.id }}>
          <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} className="size-3.5" />
          View applicants
        </Link>
      </Button>
      {job.status === "draft" ? (
        <Button
          variant="default"
          size="sm"
          onClick={onPublish}
          disabled={publishJobMutation.isPending}
        >
          <HugeiconsIcon icon={Rocket01Icon} strokeWidth={2} className="size-3.5" />
          {publishJobMutation.isPending ? "Publishing..." : "Publish"}
        </Button>
      ) : null}
      <JobPreviewDialog
        data={{
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
        }}
      />
      <Button variant="outline" size="sm" onClick={onStartEdit}>
        <HugeiconsIcon icon={Edit02Icon} strokeWidth={2} className="size-3.5" />
        Edit
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm" disabled={archiveJobMutation.isPending}>
            <HugeiconsIcon icon={Archive01Icon} strokeWidth={2} className="size-3.5" />
            {archiveJobMutation.isPending ? "Archiving..." : "Archive"}
          </Button>
        </AlertDialogTrigger>
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
