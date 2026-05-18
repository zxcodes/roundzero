import { RankingIcon, UserGroupIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link } from "@tanstack/react-router";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import {
  type ApplicationStatus,
  applicationStatusLabels,
  applicationStatusMeta,
  type Recommendation,
  recommendationBadgeTone,
  recommendationLabels,
  recommendationSchema,
} from "@/shared/enums";

export function CompanyJobApplicantsList({
  applicants,
}: {
  applicants: Awaited<ReturnType<typeof getJobApplicants>>;
}) {
  const evaluatedCount = applicants.filter((a) => a.reportId !== null).length;

  if (applicants.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} />
          </EmptyMedia>
          <EmptyTitle>No applicants yet</EmptyTitle>
          <EmptyDescription>
            Candidate submissions for this role will show up here.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="overflow-hidden rounded-4xl border border-border/60 bg-card shadow-sm ring-1 ring-foreground/5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 px-5 py-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-primary">
            Applicants
          </p>
          <h3 className="mt-1 text-base font-semibold">
            {applicants.length} candidate{applicants.length === 1 ? "" : "s"}
          </h3>
        </div>
        {evaluatedCount > 0 ? (
          <Badge variant="secondary" className="gap-1 font-mono text-[11px]">
            <HugeiconsIcon icon={RankingIcon} strokeWidth={2} className="size-3" />
            {evaluatedCount} evaluated
          </Badge>
        ) : null}
      </div>

      <div className="divide-y divide-border/50">
        {applicants.map((applicant) => {
          const score = getOverallScore(applicant.reportScores);
          const parsedRec = recommendationSchema.safeParse(applicant.reportRecommendation);
          const recommendation: Recommendation | null = parsedRec.success ? parsedRec.data : null;
          const isEvaluated = applicant.reportId !== null;
          const status = applicant.status as ApplicationStatus;
          const statusTone = applicationStatusMeta[status];

          return (
            <Link
              key={applicant.id}
              to="/dashboard/applicants/$applicationId"
              params={{ applicationId: applicant.id }}
              className="group grid gap-4 px-5 py-4 transition-colors hover:bg-muted/40 md:grid-cols-[auto_1fr_auto] md:items-center"
            >
              <div className="flex items-center gap-3">
                <Avatar className="size-10">
                  <AvatarImage
                    src={applicant.candidatePicture ?? undefined}
                    alt={applicant.candidateName}
                  />
                  <AvatarFallback className="text-[10px]">
                    {applicant.candidateName
                      .split(" ")
                      .map((p) => p[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
              </div>

              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-medium group-hover:text-primary">
                    {applicant.candidateName}
                  </span>
                  <Badge variant="outline" className={statusTone?.badge ?? ""}>
                    {applicationStatusLabels[status] ?? status}
                  </Badge>
                  {isEvaluated && recommendation ? (
                    <Badge variant="outline" className={recommendationBadgeTone[recommendation]}>
                      {recommendationLabels[recommendation]}
                    </Badge>
                  ) : null}
                  {applicant.status === "pre_screening" && applicant.preEvaluationScore != null ? (
                    <Badge
                      variant="outline"
                      className="border-warning/20 bg-warning/10 text-warning text-[11px]"
                    >
                      AI screened
                    </Badge>
                  ) : null}
                </div>
                <p className="truncate text-xs text-muted-foreground">{applicant.candidateEmail}</p>
              </div>

              <div className="flex items-center justify-between gap-4 md:justify-end">
                {score !== null ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Score</span>
                    <div className="flex size-10 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10">
                      <span className="font-mono text-sm font-semibold text-primary">
                        {Math.round(score)}
                      </span>
                    </div>
                  </div>
                ) : applicant.status === "pre_screening" && applicant.preEvaluationScore != null ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Pre-screen</span>
                    <div className="flex size-10 items-center justify-center rounded-2xl border border-warning/15 bg-warning/10">
                      <span className="font-mono text-sm font-semibold text-warning">
                        {applicant.preEvaluationScore}
                      </span>
                    </div>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">Pending evaluation</span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
