import {
  ArrowLeft01Icon,
  BubbleChatIcon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link, notFound, redirect, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { DashboardApplicationDetailSkeleton } from "@/components/route-skeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  cancelMyInterview,
  completeMyInterview,
  getMyInterview,
  startMyInterview,
} from "@/features/interviews/server/functions";
import { validateUuidParams } from "@/shared/validation";

export const Route = createFileRoute("/_authenticated/interview/$interviewId")({
  beforeLoad: ({ context, params }) => {
    if (!context.isCandidate) {
      throw redirect({ to: "/dashboard" });
    }

    validateUuidParams({ interviewId: params.interviewId });
  },
  loader: async ({ params }) => {
    const interview = await getMyInterview({
      data: { interviewId: params.interviewId },
    });

    if (!interview) {
      throw notFound();
    }

    return interview;
  },
  pendingComponent: DashboardApplicationDetailSkeleton,
  component: InterviewRoutePage,
});

function InterviewRoutePage() {
  const interview = Route.useLoaderData();
  const router = useRouter();

  const startInterviewFn = useServerFn(startMyInterview);
  const cancelInterviewFn = useServerFn(cancelMyInterview);
  const completeInterviewFn = useServerFn(completeMyInterview);

  const startInterviewMutation = useMutation({
    mutationFn: startInterviewFn,
    onSuccess: async () => {
      toast.success("Interview started.");
      await router.invalidate();
    },
    onError: () => {
      toast.error("Could not start interview. Please try again.");
    },
  });

  const cancelInterviewMutation = useMutation({
    mutationFn: cancelInterviewFn,
    onSuccess: async () => {
      toast.success("Interview cancelled.");
      await router.invalidate();
    },
    onError: () => {
      toast.error("Could not cancel interview. Please try again.");
    },
  });

  const completeInterviewMutation = useMutation({
    mutationFn: completeInterviewFn,
    onSuccess: async () => {
      toast.success("Interview submitted.");
      await router.invalidate();
    },
    onError: () => {
      toast.error("Could not submit interview. Please try again.");
    },
  });

  const onStartInterview = async () => {
    await startInterviewMutation.mutateAsync({
      data: { interviewId: interview.id },
    });
  };

  const onCancelInterview = async () => {
    await cancelInterviewMutation.mutateAsync({
      data: { interviewId: interview.id },
    });
  };

  const onCompleteInterview = async () => {
    await completeInterviewMutation.mutateAsync({
      data: { interviewId: interview.id },
    });
  };

  const canStart = interview.status === "pending";
  const canCancel = interview.status === "pending" || interview.status === "in_progress";
  const canComplete = interview.status === "in_progress";

  return (
    <div className="animate-fade-in space-y-6">
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link to="/dashboard/applications">
          <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-4" />
          Applications
        </Link>
      </Button>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <HugeiconsIcon icon={BubbleChatIcon} strokeWidth={2} className="size-4" />
            </div>
            <Badge variant="outline" className="font-mono text-[11px]">
              Interview Ready
            </Badge>
          </div>
          <CardTitle>Zero interview session</CardTitle>
          <CardDescription>
            Phase 6 baseline is live. You can start, cancel, or complete your interview from this
            session page while we wire the full conversational agent.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Interview for <span className="font-medium text-foreground">{interview.jobTitle}</span>{" "}
            at <span className="font-medium text-foreground">{interview.companyName}</span>.
          </p>
          <p>
            Session status: <span className="font-mono text-foreground">{interview.status}</span>
          </p>

          <div className="flex flex-wrap gap-2">
            {canStart ? (
              <Button onClick={onStartInterview} disabled={startInterviewMutation.isPending}>
                <HugeiconsIcon icon={BubbleChatIcon} strokeWidth={2} className="size-4" />
                Start interview
              </Button>
            ) : null}

            {canComplete ? (
              <Button
                variant="outline"
                onClick={onCompleteInterview}
                disabled={completeInterviewMutation.isPending}
              >
                <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} className="size-4" />
                Submit interview
              </Button>
            ) : null}

            {canCancel ? (
              <Button
                variant="outline"
                className="text-destructive hover:bg-destructive/10"
                onClick={onCancelInterview}
                disabled={cancelInterviewMutation.isPending}
              >
                <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className="size-4" />
                Cancel interview
              </Button>
            ) : null}

            <Button variant="outline" asChild>
              <Link
                to="/dashboard/application/$applicationId"
                params={{ applicationId: interview.applicationId }}
              >
                Open application
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
