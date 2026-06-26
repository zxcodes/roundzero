import { cn } from "@/lib/utils";
import { type Recommendation, recommendationBadgeTone, recommendationLabels } from "@/shared/enums";
import { CANDIDATE_SCORE_MAX, formatCandidateScore } from "@/shared/score";

/**
 * Unified score + recommendation pill. Used wherever we display an evaluation
 * outcome so the score number and the verbal recommendation read as a single
 * tinted entity instead of two unrelated badges.
 */
export function ScorePill({
  score,
  recommendation,
  size = "default",
  className,
}: {
  score: number | null;
  recommendation: Recommendation | null;
  size?: "sm" | "default" | "lg";
  className?: string;
}) {
  const tone =
    recommendation !== null
      ? recommendationBadgeTone[recommendation]
      : "border-border bg-muted/30 text-foreground";

  const sizeClass = {
    sm: "h-6 gap-1.5 px-2 text-[11px]",
    default: "h-8 gap-2 px-2.5 text-xs",
    lg: "h-14 gap-3 px-5 text-sm",
  }[size];

  const scoreSizeClass = {
    sm: "text-xs",
    default: "text-sm",
    lg: "text-2xl",
  }[size];

  const slashSizeClass = {
    sm: "text-[8px]",
    default: "text-[9px]",
    lg: "text-[10px]",
  }[size];

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border font-medium leading-none",
        tone,
        sizeClass,
        className,
      )}
    >
      <span className="flex items-baseline gap-0.5 font-mono font-semibold tabular-nums">
        <span className={scoreSizeClass}>{formatCandidateScore(score)}</span>
        <span className={cn("font-medium opacity-60", slashSizeClass)}>/{CANDIDATE_SCORE_MAX}</span>
      </span>
      {recommendation ? (
        <>
          <span aria-hidden className="size-1 shrink-0 rounded-full bg-current opacity-40" />
          <span>{recommendationLabels[recommendation]}</span>
        </>
      ) : null}
    </div>
  );
}
