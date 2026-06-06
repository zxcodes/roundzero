import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { JobForm, type JobFormData } from "@/features/jobs/components/job-form";
import { updateJob } from "@/features/jobs/server/functions";
import type { EmploymentType, ExperienceLevel, JobStatus, WorkplaceType } from "@/shared/enums";
import { Route as ParentRoute } from "../$jobId";

export const Route = createFileRoute("/_authenticated/dashboard/jobs/$jobId/edit")({
  beforeLoad: ({ context }) => {
    if (!context.isCompany) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: EditJobPage,
});

function EditJobPage() {
  const router = useRouter();
  const { job } = ParentRoute.useLoaderData();

  const updateJobFn = useServerFn(updateJob);
  const updateJobMutation = useMutation({
    mutationFn: updateJobFn,
    onSuccess: async () => {
      toast.success("Job updated successfully");
      await router.invalidate();
      await router.navigate({ to: "/dashboard/jobs/$jobId", params: { jobId: job.id } });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update job. Please try again.");
    },
  });

  const onSubmit = async (data: JobFormData) => {
    await updateJobMutation.mutateAsync({
      data: {
        id: job.id,
        ...data,
      },
    });
  };

  const onCancel = () => {
    void router.navigate({ to: "/dashboard/jobs/$jobId", params: { jobId: job.id } });
  };

  return (
    <div className="space-y-6 pb-28">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="shrink-0" asChild>
          <Link to="/dashboard/jobs/$jobId" params={{ jobId: job.id }}>
            <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Edit job</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Make changes to the job posting. Only &quot;Open&quot; jobs are visible to candidates.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Job details</CardTitle>
          <CardDescription className="text-xs">
            Provide a clear title, description, and requirements to attract the right candidates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <JobForm
            defaultValues={{
              title: job.title,
              description: job.description,
              requirements: Array.isArray(job.requirements) ? job.requirements : [],
              screeningQuestions: Array.isArray(job.screeningQuestions)
                ? job.screeningQuestions
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
            onSubmit={onSubmit}
            submitLabel="Save changes"
            companyName={job.companyName ?? ""}
            onCancel={onCancel}
          />
        </CardContent>
      </Card>
    </div>
  );
}
