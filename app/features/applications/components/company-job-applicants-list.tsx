import { ArrowRight01Icon, UserGroupIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import type { getJobApplicants } from "@/features/applications/server/functions";
import { getOverallScore } from "@/features/reports/schemas";
import { cn } from "@/lib/utils";
import {
  type ApplicationStatus,
  applicationStatusMeta,
  getApplicationStatusLabel,
  type Recommendation,
  recommendationLabels,
  recommendationSchema,
} from "@/shared/enums";
import {
  CANDIDATE_SCORE_MAX,
  formatCandidateScore,
  formatCandidateScoreWithScale,
} from "@/shared/score";

const recommendationTextTone: Record<Recommendation, string> = {
  strong_yes: "text-success",
  yes: "text-info",
  lean_no: "text-warning",
  no: "text-destructive",
};

export function CompanyJobApplicantsList({
  applicants,
  emptyTitle,
  emptyDescription,
}: {
  applicants: Awaited<ReturnType<typeof getJobApplicants>>;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (applicants.length === 0) {
    return (
      <Empty className="rounded-2xl border-0 bg-muted/30">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} />
          </EmptyMedia>
          <EmptyTitle>{emptyTitle ?? "No applicants yet"}</EmptyTitle>
          <EmptyDescription>
            {emptyDescription ?? "Candidate submissions for this role will show up here."}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="divide-y divide-border/50 overflow-hidden rounded-3xl border border-border/60">
      {applicants.map((applicant) => (
        <ApplicantRow key={applicant.id} applicant={applicant} />
      ))}
    </div>
  );
}

function ApplicantRow({
  applicant,
}: {
  applicant: Awaited<ReturnType<typeof getJobApplicants>>[number];
}) {
  const score = getOverallScore(applicant.reportScores);
  const parsedRec = recommendationSchema.safeParse(applicant.reportRecommendation);
  const recommendation: Recommendation | null = parsedRec.success ? parsedRec.data : null;
  const isEvaluated = applicant.reportId !== null;
  const status = applicant.status as ApplicationStatus;
  const statusTone = applicationStatusMeta[status];
  const statusLabel = getApplicationStatusLabel(status, {
    preEvaluationScore: applicant.preEvaluationScore,
  });

  return (
    <Link
      to="/dashboard/applicants/$applicationId"
      params={{ applicationId: applicant.id }}
      className="group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/40 md:gap-4 md:px-5"
    >
      {isEvaluated && score != null ? (
        <div className="w-18 shrink-0 space-y-0.5">
          <p className="text-base font-semibold leading-none tabular-nums">
            <span>{formatCandidateScore(score)}</span>
            <span className="text-[10px] font-medium text-muted-foreground">
              /{CANDIDATE_SCORE_MAX}
            </span>
          </p>
          {recommendation ? (
            <p
              className={cn(
                "text-[11px] font-medium leading-tight",
                recommendationTextTone[recommendation],
              )}
            >
              {recommendationLabels[recommendation]}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="w-18 shrink-0">
          <Badge variant="outline" className={cn("text-[10px]", statusTone?.badge ?? "")}>
            {statusLabel}
          </Badge>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold group-hover:text-primary">
            {applicant.candidateName}
          </p>
          {isEvaluated ? (
            <Badge variant="outline" className={statusTone?.badge ?? ""}>
              {statusLabel}
            </Badge>
          ) : null}
          {applicant.status === "pre_screening" && applicant.preEvaluationScore != null ? (
            <Badge
              variant="outline"
              className="border-warning/20 bg-warning/10 text-[11px] text-warning"
            >
              Screened {formatCandidateScoreWithScale(applicant.preEvaluationScore)}
            </Badge>
          ) : null}
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{applicant.candidateEmail}</p>
      </div>

      <HugeiconsIcon
        icon={ArrowRight01Icon}
        strokeWidth={2}
        className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
      />
    </Link>
  );
}
