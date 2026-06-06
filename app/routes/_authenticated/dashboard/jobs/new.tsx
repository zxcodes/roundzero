import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AiJobCreator } from "@/features/jobs/components/ai-job-creator";
import { JobForm, type JobFormData } from "@/features/jobs/components/job-form";
import { TemplateSelectDialog } from "@/features/jobs/components/template-select-dialog";
import { createJob } from "@/features/jobs/server/functions";
import type { JobTemplate } from "@/shared/job-templates";

export const Route = createFileRoute("/_authenticated/dashboard/jobs/new")({
  beforeLoad: ({ context }) => {
    if (!context.isCompany) {
      throw redirect({ to: "/dashboard" });
    }

    const atLimit = !context.subscription?.isActive && (context.jobCounts?.openCount ?? 0) >= 3;

    if (atLimit) {
      throw redirect({ to: "/dashboard/billing", search: { reason: "job_limit" } });
    }
  },
  component: NewJobPage,
});

function NewJobPage() {
  const router = useRouter();
  const context = Route.useRouteContext();
  const companyName = context.company?.name ?? "";
  const isPaid = context.subscription?.isActive ?? false;
  const [draft, setDraft] = useState<JobFormData | null>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<JobTemplate | null>(null);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);

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

  const onApplyDraft = (data: JobFormData) => {
    setDraft(data);
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const onDiscardDraft = () => {
    setDraft(null);
  };

  const onSelectTemplate = (template: JobTemplate) => {
    setSelectedTemplate(template);
    setTemplateDialogOpen(false);
    toast.success(`Loaded "${template.title}" template`);
  };

  return (
    <div className="space-y-6">
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

      <AiJobCreator isPaid={isPaid} onApply={onApplyDraft} onDiscard={onDiscardDraft} />

      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold">
            {selectedTemplate ? `Customizing "${selectedTemplate.title}"` : "Job details"}
          </h3>
          <p className="text-xs text-muted-foreground">
            {selectedTemplate
              ? "Edit any field before publishing."
              : "Provide a clear title, description, and requirements to attract the right candidates."}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setTemplateDialogOpen(true)}>
          {selectedTemplate ? "Change template" : "Start from a template"}
        </Button>
      </div>

      <TemplateSelectDialog
        isOpen={templateDialogOpen}
        onClose={() => setTemplateDialogOpen(false)}
        onSelect={onSelectTemplate}
      />

      <Card ref={formRef} className="stagger-1">
        <CardContent className="pt-6">
          <JobForm
            key={selectedTemplate ? `template-${selectedTemplate.id}` : draft ? "draft" : "empty"}
            defaultValues={selectedTemplate?.data ?? draft ?? undefined}
            onSubmit={onSubmit}
            submitLabel="Create job"
            companyName={companyName}
          />
        </CardContent>
      </Card>
    </div>
  );
}
