import {
  Alert02Icon,
  ArrowRightDoubleIcon,
  BubbleChatIcon,
  CheckmarkCircle02Icon,
  RankingIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { PublicFooter, PublicHeader } from "@/components/public-layout";
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
        title: "RoundZero | AI-Powered Hiring Platform",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <div className="bg-background text-foreground min-h-svh">
      <PublicHeader />
      <Hero />
      <InterviewSection />
      <ReportSection />
      <RankingSection />
      <BottomCTA />
      <PublicFooter />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------
function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Subtle gradient background */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--color-primary)/6%,transparent_70%)]" />

      <div className="relative mx-auto grid max-w-6xl gap-12 px-6 py-24 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-8 lg:py-32">
        {/* Left */}
        <div className="animate-fade-in-up space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1">
            <div className="size-1.5 animate-pulse rounded-full bg-primary" />
            <span className="text-xs font-medium text-primary">
              Replace your first interview round
            </span>
          </div>
          <h1 className="text-[2.5rem] font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.5rem]">
            AI interviews your{" "}
            <span className="bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              candidates.
            </span>
            <br />
            You get the report.
          </h1>
          <p className="max-w-lg text-base leading-relaxed text-muted-foreground lg:text-lg">
            RoundZero conducts adaptive, structured interviews and produces scored candidate reports
            with evidence — so your team only talks to people worth their time.
          </p>
          <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center">
            <Button size="lg" asChild>
              <Link to="/company/login">For companies</Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link to="/candidate/login">For job seekers</Link>
            </Button>
          </div>
        </div>

        {/* Right — mock report card */}
        <div className="animate-fade-in-up stagger-2 lg:ml-auto lg:max-w-md">
          <div className="rounded-xl border border-border/60 bg-card p-5 shadow-sm ring-1 ring-foreground/3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-500">
                  Strong hire
                </p>
                <p className="mt-1.5 text-base font-semibold">Sarah Chen</p>
                <p className="text-sm text-muted-foreground">Senior Backend Engineer</p>
              </div>
              <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 font-mono text-xl font-bold text-primary">
                8.4
              </div>
            </div>

            <div className="mt-5 border-t border-border/40 pt-5">
              <div className="space-y-3">
                <ScoreBar label="Technical" value={9.1} />
                <ScoreBar label="Communication" value={7.8} />
                <ScoreBar label="Experience" value={8.2} />
              </div>
            </div>

            <div className="mt-5 space-y-1.5 border-t border-border/40 pt-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Key insights
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Strong system design instincts. Clearly articulated tradeoffs in distributed caching
                question. Minor gap in observability tooling.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-28 shrink-0 text-muted-foreground">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
          style={{ width: `${(value / 10) * 100}%` }}
        />
      </div>
      <span className="w-8 text-right font-mono text-xs font-semibold">{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 1 — Interview
// ---------------------------------------------------------------------------
function InterviewSection() {
  return (
    <section className="border-t border-border/40">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-8 lg:py-28">
        {/* Left — mock chat */}
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm ring-1 ring-foreground/3">
          <div className="flex items-center gap-2 border-b border-border/40 px-5 py-3">
            <HugeiconsIcon icon={BubbleChatIcon} strokeWidth={2} className="size-4 text-primary" />
            <span className="text-sm font-medium">Interview session</span>
            <span className="ml-auto rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-500">
              In progress
            </span>
          </div>
          <div className="space-y-3 p-5">
            <ChatBubble
              sender="ai"
              text="You mentioned building a real-time notification system at your last role. Walk me through the architecture decisions you made."
            />
            <ChatBubble
              sender="candidate"
              text="We used a pub/sub model with Redis Streams for message brokering. The main tradeoff was latency vs. ordering guarantees — we chose at-least-once delivery with client-side dedup."
            />
            <ChatBubble
              sender="ai"
              text="Interesting. How did you handle the deduplication at scale? What happened when a client reconnected after being offline?"
            />
          </div>
        </div>

        {/* Right — text */}
        <div className="space-y-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary">
            Adaptive interviews
          </p>
          <h2 className="text-2xl font-bold tracking-tight lg:text-3xl">
            Questions that go deeper, not wider
          </h2>
          <p className="text-base leading-relaxed text-muted-foreground">
            Every interview adapts in real-time. The AI probes weak answers, validates strong
            claims, and detects inconsistencies between the resume and conversation — the way a
            senior interviewer would.
          </p>
          <ul className="space-y-2.5 pt-1">
            <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
              <HugeiconsIcon
                icon={ArrowRightDoubleIcon}
                strokeWidth={2}
                className="mt-0.5 size-4 shrink-0 text-primary/60"
              />
              Follow-up questions based on actual responses
            </li>
            <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
              <HugeiconsIcon
                icon={ArrowRightDoubleIcon}
                strokeWidth={2}
                className="mt-0.5 size-4 shrink-0 text-primary/60"
              />
              Scenario-based problems tailored to the role
            </li>
            <li className="flex items-start gap-2.5 text-sm text-muted-foreground">
              <HugeiconsIcon
                icon={ArrowRightDoubleIcon}
                strokeWidth={2}
                className="mt-0.5 size-4 shrink-0 text-primary/60"
              />
              20-40 minutes, async, no scheduling needed
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}

function ChatBubble({ sender, text }: { sender: "ai" | "candidate"; text: string }) {
  return (
    <div className={sender === "ai" ? "" : "flex justify-end"}>
      <div
        className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
          sender === "ai"
            ? "rounded-tl-sm bg-muted text-foreground"
            : "rounded-tr-sm bg-primary text-primary-foreground"
        }`}
      >
        {text}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 2 — Report
// ---------------------------------------------------------------------------
function ReportSection() {
  return (
    <section className="border-t border-border/40">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-8 lg:py-28">
        {/* Left — text */}
        <div className="space-y-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary">
            Candidate reports
          </p>
          <h2 className="text-2xl font-bold tracking-tight lg:text-3xl">
            Every score backed by evidence
          </h2>
          <p className="text-base leading-relaxed text-muted-foreground">
            No black-box ratings. Each report shows exactly what the candidate said, how it was
            evaluated, and why they scored the way they did. Your team sees the reasoning, not just
            a number.
          </p>
        </div>

        {/* Right — mock report breakdown */}
        <div className="lg:ml-auto lg:max-w-md">
          <div className="rounded-xl border border-border/60 bg-card shadow-sm ring-1 ring-foreground/3">
            <div className="border-b border-border/40 px-5 py-3">
              <p className="text-sm font-medium">Report — Sarah Chen</p>
            </div>
            <div className="space-y-5 p-5">
              <div>
                <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-emerald-500">
                  Strengths
                </p>
                <ul className="space-y-2">
                  <ReportItem
                    icon="check"
                    text="Deep understanding of distributed systems tradeoffs"
                  />
                  <ReportItem icon="check" text="Clear, structured communication under pressure" />
                  <ReportItem
                    icon="check"
                    text="Demonstrated ownership of past projects, not just contribution"
                  />
                </ul>
              </div>
              <div>
                <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-amber-500">
                  Areas of concern
                </p>
                <ul className="space-y-2">
                  <ReportItem
                    icon="flag"
                    text="Limited exposure to observability beyond basic logging"
                  />
                  <ReportItem icon="flag" text="Gave a vague answer on CI/CD pipeline design" />
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ReportItem({ icon, text }: { icon: "check" | "flag"; text: string }) {
  return (
    <li className="flex items-start gap-2.5 text-[13px] leading-relaxed text-muted-foreground">
      {icon === "check" ? (
        <HugeiconsIcon
          icon={CheckmarkCircle02Icon}
          strokeWidth={2}
          className="mt-0.5 size-3.5 shrink-0 text-emerald-500"
        />
      ) : (
        <HugeiconsIcon
          icon={Alert02Icon}
          strokeWidth={2}
          className="mt-0.5 size-3.5 shrink-0 text-amber-500"
        />
      )}
      {text}
    </li>
  );
}

// ---------------------------------------------------------------------------
// Section 3 — Ranking
// ---------------------------------------------------------------------------
function RankingSection() {
  return (
    <section className="border-t border-border/40">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-8 lg:py-28">
        {/* Left — mock ranked list */}
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm ring-1 ring-foreground/3">
          <div className="flex items-center gap-2.5 border-b border-border/40 px-5 py-3">
            <HugeiconsIcon icon={RankingIcon} strokeWidth={2} className="size-4 text-primary" />
            <span className="text-sm font-medium">Senior Backend Engineer</span>
            <span className="ml-auto font-mono text-xs text-muted-foreground">12 evaluated</span>
          </div>
          <div className="divide-y divide-border/40">
            <RankRow rank={1} name="Sarah Chen" score={8.4} rec="strong_hire" />
            <RankRow rank={2} name="Marcus Johnson" score={7.9} rec="strong_hire" />
            <RankRow rank={3} name="Priya Patel" score={7.2} rec="consider" />
            <RankRow rank={4} name="Alex Kim" score={5.8} rec="not_recommended" />
          </div>
        </div>

        {/* Right — text */}
        <div className="space-y-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary">
            Ranked shortlists
          </p>
          <h2 className="text-2xl font-bold tracking-tight lg:text-3xl">
            Your top candidates, sorted and explained
          </h2>
          <p className="text-base leading-relaxed text-muted-foreground">
            Stop scrolling through 200 applications. RoundZero scores every candidate across
            technical skill, communication, and experience depth — then gives you a ranked list with
            clear hire/pass recommendations.
          </p>
        </div>
      </div>
    </section>
  );
}

function RankRow({
  rank,
  name,
  score,
  rec,
}: {
  rank: number;
  name: string;
  score: number;
  rec: "strong_hire" | "consider" | "not_recommended";
}) {
  const recStyles = {
    strong_hire: "text-emerald-500 bg-emerald-500/10",
    consider: "text-amber-500 bg-amber-500/10",
    not_recommended: "text-red-400 bg-red-400/10",
  };
  const recLabels = {
    strong_hire: "Strong hire",
    consider: "Consider",
    not_recommended: "Pass",
  };

  return (
    <div className="flex items-center gap-4 px-5 py-3">
      <span className="w-5 text-center font-mono text-xs text-muted-foreground">{rank}</span>
      <span className="flex-1 text-sm font-medium">{name}</span>
      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${recStyles[rec]}`}>
        {recLabels[rec]}
      </span>
      <span className="w-8 text-right font-mono text-sm font-semibold">{score}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CTA
// ---------------------------------------------------------------------------
function BottomCTA() {
  return (
    <section className="border-t border-border/40">
      <div className="relative mx-auto max-w-6xl px-6 py-24 text-center lg:px-8 lg:py-32">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,var(--color-primary)/4%,transparent_70%)]" />
        <div className="relative">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
            Stop screening resumes.
            <br />
            Start reviewing reports.
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-muted-foreground">
            Post your first job and let RoundZero handle the first round. Your team gets scored,
            explained candidates — ready for a real conversation.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link to="/company/login">For companies</Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link to="/candidate/login">For job seekers</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
