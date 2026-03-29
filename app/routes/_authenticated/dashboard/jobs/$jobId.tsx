import {
  ArrowLeft01Icon,
  CheckmarkCircle02Icon,
  Delete02Icon,
  Edit02Icon,
  File02Icon,
  Link04Icon,
  Location01Icon,
  Mail01Icon,
  MoneyBag02Icon,
  Rocket01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
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
  AlertDialogTrigger,
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
import { Separator } from "@/components/ui/separator";
import { ApplyForm } from "@/features/applications/components/apply-form";
import {
  applyToJob,
  getJobApplicants,
  hasApplied,
  updateApplicationStatus,
} from "@/features/applications/server/functions";
import { JobForm, type JobFormData } from "@/features/jobs/components/job-form";
import { deleteJob, getJob, publishJob, updateJob } from "@/features/jobs/server/functions";
import {
  type EmploymentType,
  type ExperienceLevel,
  employmentTypeLabels,
  experienceLevelLabels,
  type JobStatus,
  type WorkplaceType,
  workplaceTypeLabels,
} from "@/shared/enums";

export const Route = createFileRoute("/_authenticated/dashboard/jobs/$jobId")({
  loader: async ({ params, context }) => {
    const job = await getJob({ data: { id: params.jobId } });

    const [alreadyApplied, applicants] = await Promise.all([
      context.isCandidate && job.status === "open"
        ? hasApplied({ data: { jobId: params.jobId } })
        : Promise.resolve(false),
      context.isCompany ? getJobApplicants({ data: { jobId: params.jobId } }) : Promise.resolve([]),
    ]);

    return { job, alreadyApplied, applicants };
  },
  component: JobDetailPage,
});

const statusVariant = (status: string) => {
  switch (status) {
    case "open":
      return "default" as const;
    case "draft":
      return "secondary" as const;
    case "closed":
      return "outline" as const;
    default:
      return "secondary" as const;
  }
};

const formatDate = (date: Date | string) => {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatSalary = (min: number | null, max: number | null, currency: string) => {
  if (!min && !max) return null;
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  if (min && max) return `${fmt(min)} - ${fmt(max)}`;
  if (min) return `From ${fmt(min)}`;
  return `Up to ${fmt(max!)}`;
};

function JobDetailPage() {
  const { job, alreadyApplied, applicants } = Route.useLoaderData();
  const { isCompany } = Route.useRouteContext();

  const requirements: string[] = Array.isArray(job.requirements) ? job.requirements : [];
  const salary = formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency);

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
            <Badge variant={statusVariant(job.status)} className="capitalize">
              {job.status}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {job.companyName && (
              <>
                <span className="font-medium text-foreground">{job.companyName}</span>
                {" \u00B7 "}
              </>
            )}
            <span className="font-mono">{formatDate(job.createdAt)}</span>
            {new Date(job.updatedAt).getTime() !== new Date(job.createdAt).getTime() && (
              <>
                {" "}
                · Updated <span className="font-mono">{formatDate(job.updatedAt)}</span>
              </>
            )}
          </p>
        </div>
      </div>

      {isCompany && <CompanyActions job={job} requirements={requirements} />}

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

          {requirements.length > 0 && (
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
          )}

          {isCompany && <ApplicantsSection applicants={applicants} />}
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
              {job.location && (
                <div className="flex items-start gap-3">
                  <HugeiconsIcon
                    icon={Location01Icon}
                    strokeWidth={2}
                    className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  />
                  <div>
                    <p className="text-sm font-medium">{job.location}</p>
                    {job.workplaceType && (
                      <p className="text-xs text-muted-foreground">
                        {workplaceTypeLabels[job.workplaceType as WorkplaceType]}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {job.employmentType && (
                <div className="flex items-center gap-3">
                  <div className="flex size-4 shrink-0 items-center justify-center rounded bg-muted text-[10px] font-bold text-muted-foreground">
                    E
                  </div>
                  <p className="text-sm">
                    {employmentTypeLabels[job.employmentType as EmploymentType]}
                  </p>
                </div>
              )}

              {job.experienceLevel && (
                <div className="flex items-center gap-3">
                  <div className="flex size-4 shrink-0 items-center justify-center rounded bg-muted text-[10px] font-bold text-muted-foreground">
                    L
                  </div>
                  <p className="text-sm">
                    {experienceLevelLabels[job.experienceLevel as ExperienceLevel]}
                  </p>
                </div>
              )}

              {salary && (
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
              )}

              {(job.teamSize || job.headcount) && (
                <>
                  <Separator />
                  <div className="flex items-start gap-3">
                    <HugeiconsIcon
                      icon={UserGroupIcon}
                      strokeWidth={2}
                      className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                    />
                    <div className="space-y-0.5">
                      {job.teamSize && (
                        <p className="text-sm">
                          <span className="font-mono font-medium">{job.teamSize}</span> people on
                          team
                        </p>
                      )}
                      {job.headcount && (
                        <p className="text-xs text-muted-foreground">
                          <span className="font-mono">{job.headcount}</span> open{" "}
                          {job.headcount === 1 ? "position" : "positions"}
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Apply section for candidates */}
          {!isCompany && job.status === "open" && (
            <CandidateApplySection jobId={job.id} alreadyApplied={alreadyApplied} />
          )}
        </div>
      </div>
    </div>
  );
}

const APPLICATION_STATUSES = [
  { value: "applied", label: "Applied" },
  { value: "interviewing", label: "Interviewing" },
  { value: "evaluated", label: "Evaluated" },
  { value: "rejected", label: "Rejected" },
];

const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  applied: ["applied", "interviewing", "rejected"],
  interviewing: ["interviewing", "evaluated", "rejected"],
  evaluated: ["evaluated", "rejected"],
  rejected: ["rejected"],
};

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

function ApplicantsSection({
  applicants,
}: {
  applicants: Awaited<ReturnType<typeof getJobApplicants>>;
}) {
  const router = useRouter();

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

  const onStatusChange = async (applicationId: string, status: string) => {
    await updateStatusMutation.mutateAsync({
      data: { applicationId, status },
    });
  };

  return (
    <Card className="animate-fade-in stagger-3">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>Applicants</CardTitle>
            <Badge variant="secondary" className="font-mono text-[11px]">
              {applicants.length}
            </Badge>
          </div>
        </div>
        <CardDescription className="text-xs">
          Review candidates and update their application status.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {applicants.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-muted">
              <HugeiconsIcon
                icon={UserGroupIcon}
                strokeWidth={2}
                className="size-5 text-muted-foreground"
              />
            </div>
            <p className="text-xs text-muted-foreground">No one has applied yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {applicants.map((applicant) => {
              const links: string[] = Array.isArray(applicant.links) ? applicant.links : [];

              return (
                <div
                  key={applicant.id}
                  className="rounded-lg border p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <Avatar className="size-8">
                        <AvatarImage
                          src={applicant.candidatePicture ?? undefined}
                          alt={applicant.candidateName}
                        />
                        <AvatarFallback className="text-[10px]">
                          {getInitials(applicant.candidateName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{applicant.candidateName}</p>
                        <div className="flex items-center gap-1">
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
                    <Select
                      value={applicant.status}
                      onValueChange={(value) => onStatusChange(applicant.id, value)}
                      disabled={updateStatusMutation.isPending}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {APPLICATION_STATUSES.filter((s) =>
                          (VALID_STATUS_TRANSITIONS[applicant.status] ?? []).includes(s.value),
                        ).map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {(applicant.resumeUrl || links.length > 0) && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 pl-11">
                      {applicant.resumeUrl && (
                        <a
                          href={applicant.resumeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          <HugeiconsIcon icon={File02Icon} strokeWidth={2} className="size-3" />
                          Resume
                        </a>
                      )}
                      {links.map((link, i) => (
                        <a
                          key={`${link}-${i}`}
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          <HugeiconsIcon icon={Link04Icon} strokeWidth={2} className="size-3" />
                          {(() => {
                            try {
                              return new URL(link).hostname;
                            } catch {
                              return "Link";
                            }
                          })()}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CandidateApplySection({
  jobId,
  alreadyApplied,
}: {
  jobId: string;
  alreadyApplied: boolean;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [applied, setApplied] = useState(alreadyApplied);

  const applyToJobFn = useServerFn(applyToJob);
  const applyMutation = useMutation({
    mutationFn: applyToJobFn,
    onSuccess: async () => {
      toast.success("Application submitted successfully!");
      setApplied(true);
      setShowForm(false);
      await router.invalidate();
    },
    onError: () => {
      toast.error("Failed to submit application. Please try again.");
    },
  });

  const onApply = async (data: { resumeUrl: string | null; links: string[] }) => {
    await applyMutation.mutateAsync({
      data: {
        jobId,
        resumeUrl: data.resumeUrl,
        links: data.links,
      },
    });
  };

  if (applied) {
    return (
      <Card className="animate-scale-in">
        <CardContent className="flex items-center justify-center gap-2 py-6">
          <HugeiconsIcon
            icon={CheckmarkCircle02Icon}
            strokeWidth={2}
            className="size-4 text-emerald-500"
          />
          <p className="text-sm font-medium text-muted-foreground">You have already applied</p>
        </CardContent>
      </Card>
    );
  }

  if (showForm) {
    return (
      <Card className="animate-scale-in">
        <CardHeader>
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary">Apply</p>
          <CardDescription className="text-xs">
            Add your resume and any relevant links.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ApplyForm onSubmit={onApply} />
          <Button
            variant="ghost"
            className="mt-3 w-full"
            onClick={() => setShowForm(false)}
            disabled={applyMutation.isPending}
          >
            Cancel
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Button className="w-full" size="lg" onClick={() => setShowForm(true)}>
      Apply for this position
    </Button>
  );
}

function CompanyActions({
  job,
  requirements,
}: {
  job: Awaited<ReturnType<typeof getJob>>;
  requirements: string[];
}) {
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
    onError: () => {
      toast.error("Failed to update job. Please try again.");
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

  const deleteJobFn = useServerFn(deleteJob);
  const deleteJobMutation = useMutation({
    mutationFn: deleteJobFn,
    onSuccess: async () => {
      toast.success("Job deleted successfully");
      await router.invalidate();
      await router.navigate({ to: "/dashboard/jobs" });
    },
    onError: () => {
      toast.error("Failed to delete job. Please try again.");
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

  const onDelete = async () => {
    await deleteJobMutation.mutateAsync({ data: { id: job.id } });
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
              status: job.status as JobStatus,
              location: job.location,
              workplaceType: job.workplaceType as WorkplaceType | null,
              employmentType: job.employmentType as EmploymentType | null,
              experienceLevel: job.experienceLevel as ExperienceLevel | null,
              salaryMin: job.salaryMin,
              salaryMax: job.salaryMax,
              salaryCurrency: job.salaryCurrency,
              teamSize: job.teamSize,
              headcount: job.headcount,
            }}
            onSubmit={onUpdate}
            submitLabel="Save changes"
          />
          <Button variant="ghost" className="mt-3 w-full" onClick={() => setIsEditing(false)}>
            Cancel
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex gap-2">
      {job.status === "draft" && (
        <Button
          variant="default"
          size="sm"
          onClick={onPublish}
          disabled={publishJobMutation.isPending}
        >
          <HugeiconsIcon icon={Rocket01Icon} strokeWidth={2} className="size-3.5" />
          {publishJobMutation.isPending ? "Publishing..." : "Publish"}
        </Button>
      )}
      <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
        <HugeiconsIcon icon={Edit02Icon} strokeWidth={2} className="size-3.5" />
        Edit
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" size="sm" disabled={deleteJobMutation.isPending}>
            <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} className="size-3.5" />
            {deleteJobMutation.isPending ? "Deleting..." : "Delete"}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this job?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the job posting and all associated applications. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
