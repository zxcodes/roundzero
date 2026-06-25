import { ArrowRight01Icon, RankingIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRouter } from "@tanstack/react-router";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import type { getAwaitingReviewReports } from "@/features/dashboard/server/functions";
import { ScorePill } from "@/features/reports/components/score-pill";

type AwaitingReviewCandidate = Awaited<ReturnType<typeof getAwaitingReviewReports>>[number];

type AwaitingReviewGroup = {
  jobId: string;
  jobTitle: string;
  candidates: AwaitingReviewCandidate[];
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
    <div className="space-y-3">
      {groups.map((group) => (
        <Accordion key={group.jobId} type="multiple">
          <AccordionItem value={group.jobId}>
            <AccordionTrigger className="px-5 py-4 text-left hover:no-underline md:px-6">
              <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-3 pr-3">
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-semibold tracking-tight">
                    {group.jobTitle}
                  </h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {group.candidates.length} candidate
                    {group.candidates.length === 1 ? "" : "s"} awaiting review
                  </p>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  {group.candidates.length}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-5 pb-5 md:px-6">
              <div className="divide-y divide-border/50 rounded-3xl border border-border/60">
                {group.candidates.map((candidate) => (
                  <AwaitingReviewRow key={candidate.applicationId} candidate={candidate} />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      ))}
    </div>
  );
}

function AwaitingReviewRow({ candidate }: { candidate: AwaitingReviewCandidate }) {
  const router = useRouter();
  const highlight = candidate.strengths[0] ?? candidate.topConcern;

  const onOpenReport = () => {
    router.navigate({
      to: "/dashboard/applicant-reports/$applicationId",
      params: { applicationId: candidate.applicationId },
    });
  };

  return (
    <div className="px-4 py-4 md:px-5">
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{candidate.candidateName}</p>
          {highlight ? (
            <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{highlight}</p>
          ) : null}
        </div>

        <ScorePill
          score={candidate.overallScore}
          recommendation={candidate.recommendation}
          size="sm"
          className="md:ml-auto"
        />

        <Button size="sm" onClick={onOpenReport} className="w-full md:w-auto">
          Open report
          <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-3.5" />
        </Button>
      </div>
    </div>
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
