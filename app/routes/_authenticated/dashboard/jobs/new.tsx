import { Upload04Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link, redirect, useLoaderData, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AiJobCreator } from "@/features/jobs/components/ai-job-creator";
import { JobForm, type JobFormData } from "@/features/jobs/components/job-form";
import { TemplateSelectDialog } from "@/features/jobs/components/template-select-dialog";
import { createJob } from "@/features/jobs/server/functions";
import type { JobTemplate } from "@/shared/job-templates";
import { PAGE_SEO } from "@/shared/seo";

export const Route = createFileRoute("/_authenticated/dashboard/jobs/new")({
  beforeLoad: ({ context }) => {
    if (!context.isCompany) {
      throw redirect({ to: "/dashboard" });
    }
  },
  head: () => ({
    meta: [
      { title: PAGE_SEO.createJob.title },
      { name: "description", content: PAGE_SEO.createJob.description },
    ],
  }),
  component: NewJobPage,
});

function NewJobPage() {
  const router = useRouter();
  const auth = useLoaderData({ from: "/_authenticated" });
  const companyName = auth.type === "company" ? (auth.company?.name ?? "") : "";
  const isPaid =
    auth.type === "company" ? (auth.entitlements?.aiJobCreation.enabled ?? false) : false;
  const jobLimit = auth.type === "company" ? (auth.entitlements?.jobs.active.limit ?? 0) : 0;
  const openCount = auth.type === "company" ? (auth.jobCounts?.openCount ?? 0) : 0;
  const atLimit =
    auth.type === "company" ? (auth.entitlements?.jobs.active.atLimit ?? false) : false;
  const [draft, setDraft] = useState<JobFormData | null>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<JobTemplate | null>(null);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);

  const createJobFn = useServerFn(createJob);
  const createJobMutation = useMutation({
    mutationFn: createJobFn,
    onSuccess: async ({ job }) => {
      toast.success("Job created successfully");
      await router.navigate({
        to: "/dashboard/job-applicants/$jobId",
        params: { jobId: job.id },
        search: { tab: "posting" },
      });
      await router.invalidate();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Failed to create job.");
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

  const onOpenTemplateDialog = () => {
    setTemplateDialogOpen(true);
  };

  const onCloseTemplateDialog = () => {
    setTemplateDialogOpen(false);
  };

  return (
    <div className="space-y-6 pb-28">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">Post a new job</h1>
          <p className="text-sm text-muted-foreground">
            Fill in the details below to create a new job posting.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link
            to="/dashboard/jobs/import"
            className="w-full no-underline hover:no-underline sm:w-auto"
          >
            <HugeiconsIcon icon={Upload04Icon} strokeWidth={2} className="size-3.5" />
            Import existing jobs
          </Link>
        </Button>
      </div>

      {atLimit ? (
        <Alert variant="destructive">
          <AlertTitle>
            Job limit reached ({openCount} of {jobLimit} active jobs)
          </AlertTitle>
          <AlertDescription>
            You've used all your active job slots on your current plan. You can still create draft
            jobs here, but you'll need to archive an existing job or{" "}
            <Link to="/dashboard/billing" className="font-medium underline underline-offset-4">
              upgrade your plan
            </Link>{" "}
            before you can publish another one.
          </AlertDescription>
        </Alert>
      ) : null}

      <AiJobCreator isPaid={isPaid} onApply={onApplyDraft} onDiscard={onDiscardDraft} />

      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold">
            {selectedTemplate ? `Customizing "${selectedTemplate.title}"` : "Job details"}
          </h3>
          <p className="text-xs text-muted-foreground">
            {selectedTemplate
              ? "Edit any field before publishing."
              : "Provide a clear title and complete Markdown description to attract the right candidates."}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onOpenTemplateDialog}>
          {selectedTemplate ? "Change template" : "Start from a template"}
        </Button>
      </div>

      <TemplateSelectDialog
        isOpen={templateDialogOpen}
        onClose={onCloseTemplateDialog}
        onSelect={onSelectTemplate}
      />

      <section
        ref={formRef}
        className="stagger-1 rounded-3xl border border-border/60 px-5 py-4 md:px-6"
      >
        <JobForm
          key={selectedTemplate ? `template-${selectedTemplate.id}` : draft ? "draft" : "empty"}
          defaultValues={selectedTemplate?.data ?? draft ?? undefined}
          onSubmit={onSubmit}
          submitLabel="Create job"
          companyName={companyName}
          isSubmitting={createJobMutation.isPending}
        />
      </section>
    </div>
  );
}
