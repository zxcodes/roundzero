import {
  CheckmarkCircle02Icon,
  Message01Icon,
  RankingIcon,
  Time04Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

type Recommendation = "strong_yes" | "yes" | "lean_no" | "no";

type ReportScores = {
  communication: number;
  problemSolving: number;
  ownership: number;
  roleFit: number;
  overall: number;
};

export type ReportData = {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  insights: string[];
  evidence: string[];
  recommendation: Recommendation;
  scores: ReportScores;
};

export type TranscriptMessage = {
  role: "assistant" | "candidate";
  content: string;
  createdAt: string;
};

const recommendationMeta: Record<Recommendation, { label: string; className: string }> = {
  strong_yes: {
    label: "Strong yes",
    className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  yes: {
    label: "Yes",
    className: "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  },
  lean_no: {
    label: "Lean no",
    className: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  no: {
    label: "No",
    className: "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  },
};

const dimensionLabels: Record<keyof Omit<ReportScores, "overall">, string> = {
  communication: "Communication",
  problemSolving: "Problem solving",
  ownership: "Ownership",
  roleFit: "Role fit",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseJsonb<T>(value: unknown): T | null {
  if (isRecord(value) || Array.isArray(value)) {
    return value as T;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (isRecord(parsed) || Array.isArray(parsed)) {
        return parsed as T;
      }
    } catch {
      return null;
    }
  }

  return null;
}

function toStringArray(value: unknown): string[] {
  const parsed = parseJsonb<unknown[]>(value);
  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.filter((item): item is string => typeof item === "string" && item.length > 0);
}

function toFiniteScore(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function toRecommendation(value: unknown): Recommendation {
  if (value === "strong_yes" || value === "yes" || value === "lean_no" || value === "no") {
    return value;
  }

  return "lean_no";
}

export function parseReportData(report: {
  summary: string;
  strengths: unknown;
  weaknesses: unknown;
  insights: unknown;
  evidence: unknown;
  recommendation: string;
  scores: unknown;
}): ReportData {
  const scoresRecord = parseJsonb<Record<string, unknown>>(report.scores);
  const scores = scoresRecord ?? {};

  return {
    summary: report.summary,
    strengths: toStringArray(report.strengths),
    weaknesses: toStringArray(report.weaknesses),
    insights: toStringArray(report.insights),
    evidence: toStringArray(report.evidence),
    recommendation: toRecommendation(report.recommendation),
    scores: {
      communication: toFiniteScore(scores.communication),
      problemSolving: toFiniteScore(scores.problemSolving),
      ownership: toFiniteScore(scores.ownership),
      roleFit: toFiniteScore(scores.roleFit),
      overall: toFiniteScore(scores.overall),
    },
  };
}

export function ReportSummaryCard({ report }: { report: ReportData }) {
  const meta = recommendationMeta[report.recommendation];

  return (
    <Card className="border border-primary/10 bg-[radial-gradient(circle_at_top_right,var(--color-primary)/10,transparent_34%),var(--color-card)] shadow-lg shadow-primary/5">
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-primary">
              Post-interview report
            </p>
            <h3 className="text-xl font-semibold tracking-tight">Evaluation summary</h3>
            <p className="text-sm leading-6 text-muted-foreground">{report.summary}</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className={meta.className}>
              {meta.label}
            </Badge>
            <div className="flex size-16 items-center justify-center rounded-3xl border border-primary/15 bg-primary/10">
              <span className="font-mono text-xl font-semibold text-primary">
                {Math.round(report.scores.overall)}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-border/70 bg-background/40 p-4">
          <div className="mb-3 flex items-center gap-2">
            <HugeiconsIcon icon={RankingIcon} strokeWidth={2} className="size-4 text-primary" />
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
              Dimension scores
            </p>
          </div>
          <div className="space-y-3">
            {(Object.keys(dimensionLabels) as Array<keyof typeof dimensionLabels>).map((key) => {
              const score = report.scores[key];
              return (
                <div key={key} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium">{dimensionLabels[key]}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {Math.round(score)}/100
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-linear-to-r from-primary to-emerald-400"
                      style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ReportInsightsCard({ report }: { report: ReportData }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <SignalList title="Strengths" items={report.strengths} emptyText="No strengths captured." />
      <SignalList
        title="Weaknesses"
        items={report.weaknesses}
        emptyText="No weaknesses captured."
      />
      <SignalList title="Insights" items={report.insights} emptyText="No insights captured." />
      <SignalList title="Evidence" items={report.evidence} emptyText="No evidence captured." />
    </div>
  );
}

const isGreetingOrFarewell = (content: string) => {
  const lower = content.toLowerCase().trim();
  const greetings = [
    "hi, i am zero",
    "hi, i'm zero",
    "thanks for joining",
    "your interview responses are captured",
    "zero is compiling your evaluation",
    "i will ask focused questions",
    "we will run a focused interview",
    "in 2-3 questions, i will quickly evaluate",
  ];
  return greetings.some((phrase) => lower.includes(phrase));
};

export function ReportTimelineCard({
  preEvaluation,
  interview,
  messages,
  reportCreatedAt,
}: {
  preEvaluation: {
    score: number;
    confidence: string;
    nextStep: string;
    createdAt: Date;
  } | null;
  interview: {
    type: string;
    status: string;
    startedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
  } | null;
  messages: TranscriptMessage[];
  reportCreatedAt: Date;
}) {
  const substantiveMessages = messages.filter((m) => !isGreetingOrFarewell(m.content));

  return (
    <Card>
      <CardContent className="space-y-6">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-primary">Timeline</p>
          <h3 className="mt-1 text-xl font-semibold tracking-tight">
            Pre-screening to interview to post-evaluation
          </h3>
        </div>

        <TimelineRow
          title="Pre-screening completed"
          description={
            preEvaluation
              ? `Score ${preEvaluation.score}/100, confidence ${preEvaluation.confidence}, next step ${preEvaluation.nextStep}.`
              : "No pre-screening record found for this application."
          }
          timestamp={preEvaluation ? preEvaluation.createdAt : null}
        />

        <TimelineRow
          title="Interview session"
          description={
            interview
              ? `Type ${interview.type}, status ${interview.status}.`
              : "No interview record found for this application."
          }
          timestamp={
            interview ? (interview.completedAt ?? interview.startedAt ?? interview.createdAt) : null
          }
        />

        <Card className="border-border/70">
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={Message01Icon} strokeWidth={2} className="size-4 text-primary" />
              <p className="text-sm font-medium">
                Interview messages ({substantiveMessages.length})
              </p>
            </div>
            <div className="max-h-72 space-y-2 overflow-y-auto rounded-xl border border-border/70 bg-muted/20 p-3">
              {substantiveMessages.length > 0 ? (
                substantiveMessages.map((message, index) => (
                  <div
                    key={`${message.createdAt}-${index}`}
                    className="rounded-lg border border-border/60 bg-background p-2.5"
                  >
                    <p className="text-[11px] font-mono uppercase text-muted-foreground">
                      {message.role} · {new Date(message.createdAt).toLocaleString()}
                    </p>
                    <p className="mt-1 text-sm text-foreground">{message.content}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No transcript messages available.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <TimelineRow
          title="Post-evaluation report generated"
          description="Report persisted with score breakdown and recommendation."
          timestamp={reportCreatedAt}
        />
      </CardContent>
    </Card>
  );
}

function SignalList({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: string[];
  emptyText: string;
}) {
  return (
    <Card className="border-border/70 bg-background/40">
      <CardContent className="space-y-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
          {title}
        </p>
        {items.length > 0 ? (
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item} className="flex gap-2.5 text-sm leading-6 text-foreground">
                <span className="mt-1 text-primary">
                  <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} className="size-4" />
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        )}
      </CardContent>
    </Card>
  );
}

function TimelineRow({
  title,
  description,
  timestamp,
}: {
  title: string;
  description: string;
  timestamp: Date | null;
}) {
  return (
    <div className="rounded-3xl border border-border/70 bg-background/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={Time04Icon} strokeWidth={2} className="size-4 text-primary" />
          <p className="text-sm font-medium">{title}</p>
        </div>
        <Badge variant="outline" className="gap-1 font-mono text-[11px]">
          <HugeiconsIcon icon={Time04Icon} strokeWidth={2} className="size-3" />
          {timestamp ? timestamp.toLocaleString() : "Pending"}
        </Badge>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
