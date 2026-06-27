import {
  Alert02Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  CheckmarkCircle02Icon,
  HelpCircleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ReportData } from "@/features/reports/schemas";
import { cn } from "@/lib/utils";
import { type Recommendation, recommendationBadgeTone } from "@/shared/enums";
import { candidateScoreProgressPercent, formatCandidateScore } from "@/shared/score";

export const verdictBandTone: Record<Recommendation, string> = {
  strong_yes: "bg-success/10",
  yes: "bg-info/10",
  lean_no: "bg-warning/10",
  no: "bg-danger/10",
};

export const reportDimensionLabels: Record<keyof Omit<ReportData["scores"], "overall">, string> = {
  communication: "Communication",
  problemSolving: "Problem solving",
  ownership: "Ownership",
  roleFit: "Role fit",
};

export const reportScreeningConcernMeta: Record<
  ReportData["screeningAnswers"][number]["concern"],
  { label: string; tone: string; icon: typeof CheckmarkCircle02Icon }
> = {
  none: {
    label: "OK",
    tone: "border-success/20 bg-success/10 text-success",
    icon: CheckmarkCircle02Icon,
  },
  minor: {
    label: "Flag",
    tone: "border-warning/20 bg-warning/10 text-warning",
    icon: HelpCircleIcon,
  },
  dealbreaker: {
    label: "Dealbreaker",
    tone: "border-danger/20 bg-danger/10 text-danger",
    icon: Alert02Icon,
  },
};

export type ReportBatchNavigation = {
  batchId: string;
  position: number;
  total: number;
  previousApplicationId: string | null;
  nextApplicationId: string | null;
};

export function getReportInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function ReportActionsRow({
  applicationId,
  batchNavigation,
  linkTarget,
}: {
  applicationId: string;
  batchNavigation: ReportBatchNavigation | null;
  linkTarget: "summary" | "full" | null;
}) {
  if (!batchNavigation && linkTarget === null) {
    return null;
  }

  const reportTo =
    linkTarget === "full"
      ? "/dashboard/applicant-reports/$applicationId/full"
      : "/dashboard/applicant-reports/$applicationId";

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 border-b border-border/30 pb-4",
        batchNavigation ? "justify-between" : "justify-end",
      )}
    >
      {batchNavigation ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            asChild={batchNavigation.previousApplicationId !== null}
            disabled={batchNavigation.previousApplicationId === null}
          >
            {batchNavigation.previousApplicationId ? (
              <Link to={reportTo} params={{ applicationId: batchNavigation.previousApplicationId }}>
                <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-4" />
                Previous
              </Link>
            ) : (
              <>
                <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-4" />
                Previous
              </>
            )}
          </Button>
          <span className="text-[11px] text-muted-foreground">
            #{batchNavigation.position} of {batchNavigation.total} in batch
          </span>
          <Button
            variant="outline"
            size="sm"
            asChild={batchNavigation.nextApplicationId !== null}
            disabled={batchNavigation.nextApplicationId === null}
          >
            {batchNavigation.nextApplicationId ? (
              <Link to={reportTo} params={{ applicationId: batchNavigation.nextApplicationId }}>
                Next
                <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-4" />
              </Link>
            ) : (
              <>
                Next
                <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-4" />
              </>
            )}
          </Button>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        {batchNavigation ? (
          <Button asChild variant="outline" size="sm">
            <Link
              to="/dashboard/job-batches/$batchId"
              params={{ batchId: batchNavigation.batchId }}
            >
              Batch
            </Link>
          </Button>
        ) : null}
        {linkTarget === "full" ? (
          <Button asChild variant="outline" size="sm">
            <Link to="/dashboard/applicant-reports/$applicationId/full" params={{ applicationId }}>
              Full audit
            </Link>
          </Button>
        ) : null}
        {linkTarget === "summary" ? (
          <Button asChild variant="outline" size="sm">
            <Link to="/dashboard/applicant-reports/$applicationId" params={{ applicationId }}>
              Report summary
            </Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export function DimensionStatChip({
  label,
  score,
  toneClass,
}: {
  label: string;
  score: number;
  toneClass?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex min-w-0 items-center gap-2 rounded-full border border-border/50 bg-background/50 px-3 py-1.5",
        toneClass,
      )}
    >
      <span className="truncate text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-semibold tabular-nums text-foreground">
        {formatCandidateScore(score)}
      </span>
      <div className="h-1 w-10 overflow-hidden rounded-full bg-muted/80">
        <div
          className="h-full rounded-full bg-current opacity-70"
          style={{ width: `${candidateScoreProgressPercent(score)}%` }}
        />
      </div>
    </div>
  );
}

export function SignalColumn({
  title,
  washClass,
  dotClass,
  items,
  emptyText,
  compact = false,
}: {
  title: string;
  washClass: string;
  dotClass: string;
  items: string[];
  emptyText: string;
  compact?: boolean;
}) {
  return (
    <div className={cn(compact ? "px-4 py-4" : "px-5 py-5 md:px-6", washClass)}>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      {items.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((item, index) => (
            <li key={index} className="flex gap-2.5 text-sm leading-6 text-foreground">
              <span className={cn("mt-2.5 size-1.5 shrink-0 rounded-full", dotClass)} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function TimelineStepPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border border-border/50 bg-muted/15 px-4 py-3", className)}>
      {children}
    </div>
  );
}

export function TimelineStepEmpty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border/50 bg-muted/10 px-4 py-3 text-xs text-muted-foreground">
      {children}
    </div>
  );
}

export function ReportEvaluationBrief({
  report,
  compact = false,
}: {
  report: ReportData;
  compact?: boolean;
}) {
  const verdictTone = verdictBandTone[report.recommendation];
  const scoreTone = recommendationBadgeTone[report.recommendation];
  const pad = compact ? "px-4" : "px-5 md:px-6";

  return (
    <div className="overflow-hidden rounded-lg border border-border/60">
      <section className={verdictTone}>
        <div className={cn(pad, "py-4")}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Verdict
          </p>
          <p className="mt-2 text-sm leading-7 text-foreground">{report.summary}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(Object.keys(reportDimensionLabels) as Array<keyof typeof reportDimensionLabels>).map(
              (key) => (
                <DimensionStatChip
                  key={key}
                  label={reportDimensionLabels[key]}
                  score={report.scores[key]}
                  toneClass={scoreTone}
                />
              ),
            )}
          </div>
        </div>

        <div className="grid border-t border-border/30 lg:grid-cols-2">
          <SignalColumn
            title="Strengths"
            washClass="bg-success/5 lg:border-r lg:border-border/30"
            dotClass="bg-success"
            items={report.strengths}
            emptyText="No strengths captured."
            compact={compact}
          />
          <SignalColumn
            title="Gaps"
            washClass="bg-warning/5"
            dotClass="bg-warning"
            items={report.weaknesses}
            emptyText="No gaps captured."
            compact={compact}
          />
        </div>

        {report.evidence.length > 0 ? (
          <div className={cn("border-t border-border/30 py-4", pad)}>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              From the interview
            </p>
            <ul className="mt-3 space-y-3">
              {report.evidence.map((item, index) => (
                <li
                  key={index}
                  className="border-l-2 border-border/80 pl-3 text-sm leading-6 text-foreground"
                >
                  &ldquo;{item}&rdquo;
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {report.insights.length > 0 ? (
          <div className={cn("border-t border-border/30 py-4", pad)}>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Notes
            </p>
            <ul className="mt-2 space-y-1.5">
              {report.insights.map((item, index) => (
                <li key={index} className="text-sm leading-6 text-foreground">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {report.screeningAnswers.length > 0 ? (
          <div className={cn("border-t border-border/30 py-4", pad)}>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Screening responses
            </p>
            <ul className="mt-3 divide-y divide-border/40">
              {report.screeningAnswers.map((entry) => {
                const cm = reportScreeningConcernMeta[entry.concern];
                return (
                  <li key={entry.question} className="space-y-1.5 py-3 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <p className="max-w-xl text-sm font-medium leading-6">{entry.question}</p>
                      <Badge variant="outline" className={cn("gap-1", cm.tone)}>
                        <HugeiconsIcon icon={cm.icon} strokeWidth={2} className="size-3" />
                        {cm.label}
                      </Badge>
                    </div>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {entry.answer ?? (
                        <span className="italic">Not asked or candidate did not answer.</span>
                      )}
                    </p>
                    {entry.notes ? (
                      <p className="border-l-2 border-border/80 pl-3 text-xs leading-5 text-muted-foreground">
                        {entry.notes}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </section>
    </div>
  );
}
