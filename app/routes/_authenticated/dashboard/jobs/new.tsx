import { ArrowLeft } from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { JobForm } from "@/features/jobs/components/job-form";
import { createJob } from "@/features/jobs/server-fns";

export const Route = createFileRoute("/_authenticated/dashboard/jobs/new")({
  component: NewJobPage,
});

function NewJobPage() {
  const router = useRouter();

  const createJobFn = useServerFn(createJob);
  const createJobMutation = useMutation({
    mutationFn: createJobFn,
    onSuccess: async ({ job }) => {
      toast.success("Job created successfully");
      await router.invalidate();
      await router.navigate({
        to: "/dashboard/jobs/$jobId",
        params: { jobId: job.id },
      });
    },
    onError: () => {
      toast.error("Failed to create job. Please try again.");
    },
  });

  const onSubmit = (data: {
    title: string;
    description: string;
    requirements: string[];
    status: string;
  }) => {
    if (!data.title.trim()) {
      toast.error("Job title is required");
      return;
    }
    if (!data.description.trim()) {
      toast.error("Job description is required");
      return;
    }

    createJobMutation.mutate({ data });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/dashboard/jobs">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Post a new job</h2>
          <p className="text-muted-foreground">
            Fill in the details below to create a new job posting.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Job details</CardTitle>
          <CardDescription>
            Provide a clear title, description, and requirements to attract the right candidates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <JobForm
            onSubmit={onSubmit}
            isSubmitting={createJobMutation.isPending}
            submitLabel="Create job"
          />
        </CardContent>
      </Card>
    </div>
  );
}
