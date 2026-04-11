import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { JobForm, type JobFormData } from "@/features/jobs/components/job-form";
import { createJob } from "@/features/jobs/server/functions";

export const Route = createFileRoute("/_authenticated/dashboard/jobs/new")({
  beforeLoad: ({ context }) => {
    if (!context.isCompany) {
      throw redirect({ to: "/dashboard" });
    }
  },
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
    onError: (error) => {
      toast.error(error.message || "Failed to create job. Please try again.");
    },
  });

  const onSubmit = async (data: JobFormData) => {
    await createJobMutation.mutateAsync({ data });
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="shrink-0" asChild>
          <Link to="/dashboard/jobs">
            <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Post a new job</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Fill in the details below to create a new job posting.
          </p>
        </div>
      </div>

      <Card className="animate-fade-in stagger-1">
        <CardHeader>
          <CardTitle>Job details</CardTitle>
          <CardDescription className="text-xs">
            Provide a clear title, description, and requirements to attract the right candidates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <JobForm onSubmit={onSubmit} submitLabel="Create job" />
        </CardContent>
      </Card>
    </div>
  );
}
