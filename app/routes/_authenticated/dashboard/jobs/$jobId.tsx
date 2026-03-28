import {
  ArrowLeft,
  CheckCircle,
  Envelope,
  PencilSimple,
  Trash,
  Users,
} from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
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
import { ApplyForm } from "@/features/applications/components/apply-form";
import {
  applyToJob,
  getJobApplicants,
  hasApplied,
  updateApplicationStatus,
} from "@/features/applications/server-fns";
import { JobForm } from "@/features/jobs/components/job-form";
import { deleteJob, getJob, updateJob } from "@/features/jobs/server-fns";

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

function JobDetailPage() {
  const { job, alreadyApplied, applicants } = Route.useLoaderData();
  const { isCompany } = Route.useRouteContext();

  const requirements: string[] = Array.isArray(job.requirements) ? job.requirements : [];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/dashboard/jobs">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight">{job.title}</h2>
            <Badge variant={statusVariant(job.status)} className="capitalize">
              {job.status}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            Created {formatDate(job.createdAt)}
            {job.updatedAt !== job.createdAt && ` · Updated ${formatDate(job.updatedAt)}`}
          </p>
        </div>
      </div>

      {isCompany && <CompanyActions job={job} requirements={requirements} />}

      <Card>
        <CardHeader>
          <CardTitle>Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{job.description}</p>
        </CardContent>
      </Card>

      {requirements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Requirements</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-inside list-disc space-y-1">
              {requirements.map((req, i) => (
                <li key={`${req}-${i}`} className="text-sm">
                  {req}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {isCompany && <ApplicantsSection applicants={applicants} />}

      {!isCompany && job.status === "open" && (
        <CandidateApplySection jobId={job.id} alreadyApplied={alreadyApplied} />
      )}
    </div>
  );
}

const APPLICATION_STATUSES = [
  { value: "applied", label: "Applied" },
  { value: "interviewing", label: "Interviewing" },
  { value: "evaluated", label: "Evaluated" },
  { value: "rejected", label: "Rejected" },
];

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

  const onStatusChange = (applicationId: string, status: string) => {
    updateStatusMutation.mutate({
      data: { applicationId, status },
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>Applicants</CardTitle>
            <Badge variant="secondary">{applicants.length}</Badge>
          </div>
        </div>
        <CardDescription>Review candidates and update their application status.</CardDescription>
      </CardHeader>
      <CardContent>
        {applicants.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Users className="text-muted-foreground mb-3 size-10" />
            <p className="text-muted-foreground text-sm">No one has applied yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {applicants.map((applicant) => (
              <div
                key={applicant.id}
                className="flex items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <Avatar className="size-9">
                    <AvatarImage
                      src={applicant.candidatePicture ?? undefined}
                      alt={applicant.candidateName}
                    />
                    <AvatarFallback className="text-xs">
                      {getInitials(applicant.candidateName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{applicant.candidateName}</p>
                    <div className="flex items-center gap-1">
                      <Envelope className="text-muted-foreground size-3" />
                      <p className="text-muted-foreground truncate text-xs">
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
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {APPLICATION_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
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

  const onApply = (data: { resumeUrl: string | null; links: string[] }) => {
    applyMutation.mutate({
      data: {
        jobId,
        resumeUrl: data.resumeUrl,
        links: data.links,
      },
    });
  };

  if (applied) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed py-6">
        <CheckCircle className="text-muted-foreground size-5" weight="fill" />
        <p className="text-muted-foreground text-sm font-medium">
          You have already applied to this position
        </p>
      </div>
    );
  }

  if (showForm) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Apply for this position</CardTitle>
          <CardDescription>
            Add your resume and any relevant links. You can submit without either — they are
            optional.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ApplyForm onSubmit={onApply} isSubmitting={applyMutation.isPending} />
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

  const onUpdate = (data: {
    title: string;
    description: string;
    requirements: string[];
    status: string;
  }) => {
    updateJobMutation.mutate({
      data: {
        id: job.id,
        ...data,
      },
    });
  };

  const onDelete = () => {
    if (
      !window.confirm("Are you sure you want to delete this job? This action cannot be undone.")
    ) {
      return;
    }

    deleteJobMutation.mutate({ data: { id: job.id } });
  };

  if (isEditing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Edit job</CardTitle>
          <CardDescription>
            Make changes to the job posting. Only &quot;Open&quot; jobs are visible to candidates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <JobForm
            defaultValues={{
              title: job.title,
              description: job.description,
              requirements,
              status: job.status,
            }}
            onSubmit={onUpdate}
            isSubmitting={updateJobMutation.isPending}
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
      <Button variant="outline" onClick={() => setIsEditing(true)}>
        <PencilSimple className="size-4" />
        Edit
      </Button>
      <Button variant="destructive" onClick={onDelete} disabled={deleteJobMutation.isPending}>
        <Trash className="size-4" />
        {deleteJobMutation.isPending ? "Deleting..." : "Delete"}
      </Button>
    </div>
  );
}
