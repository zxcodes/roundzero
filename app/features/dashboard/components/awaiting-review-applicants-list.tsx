import { ArrowRight01Icon, RankingIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link } from "@tanstack/react-router";
import { RoleAccordionPanel } from "@/components/role-accordion-panel";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import type { getAwaitingReviewReports } from "@/features/dashboard/server/functions";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/shared/date";
import { type Recommendation, recommendationLabels } from "@/shared/enums";
import { CANDIDATE_SCORE_MAX, formatCandidateScore } from "@/shared/score";

type AwaitingReviewCandidate = Awaited<ReturnType<typeof getAwaitingReviewReports>>[number];

type AwaitingReviewGroup = {
  jobId: string;
  jobTitle: string;
  candidates: AwaitingReviewCandidate[];
};

const recommendationTextTone: Record<Recommendation, string> = {
  strong_yes: "text-success",
  yes: "text-info",
  lean_no: "text-warning",
  no: "text-destructive",
};

export function AwaitingReviewApplicantsList({
  candidates,
}: {
  candidates: Awaited<ReturnType<typeof getAwaitingReviewReports>>;
}) {
  if (candidates.length === 0) {
    return (
      <Empty className="rounded-2xl border-0 bg-muted/30">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <HugeiconsIcon icon={RankingIcon} strokeWidth={2} />
          </EmptyMedia>
          <EmptyTitle>No candidates awaiting review</EmptyTitle>
          <EmptyDescription>
            Released reports waiting for a shortlist or reject decision will show up here.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const groups = buildAwaitingReviewGroups(candidates);

  return (
    <div className="flex flex-col gap-3">
      {groups.map((group) => (
        <RoleAccordionPanel
          key={group.jobId}
          jobId={group.jobId}
          jobTitle={group.jobTitle}
          count={group.candidates.length}
          countLabel={`candidate${group.candidates.length === 1 ? "" : "s"} awaiting review`}
        >
          {group.candidates.map((candidate, index) => (
            <AwaitingReviewRow
              key={candidate.applicationId}
              candidate={candidate}
              rank={index + 1}
            />
          ))}
        </RoleAccordionPanel>
      ))}
    </div>
  );
}

function AwaitingReviewRow({
  candidate,
  rank,
}: {
  candidate: AwaitingReviewCandidate;
  rank: number;
}) {
  return (
    <Link
      to="/dashboard/applicant-reports/$applicationId"
      params={{ applicationId: candidate.applicationId }}
      className="group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/40 md:gap-4 md:px-5"
    >
      <span className="w-6 shrink-0 text-xs text-muted-foreground">#{rank}</span>

      <div className="w-18 shrink-0 space-y-0.5">
        <p className="text-base font-semibold leading-none tabular-nums">
          <span>{formatCandidateScore(candidate.overallScore)}</span>
          <span className="text-[10px] font-medium text-muted-foreground">
            /{CANDIDATE_SCORE_MAX}
          </span>
        </p>
        <p
          className={cn(
            "text-[11px] font-medium leading-tight",
            recommendationTextTone[candidate.recommendation],
          )}
        >
          {recommendationLabels[candidate.recommendation]}
        </p>
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold group-hover:text-primary">
          {candidate.candidateName}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Released {formatRelativeTime(candidate.releasedAt)}
        </p>
      </div>

      <HugeiconsIcon
        icon={ArrowRight01Icon}
        strokeWidth={2}
        className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
      />
    </Link>
  );
}

function buildAwaitingReviewGroups(candidates: AwaitingReviewCandidate[]): AwaitingReviewGroup[] {
  const map = new Map<string, AwaitingReviewGroup>();

  for (const candidate of candidates) {
    const existing = map.get(candidate.jobId);
    if (existing) {
      existing.candidates.push(candidate);
      continue;
    }
    map.set(candidate.jobId, {
      jobId: candidate.jobId,
      jobTitle: candidate.jobTitle,
      candidates: [candidate],
    });
  }

  return Array.from(map.values())
    .map((group) => ({
      ...group,
      candidates: [...group.candidates].sort((a, b) => b.overallScore - a.overallScore),
    }))
    .sort((a, b) => {
      const aTop = a.candidates[0]?.overallScore ?? 0;
      const bTop = b.candidates[0]?.overallScore ?? 0;
      if (bTop !== aTop) {
        return bTop - aTop;
      }
      return a.jobTitle.localeCompare(b.jobTitle);
    });
}
