import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { applyToJob } from "@/features/applications/server/functions";

type CandidateApplySectionProps = {
  jobId: string;
  jobTitle: string;
  companyName: string;
  alreadyApplied: boolean;
  hasResume: boolean;
};

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
    return (
      <Card className="animate-scale-in">
        <CardContent className="flex items-center justify-center gap-2 py-6">
          <HugeiconsIcon
            icon={CheckmarkCircle02Icon}
            strokeWidth={2}
            className="size-4 text-success"
          />
          <p className="text-sm font-medium text-muted-foreground">Application submitted</p>
        </CardContent>
      </Card>
    );
  }

  if (alreadyApplied) {
    return (
      <Card className="animate-scale-in">
        <CardContent className="flex items-center justify-center gap-2 py-6">
          <HugeiconsIcon
            icon={CheckmarkCircle02Icon}
            strokeWidth={2}
            className="size-4 text-success"
          />
          <p className="text-sm font-medium text-muted-foreground">You have already applied</p>
        </CardContent>
      </Card>
    );
  }

  if (!hasResume) {
    return (
      <Card className="animate-scale-in">
        <CardHeader>
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary">
            Resume required
          </p>
          <CardDescription className="text-xs">
            Add a resume to your profile before applying to jobs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" asChild>
            <Link to="/dashboard/settings">Add resume in settings</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (applyError) {
    return (
      <Card className="animate-scale-in">
        <CardHeader>
          <p className="text-[11px] font-bold uppercase tracking-widest text-destructive">
            Unable to apply
          </p>
          <CardDescription className="text-xs">{applyError}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" variant="outline" asChild>
            <Link to="/jobs">Browse other jobs</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Button className="w-full" size="lg" onClick={onApply} disabled={applyMutation.isPending}>
      {applyMutation.isPending ? "Applying…" : "Apply for this position"}
    </Button>
  );
}
