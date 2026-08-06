import { useMutation } from "@tanstack/react-query";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { DashboardJobEditSkeleton } from "@/components/route-skeletons";
import { JobForm, type JobFormData, jobToFormDefaults } from "@/features/jobs/components/job-form";
import { updateJob } from "@/features/jobs/server/functions";

import { Route as ParentRoute } from "../$jobId";

export const Route = createFileRoute("/_authenticated/dashboard/jobs/$jobId/edit")({
  beforeLoad: ({ context }) => {
    if (!context.isCompany) {
      throw redirect({ to: "/dashboard" });
    }
  },
  pendingComponent: DashboardJobEditSkeleton,
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
      await router.navigate({
        to: "/dashboard/job-applicants/$jobId",
        params: { jobId: job.id },
        search: { tab: "posting" },
      });
      await router.invalidate();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to update job.");
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
    void router.navigate({
      to: "/dashboard/job-applicants/$jobId",
      params: { jobId: job.id },
      search: { tab: "posting" },
    });
  };

  return (
    <div className="space-y-6 pb-28">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Edit job</h1>
        <p className="text-sm text-muted-foreground">
          Make changes to the job posting. Only &quot;Open&quot; jobs are visible to candidates.
        </p>
      </div>

      <section className="space-y-5 rounded-3xl border border-border/60 px-5 py-4 md:px-6">
        <div className="space-y-1">
          <h2 className="text-base font-semibold tracking-tight">Job details</h2>
          <p className="text-sm text-muted-foreground">
            Provide a clear title, description, and requirements to attract the right candidates.
          </p>
        </div>
        <JobForm
          defaultValues={jobToFormDefaults(job)}
          onSubmit={onSubmit}
          submitLabel="Save changes"
          companyName={job.companyName ?? ""}
          onCancel={onCancel}
        />
      </section>
    </div>
  );
}
