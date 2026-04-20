import {
  Alert02Icon,
  BubbleChatIcon,
  Calendar01Icon,
  CheckmarkCircle02Icon,
  RankingIcon,
  TextIcon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link } from "@tanstack/react-router";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type {
  MockAiEvaluation,
  MockAiEvaluationState,
  MockAiQuestion,
  MockAiRecommendation,
} from "@/mock/ai-evaluations";

type ApplicantSummary = {
  id: string;
  candidateName: string;
  candidateEmail: string;
  candidatePicture: string | null;
};

const recommendationCopy: Record<MockAiRecommendation, { label: string; className: string }> = {
  strong_hire: {
    label: "Strong hire",
    className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  consider: {
    label: "Consider",
    className: "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  },
  needs_signal: {
    label: "Needs signal",
    className: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  pass: {
    label: "Pass",
    className: "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  },
};

const stateCopy: Record<MockAiEvaluationState, { label: string; className: string }> = {
  not_evaluated: {
    label: "Not evaluated",
    className: "bg-muted text-muted-foreground",
  },
  needs_clarification: {
    label: "Needs clarification",
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  evaluated: {
    label: "Evaluated",
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  shortlisted: {
    label: "Shortlisted",
    className: "bg-primary/10 text-primary",
  },
  rejected: {
    label: "Closed",
    className: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  },
};

const confidenceCopy: Record<MockAiEvaluation["confidence"], string> = {
  low: "Low confidence",
  medium: "Medium confidence",
  high: "High confidence",
};

function AiScoreBadge({ score }: { score: number | null }) {
  return (
    <div className="relative flex size-14 shrink-0 items-center justify-center rounded-3xl border border-primary/15 bg-primary/10 shadow-inner shadow-primary/10">
      <span className="font-mono text-lg font-semibold text-primary">
        {score ? score.toFixed(1) : "—"}
      </span>
    </div>
  );
}

function AiRecommendationBadge({ recommendation }: { recommendation: MockAiRecommendation }) {
  const copy = recommendationCopy[recommendation];
  return (
    <Badge variant="outline" className={copy.className}>
      {copy.label}
    </Badge>
  );
}

export function AiEvaluationStateBadge({ state }: { state: MockAiEvaluationState }) {
  const copy = stateCopy[state];
  return <Badge className={copy.className}>{copy.label}</Badge>;
}

function AiDimensionScores({ evaluation }: { evaluation: MockAiEvaluation }) {
  if (evaluation.dimensions.length === 0) {
    return (
      <div className="rounded-4xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
        Dimension scores will appear after RoundZero finishes evaluating this applicant.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {evaluation.dimensions.map((dimension) => (
        <div key={dimension.label} className="space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium">{dimension.label}</span>
            <span className="font-mono text-xs text-muted-foreground">
              {dimension.score.toFixed(1)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-linear-to-r from-primary to-emerald-400"
              style={{ width: `${dimension.score * 10}%` }}
            />
          </div>
          <p className="text-xs leading-5 text-muted-foreground">{dimension.summary}</p>
        </div>
      ))}
    </div>
  );
}

export function AiRankedApplicantsList({
  items,
}: {
  items: { applicant: ApplicantSummary; evaluation: MockAiEvaluation }[];
}) {
  const ranked = [...items].sort((a, b) => (b.evaluation.score ?? -1) - (a.evaluation.score ?? -1));

  return (
    <div className="overflow-hidden rounded-4xl border border-border/60 bg-card shadow-sm ring-1 ring-foreground/5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 px-5 py-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-primary">
            AI ranking preview
          </p>
          <h3 className="mt-1 text-base font-semibold">Evaluated applicant order</h3>
        </div>
        <Badge variant="secondary" className="gap-1 font-mono text-[11px]">
          <HugeiconsIcon icon={RankingIcon} strokeWidth={2} className="size-3" />
          Mock scores
        </Badge>
      </div>

      <div className="divide-y divide-border/50">
        {ranked.map((item, index) => (
          <AiRankedApplicantRow
            key={item.applicant.id}
            applicant={item.applicant}
            evaluation={item.evaluation}
            rank={index + 1}
          />
        ))}
      </div>
    </div>
  );
}

export function AiReportPanel({
  evaluation,
  action,
}: {
  evaluation: MockAiEvaluation;
  action?: React.ReactNode;
}) {
  return (
    <Card className="border border-primary/10 bg-[radial-gradient(circle_at_top_right,var(--color-primary)/10,transparent_34%),var(--color-card)] shadow-lg shadow-primary/5">
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-primary">
              RoundZero report preview
            </p>
            <h3 className="text-xl font-semibold tracking-tight">AI evaluation snapshot</h3>
            <p className="text-sm leading-6 text-muted-foreground">{evaluation.summary}</p>
          </div>
          <div className="flex items-center gap-3">
            <AiRecommendationBadge recommendation={evaluation.recommendation} />
            <AiScoreBadge score={evaluation.score} />
          </div>
        </div>

        {action ? <div>{action}</div> : null}

        <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-4">
            <SignalList
              title="Strengths"
              tone="positive"
              items={evaluation.strengths}
              emptyText="Strengths will appear after evaluation."
            />
            <SignalList
              title="Concerns"
              tone="risk"
              items={evaluation.concerns}
              emptyText="Concerns will appear after evaluation."
            />
          </div>

          <div className="space-y-4">
            <div className="rounded-4xl border border-border/70 bg-background/40 p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                  Dimension scores
                </p>
                <Badge variant="outline">{confidenceCopy[evaluation.confidence]}</Badge>
              </div>
              <AiDimensionScores evaluation={evaluation} />
            </div>
            <EvidenceList evaluation={evaluation} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function AiFullReport({
  application,
  evaluation,
}: {
  application: {
    candidateName: string;
    candidateEmail: string;
    candidatePicture: string | null;
    jobTitle: string;
    companyName: string;
    createdAt: Date | string;
  };
  evaluation: MockAiEvaluation;
}) {
  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-4xl border border-border/60 bg-card shadow-lg shadow-primary/5 ring-1 ring-foreground/5">
        <div className="relative border-b border-border/60 bg-[radial-gradient(circle_at_top_left,var(--color-primary)/14,transparent_38%)] p-6">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="flex min-w-0 items-start gap-4">
              <Avatar className="size-16 ring-4 ring-background">
                <AvatarImage
                  src={application.candidatePicture ?? undefined}
                  alt={application.candidateName}
                />
                <AvatarFallback>{getInitials(application.candidateName)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-primary">
                  Full AI report
                </p>
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight">
                    {application.candidateName}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {application.jobTitle} · {application.companyName}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <AiEvaluationStateBadge state={evaluation.state} />
                  <AiRecommendationBadge recommendation={evaluation.recommendation} />
                  <Badge variant="outline" className="gap-1 font-mono text-[11px]">
                    <HugeiconsIcon icon={Calendar01Icon} strokeWidth={2} className="size-3" />
                    Applied {formatDate(application.createdAt)}
                  </Badge>
                </div>
              </div>
            </div>
            <AiScoreBadge score={evaluation.score} />
          </div>
        </div>

        <div className="grid gap-4 p-5 lg:grid-cols-3">
          <ReportMetric label="Confidence" value={confidenceCopy[evaluation.confidence]} />
          <ReportMetric
            label="Interview evidence"
            value={`${evaluation.questionTimeline.length} answers`}
          />
          <ReportMetric label="Contact" value={application.candidateEmail} />
        </div>
      </div>

      <AiReportPanel evaluation={evaluation} />

      <Card>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-primary">
                Evidence trail
              </p>
              <h3 className="mt-1 text-xl font-semibold tracking-tight">
                Questions, answers, and scoring rationale
              </h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                This is the reviewable trail behind the score. It groups each prompt with the
                candidate answer, what RoundZero was testing, and the signal extracted from it.
              </p>
            </div>
            <Badge variant="secondary" className="gap-1">
              <HugeiconsIcon icon={BubbleChatIcon} strokeWidth={2} className="size-3" />
              Timeline
            </Badge>
          </div>
          <QuestionTimeline questions={evaluation.questionTimeline} />
        </CardContent>
      </Card>
    </div>
  );
}

export function CandidateAiNextStepCard({ evaluation }: { evaluation: MockAiEvaluation }) {
  const copy = getCandidateNextStepCopy(evaluation);

  return (
    <Card className="border border-primary/10 bg-[radial-gradient(circle_at_top_left,var(--color-primary)/10,transparent_32%),var(--color-card)] shadow-lg shadow-primary/5">
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-primary">
              RoundZero AI preview
            </p>
            <h3 className="text-lg font-semibold tracking-tight">{copy.title}</h3>
            <p className="text-sm leading-6 text-muted-foreground">{copy.body}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AiEvaluationStateBadge state={evaluation.state} />
            <AiRecommendationBadge recommendation={evaluation.recommendation} />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {copy.steps.map((step) => (
            <div
              key={step.label}
              className="rounded-3xl border border-border/70 bg-background/40 p-3"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                {step.label}
              </p>
              <p className="mt-1 text-sm font-medium">{step.value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function AiRankedApplicantRow({
  applicant,
  evaluation,
  rank,
}: {
  applicant: ApplicantSummary;
  evaluation: MockAiEvaluation;
  rank: number;
}) {
  return (
    <Link
      to="/dashboard/applicants/$applicationId"
      params={{ applicationId: applicant.id }}
      className="group grid gap-4 px-5 py-4 transition-colors hover:bg-muted/40 md:grid-cols-[auto_1fr_auto] md:items-center"
    >
      <div className="flex items-center gap-3">
        <span className="w-6 text-center font-mono text-xs text-muted-foreground">
          {String(rank).padStart(2, "0")}
        </span>
        <Avatar className="size-10">
          <AvatarImage
            src={applicant.candidatePicture ?? undefined}
            alt={applicant.candidateName}
          />
          <AvatarFallback className="text-[10px]">
            {getInitials(applicant.candidateName)}
          </AvatarFallback>
        </Avatar>
      </div>

      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-medium group-hover:text-primary">
            {applicant.candidateName}
          </span>
          <AiEvaluationStateBadge state={evaluation.state} />
          <AiRecommendationBadge recommendation={evaluation.recommendation} />
        </div>
        <p className="truncate text-xs text-muted-foreground">{applicant.candidateEmail}</p>
      </div>

      <div className="flex items-center justify-between gap-4 md:justify-end">
        <p className="hidden max-w-80 text-xs leading-5 text-muted-foreground xl:block">
          {evaluation.summary}
        </p>
        <AiScoreBadge score={evaluation.score} />
      </div>
    </Link>
  );
}

function QuestionTimeline({ questions }: { questions: MockAiQuestion[] }) {
  if (questions.length === 0) {
    return (
      <div className="rounded-4xl border border-dashed border-border bg-muted/20 p-5 text-sm text-muted-foreground">
        The question timeline will appear after the candidate completes a RoundZero interview.
      </div>
    );
  }

  return (
    <div className="relative space-y-5 before:absolute before:left-5 before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-border">
      {questions.map((question, index) => (
        <QuestionTimelineItem key={question.id} index={index + 1} question={question} />
      ))}
    </div>
  );
}

function QuestionTimelineItem({ question, index }: { question: MockAiQuestion; index: number }) {
  const signalClassName = {
    positive: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    mixed: "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    negative: "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  }[question.signal];

  return (
    <div className="relative grid gap-4 pl-12 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="absolute left-0 top-1 flex size-10 items-center justify-center rounded-full border border-primary/20 bg-background font-mono text-xs font-semibold text-primary shadow-sm">
        {String(index).padStart(2, "0")}
      </div>

      <div className="rounded-4xl border border-border/70 bg-background/40 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="gap-1 font-mono text-[11px]">
            <HugeiconsIcon icon={TextIcon} strokeWidth={2} className="size-3" />
            {question.stage}
          </Badge>
          <Badge variant="outline" className={signalClassName}>
            {question.signal}
          </Badge>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
              Question
            </p>
            <p className="mt-1 text-sm leading-6 text-foreground">{question.question}</p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
              Candidate answer
            </p>
            <p className="mt-1 rounded-3xl border border-border/70 bg-card/70 p-3 text-sm leading-6 text-muted-foreground">
              {question.answer}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
              Evaluator note
            </p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{question.evaluatorNote}</p>
          </div>
        </div>
      </div>

      <div className="rounded-4xl border border-border/70 bg-card/60 p-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
          What this tested
        </p>
        <p className="mt-2 text-sm leading-6 text-foreground">{question.tested}</p>
        <div className="mt-4 grid gap-3">
          <ReportMetric label="Dimension" value={question.dimension} />
          <ReportMetric label="Score impact" value={question.scoreImpact} />
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {question.evidenceLabels.map((label) => (
            <Badge key={label} variant="secondary" className="text-[11px]">
              {label}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReportMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-border/70 bg-background/40 p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-medium">{value}</p>
    </div>
  );
}

function SignalList({
  title,
  tone,
  items,
  emptyText,
}: {
  title: string;
  tone: "positive" | "risk";
  items: string[];
  emptyText: string;
}) {
  const icon = tone === "positive" ? CheckmarkCircle02Icon : Alert02Icon;
  const iconClassName =
    tone === "positive" ? "text-emerald-500 bg-emerald-500/10" : "text-amber-500 bg-amber-500/10";

  return (
    <div className="rounded-4xl border border-border/70 bg-background/40 p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
        {title}
      </p>
      {items.length > 0 ? (
        <ul className="mt-3 space-y-2.5">
          {items.map((item) => (
            <li key={item} className="flex gap-2.5 text-sm leading-6 text-foreground">
              <span
                className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full ${iconClassName}`}
              >
                <HugeiconsIcon icon={icon} strokeWidth={2} className="size-3.5" />
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">{emptyText}</p>
      )}
    </div>
  );
}

function EvidenceList({ evaluation }: { evaluation: MockAiEvaluation }) {
  return (
    <div className="rounded-4xl border border-border/70 bg-background/40 p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
        Evidence
      </p>
      {evaluation.evidence.length > 0 ? (
        <div className="mt-3 space-y-3">
          {evaluation.evidence.map((item) => (
            <blockquote key={item.quote} className="border-l border-solid border-primary/40 pl-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary/80">
                {item.label}
              </p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">“{item.quote}”</p>
            </blockquote>
          ))}
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-2 rounded-3xl border border-dashed border-border p-3 text-sm text-muted-foreground">
          <HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} className="size-4" />
          Interview evidence will appear here after evaluation.
        </div>
      )}
    </div>
  );
}

function getCandidateNextStepCopy(evaluation: MockAiEvaluation) {
  if (evaluation.state === "needs_clarification") {
    return {
      title: "A few follow-up questions may be next",
      body: "RoundZero has enough signal to keep this moving, but the company may ask for 2-3 clarifying answers before a full evaluation.",
      steps: [
        { label: "Current signal", value: "Partial match" },
        { label: "Expected effort", value: "2-3 questions" },
        { label: "Timing", value: "Async" },
      ],
    };
  }

  if (evaluation.state === "evaluated" || evaluation.state === "shortlisted") {
    return {
      title: "Your RoundZero evaluation is complete",
      body: "The company can now review a structured evaluation instead of only reading your resume. You will continue seeing status updates here.",
      steps: [
        { label: "Status", value: "Submitted" },
        { label: "Visibility", value: "Company review" },
        { label: "Next", value: "Decision" },
      ],
    };
  }

  if (evaluation.state === "rejected") {
    return {
      title: "This application is closed",
      body: "This role is no longer moving forward, but future applications can still use your profile and resume snapshot.",
      steps: [
        { label: "Status", value: "Closed" },
        { label: "Profile", value: "Reusable" },
        { label: "Next", value: "Browse roles" },
      ],
    };
  }

  return {
    title: "RoundZero screening is queued",
    body: "Once the AI layer is active, promising matches will move into a short async interview or clarification flow from this page.",
    steps: [
      { label: "Stage", value: "Pre-screening" },
      { label: "Format", value: "Async chat" },
      { label: "Next", value: "Invite or update" },
    ],
  };
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
