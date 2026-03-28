import { ArrowLeft, PencilSimple, Trash } from "@phosphor-icons/react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { JobForm } from "@/features/jobs/components/job-form";
import { deleteJob, getJob, updateJob } from "@/features/jobs/server-fns";

export const Route = createFileRoute("/_authenticated/dashboard/jobs/$jobId")({
  loader: ({ params }) => getJob({ data: { id: params.jobId } }),
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
  const job = Route.useLoaderData();
  const { user } = Route.useRouteContext();
  const isCompany = user?.role === "company";

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

      {!isCompany && job.status === "open" && (
        <Button className="w-full" size="lg">
          Apply for this position
        </Button>
      )}
    </div>
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const onUpdate = async (data: {
    title: string;
    description: string;
    requirements: string[];
    status: string;
  }) => {
    setIsSubmitting(true);
    try {
      await updateJob({
        data: {
          id: job.id,
          ...data,
        },
      });
      toast.success("Job updated successfully");
      setIsEditing(false);
      await router.invalidate();
    } catch {
      toast.error("Failed to update job. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onDelete = async () => {
    if (
      !window.confirm("Are you sure you want to delete this job? This action cannot be undone.")
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteJob({ data: { id: job.id } });
      toast.success("Job deleted successfully");
      await router.invalidate();
      await router.navigate({ to: "/dashboard/jobs" });
    } catch {
      toast.error("Failed to delete job. Please try again.");
      setIsDeleting(false);
    }
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
            isSubmitting={isSubmitting}
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
      <Button variant="destructive" onClick={onDelete} disabled={isDeleting}>
        <Trash className="size-4" />
        {isDeleting ? "Deleting..." : "Delete"}
      </Button>
    </div>
  );
}
