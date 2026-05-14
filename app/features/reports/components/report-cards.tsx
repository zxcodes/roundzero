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
  Mic01Icon,
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
import type { ReportData } from "@/features/reports/schemas";
import { cn } from "@/lib/utils";
import { formatDateShort, formatDateTimeUtc } from "@/shared/date";

type Recommendation = ReportData["recommendation"];

type ReportScores = ReportData["scores"];

type ScreeningConcern = ReportData["screeningAnswers"][number]["concern"];

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

// ---- Voice communication assessment parsing ----

type VoiceDimension = {
  score: number;
  evidence: string[];
};

type VoiceAnalysis = {
  clarity: VoiceDimension;
  articulation: VoiceDimension;
  conciseness: VoiceDimension;
  listening: VoiceDimension;
  confidence: VoiceDimension;
  overallScore: number;
  summary: string;
};

function parseVoiceAnalysis(value: unknown): VoiceAnalysis | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;

  const dim = (key: string): VoiceDimension => {
    const raw = record[key];
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { score: 0, evidence: [] };
    const r = raw as Record<string, unknown>;
    const evidence = Array.isArray(r.evidence)
      ? r.evidence.filter((item): item is string => typeof item === "string")
      : [];
    return {
      score: typeof r.score === "number" && Number.isFinite(r.score) ? r.score : 0,
      evidence,
    };
  };

  return {
    clarity: dim("clarity"),
    articulation: dim("articulation"),
    conciseness: dim("conciseness"),
    listening: dim("listening"),
    confidence: dim("confidence"),
    overallScore:
      typeof record.overallScore === "number" && Number.isFinite(record.overallScore)
        ? record.overallScore
        : 0,
    summary: typeof record.summary === "string" ? record.summary : "",
  };
}

const voiceDimensionMeta: Record<
  keyof Omit<VoiceAnalysis, "overallScore" | "summary">,
  { label: string }
> = {
  clarity: { label: "Clarity" },
  articulation: { label: "Articulation" },
  conciseness: { label: "Conciseness" },
  listening: { label: "Listening" },
  confidence: { label: "Confidence" },
};

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
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
                report.recommendation === "strong_yes" ? "border-brand/30 bg-brand/5" : "",
              )}
            >
              <span className={cn("font-mono text-xl font-semibold leading-none", meta.scoreText)}>
                {overall}
              </span>
              <span className="mt-0.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                / 100
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
          <Button
            asChild
            size="default"
            className="shrink-0 shadow-sm bg-brand text-brand-foreground hover:bg-brand/90"
          >
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
    <div className="relative flex gap-3 md:gap-5">
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "z-10 flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-background bg-card shadow-sm ring-1 ring-border md:size-10",
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
            {formatDateTimeUtc(timestamp)}
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
          {items.map((item, index) => (
            <li
              key={index}
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
  communicationAssessment,
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
  reportCreatedAt: Date | null;
  communicationAssessment: {
    status: string;
    transcript: Array<{ role: string; content: string }>;
    analysis: unknown;
    completedAt: Date | null;
  } | null;
  application: {
    candidateName: string;
    candidatePicture: string | null;
    jobTitle: string;
    createdAt: Date;
  };
}) {
  const meta = recommendationMeta[report.recommendation];
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
              {formatDateShort(application.createdAt)}
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
                    {messages.length} message
                    {messages.length === 1 ? "" : "s"}
                  </Badge>
                </div>
                <TranscriptDialog messages={messages} candidate={candidate} />
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

      {communicationAssessment?.status === "completed" ? (
        <TimelineNode
          icon={Mic01Icon}
          iconClass="text-foreground"
          dotClassName="ring-2 ring-border"
          title="Voice Communication Assessment"
          timestamp={communicationAssessment.completedAt}
        >
          <VoiceAssessmentReportCard
            transcript={communicationAssessment.transcript}
            analysis={communicationAssessment.analysis}
          />
        </TimelineNode>
      ) : communicationAssessment?.status === "skipped" ? (
        <TimelineNode
          icon={Mic01Icon}
          iconClass="text-muted-foreground"
          dotClassName="ring-border bg-muted/30"
          title="Voice Communication Assessment"
          timestamp={communicationAssessment.completedAt}
        >
          <Card size="sm" className="border-dashed border-border/60">
            <CardContent className="py-0 text-xs text-muted-foreground">
              Candidate chose to skip the voice assessment.
            </CardContent>
          </Card>
        </TimelineNode>
      ) : communicationAssessment != null ? (
        <TimelineNode
          icon={Mic01Icon}
          iconClass="text-muted-foreground"
          dotClassName="ring-border bg-muted/30"
          title="Voice Communication Assessment"
          timestamp={null}
        >
          <Card size="sm" className="border-dashed border-border/60">
            <CardContent className="py-0 text-xs text-muted-foreground">
              Voice assessment was not completed within the interview window.
            </CardContent>
          </Card>
        </TimelineNode>
      ) : null}

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
                    "flex size-16 shrink-0 flex-col items-center justify-center rounded-3xl border-2 md:size-20",
                    meta.scoreRing,
                    report.recommendation === "strong_yes" ? "border-brand/30 bg-brand/5" : "",
                  )}
                >
                  <span
                    className={cn(
                      "font-mono text-xl font-semibold leading-none md:text-2xl",
                      meta.scoreText,
                    )}
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
                            className="h-full rounded-full bg-linear-to-r from-brand/70 to-foreground"
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

function VoiceAssessmentReportCard({
  transcript,
  analysis,
}: {
  transcript: Array<{ role: string; content: string }>;
  analysis: unknown;
}) {
  const parsed = parseVoiceAnalysis(analysis);
  const overall = parsed ? Math.round(parsed.overallScore) : 0;

  return (
    <div className="space-y-4">
      <Card className="border-border/70">
        <CardContent className="space-y-5 pt-6">
          {/* Summary + overall */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-xl space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="gap-1 text-[11px]">
                  <HugeiconsIcon icon={Mic01Icon} strokeWidth={2} className="size-3" />
                  Voice-blended communication score
                </Badge>
              </div>
              {parsed?.summary ? (
                <p className="text-sm leading-6 text-foreground">{parsed.summary}</p>
              ) : (
                <p className="text-sm text-muted-foreground">No summary available.</p>
              )}
            </div>
            {parsed ? (
              <div className="flex size-16 shrink-0 flex-col items-center justify-center rounded-3xl border-2 border-border/70 bg-muted/30">
                <span className="font-mono text-xl font-semibold leading-none">{overall}</span>
                <span className="mt-1 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                  / 100
                </span>
              </div>
            ) : null}
          </div>

          {/* Dimension scores */}
          {parsed ? (
            <div className="space-y-3 rounded-3xl border border-border/60 bg-muted/20 p-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Dimension scores
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {(Object.keys(voiceDimensionMeta) as Array<keyof typeof voiceDimensionMeta>).map(
                  (key) => {
                    const dim = parsed[key];
                    const meta = voiceDimensionMeta[key];
                    const score = Math.round(dim.score);
                    return (
                      <div key={key} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium">{meta.label}</span>
                          <span className="font-mono text-xs text-muted-foreground">
                            {score}/100
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-background">
                          <div
                            className="h-full rounded-full bg-linear-to-r from-brand/70 to-foreground"
                            style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
                          />
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            </div>
          ) : null}

          {/* Key moments — deduplicated evidence across all dimensions */}
          {parsed ? (
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Key moments
              </p>
              <div className="space-y-2">
                {(() => {
                  const allEvidence = new Set<string>();
                  (
                    Object.keys(voiceDimensionMeta) as Array<keyof typeof voiceDimensionMeta>
                  ).forEach((key) => {
                    parsed[key].evidence.forEach((quote) => {
                      if (quote.trim().length > 0) {
                        allEvidence.add(quote.trim());
                      }
                    });
                  });
                  const uniqueEvidence = Array.from(allEvidence);
                  if (uniqueEvidence.length === 0) {
                    return (
                      <p className="text-xs text-muted-foreground">
                        No specific evidence recorded.
                      </p>
                    );
                  }
                  return uniqueEvidence.map((quote, i) => (
                    <div
                      key={i}
                      className="rounded-md border-l-2 border-border bg-muted/30 px-3 py-2 text-xs leading-5 text-muted-foreground"
                    >
                      &ldquo;{quote}&rdquo;
                    </div>
                  ));
                })()}
              </div>
            </div>
          ) : null}

          {/* Transcript */}
          {transcript.length > 0 ? (
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Transcript
              </p>
              <ScrollArea className="h-48 rounded-xl border border-border/60 bg-muted/15 p-3">
                <div className="space-y-2 pr-3">
                  {transcript
                    .filter((m) => m.content.trim().length > 0)
                    .map((m, i) => (
                      <p key={i} className="text-xs leading-5">
                        <span className="font-medium text-foreground">
                          {m.role === "assistant" ? "Zero" : "Candidate"}:
                        </span>{" "}
                        <span className="text-muted-foreground">{m.content}</span>
                      </p>
                    ))}
                </div>
              </ScrollArea>
            </div>
          ) : null}
        </CardContent>
      </Card>
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
