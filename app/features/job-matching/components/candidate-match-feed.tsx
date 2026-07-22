import {
  ArrowRight01Icon,
  Briefcase01Icon,
  Cancel01Icon,
  Loading03Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Progress } from "@/components/ui/progress";
import { JobListRow } from "@/features/jobs/components/job-list-row";
import { formatRelativeTime } from "@/shared/date";

import type { MatchBand } from "../config";
import type { MatchRefreshPhase } from "../schemas";
import {
  dismissMyCandidateMatch,
  type getMyCandidateMatches,
  getMyCandidateMatchRefreshProgress,
  refreshMyCandidateMatches,
  viewMyCandidateMatch,
} from "../server/functions";

type MatchFeed = NonNullable<Awaited<ReturnType<typeof getMyCandidateMatches>>>;
type MatchItem = MatchFeed["items"][number];

const bandLabel: Record<MatchBand, string> = {
  strong: "Strong match",
  good: "Good match",
  potential: "Potential match",
};

const refreshPhasePresentation: Record<MatchRefreshPhase, { label: string; progress: number }> = {
  queued: { label: "Starting the refresh", progress: 10 },
  reading_resume: { label: "Reading your resume", progress: 30 },
  finding_jobs: { label: "Finding relevant open roles", progress: 50 },
  ranking_matches: { label: "Ranking your matches", progress: 75 },
  updating_feed: { label: "Updating your job feed", progress: 90 },
};

export function CandidateMatchFeed({ data }: { data: MatchFeed | null }) {
  const router = useRouter();
  const refreshFn = useServerFn(refreshMyCandidateMatches);
  const progressFn = useServerFn(getMyCandidateMatchRefreshProgress);
  const refreshMutation = useMutation({
    mutationFn: refreshFn,
    onSuccess: async (result) => {
      if (!result.started) toast.error("Could not start a new refresh.");
      await router.invalidate();
    },
    onError: () => toast.error("Could not refresh matches."),
  });
  const progressQuery = useQuery({
    queryKey: [
      "candidate-match-refresh-progress",
      data?.status,
      data?.refreshedAt?.getTime() ?? null,
    ],
    queryFn: progressFn,
    enabled: data?.status === "processing",
    refetchInterval: (query) => (query.state.data?.status === "processing" ? 2_000 : false),
  });

  useEffect(() => {
    const latestStatus = progressQuery.data?.status;
    if (data?.status !== "processing" || !latestStatus || latestStatus === "processing") return;
    void router.invalidate();
  }, [data?.status, progressQuery.data?.status, router]);

  const onRefresh = () => refreshMutation.mutate({});
  const refreshStatus = progressQuery.data?.status ?? data?.status;
  const isRefreshing = refreshStatus === "processing";
  const refreshPhase = progressQuery.data?.phase ?? data?.refreshPhase ?? "queued";
  const refreshPresentation = refreshPhasePresentation[refreshPhase];

  if (!data?.hasResume) {
    return (
      <Empty className="rounded-3xl border border-border/60">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <HugeiconsIcon icon={Briefcase01Icon} strokeWidth={2} />
          </EmptyMedia>
          <EmptyTitle>Add your resume to get personalized matches</EmptyTitle>
          <EmptyDescription>
            Upload a resume in settings, or browse every open role.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild>
            <a href="/dashboard/settings">Open settings</a>
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  if (!data.refreshedAt && data.status !== "failed" && !isRefreshing) {
    return (
      <Empty className="rounded-3xl border border-border/60">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <HugeiconsIcon icon={Loading03Icon} strokeWidth={2} className="animate-spin" />
          </EmptyMedia>
          <EmptyTitle>Preparing your matches</EmptyTitle>
          <EmptyDescription>
            We’re reading your resume and comparing it with open roles.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {isRefreshing ? (
        <Alert className="border-border/60 bg-muted/30">
          <HugeiconsIcon icon={Loading03Icon} strokeWidth={2} className="animate-spin" />
          <AlertTitle>Refreshing your matches</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>{refreshPresentation.label}. Your existing matches remain available.</p>
            <Progress
              value={refreshPresentation.progress}
              role="progressbar"
              aria-label="Job match refresh progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={refreshPresentation.progress}
              className="h-1.5"
            />
          </AlertDescription>
        </Alert>
      ) : null}
      {data.hasError ? (
        <Alert>
          <AlertTitle>Latest refresh did not finish</AlertTitle>
          <AlertDescription>Your previous matches are still available.</AlertDescription>
        </Alert>
      ) : null}
      {data.resumeIsStale ? (
        <Alert>
          <AlertTitle>Your resume may be out of date</AlertTitle>
          <AlertDescription>
            Update it in settings so future recommendations reflect your latest experience.
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {data.refreshedAt
            ? `Refreshed ${formatRelativeTime(data.refreshedAt)}`
            : "Not refreshed yet"}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={refreshMutation.isPending || isRefreshing}
        >
          <HugeiconsIcon
            icon={Loading03Icon}
            strokeWidth={2}
            data-icon="inline-start"
            className={refreshMutation.isPending || isRefreshing ? "animate-spin" : undefined}
          />
          {isRefreshing ? "Refreshing" : "Refresh"}
        </Button>
      </div>
      {data.items.length === 0 ? (
        <Empty className="rounded-3xl border border-border/60">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HugeiconsIcon icon={Briefcase01Icon} strokeWidth={2} />
            </EmptyMedia>
            <EmptyTitle>
              {isRefreshing && !data.refreshedAt
                ? "Your personalized matches are on the way"
                : "No personalized matches yet"}
            </EmptyTitle>
            <EmptyDescription>
              {isRefreshing && !data.refreshedAt
                ? "Your results will appear here when this refresh finishes."
                : "We’ll keep checking as new roles are published. All jobs is always available."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="divide-y divide-border/50 overflow-hidden rounded-3xl border border-border/60">
          {data.items.map((match) => (
            <CandidateMatchRow key={match.jobId} match={match} />
          ))}
        </div>
      )}
    </div>
  );
}

function CandidateMatchRow({ match }: { match: MatchItem }) {
  const router = useRouter();
  const navigate = useNavigate();
  const viewFn = useServerFn(viewMyCandidateMatch);
  const dismissFn = useServerFn(dismissMyCandidateMatch);
  const viewMutation = useMutation({ mutationFn: viewFn });
  const dismissMutation = useMutation({
    mutationFn: dismissFn,
    onSuccess: async () => {
      toast.success("Recommendation dismissed");
      await router.invalidate();
    },
    onError: () => toast.error("Could not dismiss this match."),
  });

  const onOpen = () => {
    viewMutation.mutate({ data: { jobId: match.jobId } });
  };
  const onView = () => {
    onOpen();
    void navigate({ to: "/dashboard/jobs/$jobId", params: { jobId: match.jobId } });
  };
  const onDismiss = () => dismissMutation.mutate({ data: { jobId: match.jobId } });
  const band = match.band as MatchBand;

  return (
    <JobListRow
      job={{ ...match, id: match.jobId }}
      jobTo="/dashboard/jobs/$jobId"
      showCompanyName
      onOpen={onOpen}
      badge={
        <Badge variant={band === "strong" ? "default" : "secondary"}>
          {bandLabel[band] ?? "Potential match"}
        </Badge>
      }
      details={
        <div className="space-y-2">
          {match.reasons.length > 0 ? (
            <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-foreground/90">
              {match.reasons.slice(0, 2).map((reason) => (
                <li key={`${reason.candidateFactId}:${reason.jobFactId}`} className="line-clamp-1">
                  {reason.text}
                </li>
              ))}
            </ul>
          ) : null}
          {match.reasons.length < 2 ? (
            <p className="text-sm text-muted-foreground">
              Limited positive evidence in your resume—review the role details before deciding.
            </p>
          ) : null}
          {match.consideration ? (
            <p className="line-clamp-1 text-xs text-muted-foreground">{match.consideration}</p>
          ) : null}
        </div>
      }
      actions={
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            disabled={dismissMutation.isPending}
          >
            <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} data-icon="inline-start" />
            Not relevant
          </Button>
          <Button size="sm" onClick={onView}>
            View job
            <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} data-icon="inline-end" />
          </Button>
        </>
      }
    />
  );
}
