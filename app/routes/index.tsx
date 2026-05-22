import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { PublicFooter, PublicHeader } from "@/components/public-layout";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  beforeLoad: ({ context }) => {
    if (context.user) {
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
          "Run AI-driven first-round interviews and get ranked candidates with structured evaluation reports. Skip resume screening — evaluate how candidates actually think.",
      },
      {
        property: "og:url",
        content: "https://roundzero.dev/",
      },
    ],
    links: [
      {
        rel: "canonical",
        href: "https://roundzero.dev/",
      },
    ],
  }),
  component: HomePage,
});

const ISSUE_LABEL = "The Time of Résumés is Over · Vol. 01 · Spring 2026";

function HomePage() {
  return (
    <div className="editorial min-h-svh">
      <a href="#main-content" className="editorial-skip-link">
        Skip to main content
      </a>
      <PublicHeader />
      <main id="main-content">
        <Hero />
        <Ticker />
        <Chapter roman="I" title="How it works" kicker="The flow">
          <HowItWorks />
        </Chapter>
        <Chapter roman="II" title="What candidates experience" kicker="The interview">
          <InterviewSpread />
        </Chapter>
        <Chapter roman="III" title="See how candidates actually perform" kicker="The report">
          <ReportSpread />
        </Chapter>
        <Chapter roman="IV" title="Ranked, not filtered" kicker="Ranking">
          <RankingSpread />
        </Chapter>
        <Chapter roman="V" title="Pricing, plainly stated" kicker="Subscriptions">
          <PricingTable />
          <CostComparison />
        </Chapter>
        <Chapter roman="VI" title="Frequently asked" kicker="Correspondence">
          <Faq />
        </Chapter>
        <Closing />
      </main>
      <PublicFooter />
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Shared editorial primitives
// ───────────────────────────────────────────────────────────────────────────

function Rule({ thick = false }: { thick?: boolean }) {
  return (
    <hr
      className="my-0 w-full border-0"
      style={{
        borderTop: thick ? "2px solid var(--ed-ink)" : "1px solid var(--ed-rule)",
      }}
    />
  );
}

function SmallCaps({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-block text-[10.5px] font-medium uppercase ${className}`}
      style={{
        letterSpacing: "0.22em",
        color: "var(--ed-muted)",
        fontFeatureSettings: '"smcp"',
      }}
    >
      {children}
    </span>
  );
}

function Roman({ n }: { n: string }) {
  return (
    <span
      className="font-serif"
      style={{
        fontStyle: "italic",
        fontWeight: 400,
        color: "var(--ed-accent)",
        fontVariationSettings: '"opsz" 144, "SOFT" 100',
      }}
    >
      {n}.
    </span>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Hero — editorial masthead
// ───────────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative">
      <div className="mx-auto w-full max-w-6xl px-6 lg:px-8">
        {/* Masthead row */}
        <div className="flex items-center justify-between pt-10 pb-6">
          <SmallCaps>{ISSUE_LABEL}</SmallCaps>
          <SmallCaps className="hidden md:inline-block">By RoundZero</SmallCaps>
        </div>
        <Rule thick />

        {/* Hero headline */}
        <div className="grid grid-cols-12 gap-x-6 gap-y-10 pt-14 pb-16 lg:pt-24 lg:pb-24">
          <div className="col-span-12 lg:col-span-9 ed-rise">
            <h1
              className="font-serif text-[clamp(2.75rem,7.4vw,7.25rem)] leading-[0.95] tracking-[-0.02em]"
              style={{
                color: "var(--ed-ink)",
                fontWeight: 350,
                fontVariationSettings: '"opsz" 144, "SOFT" 50',
              }}
            >
              Replace your first interview round with{" "}
              <span style={{ color: "var(--ed-accent)" }}>AI</span>
            </h1>
          </div>

          {/* Right rail — byline and lede */}
          <aside className="col-span-12 lg:col-span-3 lg:pt-3">
            <div
              className="space-y-5 lg:border-l lg:pl-5"
              style={{ borderColor: "var(--ed-rule)" }}
            >
              <SmallCaps>The lede</SmallCaps>
              <p
                className="font-serif text-[17px] leading-normal"
                style={{ color: "var(--ed-ink)" }}
              >
                Post a job, get ranked reports. No résumés to sift through.
              </p>
              <p className="text-[13px] leading-normal" style={{ color: "var(--ed-muted)" }}>
                The time of résumés is over. Candidates use AI to apply — RoundZero uses AI to
                evaluate. Cut through the noise. Beat AI with AI.
              </p>
              <div className="flex flex-col gap-2 pt-1">
                <EditorialButton to="/company/login" primary>
                  Post a job
                </EditorialButton>
                <EditorialButton to="/jobs">Browse jobs</EditorialButton>
              </div>
            </div>
          </aside>
        </div>

        <Rule />

        {/* Drop-cap intro paragraph */}
        <div className="grid grid-cols-12 gap-x-6 py-14 lg:py-20">
          <div className="col-span-12 lg:col-span-2">
            <SmallCaps>An introduction</SmallCaps>
          </div>
          <div className="col-span-12 lg:col-span-7 lg:col-start-3">
            <p
              className="font-serif text-[clamp(1.1rem,1.7vw,1.45rem)] leading-[1.55]"
              style={{ color: "var(--ed-ink)" }}
            >
              <span
                className="float-left mr-3 mt-2 font-serif text-[5.4rem] leading-[0.78]"
                style={{
                  color: "var(--ed-accent)",
                  fontWeight: 400,
                  fontVariationSettings: '"opsz" 144',
                }}
              >
                T
              </span>
              he hiring funnel still starts with résumés — a weak signal that's easy to game. Years
              of experience is a proxy, not a measurement. Great engineers can look average on
              paper, and weak candidates can fabricate their way past ATS filters. RoundZero cuts
              through the noise. It evaluates how candidates actually think, not what they claim in
              a document. What follows is how that works.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function EditorialButton({
  to,
  children,
  primary = false,
}: {
  to: string;
  children: React.ReactNode;
  primary?: boolean;
}) {
  const base =
    "editorial-cta group relative inline-flex w-full items-center justify-between gap-4 px-4 py-3 text-[13px] tracking-tight transition-colors";
  if (primary) {
    return (
      <Link
        to={to}
        className={base}
        style={{
          background: "var(--ed-ink)",
          color: "var(--ed-paper)",
          border: "1px solid var(--ed-ink)",
        }}
      >
        <span>{children}</span>
        <span className="font-serif italic">→</span>
      </Link>
    );
  }
  return (
    <Link
      to={to}
      className={base}
      style={{
        border: "1px solid var(--ed-ink)",
        color: "var(--ed-ink)",
      }}
    >
      <span>{children}</span>
      <span className="font-serif italic">→</span>
    </Link>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Ticker — small data row
// ───────────────────────────────────────────────────────────────────────────
const tickerStats = [
  { label: "Skip", value: "Resume screening" },
  { label: "Cut through", value: "ATS noise" },
  { label: "Evaluate", value: "How candidates think" },
  { label: "Get", value: "Ranked reports, not files" },
];

function Ticker() {
  return (
    <div className="relative">
      <div className="mx-auto w-full max-w-6xl px-6 lg:px-8">
        <Rule />
        <div className="grid grid-cols-2 md:grid-cols-4">
          {tickerStats.map((s, i) => (
            <div
              key={s.label}
              className="flex flex-col gap-1.5 py-6 md:py-8"
              style={{
                borderLeft: i === 0 ? "none" : "1px solid var(--ed-rule-hair)",
                paddingLeft: i === 0 ? 0 : 24,
              }}
            >
              <SmallCaps>{s.label}</SmallCaps>
              <span
                className="font-serif text-[clamp(1.4rem,2.4vw,2rem)]"
                style={{ color: "var(--ed-ink)", fontWeight: 400 }}
              >
                {s.value}
              </span>
            </div>
          ))}
        </div>
        <Rule />
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Chapter wrapper
// ───────────────────────────────────────────────────────────────────────────
function Chapter({
  roman,
  title,
  kicker,
  children,
}: {
  roman: string;
  title: string;
  kicker: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mx-auto w-full max-w-6xl px-6 lg:px-8">
        <div className="flex items-end justify-between gap-6 pt-20 pb-6 lg:pt-28">
          <div className="flex items-baseline gap-4 md:gap-5">
            <span
              className="font-serif text-[clamp(1.6rem,2.4vw,2.4rem)] leading-none shrink-0"
              style={{ color: "var(--ed-accent)", fontWeight: 400 }}
            >
              <Roman n={roman} />
            </span>
            <h2
              className="font-serif text-[clamp(1.7rem,3.6vw,3.25rem)] leading-[1.05] tracking-[-0.015em] max-w-[18ch]"
              style={{ color: "var(--ed-ink)", fontWeight: 400 }}
            >
              {title}
            </h2>
          </div>
          <SmallCaps className="hidden shrink-0 pb-2 md:inline-block">{kicker}</SmallCaps>
        </div>
        <Rule />
        <div className="py-14 lg:py-20">{children}</div>
      </div>
    </section>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// I. How it works
// ───────────────────────────────────────────────────────────────────────────
const steps = [
  {
    n: "01",
    title: "You post a job.",
    body: "Describe the role. RoundZero handles the rest. No ATS setup, no keyword filters, no manual screening.",
  },
  {
    n: "02",
    title: "Candidates apply.",
    body: "Applicants submit and go — RoundZero takes over. Pre-evaluation runs immediately. Zero handles salary, relocation, visa, and other screening so your team doesn't have to.",
  },
  {
    n: "03",
    title: "Ranked reports roll in.",
    body: "Strong candidates are interviewed by Zero, then you get ranked reports with scores, strengths, and evidence. You're notified the moment they're ready.",
  },
  {
    n: "04",
    title: "Focus on the best.",
    body: "Review only the top-ranked candidates. Every score links to real conversation — no more guessing.",
  },
];

function HowItWorks() {
  return (
    <div className="grid grid-cols-12 gap-x-6 gap-y-12">
      {steps.map((step, i) => (
        <article key={step.n} className="col-span-12 md:col-span-6 lg:col-span-3">
          <div className="flex items-baseline gap-3 mb-4">
            <span className="font-mono text-[11px]" style={{ color: "var(--ed-muted)" }}>
              {step.n}
            </span>
            <div className="flex-1 h-px" style={{ background: "var(--ed-rule-hair)" }} />
          </div>
          <h3
            className="font-serif text-[1.6rem] leading-[1.1] mb-3"
            style={{ color: "var(--ed-ink)", fontWeight: 400 }}
          >
            {step.title}
          </h3>
          <p className="text-[14.5px] leading-[1.6]" style={{ color: "var(--ed-muted)" }}>
            {step.body}
          </p>
          {i < steps.length - 1 ? null : null}
        </article>
      ))}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// II. Interview — pull-quote left, transcript right
// ───────────────────────────────────────────────────────────────────────────
const transcript = [
  {
    role: "Zero",
    text: "You mentioned building a real-time notification system. Walk me through the architecture decisions.",
  },
  {
    role: "Sarah",
    text: "Pub/sub with Redis Streams for brokering. The tradeoff was latency vs. ordering — we chose at-least-once with client-side dedup.",
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

function InterviewSpread() {
  return (
    <div className="grid grid-cols-12 gap-x-6 gap-y-12">
      <div className="col-span-12 lg:col-span-6">
        <SmallCaps>Pulled from a recent interview</SmallCaps>
        <blockquote
          className="font-editorial mt-4 text-[clamp(1.35rem,2.4vw,2rem)] leading-[1.3]"
          style={{
            color: "var(--ed-ink)",
            fontStyle: "italic",
            fontWeight: 400,
          }}
        >
          <span style={{ color: "var(--ed-accent)" }}>“</span>It noticed I’d been vague about Redis
          Streams and asked me to draw out exactly how messages were ordered. It felt less like a
          quiz and more like a conversation with a senior engineer who had already read my résumé.
          <span style={{ color: "var(--ed-accent)" }}>”</span>
        </blockquote>
        <p className="mt-6 text-[13px]" style={{ color: "var(--ed-muted)" }}>
          — Sarah Chen, Senior Backend Engineer
        </p>

        <div className="mt-8 space-y-4 max-w-md">
          <h4
            className="font-serif text-[1.25rem]"
            style={{ color: "var(--ed-ink)", fontWeight: 400 }}
          >
            What the interview is built to do.
          </h4>
          <ul className="space-y-3">
            {[
              "Validate specific claims on the résumé.",
              "Probe role-relevant judgement, not trivia.",
              "Follow up on vagueness, the way a human would.",
              "Stay concise (20–40 minutes, async).",
            ].map((line) => (
              <li
                key={line}
                className="flex gap-3 text-[14.5px] leading-[1.55]"
                style={{ color: "var(--ed-ink)" }}
              >
                <span className="font-serif italic shrink-0" style={{ color: "var(--ed-accent)" }}>
                  ¶
                </span>
                {line}
              </li>
            ))}
          </ul>

          <div className="mt-6 space-y-4 max-w-md">
            <h4
              className="font-serif text-[1.25rem]"
              style={{ color: "var(--ed-ink)", fontWeight: 400 }}
            >
              For candidates.
            </h4>
            <ul className="space-y-3">
              {[
                "Get evaluated beyond your resume.",
                "Show how you think and solve problems.",
                "Avoid being filtered out by keyword matching.",
                "Fairer and more meaningful evaluation.",
              ].map((line) => (
                <li
                  key={line}
                  className="flex gap-3 text-[14.5px] leading-[1.55]"
                  style={{ color: "var(--ed-ink)" }}
                >
                  <span
                    className="font-serif italic shrink-0"
                    style={{ color: "var(--ed-accent)" }}
                  >
                    ¶
                  </span>
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="col-span-12 lg:col-span-6">
        <div
          className="border"
          style={{
            borderColor: "var(--ed-ink)",
            background: "var(--ed-paper-soft)",
          }}
        >
          <div
            className="flex items-start justify-between gap-2 px-5 py-3"
            style={{ borderBottom: "1px solid var(--ed-ink)" }}
          >
            <SmallCaps className="wrap-break-word max-w-[70%]">
              Transcript · Senior Backend Engineer
            </SmallCaps>
            <span className="font-mono text-[10px] shrink-0" style={{ color: "var(--ed-muted)" }}>
              MIN 18:42
            </span>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--ed-rule-hair)" }}>
            {transcript.map((t, i) => (
              <div
                key={i}
                className="grid grid-cols-12 gap-3 px-5 py-4"
                style={{
                  borderBottom:
                    i === transcript.length - 1 ? "none" : "1px solid var(--ed-rule-hair)",
                }}
              >
                <div className="col-span-3 md:col-span-2">
                  <span
                    className="font-mono text-[10.5px]"
                    style={{
                      color: t.role === "Zero" ? "var(--ed-accent)" : "var(--ed-muted)",
                      letterSpacing: "0.08em",
                    }}
                  >
                    {t.role.toUpperCase()}
                  </span>
                </div>
                <p
                  className="col-span-9 md:col-span-10 text-[14px] leading-[1.55]"
                  style={{ color: "var(--ed-ink)" }}
                >
                  {t.text}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div
          className="mt-8 border"
          style={{
            borderColor: "var(--ed-ink)",
            background: "var(--ed-paper-soft)",
          }}
        >
          <div
            className="flex items-start justify-between gap-2 px-5 py-3"
            style={{ borderBottom: "1px solid var(--ed-ink)" }}
          >
            <SmallCaps className="wrap-break-word max-w-[70%]">Voice assessment · 5 min</SmallCaps>
            <span className="font-mono text-[10px] shrink-0" style={{ color: "var(--ed-muted)" }}>
              CLARITY 78
            </span>
          </div>
          <div className="px-5 py-5 space-y-5">
            <div className="flex items-center gap-px h-12">
              {[
                10, 7, 14, 9, 18, 12, 22, 16, 26, 19, 30, 22, 28, 18, 24, 14, 20, 11, 16, 8, 12, 6,
                8, 4,
              ].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-full"
                  style={{
                    height: `${h}px`,
                    background: i > 16 ? "var(--ed-rule)" : "var(--ed-ink)",
                    opacity: i > 16 ? 0.3 : undefined,
                  }}
                />
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2 md:grid-cols-5 md:gap-3">
              {[
                { label: "Clarity", value: 78 },
                { label: "Articulation", value: 72 },
                { label: "Conciseness", value: 65 },
                { label: "Listening", value: 80 },
                { label: "Confidence", value: 70 },
              ].map((dim) => (
                <div key={dim.label} className="text-center min-w-0">
                  <span className="font-mono text-[13px]" style={{ color: "var(--ed-ink)" }}>
                    {dim.value}
                  </span>
                  <div className="mt-1 h-0.5 w-full" style={{ background: "var(--ed-rule-hair)" }}>
                    <div
                      className="h-full"
                      style={{ background: "var(--ed-accent)", width: `${dim.value}%` }}
                    />
                  </div>
                  <SmallCaps>{dim.label}</SmallCaps>
                </div>
              ))}
            </div>

            <p className="text-[12px] leading-normal" style={{ color: "var(--ed-muted)" }}>
              Voice communication is assessed after the text interview and blended into the final
              communication score (60% voice, 40% text).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// III. Report — dossier-style spread
// ───────────────────────────────────────────────────────────────────────────
const reportScores = [
  { label: "Technical depth", value: 9.1, note: "System design, distributed tradeoffs" },
  { label: "Communication", value: 7.8, note: "Concise, structured under pressure" },
  { label: "Experience", value: 8.2, note: "Validated against four prior roles" },
  { label: "Ownership", value: 8.5, note: "Drove rollout, handled rollback" },
];

function ReportSpread() {
  return (
    <div className="grid grid-cols-12 gap-x-6 gap-y-12">
      {/* Dossier header */}
      <div className="col-span-12 lg:col-span-5">
        <SmallCaps>Dossier no. 0481 · Strong hire</SmallCaps>
        <h3
          className="font-serif text-[clamp(1.8rem,3vw,2.6rem)] leading-[1.05] mt-4"
          style={{ color: "var(--ed-ink)", fontWeight: 400 }}
        >
          Sarah Chen
          <br />
          <span
            className="font-editorial"
            style={{ fontStyle: "italic", color: "var(--ed-muted)" }}
          >
            for Senior Backend Engineer
          </span>
        </h3>
        <div className="mt-6 flex items-baseline gap-3" style={{ color: "var(--ed-ink)" }}>
          <span className="font-serif text-[5rem] leading-none" style={{ fontWeight: 350 }}>
            8.4
          </span>
          <span className="font-mono text-[11px]" style={{ color: "var(--ed-muted)" }}>
            / 10
          </span>
        </div>
        <p
          className="mt-4 max-w-sm text-[14.5px] leading-[1.6]"
          style={{ color: "var(--ed-muted)" }}
        >
          Each candidate comes with a structured report covering reasoning, communication, and
          relevant experience — with an overall score, key strengths and concerns, and role-specific
          evaluation.
        </p>
      </div>

      {/* Scores table */}
      <div className="col-span-12 lg:col-span-7">
        <div className="space-y-5">
          {reportScores.map((s, i) => (
            <div key={s.label}>
              <div className="grid grid-cols-12 gap-4 items-baseline pb-2">
                <span
                  className="col-span-7 md:col-span-5 font-serif text-[1.1rem]"
                  style={{ color: "var(--ed-ink)", fontWeight: 400 }}
                >
                  {s.label}
                </span>
                <span
                  className="col-span-5 md:col-span-5 text-[12.5px] hidden md:block"
                  style={{ color: "var(--ed-muted)" }}
                >
                  {s.note}
                </span>
                <span
                  className="col-span-5 md:col-span-2 text-right font-mono text-[15px]"
                  style={{ color: "var(--ed-ink)" }}
                >
                  {s.value.toFixed(1)}
                </span>
              </div>
              <div className="h-0.5 w-full" style={{ background: "var(--ed-rule-hair)" }}>
                <div
                  className="h-full"
                  style={{
                    background: "var(--ed-ink)",
                    width: `${(s.value / 10) * 100}%`,
                  }}
                />
              </div>
              {i < reportScores.length - 1 ? (
                <p className="md:hidden mt-2 text-[12.5px]" style={{ color: "var(--ed-muted)" }}>
                  {s.note}
                </p>
              ) : null}
            </div>
          ))}
        </div>

        {/* Strengths / concerns */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8">
          <div>
            <SmallCaps>Strengths</SmallCaps>
            <ul className="mt-4 space-y-3">
              {[
                "Deep understanding of distributed systems tradeoffs.",
                "Clear, structured communication under pressure.",
                "Demonstrated ownership across the rollout cycle.",
              ].map((s) => (
                <li
                  key={s}
                  className="flex gap-3 text-[14px] leading-[1.55]"
                  style={{ color: "var(--ed-ink)" }}
                >
                  <span
                    className="font-serif italic shrink-0"
                    style={{ color: "var(--ed-accent)" }}
                  >
                    +
                  </span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <SmallCaps>Areas of concern</SmallCaps>
            <ul className="mt-4 space-y-3">
              {[
                "Limited exposure to observability beyond basic logging.",
                "Vague answer on CI/CD pipeline design — flagged for follow-up.",
              ].map((s) => (
                <li
                  key={s}
                  className="flex gap-3 text-[14px] leading-[1.55]"
                  style={{ color: "var(--ed-ink)" }}
                >
                  <span className="font-serif italic shrink-0" style={{ color: "var(--ed-muted)" }}>
                    −
                  </span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// IV. Ranking — actual ranked list as table
// ───────────────────────────────────────────────────────────────────────────
const ranking = [
  { rank: 1, name: "Sarah Chen", score: 8.4, rec: "Strong hire" },
  { rank: 2, name: "Marcus Johnson", score: 7.9, rec: "Strong hire" },
  { rank: 3, name: "Priya Patel", score: 7.2, rec: "Consider" },
  { rank: 4, name: "Alex Kim", score: 5.8, rec: "Pass" },
  { rank: 5, name: "Diego Alvarez", score: 5.4, rec: "Pass" },
];

function recColor(rec: string) {
  if (rec === "Strong hire") return "var(--ed-ink)";
  if (rec === "Consider") return "var(--ed-accent)";
  return "var(--ed-muted)";
}

function RankingSpread() {
  return (
    <div className="grid grid-cols-12 gap-x-6 gap-y-10">
      <div className="col-span-12 lg:col-span-4">
        <p
          className="font-serif text-[clamp(1.2rem,1.8vw,1.55rem)] leading-[1.45] max-w-[28ch]"
          style={{ color: "var(--ed-ink)" }}
        >
          After RoundZero, you don’t see applicants — you see ranked candidates.
        </p>
        <p
          className="mt-6 text-[13.5px] leading-[1.6] max-w-md"
          style={{ color: "var(--ed-muted)" }}
        >
          Candidates are ordered by actual evaluation, not keyword matches or resume quality. Every
          recommendation links back to real responses and reasoning.
        </p>
      </div>

      <div className="col-span-12 lg:col-span-8">
        <div className="border" style={{ borderColor: "var(--ed-ink)" }}>
          <div
            className="grid grid-cols-12 px-5 py-3 text-[10.5px] uppercase"
            style={{
              borderBottom: "1px solid var(--ed-ink)",
              color: "var(--ed-muted)",
              letterSpacing: "0.18em",
              fontFamily: "var(--font-mono)",
            }}
          >
            <span className="col-span-1">#</span>
            <span className="col-span-6">Candidate</span>
            <span className="col-span-3">Recommendation</span>
            <span className="col-span-2 text-right">Score</span>
          </div>
          {ranking.map((r) => (
            <div
              key={r.rank}
              className="grid grid-cols-12 px-5 py-4 items-baseline"
              style={{
                borderBottom: "1px solid var(--ed-rule-hair)",
              }}
            >
              <span
                className="col-span-1 font-mono text-[12px]"
                style={{ color: "var(--ed-muted)" }}
              >
                {String(r.rank).padStart(2, "0")}
              </span>
              <span
                className="col-span-6 font-serif text-[1.05rem]"
                style={{ color: "var(--ed-ink)", fontWeight: 400 }}
              >
                {r.name}
              </span>
              <span
                className="col-span-3 font-editorial text-[14px]"
                style={{
                  fontStyle: "italic",
                  color: recColor(r.rec),
                }}
              >
                {r.rec}
              </span>
              <span
                className="col-span-2 text-right font-mono text-[14px]"
                style={{ color: "var(--ed-ink)" }}
              >
                {r.score.toFixed(1)}
              </span>
            </div>
          ))}
          <div
            className="px-5 py-3 flex items-center justify-between text-[11px]"
            style={{
              color: "var(--ed-muted)",
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.04em",
            }}
          >
            <span>5 evaluated</span>
            <span>87 in pipeline · still readable</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// V. Pricing — comparison table
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
  { label: "AI job creation", values: ["—", "Included", "Included"] },
  { label: "AI pre-evaluation", values: ["All applicants", "All applicants", "All applicants"] },
  { label: "Deep-evaluated reports", values: ["5 per job", "Top fits", "Top fits"] },
  { label: "Custom evaluation criteria", values: ["—", "Included", "Included"] },
  { label: "Team seats", values: ["1", "5", "Unlimited"] },
  { label: "API & integrations", values: ["—", "—", "Included"] },
  { label: "Support", values: ["Email", "Priority", "Dedicated AM"] },
];

function PricingTable() {
  return (
    <div>
      {/* Desktop table */}
      <table className="hidden md:table w-full border-collapse">
        <caption className="sr-only">
          Compare RoundZero pricing tiers for active jobs, reports, seats, integrations, and
          support.
        </caption>
        <thead style={{ borderBottom: "1px solid var(--ed-ink)" }}>
          <tr>
            <th scope="col" className="w-1/4 pb-6 text-left" />
            {tiers.map((t) => (
              <th
                key={t.name}
                scope="col"
                className="w-1/4 px-3 pb-6 align-top text-left first:pl-0 last:pr-0"
              >
                <div className="flex flex-col gap-2">
                  <SmallCaps>{t.featured ? "Editor’s pick" : "\u00A0"}</SmallCaps>
                  <span
                    className="font-serif text-[1.5rem]"
                    style={{ color: "var(--ed-ink)", fontWeight: 400 }}
                  >
                    {t.name}
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span
                      className="font-serif text-[2.4rem] leading-none"
                      style={{ color: "var(--ed-ink)", fontWeight: 350 }}
                    >
                      {t.price}
                    </span>
                    <span
                      className="font-editorial text-[13px]"
                      style={{ color: "var(--ed-muted)", fontStyle: "italic" }}
                    >
                      / {t.period}
                    </span>
                  </div>
                  <p
                    className="max-w-[26ch] text-[13px] leading-normal"
                    style={{ color: "var(--ed-muted)" }}
                  >
                    {t.description}
                  </p>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {featureRows.map((row) => (
            <tr key={row.label} style={{ borderBottom: "1px solid var(--ed-rule-hair)" }}>
              <th
                scope="row"
                className="py-4 pr-6 text-left align-top font-serif text-[15px]"
                style={{ color: "var(--ed-ink)", fontWeight: 400 }}
              >
                {row.label}
              </th>
              {row.values.map((value, valueIndex) => (
                <td
                  key={`${row.label}-${tiers[valueIndex]?.name}`}
                  className="px-3 py-4 align-top text-[14px] first:pl-0 last:pr-0"
                  style={{
                    color: value === "—" ? "var(--ed-muted)" : "var(--ed-ink)",
                    fontFamily: value === "—" || /\d/.test(value) ? "var(--font-mono)" : undefined,
                    fontSize: value === "—" || /\d/.test(value) ? "13px" : undefined,
                  }}
                >
                  {value}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile cards */}
      <div className="md:hidden space-y-8">
        {tiers.map((t, tierIndex) => (
          <div key={t.name} className="border px-4 py-5" style={{ borderColor: "var(--ed-ink)" }}>
            <div className="flex flex-col gap-2 mb-6">
              <SmallCaps>{t.featured ? "Editor’s pick" : "\u00A0"}</SmallCaps>
              <span
                className="font-serif text-[1.5rem]"
                style={{ color: "var(--ed-ink)", fontWeight: 400 }}
              >
                {t.name}
              </span>
              <div className="flex items-baseline gap-2">
                <span
                  className="font-serif text-[2.4rem] leading-none"
                  style={{ color: "var(--ed-ink)", fontWeight: 350 }}
                >
                  {t.price}
                </span>
                <span
                  className="font-editorial text-[13px]"
                  style={{ color: "var(--ed-muted)", fontStyle: "italic" }}
                >
                  / {t.period}
                </span>
              </div>
              <p className="text-[13px] leading-normal" style={{ color: "var(--ed-muted)" }}>
                {t.description}
              </p>
            </div>
            <dl className="space-y-3">
              {featureRows.map((row) => {
                const value = row.values[tierIndex];
                return (
                  <div
                    key={row.label}
                    className="flex items-baseline justify-between gap-x-4"
                    style={{ borderTop: "1px solid var(--ed-rule-hair)", paddingTop: "10px" }}
                  >
                    <dt
                      className="font-serif text-[15px]"
                      style={{ color: "var(--ed-ink)", fontWeight: 400 }}
                    >
                      {row.label}
                    </dt>
                    <dd
                      className="shrink-0 text-right text-[14px]"
                      style={{
                        color: value === "—" ? "var(--ed-muted)" : "var(--ed-ink)",
                        fontFamily:
                          value === "—" || /\d/.test(value) ? "var(--font-mono)" : undefined,
                        fontSize: value === "—" || /\d/.test(value) ? "13px" : undefined,
                      }}
                    >
                      {value}
                    </dd>
                  </div>
                );
              })}
            </dl>
            {t.href.startsWith("mailto:") ? (
              <a
                href={t.href}
                className="editorial-cta group mt-6 flex w-full items-center justify-between gap-3 px-4 py-3 text-[13px] tracking-tight"
                style={
                  t.featured
                    ? {
                        background: "var(--ed-ink)",
                        color: "var(--ed-paper)",
                        border: "1px solid var(--ed-ink)",
                      }
                    : {
                        border: "1px solid var(--ed-ink)",
                        color: "var(--ed-ink)",
                      }
                }
              >
                <span>{t.cta}</span>
                <span className="font-serif italic">→</span>
              </a>
            ) : (
              <Link
                to={t.href}
                className="editorial-cta group mt-6 flex w-full items-center justify-between gap-3 px-4 py-3 text-[13px] tracking-tight"
                style={
                  t.featured
                    ? {
                        background: "var(--ed-ink)",
                        color: "var(--ed-paper)",
                        border: "1px solid var(--ed-ink)",
                      }
                    : {
                        border: "1px solid var(--ed-ink)",
                        color: "var(--ed-ink)",
                      }
                }
              >
                <span>{t.cta}</span>
                <span className="font-serif italic">→</span>
              </Link>
            )}
          </div>
        ))}
      </div>

      {/* Desktop CTA row */}
      <div className="hidden md:grid grid-cols-12 gap-x-6 pt-8">
        <div className="col-span-3" />
        {tiers.map((t) => (
          <div key={t.name} className="col-span-3">
            {t.href.startsWith("mailto:") ? (
              <a
                href={t.href}
                className="editorial-cta group flex w-full items-center justify-between gap-3 px-4 py-3 text-[13px] tracking-tight"
                style={
                  t.featured
                    ? {
                        background: "var(--ed-ink)",
                        color: "var(--ed-paper)",
                        border: "1px solid var(--ed-ink)",
                      }
                    : {
                        border: "1px solid var(--ed-ink)",
                        color: "var(--ed-ink)",
                      }
                }
              >
                <span>{t.cta}</span>
                <span className="font-serif italic">→</span>
              </a>
            ) : (
              <Link
                to={t.href}
                className="editorial-cta group flex w-full items-center justify-between gap-3 px-4 py-3 text-[13px] tracking-tight"
                style={
                  t.featured
                    ? {
                        background: "var(--ed-ink)",
                        color: "var(--ed-paper)",
                        border: "1px solid var(--ed-ink)",
                      }
                    : {
                        border: "1px solid var(--ed-ink)",
                        color: "var(--ed-ink)",
                      }
                }
              >
                <span>{t.cta}</span>
                <span className="font-serif italic">→</span>
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Cost comparison
// ───────────────────────────────────────────────────────────────────────────
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
  { name: "RoundZero Pro", cost: "$149", per: "/ month", note: "Unlimited jobs, deep evaluations" },
];

function CostComparison() {
  return (
    <div className="mt-20 pt-12" style={{ borderTop: "1px solid var(--ed-rule)" }}>
      <div className="grid grid-cols-12 gap-x-6 gap-y-8">
        <div className="col-span-12 lg:col-span-5">
          <SmallCaps>Cost comparison</SmallCaps>
          <h3
            className="font-serif text-[clamp(1.5rem,2.8vw,2.4rem)] leading-[1.05] mt-4"
            style={{ color: "var(--ed-ink)", fontWeight: 400 }}
          >
            Replace a $50,000 recruiting budget with a subscription.
          </h3>
          <p className="mt-4 text-[14.5px] leading-[1.6]" style={{ color: "var(--ed-muted)" }}>
            Traditional hiring platforms charge per job, per seat, or per placement — and still
            leave you with résumés to screen. RoundZero replaces the entire first round with a flat
            fee that includes evaluation.
          </p>
        </div>
        <div className="col-span-12 lg:col-span-7">
          <div className="border" style={{ borderColor: "var(--ed-ink)" }}>
            <div
              className="grid grid-cols-12 px-5 py-3 text-[10.5px] uppercase"
              style={{
                borderBottom: "1px solid var(--ed-ink)",
                color: "var(--ed-muted)",
                letterSpacing: "0.18em",
                fontFamily: "var(--font-mono)",
              }}
            >
              <span className="col-span-5">Platform</span>
              <span className="col-span-3">Cost</span>
              <span className="col-span-4">Notes</span>
            </div>
            {costPlatforms.map((p) => (
              <div
                key={p.name}
                className="grid grid-cols-12 px-5 py-4 items-baseline"
                style={{ borderBottom: "1px solid var(--ed-rule-hair)" }}
              >
                <span
                  className="col-span-5 font-serif text-[15px]"
                  style={{ color: "var(--ed-ink)", fontWeight: 400 }}
                >
                  {p.name}
                </span>
                <span
                  className="col-span-3 font-mono text-[14px]"
                  style={{
                    color: p.name === "RoundZero Pro" ? "var(--ed-ink)" : "var(--ed-muted)",
                  }}
                >
                  {p.cost}
                  <span className="font-editorial text-[11px]" style={{ fontStyle: "italic" }}>
                    {" "}
                    {p.per}
                  </span>
                </span>
                <span className="col-span-4 text-[12.5px]" style={{ color: "var(--ed-muted)" }}>
                  {p.note}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// VI. FAQ — column treatment
// ───────────────────────────────────────────────────────────────────────────
const faq = [
  {
    q: "How does the AI interview work?",
    a: "Every applicant first goes through a lightweight pre-evaluation. Strong and medium fits are invited to an async chat-based interview with Zero, our interviewer. No scheduling. No video. Zero adapts questions based on the role and the candidate’s answers, probing weak responses and validating résumé claims. Most interviews take twenty to forty minutes and can be completed any time.",
  },
  {
    q: "What does a candidate report include?",
    a: "Each report scores candidates across technical depth, communication, and experience credibility. It includes specific strengths, areas of concern, key insights from the interview, and a clear hire / consider / pass recommendation — every score linked to evidence in the actual conversation.",
  },
  {
    q: "Is there a voice component to the interview?",
    a: "Yes. After the text interview, candidates complete a short ~5 minute voice conversation to assess real-time communication. The voice assessment is blended into the communication score (60% voice, 40% text). The full transcript and per-dimension scores (clarity, articulation, conciseness, listening, confidence) are visible in the report. Candidates can skip the voice check — the report will note it was excluded.",
  },
  {
    q: "Can candidates cheat or use AI to answer?",
    a: "Built-in guardrails catch AI-generated answers before they reach your report. The interview is adaptive — it follows up on vague answers, asks for specifics about claimed experience, and cross-references every response against the candidate's résumé. The system evaluates consistency, depth, and context, not just correctness. Answers that a model could have written are flagged automatically because they lack the context-specific details that genuine experience produces.",
  },
  {
    q: "How long before I see results?",
    a: "Pre-evaluation runs within minutes of applying. Interviews are completed by candidates on their own schedule, typically within a few days. Reports are generated immediately after the interview ends.",
  },
  {
    q: "Do candidates need to install anything?",
    a: "No. Apply, interview, and track status — all in the browser. No apps, plugins, or calendar links.",
  },
  {
    q: "What happens to candidates who aren’t a strong fit?",
    a: "They remain in your applicant pipeline with their profile and résumé available for manual review. Partial matches receive two or three clarifying questions before a final evaluation. Everyone receives clear status updates throughout the process.",
  },
  {
    q: "Can I customise what the AI evaluates?",
    a: "Yes — on Pro and Enterprise plans, you define custom evaluation criteria. The AI uses your job requirements, interview questions, and weighting preferences.",
  },
  {
    q: "What is AI job creation?",
    a: "Describe a role in plain language — 'Senior React engineer, remote, $120-160k' — and our AI builds a complete job posting with title, description, requirements, salary, interview questions, and more. You review the draft, edit anything, then publish. Available on Pro and Enterprise.",
  },
  {
    q: "Does RoundZero only work for technical roles?",
    a: "No, not at all. RoundZero can evaluate any role as long as the requirements and skills are clearly defined when creating the job. Just create a detailed job description, and our AI will take care of the rest.",
  },
  {
    q: "How is RoundZero different from other AI hiring platforms?",
    a: "Most platforms rely on video interviews or resume screening — both consume hours of human time per candidate. RoundZero uses adaptive chat-based interviews that run on your behalf. Zero handles salary expectations, relocation preferences, visa requirements, and other screening criteria so your team only speaks to the right candidates. The interview follows up on vague answers, cross-references claims, and adjusts questions based on the role. You get rich, context-specific insights that catch inconsistencies and validate genuine experience. No scheduling friction, no video anxiety.",
  },
];

function Faq() {
  return (
    <div className="grid grid-cols-12 gap-x-6">
      <div className="col-span-12 md:col-span-3 mb-6 md:mb-0">
        <SmallCaps>Letters to the editor</SmallCaps>
        <p
          className="font-serif mt-4 text-[15px] leading-[1.6] max-w-[26ch]"
          style={{ color: "var(--ed-muted)" }}
        >
          Questions we hear most often, answered with the same plainness we ask of candidates.
        </p>
      </div>
      <div className="col-span-12 md:col-span-9">
        <Accordion type="single" collapsible className="w-full">
          {faq.map((f, i) => (
            <AccordionItem key={f.q} value={`q-${i}`}>
              <AccordionTrigger
                className="py-5 hover:no-underline"
                style={{ color: "var(--ed-ink)" }}
              >
                <span className="font-serif text-[1.15rem] text-left" style={{ fontWeight: 400 }}>
                  {f.q}
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <p
                  className="text-[14.5px] leading-[1.65] pb-2 max-w-[68ch]"
                  style={{ color: "var(--ed-muted)" }}
                >
                  {f.a}
                </p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Closing — colophon-style
// ───────────────────────────────────────────────────────────────────────────
function Closing() {
  return (
    <section>
      <div className="mx-auto w-full max-w-6xl px-6 lg:px-8">
        <Rule thick />
        <div className="grid grid-cols-12 gap-x-6 py-20 lg:py-32">
          <div className="col-span-12 lg:col-span-2">
            <SmallCaps>Colophon</SmallCaps>
          </div>
          <div className="col-span-12 lg:col-span-8 lg:col-start-3">
            <h2
              className="font-serif text-[clamp(2rem,5vw,4.5rem)] leading-none tracking-[-0.02em]"
              style={{ color: "var(--ed-ink)", fontWeight: 350 }}
            >
              Run RoundZero before{" "}
              <span
                className="font-editorial"
                style={{ fontStyle: "italic", color: "var(--ed-accent)" }}
              >
                Round One
              </span>
            </h2>
            <p
              className="mt-8 font-serif text-[clamp(1rem,1.5vw,1.25rem)] leading-[1.55] max-w-[60ch]"
              style={{ color: "var(--ed-muted)" }}
            >
              Start replacing your first interview round today.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-3">
              <Button
                className="rounded-none w-full sm:flex-1 h-12"
                style={{
                  background: "var(--ed-ink)",
                  color: "var(--ed-paper)",
                  border: "1px solid var(--ed-ink)",
                }}
                asChild
              >
                <Link to="/company/login">Post your first job</Link>
              </Button>
              <Button
                variant="outline"
                className="rounded-none w-full sm:flex-1 h-12 bg-transparent"
                style={{
                  border: "1px solid var(--ed-ink)",
                  color: "var(--ed-ink)",
                }}
                asChild
              >
                <Link to="/jobs">Browse jobs</Link>
              </Button>
            </div>

            <div
              className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 pt-8"
              style={{ borderTop: "1px solid var(--ed-rule-hair)" }}
            >
              {[
                ["Set in", "Fraunces & Geist"],
                ["Printed", "On the open web"],
                ["Issue", "Vol. 01"],
                ["Made by", "RoundZero"],
              ].map(([k, v]) => (
                <div key={k}>
                  <SmallCaps>{k}</SmallCaps>
                  <p
                    className="mt-1 font-editorial text-[15px]"
                    style={{
                      color: "var(--ed-ink)",
                      fontStyle: "italic",
                      fontWeight: 400,
                    }}
                  >
                    {v}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
