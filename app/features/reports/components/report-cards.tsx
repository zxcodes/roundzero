import {
  AiMagicIcon,
  AnalyticsUpIcon,
  ArrowRight01Icon,
  BotIcon,
  BubbleChatIcon,
  Calendar01Icon,
  CheckmarkCircle02Icon,
  FilesIcon,
  Message01Icon,
  Mic01Icon,
  RankingIcon,
  SparklesIcon,
  Target02Icon,
  type Time04Icon,
  UserCircleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  getReportInitials,
  ReportEvaluationBrief,
  TimelineStepEmpty,
  TimelineStepPanel,
} from "@/features/reports/components/report-page-ui";
import { ScorePill } from "@/features/reports/components/score-pill";
import type { ReportData } from "@/features/reports/schemas";
import { cn } from "@/lib/utils";
import {
  type CommunicationAssessmentAnalysis,
  parseCommunicationAssessment,
} from "@/prompts/communication-assessment";
import { formatDateShort, formatDateTimeUtc } from "@/shared/date";
import {
  CANDIDATE_SCORE_MAX,
  candidateScoreProgressPercent,
  formatCandidateScore,
  formatCandidateScoreWithScale,
} from "@/shared/score";

type Recommendation = ReportData["recommendation"];

type ReportScores = ReportData["scores"];

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
  scoreRing: string;
  scoreText: string;
  accent: string;
};

const recommendationMeta: Record<Recommendation, RecommendationMeta> = {
  strong_yes: {
    scoreRing: "border-border/60 bg-primary/5",
    scoreText: "text-foreground",
    accent: "bg-primary/60",
  },
  yes: {
    scoreRing: "border-border/60 bg-muted/30",
    scoreText: "text-foreground",
    accent: "bg-muted-foreground/70",
  },
  lean_no: {
    scoreRing: "border-border/60 bg-muted/30",
    scoreText: "text-foreground",
    accent: "bg-muted-foreground/70",
  },
  no: {
    scoreRing: "border-border/60 bg-muted/30",
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

const voiceDimensionMeta: Record<
  keyof Omit<CommunicationAssessmentAnalysis, "overallScore" | "summary">,
  { label: string }
> = {
  clarity: { label: "Clarity" },
  articulation: { label: "Articulation" },
  conciseness: { label: "Conciseness" },
  listening: { label: "Listening" },
  confidence: { label: "Confidence" },
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
  return (
    <section className="space-y-4 rounded-3xl border border-border/60 px-5 py-4 md:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-muted/30">
            <HugeiconsIcon
              icon={SparklesIcon}
              strokeWidth={2}
              className="size-5 text-muted-foreground"
            />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold tracking-tight">Post-interview evaluation</h3>
            <p className="text-sm font-medium text-foreground">Zero finished evaluating</p>
            <p className="text-sm text-muted-foreground">
              Recommendation, score breakdown and full transcript are ready.
            </p>
          </div>
        </div>
        <ScorePill score={report.scores.overall} recommendation={report.recommendation} size="lg" />
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {(Object.keys(dimensionMeta) as Array<keyof typeof dimensionMeta>).map((key) => {
          const rawScore = report.scores[key];
          const dim = dimensionMeta[key];
          return (
            <div key={key} className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2.5">
              <div className="flex items-center gap-1.5">
                <HugeiconsIcon
                  icon={dim.icon}
                  strokeWidth={2}
                  className="size-3 text-muted-foreground"
                />
                <p className="text-xs text-muted-foreground">{dim.label}</p>
              </div>
              <p className="mt-1 text-lg font-semibold leading-none">
                {formatCandidateScore(rawScore)}
              </p>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-background">
                <div
                  className="h-full rounded-full bg-foreground"
                  style={{ width: `${candidateScoreProgressPercent(rawScore)}%` }}
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
        <Button asChild size="default" className="shrink-0">
          <Link to="/dashboard/applicant-reports/$applicationId" params={{ applicationId }}>
            View full report
            <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2.2} className="size-4" />
          </Link>
        </Button>
      </div>
    </section>
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
            "z-10 flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-background bg-card ring-1 ring-border md:size-10",
            dotClassName,
          )}
        >
          <HugeiconsIcon
            icon={icon}
            strokeWidth={2}
            className={cn("size-4", iconClass ?? "text-foreground")}
          />
        </div>
        {!isLast ? <div className="-mt-1 w-px flex-1 bg-border" /> : null}
      </div>

      <div className={cn("min-w-0 flex-1 pb-6", isLast && "pb-0")}>
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
          <h4 className="text-base font-semibold tracking-tight">{title}</h4>
          <span className="text-[11px] text-muted-foreground">{formatDateTimeUtc(timestamp)}</span>
        </div>
        {children}
      </div>
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
        <TimelineStepPanel className="flex flex-wrap items-center gap-3">
          <Avatar className="size-10">
            <AvatarImage src={candidate.picture ?? undefined} alt={candidate.name} />
            <AvatarFallback>{getReportInitials(candidate.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{candidate.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              Applied for <span className="font-medium">{application.jobTitle}</span>
            </p>
          </div>
          <Badge variant="outline" className="gap-1 text-[10px]">
            <HugeiconsIcon icon={Calendar01Icon} strokeWidth={2} className="size-3" />
            {formatDateShort(application.createdAt)}
          </Badge>
        </TimelineStepPanel>
      </TimelineNode>

      <TimelineNode
        icon={FilesIcon}
        iconClass="text-muted-foreground"
        dotClassName="ring-border bg-muted/30"
        title="Pre-screening"
        timestamp={preEvaluation?.createdAt ?? null}
      >
        {preEvaluation ? (
          <TimelineStepPanel className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex size-12 items-center justify-center rounded-xl border border-border/60 bg-muted/30">
                  <span className="text-base font-semibold">
                    {formatCandidateScore(preEvaluation.score)}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium">Profile match score</p>
                  <p className="text-xs text-muted-foreground">
                    Confidence:{" "}
                    <span className="font-medium text-foreground">{preEvaluation.confidence}</span>
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="text-[11px]">
                Next: {preEvaluation.nextStep.replace(/_/g, " ")}
              </Badge>
            </div>
            {missingRequirements.length > 0 ? (
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                <p className="text-sm font-semibold text-muted-foreground">
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
          </TimelineStepPanel>
        ) : (
          <TimelineStepEmpty>No pre-screening record found for this application.</TimelineStepEmpty>
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
          <TimelineStepPanel>
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
          </TimelineStepPanel>
        ) : (
          <TimelineStepEmpty>No interview record found for this application.</TimelineStepEmpty>
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
          <TimelineStepEmpty>Candidate chose to skip the voice assessment.</TimelineStepEmpty>
        </TimelineNode>
      ) : communicationAssessment != null ? (
        <TimelineNode
          icon={Mic01Icon}
          iconClass="text-muted-foreground"
          dotClassName="ring-border bg-muted/30"
          title="Voice Communication Assessment"
          timestamp={null}
        >
          <TimelineStepEmpty>
            Voice assessment was not completed within the interview window.
          </TimelineStepEmpty>
        </TimelineNode>
      ) : null}

      <TimelineNode
        icon={SparklesIcon}
        iconClass={meta.scoreText}
        dotClassName={cn("ring-2", meta.scoreRing)}
        title="Evaluation"
        timestamp={reportCreatedAt}
      >
        <ReportEvaluationBrief report={report} compact />
      </TimelineNode>

      {report.answerAuthenticity?.riskLevel === "medium" ||
      report.answerAuthenticity?.riskLevel === "high" ? (
        <TimelineNode
          icon={AiMagicIcon}
          iconClass="text-muted-foreground"
          dotClassName="ring-border bg-muted/30"
          title="Answer authenticity concern"
          timestamp={reportCreatedAt}
        >
          <TimelineStepPanel className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-xl space-y-3">
                <p className="text-base font-semibold tracking-tight">
                  {report.answerAuthenticity.riskLevel === "high" ? "High risk" : "Medium risk"}
                </p>
                <p className="text-sm leading-6 text-foreground">
                  {report.answerAuthenticity.explanation}
                </p>
              </div>
              <Badge variant="outline" className="shrink-0 text-[11px]">
                {report.answerAuthenticity.signals.length} signal
                {report.answerAuthenticity.signals.length === 1 ? "" : "s"}
              </Badge>
            </div>
            {report.answerAuthenticity.signals.length > 0 ? (
              <div className="space-y-2">
                {report.answerAuthenticity.signals.map((s, i) => (
                  <div key={i} className="rounded-lg border border-border/60 bg-background/50 p-3">
                    <p className="text-sm font-medium text-foreground">{s.signal}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      <span className="font-medium">Evidence:</span> &ldquo;{s.evidence}&rdquo;
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </TimelineStepPanel>
        </TimelineNode>
      ) : null}

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
  const parsed = parseCommunicationAssessment(analysis);

  return (
    <TimelineStepPanel className="space-y-4">
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
          <div className="flex size-16 shrink-0 flex-col items-center justify-center rounded-3xl border border-border/60 bg-muted/30">
            <span className="text-xl font-semibold leading-none">
              {formatCandidateScore(parsed.overallScore)}
            </span>
            <span className="mt-1 text-xs text-muted-foreground">/ {CANDIDATE_SCORE_MAX}</span>
          </div>
        ) : null}
      </div>

      {parsed ? (
        <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-4">
          <p className="text-sm font-semibold tracking-tight">Dimension scores</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {(Object.keys(voiceDimensionMeta) as Array<keyof typeof voiceDimensionMeta>).map(
              (key) => {
                const dim = parsed[key as keyof typeof voiceDimensionMeta];
                const meta = voiceDimensionMeta[key];
                return (
                  <div key={key} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium">{meta.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatCandidateScoreWithScale(dim.score)}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-background">
                      <div
                        className="h-full rounded-full bg-foreground/80"
                        style={{ width: `${candidateScoreProgressPercent(dim.score)}%` }}
                      />
                    </div>
                  </div>
                );
              },
            )}
          </div>
        </div>
      ) : null}

      {parsed ? (
        <div className="space-y-2">
          <p className="text-sm font-semibold tracking-tight">Key moments</p>
          <div className="space-y-2">
            {(() => {
              const allEvidence = new Set<string>();
              (Object.keys(voiceDimensionMeta) as Array<keyof typeof voiceDimensionMeta>).forEach(
                (key) => {
                  parsed[key as keyof typeof voiceDimensionMeta].evidence.forEach((quote) => {
                    if (quote.trim().length > 0) {
                      allEvidence.add(quote.trim());
                    }
                  });
                },
              );
              const uniqueEvidence = Array.from(allEvidence);
              if (uniqueEvidence.length === 0) {
                return (
                  <p className="text-xs text-muted-foreground">No specific evidence recorded.</p>
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

      {transcript.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-semibold tracking-tight">Transcript</p>
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
    </TimelineStepPanel>
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
        <DialogHeader className="space-y-4 border-b border-border/60 bg-card px-6 py-5">
          <div className="flex items-start gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-muted/30">
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
                <div className="rounded-full border border-border/60 bg-muted/20 px-3 py-1 text-[11px] text-muted-foreground">
                  {messages.length} message{messages.length === 1 ? "" : "s"}
                </div>
                <div className="rounded-full border border-border/60 bg-muted/20 px-3 py-1 text-[11px] text-muted-foreground">
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
