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
import { companyLoginLinkForPlan } from "@/features/auth/signup-search";
import {
  PLAN_CONFIGS,
  SUBSCRIPTION_PLANS,
  type SubscriptionPlan,
  teamMemberFeatureLabel,
} from "@/features/billing/config";
import { cn } from "@/lib/utils";
import { DEFAULT_META_TITLE, HOMEPAGE_META_DESCRIPTION } from "@/shared/seo";

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
        title: DEFAULT_META_TITLE,
      },
      {
        name: "description",
        content: HOMEPAGE_META_DESCRIPTION,
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
        <ProductIntro />
        <ValueStrip />
        <HowItWorks />
        <PipelineSection />
        <CandidateExperience />
        <ReportScreenshotSection />
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
const CONTAINER = "mx-auto w-full max-w-[90rem] px-6 lg:px-12 xl:px-16";
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

function TextLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="group inline-flex items-center gap-1 text-sm text-foreground transition-colors hover:text-foreground/80"
    >
      <span className="underline decoration-border underline-offset-[5px] transition-[text-decoration-color] group-hover:decoration-foreground/40">
        {children}
      </span>
      <HugeiconsIcon
        icon={ArrowRight01Icon}
        strokeWidth={2}
        className="size-3.5 transition-transform group-hover:translate-x-0.5"
      />
    </Link>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Hero
// ───────────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="calm-hero relative overflow-hidden">
      <div className={cn(CONTAINER, "pb-0 pt-16 lg:pt-24")}>
        <div className="rise max-w-4xl text-left">
          <h1 className="max-w-3xl text-[clamp(2.5rem,4.8vw,4.25rem)] font-semibold leading-[1.06] tracking-[-0.035em]">
            Review candidates, not <Highlight>resumes</Highlight>.
          </h1>
          <p className="mt-5 max-w-xl text-[clamp(0.95rem,1.2vw,1.05rem)] leading-relaxed text-muted-foreground">
            Purpose-built for hiring teams. Evaluation before the first interview.
          </p>
          <div className="mt-5 flex items-center gap-2.5 text-sm">
            <span className="rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              Free to start
            </span>
            <TextLink to="/company/login">Post a job</TextLink>
          </div>
        </div>
      </div>

      <div className="rise calm-hero-shot">
        <img
          src="/marketing/dashboard.jpeg"
          alt="RoundZero dashboard showing candidates awaiting review with scores and recommendations"
          className="calm-hero-shot__img"
          width={2400}
          height={1500}
          loading="eager"
          decoding="async"
        />
      </div>
    </section>
  );
}

function ProductIntro() {
  return (
    <section className="border-t border-border">
      <div className={cn(CONTAINER, "py-14 lg:py-20")}>
        <p className="max-w-2xl text-left text-[clamp(0.98rem,1.2vw,1.08rem)] leading-relaxed text-muted-foreground">
          Every applicant is evaluated through adaptive interviews and structured assessment. Get
          ranked candidates, evidence-backed reports, and clear hiring recommendations before the
          first human interview.
        </p>
      </div>
    </section>
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
      "check_authenticity completed → consistencyScore=9.4 redFlags=0 explanation=No authenticity concerns",
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
      "evaluate completed → score=5.2 confidence=medium modelNextStep=interview_invited missingCount=4",
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
    message: "save_pre_eval completed → status=pre_screening consistencyScore=9.4",
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
    message: "Workflow complete: score=5.2, modelNextStep=interview_invited, decision=pooled",
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
    message: "report saved → overallScore=8.4 recommendation=strong_yes ranked=01",
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
function ReportScreenshotSection() {
  return (
    <section className={cn("border-t border-border", SECTION_TINT)}>
      <div className={cn(CONTAINER, SECTION_PAD)}>
        <div className="grid grid-cols-1 items-center gap-x-12 gap-y-12 lg:grid-cols-2">
          <SectionHeading
            eyebrow="The report"
            title="See how candidates actually perform"
            lead="Every candidate arrives with a structured report covering reasoning, communication, and relevant experience, plus strengths, concerns, and a clear recommendation."
          />
          <div className="calm-report-shot">
            <img
              src="/marketing/report.jpeg"
              alt="RoundZero post-interview report with scores, strengths, gaps, and interview evidence"
              className="block w-full"
              width={2400}
              height={1500}
              loading="lazy"
              decoding="async"
            />
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
  plan: SubscriptionPlan;
  name: string;
  price: string;
  period: string;
  description: string;
  cta: string;
  featured?: boolean;
};

const tiers: Tier[] = SUBSCRIPTION_PLANS.map((plan) => {
  const config = PLAN_CONFIGS[plan];

  return {
    plan,
    name: config.name,
    price: config.priceLabel,
    period: config.periodLabel,
    description: config.description,
    cta: plan === "free" ? "Start free" : "Get started",
    featured: plan === "growth",
  };
});

const featureRows = [
  {
    label: "Active job postings",
    values: SUBSCRIPTION_PLANS.map((plan) => String(PLAN_CONFIGS[plan].includedJobs)),
  },
  { label: "AI job creation", values: [NOT_INCLUDED, "Included", "Included", "Included"] },
  {
    label: "AI pre-evaluation",
    values: ["All applicants", "All applicants", "All applicants", "All applicants"],
  },
  {
    label: "Evaluation reports per job",
    values: SUBSCRIPTION_PLANS.map((plan) => String(PLAN_CONFIGS[plan].includedReportsPerJob)),
  },
  {
    label: "Teammates (+ you)",
    values: SUBSCRIPTION_PLANS.map((plan) =>
      teamMemberFeatureLabel(PLAN_CONFIGS[plan].includedTeamMembers),
    ),
  },
  { label: "Support", values: ["Email", "Email", "Email", "Email"] },
];

function TierCta({ tier, className }: { tier: Tier; className?: string }) {
  const content = (
    <>
      {tier.cta}
      <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} />
    </>
  );
  const classes = cn("w-full rounded-full", className);
  if (tier.plan === "free") {
    return (
      <Button variant={tier.featured ? "default" : "outline"} className={classes} asChild>
        <Link to="/company/login">{content}</Link>
      </Button>
    );
  }
  return (
    <Button variant={tier.featured ? "default" : "outline"} className={classes} asChild>
      <Link {...companyLoginLinkForPlan(tier.plan)}>{content}</Link>
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
              Compare RoundZero pricing tiers for active jobs, AI features, reports, and support.
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
                        <span className="font-mono text-xs text-muted-foreground font-medium">
                          / {t.period}
                        </span>
                      </div>
                      <p className="text-[13px] leading-relaxed text-muted-foreground font-medium">
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
    name: "RoundZero Growth",
    cost: "$99",
    per: " / mo",
    note: `${PLAN_CONFIGS.growth.includedJobs} jobs, deep evaluations`,
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
                    p.name === "RoundZero Growth" ? "text-foreground" : "text-foreground",
                  )}
                >
                  {p.name}
                </span>
                <span
                  className={cn(
                    "col-span-3 font-mono text-sm tabular-nums",
                    p.name === "RoundZero Growth" ? "text-foreground" : "text-muted-foreground",
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
    a: "Each report scores candidates across technical depth, communication, and experience credibility. It includes specific strengths, areas of concern, key insights from the interview, and a clear shortlist / borderline / reject recommendation. Every score is linked to evidence in the actual conversation.",
  },
  {
    q: "Is there a voice component to the interview?",
    a: "Yes. After the text interview, candidates complete a short ~5 minute voice conversation to assess real-time communication. The voice assessment is blended into the communication score (60% voice, 40% text). The full transcript and per-dimension scores (clarity, articulation, conciseness, listening, confidence) are visible in the report. The voice check is required to complete the interview.",
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
