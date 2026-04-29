import {
  Alert02Icon,
  AnalyticsUpIcon,
  ArrowRight01Icon,
  BotIcon,
  BubbleChatIcon,
  Calendar01Icon,
  CheckmarkCircle02Icon,
  ClipboardIcon,
  FilesIcon,
  FilterEditIcon,
  FlagIcon,
  HelpCircleIcon,
  Message01Icon,
  RankingIcon,
  SparklesIcon,
  Target02Icon,
  TickDouble01Icon,
  type Time04Icon,
  UserCircleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyInterviewComponent } from "@/features/interviews/components/interview-chat";
import { InterviewTranscript } from "@/features/interviews/components/interview-transcript";
import { cn } from "@/lib/utils";

type Recommendation = "strong_yes" | "yes" | "lean_no" | "no";

type ReportScores = {
  communication: number;
  problemSolving: number;
  ownership: number;
  roleFit: number;
  overall: number;
};

type ScreeningConcern = "none" | "minor" | "dealbreaker";

type ScreeningAnswer = {
  question: string;
  answer: string | null;
  concern: ScreeningConcern;
  notes: string;
};

type ReportData = {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  insights: string[];
  evidence: string[];
  screeningAnswers: ScreeningAnswer[];
  recommendation: Recommendation;
  scores: ReportScores;
};

type TranscriptMessage = {
  role: "assistant" | "candidate";
  content: string;
  createdAt: string;
};

type CandidateSummary = {
  name: string;
  picture: string | null;
};

type RecommendationMeta = {
  label: string;
  badge: string;
  scoreRing: string;
  scoreText: string;
  accent: string;
};

const recommendationMeta: Record<Recommendation, RecommendationMeta> = {
  strong_yes: {
    label: "Strong yes",
    badge: "border-primary/20 bg-primary/5 text-foreground",
    scoreRing: "border-primary/20 bg-primary/5",
    scoreText: "text-foreground",
    accent: "bg-primary/60",
  },
  yes: {
    label: "Yes",
    badge: "border-border/70 bg-muted/30 text-foreground",
    scoreRing: "border-border/70 bg-muted/30",
    scoreText: "text-foreground",
    accent: "bg-muted-foreground/70",
  },
  lean_no: {
    label: "Lean no",
    badge: "border-border/70 bg-muted/30 text-foreground",
    scoreRing: "border-border/70 bg-muted/30",
    scoreText: "text-foreground",
    accent: "bg-muted-foreground/70",
  },
  no: {
    label: "No",
    badge: "border-border/70 bg-muted/30 text-foreground",
    scoreRing: "border-border/70 bg-muted/30",
    scoreText: "text-foreground",
    accent: "bg-muted-foreground/70",
  },
};

const dimensionMeta: Record<
  keyof Omit<ReportScores, "overall">,
  { label: string; icon: typeof Target02Icon }
> = {
  communication: { label: "Communication", icon: BubbleChatIcon },
  problemSolving: { label: "Problem solving", icon: AnalyticsUpIcon },
  ownership: { label: "Ownership", icon: RankingIcon },
  roleFit: { label: "Role fit", icon: Target02Icon },
};

const concernMeta: Record<
  ScreeningConcern,
  { label: string; badge: string; rowBorder: string; icon: typeof CheckmarkCircle02Icon }
> = {
  none: {
    label: "OK",
    badge: "border-border/70 bg-muted/20 text-foreground",
    rowBorder: "border-border/70",
    icon: CheckmarkCircle02Icon,
  },
  minor: {
    label: "Flag",
    badge: "border-border/70 bg-muted/20 text-foreground",
    rowBorder: "border-border/70",
    icon: HelpCircleIcon,
  },
  dealbreaker: {
    label: "Dealbreaker",
    badge: "border-border/70 bg-muted/20 text-foreground",
    rowBorder: "border-border/70",
    icon: Alert02Icon,
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseJsonb<T>(value: unknown): T | null {
  if (isRecord(value) || Array.isArray(value)) {
    return value as T;
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

function toScreeningConcern(value: unknown): ScreeningConcern {
  if (value === "none" || value === "minor" || value === "dealbreaker") {
    return value;
  }
  return "none";
}

function toScreeningAnswers(value: unknown): ScreeningAnswer[] {
  const parsed = parseJsonb<unknown[]>(value);
  if (!Array.isArray(parsed)) {
    return [];
  }

  const result: ScreeningAnswer[] = [];
  for (const item of parsed) {
    if (!isRecord(item)) {
      continue;
    }
    const question = typeof item.question === "string" ? item.question : "";
    if (!question) {
      continue;
    }
    const answer =
      typeof item.answer === "string" && item.answer.trim().length > 0 ? item.answer : null;
    result.push({
      question,
      answer,
      concern: toScreeningConcern(item.concern),
      notes: typeof item.notes === "string" ? item.notes : "",
    });
  }
  return result;
}

export function parseReportData(report: {
  summary: string;
  strengths: unknown;
  weaknesses: unknown;
  insights: unknown;
  evidence: unknown;
  screeningAnswers?: unknown;
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
    screeningAnswers: toScreeningAnswers(report.screeningAnswers),
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

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const monthLabels = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function toUtcDate(value: Date | string) {
  return typeof value === "string" ? new Date(value) : value;
}

const formatDateTime = (date: Date | string | null) => {
  if (!date) {
    return "Pending";
  }
  const value = toUtcDate(date);
  const month = monthLabels[value.getUTCMonth()];
  const day = value.getUTCDate();
  const year = value.getUTCFullYear();
  const hours = String(value.getUTCHours()).padStart(2, "0");
  const minutes = String(value.getUTCMinutes()).padStart(2, "0");
  return `${month} ${day}, ${year} · ${hours}:${minutes} UTC`;
};

const formatShortDate = (date: Date | string) => {
  const value = toUtcDate(date);
  const month = monthLabels[value.getUTCMonth()];
  const day = value.getUTCDate();
  return `${month} ${day}`;
};

/**
 * Compact post-interview report snapshot rendered on the applicant detail page.
 * Replaces the AI-looking summary card with a clearer hero block + a primary CTA
 * that's impossible to miss.
 */
export function ReportSnapshotCard({
  report,
  applicationId,
}: {
  report: ReportData;
  applicationId: string;
}) {
  const meta = recommendationMeta[report.recommendation];
  const overall = Math.round(report.scores.overall);

  return (
    <Card className="border-border/70 bg-card">
      <CardContent className="space-y-5 pt-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-muted/30">
              <HugeiconsIcon
                icon={SparklesIcon}
                strokeWidth={2}
                className="size-5 text-muted-foreground"
              />
            </div>
            <div className="space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                Post-interview evaluation
              </p>
              <h3 className="text-lg font-semibold tracking-tight">Zero finished evaluating</h3>
              <p className="text-sm text-muted-foreground">
                Recommendation, score breakdown and full transcript are ready.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex size-16 flex-col items-center justify-center rounded-2xl border-2",
                meta.scoreRing,
              )}
            >
              <span className={cn("font-mono text-xl font-semibold leading-none", meta.scoreText)}>
                {overall}
              </span>
              <span className="mt-0.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                /100
              </span>
            </div>
            <Badge variant="outline" className={cn("font-medium", meta.badge)}>
              {meta.label}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {(Object.keys(dimensionMeta) as Array<keyof typeof dimensionMeta>).map((key) => {
            const score = Math.round(report.scores[key]);
            const dim = dimensionMeta[key];
            return (
              <div key={key} className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5">
                <div className="flex items-center gap-1.5">
                  <HugeiconsIcon
                    icon={dim.icon}
                    strokeWidth={2}
                    className="size-3 text-muted-foreground"
                  />
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    {dim.label}
                  </p>
                </div>
                <p className="mt-1 font-mono text-lg font-semibold leading-none">{score}</p>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-background">
                  <div
                    className="h-full rounded-full bg-foreground"
                    style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
          <p className="line-clamp-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {report.summary}
          </p>
          <Button asChild size="default" className="shrink-0 shadow-sm">
            <Link to="/dashboard/applicant-reports/$applicationId" params={{ applicationId }}>
              View full report
              <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2.2} className="size-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

type TimelineNodeProps = {
  icon: typeof Time04Icon;
  iconClass?: string;
  dotClassName?: string;
  title: string;
  timestamp: Date | string | null;
  isLast?: boolean;
  children: ReactNode;
};

function TimelineNode({
  icon,
  iconClass,
  dotClassName,
  title,
  timestamp,
  isLast,
  children,
}: TimelineNodeProps) {
  return (
    <div className="relative flex gap-5">
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "z-10 flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-background bg-card shadow-sm ring-1 ring-border",
            dotClassName,
          )}
        >
          <HugeiconsIcon
            icon={icon}
            strokeWidth={2}
            className={cn("size-4", iconClass ?? "text-foreground")}
          />
        </div>
        {!isLast ? (
          <div className="-mt-1 w-px flex-1 bg-linear-to-b from-border via-border to-transparent" />
        ) : null}
      </div>

      <div className={cn("min-w-0 flex-1 pb-10", isLast && "pb-0")}>
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
          <h4 className="text-base font-semibold tracking-tight">{title}</h4>
          <span className="font-mono text-[11px] text-muted-foreground">
            {formatDateTime(timestamp)}
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}

function SignalSection({
  title,
  icon,
  iconToneClass,
  items,
  emptyText,
}: {
  title: string;
  icon: typeof Time04Icon;
  iconToneClass?: string;
  items: string[];
  emptyText: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5">
        <div className="flex size-7 items-center justify-center rounded-full border border-border/70 bg-muted/30">
          <HugeiconsIcon
            icon={icon}
            strokeWidth={2}
            className={cn("size-3.5 text-muted-foreground", iconToneClass)}
          />
        </div>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          {title}
        </p>
      </div>
      {items.length > 0 ? (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item}
              className="flex gap-3 rounded-2xl border border-border/60 bg-muted/15 px-4 py-3 text-sm leading-6 text-foreground"
            >
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-muted-foreground/60" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed border-border/50 px-3 py-2 text-xs text-muted-foreground">
          {emptyText}
        </p>
      )}
    </div>
  );
}

/**
 * Full report rendered as a vertical timeline. Replaces the old stack of
 * generic-looking cards on the applicant-reports page.
 */
export function ReportTimeline({
  report,
  preEvaluation,
  interview,
  messages,
  reportCreatedAt,
  application,
}: {
  report: ReportData;
  preEvaluation: {
    score: number;
    confidence: string;
    nextStep: string;
    missingRequirements: unknown;
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
  application: {
    candidateName: string;
    candidatePicture: string | null;
    jobTitle: string;
    createdAt: Date;
  };
}) {
  const meta = recommendationMeta[report.recommendation];
  const substantiveMessages = messages.filter((m) => !isGreetingOrFarewell(m.content));
  const overall = Math.round(report.scores.overall);

  const candidate: CandidateSummary = {
    name: application.candidateName,
    picture: application.candidatePicture,
  };

  const missingRequirements = Array.isArray(preEvaluation?.missingRequirements)
    ? (preEvaluation.missingRequirements.filter(
        (item) => typeof item === "string" && item.length > 0,
      ) as string[])
    : [];

  return (
    <div className="space-y-2">
      <TimelineNode
        icon={UserCircleIcon}
        iconClass="text-muted-foreground"
        dotClassName="ring-border bg-muted/30"
        title="Application submitted"
        timestamp={application.createdAt}
      >
        <Card size="sm" className="border-border/60">
          <CardContent className="flex flex-wrap items-center gap-3 py-0">
            <Avatar className="size-10">
              <AvatarImage src={candidate.picture ?? undefined} alt={candidate.name} />
              <AvatarFallback>{getInitials(candidate.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{candidate.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                Applied for <span className="font-medium">{application.jobTitle}</span>
              </p>
            </div>
            <Badge variant="outline" className="gap-1 font-mono text-[10px]">
              <HugeiconsIcon icon={Calendar01Icon} strokeWidth={2} className="size-3" />
              {formatShortDate(application.createdAt)}
            </Badge>
          </CardContent>
        </Card>
      </TimelineNode>

      <TimelineNode
        icon={FilesIcon}
        iconClass="text-muted-foreground"
        dotClassName="ring-border bg-muted/30"
        title="Pre-screening"
        timestamp={preEvaluation?.createdAt ?? null}
      >
        {preEvaluation ? (
          <Card size="sm" className="border-border/60">
            <CardContent className="space-y-3 py-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-12 items-center justify-center rounded-xl border border-border/60 bg-muted/30">
                    <span className="font-mono text-base font-semibold">{preEvaluation.score}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Profile match score</p>
                    <p className="text-xs text-muted-foreground">
                      Confidence:{" "}
                      <span className="font-medium text-foreground">
                        {preEvaluation.confidence}
                      </span>
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-[11px]">
                  Next: {preEvaluation.nextStep.replace(/_/g, " ")}
                </Badge>
              </div>
              {missingRequirements.length > 0 ? (
                <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    {missingRequirements.length} gap
                    {missingRequirements.length === 1 ? "" : "s"} detected
                  </p>
                  <ul className="mt-1.5 space-y-1">
                    {missingRequirements.map((req) => (
                      <li key={req} className="text-xs text-foreground">
                        • {req}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">All key requirements matched.</p>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card size="sm" className="border-dashed border-border/60">
            <CardContent className="py-0 text-xs text-muted-foreground">
              No pre-screening record found for this application.
            </CardContent>
          </Card>
        )}
      </TimelineNode>

      <TimelineNode
        icon={BubbleChatIcon}
        iconClass="text-muted-foreground"
        dotClassName="ring-border bg-muted/30"
        title="Interview"
        timestamp={
          interview ? (interview.completedAt ?? interview.startedAt ?? interview.createdAt) : null
        }
      >
        {interview ? (
          <Card size="sm" className="border-border/60">
            <CardContent className="space-y-3 py-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="text-[11px] capitalize">
                    {interview.type}
                  </Badge>
                  <Badge variant="outline" className="text-[11px] capitalize">
                    {interview.status.replace(/_/g, " ")}
                  </Badge>
                  <Badge variant="outline" className="gap-1 text-[11px]">
                    <HugeiconsIcon icon={Message01Icon} strokeWidth={2} className="size-3" />
                    {substantiveMessages.length} message
                    {substantiveMessages.length === 1 ? "" : "s"}
                  </Badge>
                </div>
                <TranscriptDialog messages={substantiveMessages} candidate={candidate} />
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card size="sm" className="border-dashed border-border/60">
            <CardContent className="py-0 text-xs text-muted-foreground">
              No interview record found for this application.
            </CardContent>
          </Card>
        )}
      </TimelineNode>

      <TimelineNode
        icon={SparklesIcon}
        iconClass={meta.scoreText}
        dotClassName={cn("ring-2", meta.scoreRing)}
        title="Evaluation"
        timestamp={reportCreatedAt}
      >
        <div className="space-y-4">
          <Card className="overflow-hidden border-border/70">
            <CardContent className="space-y-6 pt-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-xl space-y-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-8 items-center justify-center rounded-full border border-border/70 bg-muted/30">
                      <HugeiconsIcon
                        icon={SparklesIcon}
                        strokeWidth={2}
                        className="size-3.5 text-muted-foreground"
                      />
                    </div>
                    <Badge variant="outline" className={cn("font-medium", meta.badge)}>
                      {meta.label}
                    </Badge>
                  </div>
                  <p className="text-sm leading-6 text-foreground">{report.summary}</p>
                </div>
                <div
                  className={cn(
                    "flex size-20 shrink-0 flex-col items-center justify-center rounded-3xl border-2",
                    meta.scoreRing,
                  )}
                >
                  <span
                    className={cn("font-mono text-2xl font-semibold leading-none", meta.scoreText)}
                  >
                    {overall}
                  </span>
                  <span className="mt-1 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                    / 100
                  </span>
                </div>
              </div>

              <div className="space-y-3 rounded-3xl border border-border/60 bg-muted/20 p-5">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      "flex size-7 items-center justify-center rounded-full border border-border/70 bg-muted/30",
                      meta.accent,
                    )}
                  >
                    <HugeiconsIcon
                      icon={RankingIcon}
                      strokeWidth={2}
                      className="size-3.5 text-foreground"
                    />
                  </div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                    Dimension scores
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {(Object.keys(dimensionMeta) as Array<keyof typeof dimensionMeta>).map((key) => {
                    const score = Math.round(report.scores[key]);
                    const dim = dimensionMeta[key];
                    return (
                      <div key={key} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <HugeiconsIcon
                              icon={dim.icon}
                              strokeWidth={2}
                              className="size-3.5 text-muted-foreground"
                            />
                            <span className="text-xs font-medium">{dim.label}</span>
                          </div>
                          <span className="font-mono text-xs text-muted-foreground">
                            {score}/100
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-background">
                          <div
                            className="h-full rounded-full bg-foreground"
                            style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <SignalSection
                  title="Strengths"
                  icon={CheckmarkCircle02Icon}
                  items={report.strengths}
                  emptyText="No strengths captured."
                />
                <SignalSection
                  title="Weaknesses"
                  icon={FlagIcon}
                  items={report.weaknesses}
                  emptyText="No weaknesses captured."
                />
                <SignalSection
                  title="Insights"
                  icon={FilterEditIcon}
                  items={report.insights}
                  emptyText="No insights captured."
                />
                <SignalSection
                  title="Evidence"
                  icon={TickDouble01Icon}
                  items={report.evidence}
                  emptyText="No evidence captured."
                />
              </div>
            </CardContent>
          </Card>

          {report.screeningAnswers.length > 0 ? (
            <Card className="border-border/60">
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <HugeiconsIcon
                    icon={ClipboardIcon}
                    strokeWidth={2}
                    className="size-4 text-muted-foreground"
                  />
                  <div>
                    <p className="text-sm font-semibold">Screening question answers</p>
                    <p className="text-xs text-muted-foreground">
                      How the candidate responded to the questions you required.
                    </p>
                  </div>
                </div>
                <ul className="space-y-2.5">
                  {report.screeningAnswers.map((entry) => {
                    const cm = concernMeta[entry.concern];
                    return (
                      <li
                        key={entry.question}
                        className={cn("rounded-xl border bg-background/50 p-4", cm.rowBorder)}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <p className="max-w-xl text-sm font-medium leading-6 text-foreground">
                            {entry.question}
                          </p>
                          <Badge variant="outline" className={cn("gap-1.5", cm.badge)}>
                            <HugeiconsIcon icon={cm.icon} strokeWidth={2} className="size-3.5" />
                            {cm.label}
                          </Badge>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-foreground">
                          {entry.answer ?? (
                            <span className="text-muted-foreground italic">
                              Not asked or candidate did not answer.
                            </span>
                          )}
                        </p>
                        {entry.notes ? (
                          <p className="mt-2 rounded-md border-l-2 border-border bg-muted/30 px-2.5 py-1.5 text-xs leading-5 text-muted-foreground">
                            {entry.notes}
                          </p>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </TimelineNode>

      <TimelineNode
        icon={CheckmarkCircle02Icon}
        iconClass="text-foreground"
        dotClassName="ring-border bg-muted/30"
        title="Report saved"
        timestamp={reportCreatedAt}
        isLast
      >
        <p className="text-xs text-muted-foreground">
          The persisted post-evaluation report is locked in. Move the application forward from the
          applicant page.
        </p>
      </TimelineNode>
    </div>
  );
}

function TranscriptDialog({
  messages,
  candidate,
}: {
  messages: TranscriptMessage[];
  candidate: CandidateSummary;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5 rounded-full px-4">
          <HugeiconsIcon icon={BubbleChatIcon} strokeWidth={2} className="size-4" />
          View transcript
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[88vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="space-y-4 border-b border-border/70 bg-card px-6 py-5">
          <div className="flex items-start gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-muted/30">
              <HugeiconsIcon
                icon={BotIcon}
                strokeWidth={2}
                className="size-4 text-muted-foreground"
              />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="space-y-1">
                <DialogTitle className="text-lg tracking-tight">Interview transcript</DialogTitle>
                <DialogDescription className="text-sm">
                  Full conversation between Zero and {candidate.name}
                </DialogDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="rounded-full border border-border/70 bg-muted/20 px-3 py-1 font-mono text-[11px] text-muted-foreground">
                  {messages.length} message{messages.length === 1 ? "" : "s"}
                </div>
                <div className="rounded-full border border-border/70 bg-muted/20 px-3 py-1 font-mono text-[11px] text-muted-foreground">
                  Candidate: {candidate.name}
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="border-t border-border/60 bg-muted/20 min-h-72 flex h-full justify-center items-center">
          {!messages.length ? (
            <EmptyInterviewComponent
              description="The interview finished without any persisted conversation history."
              title="No transcript messages available."
            />
          ) : (
            <ScrollArea className="h-[68vh] max-h-[68vh]">
              <InterviewTranscript
                messages={messages.map((message, index) => ({
                  id: `${message.createdAt}-${index}`,
                  role: message.role,
                  content: message.content,
                }))}
                userLabel={candidate.name}
              />
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
