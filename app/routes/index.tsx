import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { PublicFooter, PublicHeader } from "@/components/public-layout";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const NOT_INCLUDED = "Not included";

export const Route = createFileRoute("/")({
  beforeLoad: ({ context }) => {
    if (context.user?.role) {
      throw redirect({ to: "/dashboard" });
    }
  },
  head: () => ({
    meta: [
      {
        title: "RoundZero | Replace Your First Interview Round with AI",
      },
      {
        name: "description",
        content:
          "Run AI-driven first-round interviews and get ranked candidates with structured evaluation reports. Skip resume screening. Evaluate how candidates actually think.",
      },
      {
        property: "og:url",
        content: `${import.meta.env.VITE_APP_URL}/`,
      },
    ],
    links: [
      {
        rel: "canonical",
        href: `${import.meta.env.VITE_APP_URL}/`,
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <div className="calm min-h-svh bg-background text-foreground">
      <a href="#main-content" className="calm-skip-link">
        Skip to main content
      </a>
      <PublicHeader />
      <main id="main-content">
        <Hero />
        <ValueStrip />
        <HowItWorks />
        <PipelineSection />
        <CandidateExperience />
        <ReportSection />
        <RankingSection />
        <PricingSection />
        <FaqSection />
        <Closing />
      </main>
      <PublicFooter />
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Shared primitives
// ───────────────────────────────────────────────────────────────────────────
const CONTAINER = "mx-auto w-full max-w-7xl px-6 lg:px-10";
const SECTION_PAD = "py-20 lg:py-28";
const SECTION_TINT = "bg-muted/30";

function Highlight({ children }: { children: React.ReactNode }) {
  return <span className="highlight">{children}</span>;
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="eyebrow inline-flex items-center gap-2">
      <span className="size-1.5 rounded-xs bg-foreground" />
      {children}
    </span>
  );
}

function SectionHeading({
  eyebrow,
  title,
  lead,
  className,
}: {
  eyebrow: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("max-w-2xl", className)}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-4 text-[clamp(1.75rem,3.2vw,2.6rem)] font-semibold leading-[1.05] tracking-tight">
        {title}
      </h2>
      {lead ? (
        <p className="mt-4 text-[clamp(0.98rem,1.3vw,1.1rem)] leading-relaxed text-muted-foreground">
          {lead}
        </p>
      ) : null}
    </div>
  );
}

function PrimaryCta({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Button size="lg" className="rounded-full" asChild>
      <Link to={to}>
        {children}
        <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
      </Link>
    </Button>
  );
}

function SecondaryCta({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Button size="lg" variant="outline" className="rounded-full" asChild>
      <Link to={to}>{children}</Link>
    </Button>
  );
}

function ScoreBar({ value }: { value: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full bg-linear-to-r from-foreground/75 to-foreground"
        style={{ width: `${(value / 10) * 100}%` }}
      />
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Hero
// ───────────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="calm-hero relative overflow-hidden">
      <div className={cn(CONTAINER, SECTION_PAD)}>
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="rise max-w-xl">
            <Eyebrow>Async AI interviews · Ranked reports</Eyebrow>
            <h1 className="mt-6 text-[clamp(2.6rem,5.6vw,4.75rem)] font-bold leading-[1.02] tracking-[-0.035em]">
              Replace your first interview round with <Highlight>AI</Highlight>
            </h1>
            <p className="mt-6 max-w-lg text-[clamp(1.05rem,1.4vw,1.2rem)] leading-relaxed text-muted-foreground">
              Post a job and get ranked candidates with structured, evidence-backed reports. No
              résumés to sift through, no scheduling. Candidates arrive already evaluated.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <PrimaryCta to="/company/login">Post a job</PrimaryCta>
              <SecondaryCta to="/jobs">Browse jobs</SecondaryCta>
            </div>
            <p className="eyebrow mt-6">Free to start · No credit card</p>
          </div>

          <div className="rise">
            <HeroProductWindow />
          </div>
        </div>
      </div>
    </section>
  );
}

const heroRanking = [
  { rank: 1, name: "Sarah Chen", score: 8.4, rec: "Strong hire", active: true },
  { rank: 2, name: "Marcus Johnson", score: 7.9, rec: "Strong hire", active: false },
  { rank: 3, name: "Priya Patel", score: 7.2, rec: "Consider", active: false },
];

const heroDims = [
  { label: "Technical depth", value: 9.1 },
  { label: "Communication", value: 7.8 },
  { label: "Experience", value: 8.2 },
];

function HeroProductWindow() {
  return (
    <div className="panel">
      <div className="panel-header">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-border" />
          <span className="size-2 rounded-full bg-border" />
          <span className="size-2 rounded-full bg-border" />
          <span className="ml-1 font-mono text-[11px] text-muted-foreground">
            roundzero / senior-backend-engineer
          </span>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <span className="eyebrow">Ranked candidates</span>
          <span className="font-mono text-[10px] text-muted-foreground">87 in pipeline</span>
        </div>
        <div className="mt-3 space-y-0.5">
          {heroRanking.map((r) => (
            <div
              key={r.rank}
              className={cn("flex items-center gap-3 px-2 py-2.5", r.active ? "bg-muted/50" : "")}
            >
              <span className="w-5 font-mono text-[11px] text-muted-foreground">
                {String(r.rank).padStart(2, "0")}
              </span>
              <span className="flex-1 text-sm font-medium">{r.name}</span>
              <span className={cn("text-[12px]", recClass(r.rec))}>{r.rec}</span>
              <span className="w-9 text-right font-mono text-sm tabular-nums">
                {r.score.toFixed(1)}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-4 border-t border-border pt-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="eyebrow">Report · Sarah Chen</span>
              <div className="mt-1.5 flex items-baseline gap-1.5">
                <span className="font-mono text-3xl font-medium tabular-nums tracking-tight">
                  8.4
                </span>
                <span className="font-mono text-[11px] text-muted-foreground">/ 10</span>
              </div>
            </div>
            <span className="inline-flex items-center rounded-full bg-success/10 px-2.5 py-1 font-mono text-[11px] font-medium tracking-wide text-success">
              Strong hire
            </span>
          </div>
          <div className="mt-3.5 space-y-2.5">
            {heroDims.map((d) => (
              <div key={d.label}>
                <div className="mb-1 flex items-baseline justify-between">
                  <span className="text-[12px] text-foreground">{d.label}</span>
                  <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                    {d.value.toFixed(1)}
                  </span>
                </div>
                <ScoreBar value={d.value} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Value strip
// ───────────────────────────────────────────────────────────────────────────
const valueProps = [
  { label: "Skip", value: "Résumé screening", note: "No keyword filters, no ATS noise." },
  { label: "Evaluate", value: "How people think", note: "Adaptive interviews, not trivia." },
  { label: "Receive", value: "Ranked reports", note: "Scored, not just collected." },
  { label: "Trust", value: "Linked evidence", note: "Every score ties to real answers." },
];

function ValueStrip() {
  return (
    <section className="border-t border-border">
      <div className={CONTAINER}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {valueProps.map((v, i) => (
            <div
              key={v.label}
              className={cn(
                "py-10 sm:px-6 lg:py-12",
                i !== 0 ? "border-t border-border sm:border-t-0 sm:border-l" : "",
                i === 2 ? "sm:border-t lg:border-t-0 lg:border-l" : "",
                i === 0 ? "lg:pl-0" : "",
              )}
            >
              <span className="eyebrow">{v.label}</span>
              <p className="mt-2 text-xl font-semibold tracking-[-0.015em]">{v.value}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{v.note}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// How it works
// ───────────────────────────────────────────────────────────────────────────
const steps = [
  {
    n: "01",
    title: "You post a job",
    body: "Describe the role. RoundZero handles the rest. No ATS setup, no keyword filters, no manual screening.",
  },
  {
    n: "02",
    title: "Candidates apply",
    body: "Applicants submit and go. Pre-evaluation runs immediately. Zero handles salary, relocation, and visa screening so your team doesn't have to.",
  },
  {
    n: "03",
    title: "Ranked reports roll in",
    body: "Strong candidates are interviewed by Zero, then you get ranked reports with scores, strengths, and evidence the moment they're ready.",
  },
  {
    n: "04",
    title: "Focus on the best",
    body: "Review only the top-ranked candidates. Every score links back to a real conversation. No more guessing.",
  },
];

function HowItWorks() {
  return (
    <section className="border-t border-border">
      <div className={cn(CONTAINER, SECTION_PAD)}>
        <SectionHeading
          eyebrow="The flow"
          title="How it works"
          lead="A complete first round that runs on your behalf, from application to ranked decision."
        />
        <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0">
          {steps.map((step, i) => (
            <article
              key={step.n}
              className={cn(
                "lg:px-7",
                i !== 0 ? "border-t border-border pt-8 sm:border-t-0 sm:pt-0" : "",
                i !== 0 ? "sm:border-l lg:border-l" : "",
                i === 2 ? "sm:border-t lg:border-t-0" : "",
                i === 0 ? "lg:pl-0" : "",
              )}
            >
              <span className="font-mono text-xs text-foreground">{step.n}</span>
              <h3 className="mt-3 text-lg font-semibold tracking-[-0.01em]">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Pipeline
// ───────────────────────────────────────────────────────────────────────────
type PipelineLogLevel = "INFO" | "WARN";

type PipelineLogLine = {
  workflow: string;
  runId: string;
  level: PipelineLogLevel;
  message: string;
};

const pipelineStages = [
  {
    label: "Pre-eval",
    body: "Resume extraction, job classification, authenticity checks, and fit scoring run the moment someone applies.",
  },
  {
    label: "Batch",
    body: "Quota-aware orchestration pools strong candidates and schedules interviews without manual triage.",
  },
  {
    label: "Post-eval",
    body: "Transcript review, voice assessment, and structured report generation close the loop with evidence.",
  },
];

const pipelineLogs: PipelineLogLine[] = [
  {
    workflow: "pre-eval",
    runId: "d2e765a6",
    level: "INFO",
    message: "Starting pre-evaluation workflow",
  },
  {
    workflow: "pre-eval",
    runId: "d2e765a6",
    level: "INFO",
    message: "load_application: Loading application from DB",
  },
  {
    workflow: "pre-eval",
    runId: "d2e765a6",
    level: "INFO",
    message: "load_application completed → jobTitle=Senior Backend Engineer",
  },
  {
    workflow: "pre-eval",
    runId: "d2e765a6",
    level: "INFO",
    message: "extract_resume: Fetching from R2 and extracting text",
  },
  {
    workflow: "pre-eval",
    runId: "d2e765a6",
    level: "INFO",
    message: "Resume format: application/pdf, size: 77 KB",
  },
  {
    workflow: "pre-eval",
    runId: "d2e765a6",
    level: "INFO",
    message: "extract_resume completed → chars=4283 words=600",
  },
  {
    workflow: "pre-eval",
    runId: "d2e765a6",
    level: "INFO",
    message: "classify_job: Classifying job type for role-specific evaluation",
  },
  {
    workflow: "pre-eval",
    runId: "d2e765a6",
    level: "INFO",
    message: "ai-call → prompt=396 tokens=34 latencyMs=3948 promptVersion=1.0.0",
  },
  {
    workflow: "pre-eval",
    runId: "d2e765a6",
    level: "INFO",
    message:
      "classify_job completed → roleType=technical reasoning=Backend APIs, scalable services, infrastructure",
  },
  {
    workflow: "pre-eval",
    runId: "d2e765a6",
    level: "INFO",
    message: "check_authenticity: Running resume authenticity check",
  },
  {
    workflow: "pre-eval",
    runId: "d2e765a6",
    level: "INFO",
    message: "ai-call → prompt=4638 tokens=3009 latencyMs=35015 promptVersion=1.0.0",
  },
  {
    workflow: "pre-eval",
    runId: "d2e765a6",
    level: "INFO",
    message:
      "check_authenticity completed → consistencyScore=94 redFlags=0 explanation=No authenticity concerns",
  },
  {
    workflow: "pre-eval",
    runId: "d2e765a6",
    level: "INFO",
    message: "evaluate: Calling OpenRouter for pre-evaluation",
  },
  {
    workflow: "pre-eval",
    runId: "d2e765a6",
    level: "INFO",
    message: "ai-call → prompt=5579 tokens=1698 latencyMs=18521 promptVersion=1.0.0",
  },
  {
    workflow: "pre-eval",
    runId: "d2e765a6",
    level: "INFO",
    message:
      "evaluate completed → score=52 confidence=medium modelNextStep=interview_invited missingCount=4",
  },
  {
    workflow: "pre-eval",
    runId: "d2e765a6",
    level: "INFO",
    message: "save_pre_eval: Saving pre-evaluation to DB",
  },
  {
    workflow: "pre-eval",
    runId: "d2e765a6",
    level: "INFO",
    message: "save_pre_eval completed → status=pre_screening consistencyScore=94",
  },
  {
    workflow: "pre-eval",
    runId: "d2e765a6",
    level: "INFO",
    message: "decide: Checking quota and making decision",
  },
  {
    workflow: "pre-eval",
    runId: "d2e765a6",
    level: "INFO",
    message: "decide completed → action=pooled newStatus=queued_for_batch availableSlots=5",
  },
  {
    workflow: "pre-eval",
    runId: "d2e765a6",
    level: "INFO",
    message: "Workflow complete: score=52, modelNextStep=interview_invited, decision=pooled",
  },
  {
    workflow: "batch",
    runId: "e104ba4b",
    level: "INFO",
    message: "Batch orchestration started for Senior Backend Engineer",
  },
  {
    workflow: "batch",
    runId: "e104ba4b",
    level: "INFO",
    message: "Matching 12 pooled candidates to 5 interview slots",
  },
  {
    workflow: "batch",
    runId: "e104ba4b",
    level: "INFO",
    message: "Interview invitations queued → batch=e104ba4b slots=5",
  },
  {
    workflow: "post-eval",
    runId: "88683432",
    level: "INFO",
    message: "Loading existing report state",
  },
  {
    workflow: "post-eval",
    runId: "88683432",
    level: "INFO",
    message: "Reading interview context and transcript",
  },
  {
    workflow: "post-eval",
    runId: "88683432",
    level: "INFO",
    message: "Waiting for voice assessment to complete (max 12h)",
  },
  {
    workflow: "post-eval",
    runId: "88683432",
    level: "INFO",
    message: "Voice assessment event received",
  },
  {
    workflow: "post-eval",
    runId: "88683432",
    level: "INFO",
    message: "Assessing answer authenticity",
  },
  {
    workflow: "post-eval",
    runId: "88683432",
    level: "INFO",
    message:
      "ai-call → prompt=11715 tokens=1105 latencyMs=8420 promptVersion=answer-authenticity-1.0",
  },
  {
    workflow: "post-eval",
    runId: "88683432",
    level: "WARN",
    message: "Answer authenticity: medium risk, 2 signal(s) detected",
  },
  {
    workflow: "post-eval",
    runId: "88683432",
    level: "INFO",
    message: "Generating structured interview report with OpenRouter",
  },
  {
    workflow: "post-eval",
    runId: "88683432",
    level: "INFO",
    message: "report saved → overallScore=8.4 recommendation=strong_hire ranked=01",
  },
];

function pipelineLogLevelClass(level: PipelineLogLevel) {
  if (level === "WARN") return "text-warning";
  return "text-info";
}

function PipelineSection() {
  return (
    <section className={cn("border-t border-border", SECTION_TINT)}>
      <div className={cn(CONTAINER, SECTION_PAD)}>
        <div className="grid grid-cols-1 items-start gap-x-12 gap-y-12 lg:grid-cols-2">
          <div>
            <SectionHeading
              eyebrow="Under the hood"
              title={
                <>
                  A real pipeline runs on every <Highlight>application</Highlight>
                </>
              }
              lead="Pre-evaluation, batch orchestration, and post-interview reporting are durable workflows, not a single prompt. Here is what happens behind the ranked list you see."
            />
            <div className="mt-8 space-y-6">
              {pipelineStages.map((stage) => (
                <div
                  key={stage.label}
                  className="border-t border-border pt-6 first:border-t-0 first:pt-0"
                >
                  <span className="font-mono text-xs text-foreground">{stage.label}</span>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{stage.body}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-border" />
                <span className="size-2 rounded-full bg-border" />
                <span className="size-2 rounded-full bg-border" />
                <span className="ml-1 font-mono text-[11px] text-muted-foreground">
                  roundzero / pipeline
                </span>
              </div>
              <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground">
                <span className="size-1.5 rounded-full bg-success" />
                live
              </span>
            </div>
            <ScrollArea className="h-128">
              <div className="space-y-0 p-4 font-mono text-[11px] leading-[1.65] sm:p-5">
                {pipelineLogs.map((line) => (
                  <div
                    key={`${line.runId}-${line.message}`}
                    className="grid grid-cols-[19ch_6ch_minmax(0,1fr)] gap-x-2 py-0.5"
                  >
                    <span className="truncate text-muted-foreground/70">
                      [{line.workflow}:{line.runId}]
                    </span>
                    <span className={pipelineLogLevelClass(line.level)}>[{line.level}]</span>
                    <span
                      className={cn(
                        "min-w-0",
                        line.level === "WARN" ? "text-warning" : "text-foreground/85",
                      )}
                    >
                      {line.message}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </section>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Candidate experience
// ───────────────────────────────────────────────────────────────────────────
const transcript = [
  {
    role: "Zero",
    text: "You mentioned building a real-time notification system. Walk me through the architecture decisions.",
  },
  {
    role: "Sarah",
    text: "Pub/sub with Redis Streams for brokering. The tradeoff was latency vs. ordering. We chose at-least-once with client-side dedup.",
  },
  {
    role: "Zero",
    text: "How did dedup hold up at scale? Specifically, what happened on a client reconnect after going offline for several minutes?",
  },
  {
    role: "Sarah",
    text: "We kept a sliding window of message IDs in IndexedDB. On reconnect we replayed missed entries and dropped duplicates against the window.",
  },
];

const voiceBars = [
  10, 7, 14, 9, 18, 12, 22, 16, 26, 19, 30, 22, 28, 18, 24, 14, 20, 11, 16, 8, 12, 6, 8, 4,
];

const voiceDims = [
  { label: "Clarity", value: 78 },
  { label: "Articulation", value: 72 },
  { label: "Conciseness", value: 65 },
  { label: "Listening", value: 80 },
  { label: "Confidence", value: 70 },
];

function CandidateExperience() {
  return (
    <section className="border-t border-border">
      <div className={cn(CONTAINER, SECTION_PAD)}>
        <div className="grid grid-cols-1 items-start gap-x-12 gap-y-12 lg:grid-cols-2">
          <div>
            <SectionHeading
              eyebrow="The interview"
              title={
                <>
                  A conversation, not a <Highlight>quiz</Highlight>
                </>
              }
              lead="Zero validates claims, probes vague answers, and adapts to the role the way a senior interviewer would."
            />

            <blockquote className="mt-8 border-l-2 border-foreground pl-5 text-lg leading-relaxed text-foreground">
              “It noticed I'd been vague about Redis Streams and asked me to draw out exactly how
              messages were ordered. It felt less like a quiz and more like a conversation with a
              senior engineer who had already read my résumé.”
              <footer className="mt-3 font-mono text-xs not-italic text-muted-foreground">
                Sarah Chen, Senior Backend Engineer
              </footer>
            </blockquote>

            <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2">
              <div>
                <span className="eyebrow">What it does</span>
                <ul className="mt-3 space-y-2.5">
                  {[
                    "Validates specific claims on the résumé.",
                    "Probes role-relevant judgement, not trivia.",
                    "Follows up on vagueness, like a human would.",
                    "Stays concise. Twenty to forty minutes, async.",
                  ].map((line) => (
                    <li key={line} className="flex gap-2.5 text-sm leading-relaxed text-foreground">
                      <span className="mt-2 size-1 shrink-0 rounded-full bg-foreground" />
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <span className="eyebrow">For candidates</span>
                <ul className="mt-3 space-y-2.5">
                  {[
                    "Get evaluated beyond your résumé.",
                    "Show how you think and solve problems.",
                    "Never filtered out by keyword matching.",
                    "A fairer, more meaningful evaluation.",
                  ].map((line) => (
                    <li key={line} className="flex gap-2.5 text-sm leading-relaxed text-foreground">
                      <span className="mt-2 size-1 shrink-0 rounded-full bg-foreground" />
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <span className="eyebrow">Transcript · Senior Backend Engineer</span>
              <span className="font-mono text-[10px] text-muted-foreground">MIN 18:42</span>
            </div>
            <div className="divide-y divide-border">
              {transcript.map((t) => (
                <div key={t.text} className="grid grid-cols-12 gap-3 px-5 py-4">
                  <span
                    className={cn(
                      "col-span-3 font-mono text-[10.5px] tracking-wider sm:col-span-2",
                      t.role === "Zero" ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {t.role.toUpperCase()}
                  </span>
                  <p className="col-span-9 text-[13.5px] leading-relaxed text-foreground sm:col-span-10">
                    {t.text}
                  </p>
                </div>
              ))}
            </div>

            <div className="border-t border-border">
              <div className="panel-header border-b-0">
                <span className="eyebrow">Voice assessment · 5 min</span>
                <span className="font-mono text-[10px] text-muted-foreground">CLARITY 78</span>
              </div>
              <div className="space-y-5 px-5 py-5">
                <div className="flex h-12 items-center gap-0.5">
                  {voiceBars.map((h, i) => (
                    <div
                      key={`${h}-${i}`}
                      className={cn("flex-1 rounded-full", i > 16 ? "bg-border" : "bg-foreground")}
                      style={{ height: `${h}px` }}
                    />
                  ))}
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {voiceDims.map((dim) => (
                    <div key={dim.label} className="min-w-0 text-center">
                      <span className="font-mono text-[13px] tabular-nums text-foreground">
                        {dim.value}
                      </span>
                      <div className="mt-1 h-0.5 w-full overflow-hidden rounded-full bg-border">
                        <div
                          className="h-full rounded-full bg-foreground"
                          style={{ width: `${dim.value}%` }}
                        />
                      </div>
                      <span className="eyebrow mt-1 block text-[9px]">{dim.label}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Voice communication is assessed after the text interview and blended into the
                  final communication score (60% voice, 40% text).
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Report
// ───────────────────────────────────────────────────────────────────────────
const reportScores = [
  { label: "Technical depth", value: 9.1, note: "System design, distributed tradeoffs" },
  { label: "Communication", value: 7.8, note: "Concise, structured under pressure" },
  { label: "Experience", value: 8.2, note: "Validated against four prior roles" },
  { label: "Ownership", value: 8.5, note: "Drove rollout, handled rollback" },
];

function ReportSection() {
  return (
    <section className={cn("border-t border-border", SECTION_TINT)}>
      <div className={cn(CONTAINER, SECTION_PAD)}>
        <div className="grid grid-cols-1 items-start gap-x-12 gap-y-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <SectionHeading
              eyebrow="The report"
              title="See how candidates actually perform"
              lead="Every candidate arrives with a structured report covering reasoning, communication, and relevant experience, plus strengths, concerns, and a clear recommendation."
            />
            <div className="mt-8 border-t border-border pt-8">
              <span className="eyebrow">Dossier no. 0481</span>
              <h3 className="mt-2 text-2xl font-semibold tracking-[-0.015em]">Sarah Chen</h3>
              <p className="text-sm text-muted-foreground">for Senior Backend Engineer</p>
              <div className="mt-5 flex items-end justify-between">
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-5xl font-medium tabular-nums tracking-tight">
                    8.4
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">/ 10</span>
                </div>
                <span className="inline-flex items-center rounded-full bg-success/10 px-2.5 py-1 font-mono text-[11px] font-medium tracking-wide text-success">
                  Strong hire
                </span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="space-y-5">
              {reportScores.map((s) => (
                <div key={s.label}>
                  <div className="flex items-baseline justify-between gap-4 pb-2">
                    <span className="text-[15px] font-medium text-foreground">{s.label}</span>
                    <span className="hidden flex-1 text-[13px] text-muted-foreground md:block">
                      {s.note}
                    </span>
                    <span className="font-mono text-[15px] tabular-nums text-foreground">
                      {s.value.toFixed(1)}
                    </span>
                  </div>
                  <ScoreBar value={s.value} />
                </div>
              ))}
            </div>

            <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2">
              <div>
                <span className="eyebrow">Strengths</span>
                <ul className="mt-3 space-y-2.5">
                  {[
                    "Deep understanding of distributed systems tradeoffs.",
                    "Clear, structured communication under pressure.",
                    "Demonstrated ownership across the rollout cycle.",
                  ].map((s) => (
                    <li key={s} className="flex gap-2.5 text-sm leading-relaxed text-foreground">
                      <span className="mt-2 size-1 shrink-0 rounded-full bg-success" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <span className="eyebrow">Areas of concern</span>
                <ul className="mt-3 space-y-2.5">
                  {[
                    "Limited exposure to observability beyond basic logging.",
                    "Vague answer on CI/CD pipeline design, flagged for follow-up.",
                  ].map((s) => (
                    <li key={s} className="flex gap-2.5 text-sm leading-relaxed text-foreground">
                      <span className="mt-2 size-1 shrink-0 rounded-full bg-muted-foreground/60" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Ranking
// ───────────────────────────────────────────────────────────────────────────
const ranking = [
  { rank: 1, name: "Sarah Chen", score: 8.4, rec: "Strong hire" },
  { rank: 2, name: "Marcus Johnson", score: 7.9, rec: "Strong hire" },
  { rank: 3, name: "Priya Patel", score: 7.2, rec: "Consider" },
  { rank: 4, name: "Alex Kim", score: 5.8, rec: "Pass" },
  { rank: 5, name: "Diego Alvarez", score: 5.4, rec: "Pass" },
];

function recClass(rec: string) {
  if (rec === "Strong hire") return "text-success";
  if (rec === "Consider") return "text-foreground";
  return "text-muted-foreground";
}

function RankingSection() {
  return (
    <section className="border-t border-border">
      <div className={cn(CONTAINER, SECTION_PAD)}>
        <div className="grid grid-cols-1 gap-x-12 gap-y-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <SectionHeading
              eyebrow="Ranking"
              title={
                <>
                  Ranked, not <Highlight>filtered</Highlight>
                </>
              }
              lead="After RoundZero you don't see applicants. You see ranked candidates, ordered by real evaluation rather than keyword matches or résumé polish."
            />
          </div>

          <div className="lg:col-span-8">
            <div className="spec-sheet">
              <div className="grid grid-cols-12 border-b border-border px-5 py-3 font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground">
                <span className="col-span-2">#</span>
                <span className="col-span-6">Candidate</span>
                <span className="col-span-2">Rec</span>
                <span className="col-span-2 text-right">Score</span>
              </div>
              {ranking.map((r) => (
                <div
                  key={r.rank}
                  className="grid grid-cols-12 items-center border-b border-border px-5 py-4 transition-colors last:border-b-0 hover:bg-muted/40"
                >
                  <span className="col-span-2 font-mono text-xs text-muted-foreground">
                    {String(r.rank).padStart(2, "0")}
                  </span>
                  <span className="col-span-6 text-[15px] font-medium">{r.name}</span>
                  <span className={cn("col-span-2 text-[13px]", recClass(r.rec))}>{r.rec}</span>
                  <span className="col-span-2 text-right font-mono text-sm tabular-nums">
                    {r.score.toFixed(1)}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between px-5 py-3 font-mono text-[11px] text-muted-foreground">
                <span>5 evaluated</span>
                <span>87 in pipeline · still readable</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Pricing
// ───────────────────────────────────────────────────────────────────────────
type Tier = {
  name: string;
  price: string;
  period: string;
  description: string;
  cta: string;
  href: string;
  featured?: boolean;
};

const tiers: Tier[] = [
  {
    name: "Starter",
    price: "$0",
    period: "forever",
    description: "Try RoundZero on your next hire. No commitment.",
    cta: "Begin free",
    href: "/company/login",
  },
  {
    name: "Pro",
    price: "$149",
    period: "per month",
    description: "For teams hiring across multiple roles.",
    cta: "Start a trial",
    href: "/company/login?redirect=/dashboard/billing",
    featured: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "tailored",
    description: "High-volume hiring with dedicated support.",
    cta: "Speak with us",
    href: "mailto:sales@roundzero.dev",
  },
];

const featureRows = [
  { label: "Active job postings", values: ["Up to 3", "Unlimited", "Unlimited"] },
  { label: "AI job creation", values: [NOT_INCLUDED, "Included", "Included"] },
  { label: "AI pre-evaluation", values: ["All applicants", "All applicants", "All applicants"] },
  { label: "Deep-evaluated reports", values: ["5 per job", "Top fits", "Top fits"] },
  { label: "Custom evaluation criteria", values: [NOT_INCLUDED, "Included", "Included"] },
  { label: "Team seats", values: ["1", "5", "Unlimited"] },
  { label: "API & integrations", values: [NOT_INCLUDED, NOT_INCLUDED, "Included"] },
  { label: "Support", values: ["Email", "Priority", "Dedicated AM"] },
];

function TierCta({ tier, className }: { tier: Tier; className?: string }) {
  const content = (
    <>
      {tier.cta}
      <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
    </>
  );
  const classes = cn("w-full rounded-full", className);
  if (tier.href.startsWith("mailto:")) {
    return (
      <Button variant={tier.featured ? "default" : "outline"} className={classes} asChild>
        <a href={tier.href}>{content}</a>
      </Button>
    );
  }
  return (
    <Button variant={tier.featured ? "default" : "outline"} className={classes} asChild>
      <Link to={tier.href}>{content}</Link>
    </Button>
  );
}

function PricingSection() {
  return (
    <section className={cn("border-t border-border", SECTION_TINT)}>
      <div className={cn(CONTAINER, SECTION_PAD)}>
        <SectionHeading
          eyebrow="Pricing"
          title="Pricing, plainly stated"
          lead="Replace a five-figure recruiting budget with a flat subscription that includes evaluation."
        />

        {/* Desktop table */}
        <div className="mt-12 hidden md:block">
          <table className="w-full border-collapse">
            <caption className="sr-only">
              Compare RoundZero pricing tiers for active jobs, reports, seats, integrations, and
              support.
            </caption>
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className="w-1/4 pb-6 text-left" />
                {tiers.map((t) => (
                  <th
                    key={t.name}
                    scope="col"
                    className={cn(
                      "w-1/4 px-4 pb-6 text-left align-top",
                      t.featured ? "border-x border-foreground/15 bg-muted/25" : "",
                    )}
                  >
                    <div className="flex flex-col gap-2">
                      <span className="eyebrow h-4">{t.featured ? "Most popular" : "\u00A0"}</span>
                      <span className="text-lg font-semibold tracking-[-0.01em]">{t.name}</span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-mono text-3xl font-medium tracking-tight">
                          {t.price}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">
                          / {t.period}
                        </span>
                      </div>
                      <p className="text-[13px] leading-relaxed text-muted-foreground">
                        {t.description}
                      </p>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {featureRows.map((row) => (
                <tr key={row.label} className="border-b border-border">
                  <th scope="row" className="py-4 pr-6 text-left align-top text-[15px] font-medium">
                    {row.label}
                  </th>
                  {row.values.map((value, valueIndex) => (
                    <td
                      key={`${row.label}-${tiers[valueIndex]?.name}`}
                      className={cn(
                        "px-4 py-4 align-top text-[14px]",
                        tiers[valueIndex]?.featured
                          ? "border-x border-foreground/15 bg-muted/25"
                          : "",
                        value === NOT_INCLUDED ? "text-muted-foreground" : "text-foreground",
                      )}
                    >
                      {value}
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <td />
                {tiers.map((t) => (
                  <td
                    key={t.name}
                    className={cn(
                      "px-4 pt-6 align-top",
                      t.featured ? "border-x border-foreground/15 bg-muted/25" : "",
                    )}
                  >
                    <TierCta tier={t} />
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="mt-10 space-y-5 md:hidden">
          {tiers.map((t, tierIndex) => (
            <div
              key={t.name}
              className={cn(
                "rounded-4xl border p-5",
                t.featured
                  ? "border-x border-foreground/15 border-y-border bg-muted/25"
                  : "border-border",
              )}
            >
              <div className="mb-5 flex flex-col gap-1.5">
                {t.featured ? <span className="eyebrow text-foreground">Most popular</span> : null}
                <span className="text-lg font-semibold tracking-[-0.01em]">{t.name}</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-mono text-3xl font-medium tracking-tight">{t.price}</span>
                  <span className="font-mono text-xs text-muted-foreground">/ {t.period}</span>
                </div>
                <p className="text-[13px] leading-relaxed text-muted-foreground">{t.description}</p>
              </div>
              <dl className="space-y-3">
                {featureRows.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-baseline justify-between gap-4 border-t border-border pt-2.5"
                  >
                    <dt className="text-[14px] font-medium">{row.label}</dt>
                    <dd
                      className={cn(
                        "shrink-0 text-right text-[13px]",
                        row.values[tierIndex] === NOT_INCLUDED
                          ? "text-muted-foreground"
                          : "text-foreground",
                      )}
                    >
                      {row.values[tierIndex]}
                    </dd>
                  </div>
                ))}
              </dl>
              <TierCta tier={t} className="mt-5" />
            </div>
          ))}
        </div>

        <CostComparison />
      </div>
    </section>
  );
}

const costPlatforms = [
  {
    name: "LinkedIn Recruiter",
    cost: "$10,800+",
    per: "/ year",
    note: "Per-seat license, 150 InMails/mo",
  },
  {
    name: "Indeed Sponsored",
    cost: "~$150+",
    per: "/ mo",
    note: "Per-job daily budget, no fixed fee",
  },
  {
    name: "Greenhouse",
    cost: "$6,500+",
    per: "/ year",
    note: "ATS license, no evaluation included",
  },
  {
    name: "RoundZero Pro",
    cost: "$149",
    per: "/ mo",
    note: "Unlimited jobs, deep evaluations",
  },
];

function CostComparison() {
  return (
    <div className="mt-16 border-t border-border pt-12">
      <div className="grid grid-cols-1 gap-x-12 gap-y-8 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <Eyebrow>Cost comparison</Eyebrow>
          <h3 className="mt-4 text-[clamp(1.5rem,2.6vw,2.1rem)] font-semibold leading-[1.1] tracking-[-0.02em]">
            Replace a $50,000 recruiting budget with a subscription.
          </h3>
          <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
            Traditional platforms charge per job, per seat, or per placement, and still leave you
            with résumés to screen. RoundZero replaces the entire first round with a flat fee that
            includes evaluation.
          </p>
        </div>
        <div className="lg:col-span-7">
          <div className="spec-sheet">
            <div className="grid grid-cols-12 border-b border-border px-5 py-3 font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted-foreground">
              <span className="col-span-5">Platform</span>
              <span className="col-span-3">Cost</span>
              <span className="col-span-4">Notes</span>
            </div>
            {costPlatforms.map((p) => (
              <div
                key={p.name}
                className="grid grid-cols-12 items-baseline border-b border-border px-5 py-4 transition-colors last:border-b-0 hover:bg-muted/40"
              >
                <span
                  className={cn(
                    "col-span-5 text-[15px] font-medium",
                    p.name === "RoundZero Pro" ? "text-foreground" : "text-foreground",
                  )}
                >
                  {p.name}
                </span>
                <span
                  className={cn(
                    "col-span-3 font-mono text-sm tabular-nums",
                    p.name === "RoundZero Pro" ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {p.cost}
                  <span className="text-[11px] text-muted-foreground"> {p.per}</span>
                </span>
                <span className="col-span-4 text-[12.5px] text-muted-foreground">{p.note}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// FAQ
// ───────────────────────────────────────────────────────────────────────────
const faq = [
  {
    q: "How does the AI interview work?",
    a: "Every applicant first goes through a lightweight pre-evaluation. Strong and medium fits are invited to an async chat-based interview with Zero, our interviewer. No scheduling. No video. Zero adapts questions based on the role and the candidate's answers, probing weak responses and validating résumé claims. Most interviews take twenty to forty minutes and can be completed any time.",
  },
  {
    q: "What does a candidate report include?",
    a: "Each report scores candidates across technical depth, communication, and experience credibility. It includes specific strengths, areas of concern, key insights from the interview, and a clear hire / consider / pass recommendation. Every score is linked to evidence in the actual conversation.",
  },
  {
    q: "Is there a voice component to the interview?",
    a: "Yes. After the text interview, candidates complete a short ~5 minute voice conversation to assess real-time communication. The voice assessment is blended into the communication score (60% voice, 40% text). The full transcript and per-dimension scores (clarity, articulation, conciseness, listening, confidence) are visible in the report. Candidates can skip the voice check. The report will note it was excluded.",
  },
  {
    q: "Can candidates cheat or use AI to answer?",
    a: "Built-in guardrails catch AI-generated answers before they reach your report. The interview is adaptive. It follows up on vague answers, asks for specifics about claimed experience, and cross-references every response against the candidate's résumé. The system evaluates consistency, depth, and context, not just correctness. Answers that a model could have written are flagged automatically because they lack the context-specific details that genuine experience produces.",
  },
  {
    q: "How long before I see results?",
    a: "Pre-evaluation runs within minutes of applying. Interviews are completed by candidates on their own schedule, typically within a few days. Reports are generated immediately after the interview ends.",
  },
  {
    q: "Does RoundZero only work for technical roles?",
    a: "No, not at all. RoundZero can evaluate any role as long as the requirements and skills are clearly defined when creating the job. Just create a detailed job description, and our AI will take care of the rest.",
  },
  {
    q: "How is RoundZero different from other AI hiring platforms?",
    a: "Most platforms rely on video interviews or resume screening. Both consume hours of human time per candidate. RoundZero uses adaptive chat-based interviews that run on your behalf. Zero handles salary expectations, relocation preferences, visa requirements, and other screening criteria so your team only speaks to the right candidates. The interview follows up on vague answers, cross-references claims, and adjusts questions based on the role. You get rich, context-specific insights that catch inconsistencies and validate genuine experience. No scheduling friction, no video anxiety.",
  },
];

function FaqSection() {
  return (
    <section className="border-t border-border">
      <div className={cn(CONTAINER, SECTION_PAD)}>
        <div className="grid grid-cols-1 gap-x-12 gap-y-8 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <SectionHeading
              eyebrow="Questions"
              title="Frequently asked"
              lead="Answered with the same plainness we ask of candidates."
            />
          </div>
          <div className="lg:col-span-8">
            <Accordion type="single" collapsible className="w-full">
              {faq.map((f, i) => (
                <AccordionItem key={f.q} value={`q-${i}`}>
                  <AccordionTrigger className="py-5 text-left text-[15px] font-medium hover:no-underline">
                    {f.q}
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="max-w-[68ch] pb-2 text-[14px] leading-relaxed text-muted-foreground">
                      {f.a}
                    </p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </div>
    </section>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Closing
// ───────────────────────────────────────────────────────────────────────────
function Closing() {
  return (
    <section className={cn("border-t border-border", SECTION_TINT, "calm-closing")}>
      <div className={cn(CONTAINER, SECTION_PAD)}>
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow>Get started</Eyebrow>
          <h2 className="mt-5 text-[clamp(2rem,4.4vw,3.5rem)] font-semibold leading-[1.04] tracking-[-0.03em]">
            Run RoundZero before <Highlight>round one</Highlight>
          </h2>
          <p className="mx-auto mt-5 max-w-md text-[clamp(1rem,1.4vw,1.15rem)] leading-relaxed text-muted-foreground">
            Start replacing your first interview round today. Post a job and let evaluated
            candidates come to you.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <PrimaryCta to="/company/login">Post your first job</PrimaryCta>
            <SecondaryCta to="/jobs">Browse jobs</SecondaryCta>
          </div>
        </div>
      </div>
    </section>
  );
}
