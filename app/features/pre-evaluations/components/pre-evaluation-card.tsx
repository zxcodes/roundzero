import { Alert02Icon, CheckmarkCircle02Icon, ShieldAlert } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

type PreEvaluation = {
  score: number;
  confidence: string;
  missingRequirements: string[];
  nextStep: string;
  consistencyScore: number | null;
};

const confidenceLabel: Record<string, string> = {
  low: "Low confidence",
  medium: "Medium confidence",
  high: "High confidence",
};

const nextStepLabel: Record<string, { label: string; tone: string }> = {
  interview_invited: {
    label: "Interview invited",
    tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  ask_followups: {
    label: "Quick evaluation",
    tone: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  },
  hold: { label: "On hold", tone: "bg-amber-500/10 text-amber-700 dark:text-amber-300" },
};

function ConsistencyBadge({ score }: { score: number | null }) {
  if (score === null) return null;
  if (score >= 80) {
    return (
      <Badge variant="outline" className="gap-1 text-[11px]">
        <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} className="size-3" />
        Consistent ({score}/100)
      </Badge>
    );
  }
  if (score >= 50) {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-amber-500/20 bg-amber-500/10 text-amber-700 text-[11px] dark:text-amber-300"
      >
        <HugeiconsIcon icon={ShieldAlert} strokeWidth={2} className="size-3" />
        Some gaps ({score}/100)
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="gap-1 border-rose-500/20 bg-rose-500/10 text-rose-700 text-[11px] dark:text-rose-300"
    >
      <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} className="size-3" />
      Low consistency ({score}/100)
    </Badge>
  );
}

export function PreEvaluationCard({ evaluation }: { evaluation: PreEvaluation }) {
  const nextStep = nextStepLabel[evaluation.nextStep] ?? nextStepLabel.hold;

  return (
    <Card className="border border-primary/10 bg-[radial-gradient(circle_at_top_left,var(--color-primary)/10,transparent_32%),var(--color-card)] shadow-lg shadow-primary/5">
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-primary">
              Zero pre-screening result
            </p>
            <h3 className="text-lg font-semibold tracking-tight">
              Profile score: {evaluation.score}/100
            </h3>
            <p className="text-sm leading-6 text-muted-foreground">
              Zero analyzed the resume against the job requirements.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={nextStep.tone}>{nextStep.label}</Badge>
            <Badge variant="outline">
              {confidenceLabel[evaluation.confidence] ?? evaluation.confidence}
            </Badge>
            <ConsistencyBadge score={evaluation.consistencyScore} />
          </div>
        </div>

        {evaluation.missingRequirements.length > 0 ? (
          <div className="rounded-3xl border border-border/70 bg-background/40 p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
              Gaps detected
            </p>
            <ul className="mt-3 space-y-2">
              {evaluation.missingRequirements.map((req) => (
                <li key={req} className="flex gap-2.5 text-sm leading-5 text-foreground">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
                    <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} className="size-3.5" />
                  </span>
                  <span>{req}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="rounded-3xl border border-border/70 bg-background/40 p-4">
            <div className="flex items-center gap-2 text-sm text-emerald-600">
              <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} className="size-4" />
              <span>All key requirements matched</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
