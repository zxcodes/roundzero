import {
  ArrowRight01Icon,
  Briefcase01Icon,
  Cancel01Icon,
  Loading03Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { formatRelativeTime } from "@/shared/date";

import type { MatchBand } from "../config";
import {
  dismissMyCandidateMatch,
  type getMyCandidateMatches,
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

export function CandidateMatchFeed({ data }: { data: MatchFeed | null }) {
  const router = useRouter();
  const refreshFn = useServerFn(refreshMyCandidateMatches);
  const refreshMutation = useMutation({
    mutationFn: refreshFn,
    onSuccess: async () => {
      toast.success("Refreshing your matches");
      await router.invalidate();
    },
    onError: () => toast.error("Could not refresh matches."),
  });

  const onRefresh = () => refreshMutation.mutate({});

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

  if (!data.refreshedAt && data.status !== "failed") {
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
          disabled={refreshMutation.isPending}
        >
          <HugeiconsIcon
            icon={Loading03Icon}
            strokeWidth={2}
            data-icon="inline-start"
            className={refreshMutation.isPending ? "animate-spin" : undefined}
          />
          Refresh
        </Button>
      </div>
      {data.items.length === 0 ? (
        <Empty className="rounded-3xl border border-border/60">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <HugeiconsIcon icon={Briefcase01Icon} strokeWidth={2} />
            </EmptyMedia>
            <EmptyTitle>No personalized matches yet</EmptyTitle>
            <EmptyDescription>
              We’ll keep checking as new roles are published. All jobs is always available.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.items.map((match) => (
            <CandidateMatchCard key={match.jobId} match={match} />
          ))}
        </div>
      )}
    </div>
  );
}

function CandidateMatchCard({ match }: { match: MatchItem }) {
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

  const onView = async () => {
    await viewMutation.mutateAsync({ data: { jobId: match.jobId } });
    await navigate({ to: "/jobs/$jobId", params: { jobId: match.jobId } });
  };
  const onDismiss = () => dismissMutation.mutate({ data: { jobId: match.jobId } });
  const band = match.band as MatchBand;

  return (
    <Card variant="bordered" size="sm">
      <CardHeader className="pt-4">
        <CardTitle>{match.title}</CardTitle>
        <p className="text-sm text-muted-foreground">{match.companyName}</p>
        <CardAction>
          <Badge variant={band === "strong" ? "default" : "secondary"}>
            {bandLabel[band] ?? "Potential match"}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 py-4">
        {match.reasons.length > 0 ? (
          <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm">
            {match.reasons.map((reason) => (
              <li key={`${reason.candidateFactId}:${reason.jobFactId}`}>{reason.text}</li>
            ))}
          </ul>
        ) : null}
        {match.reasons.length < 2 ? (
          <p className="text-sm text-muted-foreground">
            Limited positive evidence in your resume—review the role details before deciding.
          </p>
        ) : null}
        {match.consideration ? (
          <p className="text-xs text-muted-foreground">{match.consideration}</p>
        ) : null}
      </CardContent>
      <CardFooter className="justify-between border-t py-4">
        <Button variant="ghost" size="sm" onClick={onDismiss} disabled={dismissMutation.isPending}>
          <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} data-icon="inline-start" />
          Not relevant
        </Button>
        <Button size="sm" onClick={onView} disabled={viewMutation.isPending}>
          View job
          <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} data-icon="inline-end" />
        </Button>
      </CardFooter>
    </Card>
  );
}
