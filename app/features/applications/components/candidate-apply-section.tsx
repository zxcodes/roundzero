import { CheckmarkCircle02Icon, Loading03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { applyToJob } from "@/features/applications/server/functions";

type CandidateApplySectionProps = {
  jobId: string;
  jobTitle: string;
  companyName: string;
  alreadyApplied: boolean;
  hasResume: boolean;
};

function ApplyStatusPanel({
  tone,
  title,
  description,
  action,
}: {
  tone: "success" | "warning" | "danger";
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  const toneClass = {
    success: "text-success",
    warning: "text-warning",
    danger: "text-destructive",
  }[tone];

  return (
    <section className="space-y-3 rounded-3xl border border-border/60 px-5 py-4 md:px-6">
      <div className="flex items-center gap-2">
        <HugeiconsIcon
          icon={CheckmarkCircle02Icon}
          strokeWidth={2}
          className={`size-4 ${toneClass}`}
        />
        <p className="text-sm font-semibold">{title}</p>
      </div>
      {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      {action}
    </section>
  );
}

export function CandidateApplySection({
  jobId,
  jobTitle,
  companyName,
  alreadyApplied,
  hasResume,
}: CandidateApplySectionProps) {
  const router = useRouter();
  const [justApplied, setJustApplied] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  const applyToJobFn = useServerFn(applyToJob);

  const applyMutation = useMutation({
    mutationFn: applyToJobFn,
    onSuccess: async () => {
      toast.success(`Successfully applied to ${jobTitle} at ${companyName}`, {
        action: {
          label: "View applications",
          onClick: () => router.navigate({ to: "/dashboard/applications" }),
        },
      });
      setJustApplied(true);
      await router.invalidate();
    },
    onError: (error) => {
      setApplyError(error.message || "Failed to submit application. Please try again.");
    },
  });

  const onApply = async () => {
    setApplyError(null);
    await applyMutation.mutateAsync({
      data: { jobId },
    });
  };

  if (justApplied) {
    return <ApplyStatusPanel tone="success" title="Application submitted" />;
  }

  if (alreadyApplied) {
    return <ApplyStatusPanel tone="success" title="You have already applied" />;
  }

  if (!hasResume) {
    return (
      <ApplyStatusPanel
        tone="warning"
        title="Resume required"
        description="Add a resume to your profile before applying to jobs."
        action={
          <Button className="w-full" asChild>
            <Link to="/dashboard/settings" search={{ redirect: `/dashboard/jobs/${jobId}` }}>
              Add resume in settings
            </Link>
          </Button>
        }
      />
    );
  }

  if (applyError) {
    return (
      <ApplyStatusPanel
        tone="danger"
        title="Unable to apply"
        description={applyError}
        action={
          <Button className="w-full" variant="outline" asChild>
            <Link to="/jobs">Browse other jobs</Link>
          </Button>
        }
      />
    );
  }

  return (
    <Button className="w-full" size="lg" onClick={onApply} disabled={applyMutation.isPending}>
      {applyMutation.isPending ? (
        <>
          <HugeiconsIcon icon={Loading03Icon} strokeWidth={2} className="size-4 animate-spin" />
          Applying
        </>
      ) : (
        "Apply for this position"
      )}
    </Button>
  );
}
