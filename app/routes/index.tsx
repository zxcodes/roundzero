import { Button } from "@/components/ui/button";
import {
    ArrowRight,
    CaretDoubleRight,
    ChatCircleText,
    CheckCircle,
    Ranking,
    Warning,
} from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({ component: HomePage });

function HomePage() {
  return (
    <div className="bg-background text-foreground min-h-svh">
      <Nav />
      <Hero />
      <InterviewSection />
      <ReportSection />
      <RankingSection />
      <BottomCTA />
      <Footer />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Nav
// ---------------------------------------------------------------------------
function Nav() {
  return (
    <header className="border-border/40 sticky top-0 z-50 border-b backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
        <span className="text-sm font-semibold tracking-tight">hirely</span>
        <div className="flex items-center gap-2">

          <Button size="sm" variant="ghost" className="text-muted-foreground text-sm">
            Log in
          </Button>
          <Button size="sm" className="text-sm">
            Get started
          </Button>
        </div>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Hero — left text, right mock report card
// ---------------------------------------------------------------------------
function Hero() {
  return (
    <section className="mx-auto grid max-w-5xl gap-12 px-6 py-24 lg:grid-cols-2 lg:items-center lg:py-32">
      {/* Left */}
      <div className="max-w-lg space-y-6">
        <p className="text-muted-foreground text-sm">Replace your first interview round</p>
        <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-[2.75rem]">
          AI interviews your candidates. You get the report.
        </h1>
        <p className="text-muted-foreground leading-relaxed">
          Hirely conducts adaptive, structured interviews and produces scored candidate reports with
          evidence — so your team only talks to people worth their time.
        </p>
        <div className="flex items-center gap-3">
          <Button>
            Start hiring <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
          <Button variant="ghost" className="text-muted-foreground">
            See how it works
          </Button>
        </div>
      </div>

      {/* Right — mock report card */}
      <div className="bg-card border-border/60 rounded-xl border p-5 shadow-sm lg:ml-auto lg:max-w-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-emerald-500">
              Strong hire
            </p>
            <p className="mt-1 font-semibold">Sarah Chen</p>
            <p className="text-muted-foreground text-xs">Senior Backend Engineer</p>
          </div>
          <div className="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold">
            8.4
          </div>
        </div>

        <div className="border-border/40 mt-4 border-t pt-4">
          <div className="space-y-2.5">
            <ScoreBar label="Technical" value={9.1} />
            <ScoreBar label="Communication" value={7.8} />
            <ScoreBar label="Experience" value={8.2} />
          </div>
        </div>

        <div className="border-border/40 mt-4 space-y-1.5 border-t pt-4">
          <p className="text-xs font-medium">Key insights</p>
          <p className="text-muted-foreground text-xs leading-relaxed">
            Strong system design instincts. Clearly articulated tradeoffs in distributed caching
            question. Minor gap in observability tooling.
          </p>
        </div>
      </div>
    </section>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="text-muted-foreground w-28 shrink-0">{label}</span>
      <div className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full">
        <div
          className="bg-primary h-full rounded-full"
          style={{ width: `${(value / 10) * 100}%` }}
        />
      </div>
      <span className="w-6 text-right font-medium">{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 1 — Interview (left mock chat, right text)
// ---------------------------------------------------------------------------
function InterviewSection() {
  return (
    <section className="border-border/40 border-t">
      <div className="mx-auto grid max-w-5xl gap-12 px-6 py-20 lg:grid-cols-2 lg:items-center">
        {/* Left — mock chat */}
        <div className="bg-card border-border/60 overflow-hidden rounded-xl border shadow-sm">
          <div className="border-border/40 flex items-center gap-2 border-b px-4 py-3">
            <ChatCircleText weight="fill" className="text-primary h-4 w-4" />
            <span className="text-xs font-medium">Interview session</span>
            <span className="bg-emerald-500/10 ml-auto rounded-full px-2 py-0.5 text-[10px] font-medium text-emerald-500">
              In progress
            </span>
          </div>
          <div className="space-y-3 p-4">
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
        <div className="max-w-md space-y-4 lg:pl-4">
          <p className="text-muted-foreground text-sm font-medium">Adaptive interviews</p>
          <h2 className="text-2xl font-bold tracking-tight">Questions that go deeper, not wider</h2>
          <p className="text-muted-foreground leading-relaxed">
            Every interview adapts in real-time. The AI probes weak answers, validates strong
            claims, and detects inconsistencies between the resume and conversation — the way a
            senior interviewer would.
          </p>
          <ul className="text-muted-foreground space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <CaretDoubleRight className="mt-0.5 h-4 w-4 shrink-0" />
              Follow-up questions based on actual responses
            </li>
            <li className="flex items-start gap-2">
              <CaretDoubleRight className="mt-0.5 h-4 w-4 shrink-0" />
              Scenario-based problems tailored to the role
            </li>
            <li className="flex items-start gap-2">
              <CaretDoubleRight className="mt-0.5 h-4 w-4 shrink-0" />
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
        className={`max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
          sender === "ai" ? "bg-muted text-foreground" : "bg-primary text-primary-foreground"
        }`}
      >
        {text}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 2 — Report (left text, right mock report details)
// ---------------------------------------------------------------------------
function ReportSection() {
  return (
    <section className="border-border/40 border-t">
      <div className="mx-auto grid max-w-5xl gap-12 px-6 py-20 lg:grid-cols-2 lg:items-center">
        {/* Left — text */}
        <div className="max-w-md space-y-4">
          <p className="text-muted-foreground text-sm font-medium">Candidate reports</p>
          <h2 className="text-2xl font-bold tracking-tight">Every score backed by evidence</h2>
          <p className="text-muted-foreground leading-relaxed">
            No black-box ratings. Each report shows exactly what the candidate said, how it was
            evaluated, and why they scored the way they did. Your team sees the reasoning, not just
            a number.
          </p>
        </div>

        {/* Right — mock report breakdown */}
        <div className="bg-card border-border/60 rounded-xl border shadow-sm lg:ml-auto lg:max-w-sm">
          <div className="border-border/40 border-b px-5 py-3">
            <p className="text-xs font-medium">Report — Sarah Chen</p>
          </div>
          <div className="space-y-4 p-5">
            <div>
              <p className="mb-2 text-xs font-medium text-emerald-500">Strengths</p>
              <ul className="space-y-1.5">
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
              <p className="text-xs font-medium text-amber-500">Areas of concern</p>
              <ul className="mt-2 space-y-1.5">
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
    </section>
  );
}

function ReportItem({ icon, text }: { icon: "check" | "flag"; text: string }) {
  return (
    <li className="text-muted-foreground flex items-start gap-2 text-xs leading-relaxed">
      {icon === "check" ? (
        <CheckCircle weight="fill" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
      ) : (
        <Warning weight="fill" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
      )}
      {text}
    </li>
  );
}

// ---------------------------------------------------------------------------
// Section 3 — Ranking (left mock ranked list, right text)
// ---------------------------------------------------------------------------
function RankingSection() {
  return (
    <section className="border-border/40 border-t">
      <div className="mx-auto grid max-w-5xl gap-12 px-6 py-20 lg:grid-cols-2 lg:items-center">
        {/* Left — mock ranked list */}
        <div className="bg-card border-border/60 rounded-xl border shadow-sm">
          <div className="border-border/40 flex items-center gap-2 border-b px-5 py-3">
            <Ranking weight="fill" className="text-primary h-4 w-4" />
            <span className="text-xs font-medium">Senior Backend Engineer</span>
            <span className="text-muted-foreground ml-auto text-[10px]">12 evaluated</span>
          </div>
          <div className="divide-border/40 divide-y">
            <RankRow rank={1} name="Sarah Chen" score={8.4} rec="strong_hire" />
            <RankRow rank={2} name="Marcus Johnson" score={7.9} rec="strong_hire" />
            <RankRow rank={3} name="Priya Patel" score={7.2} rec="consider" />
            <RankRow rank={4} name="Alex Kim" score={5.8} rec="not_recommended" />
          </div>
        </div>

        {/* Right — text */}
        <div className="max-w-md space-y-4 lg:pl-4">
          <p className="text-muted-foreground text-sm font-medium">Ranked shortlists</p>
          <h2 className="text-2xl font-bold tracking-tight">
            Your top candidates, sorted and explained
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Stop scrolling through 200 applications. Hirely scores every candidate across technical
            skill, communication, and experience depth — then gives you a ranked list with clear
            hire/pass recommendations.
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
      <span className="text-muted-foreground w-5 text-center text-xs font-medium">{rank}</span>
      <span className="flex-1 text-sm font-medium">{name}</span>
      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${recStyles[rec]}`}>
        {recLabels[rec]}
      </span>
      <span className="w-8 text-right text-sm font-semibold">{score}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CTA
// ---------------------------------------------------------------------------
function BottomCTA() {
  return (
    <section className="border-border/40 border-t">
      <div className="mx-auto max-w-5xl px-6 py-24 text-center">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Stop screening resumes. Start reviewing reports.
        </h2>
        <p className="text-muted-foreground mx-auto mt-3 max-w-md text-sm leading-relaxed">
          Post your first job and let Hirely handle the first round. Your team gets scored,
          explained candidates — ready for a real conversation.
        </p>
        <Button size="lg" className="mt-8">
          Get started <ArrowRight className="ml-1.5 h-4 w-4" />
        </Button>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------
function Footer() {
  return (
    <footer className="border-border/40 border-t">
      <div className="text-muted-foreground mx-auto flex max-w-5xl items-center justify-between px-6 py-6 text-xs">
        <span>&copy; {new Date().getFullYear()} Hirely</span>
        <div className="flex gap-4">
          <span className="hover:text-foreground cursor-pointer transition-colors">Privacy</span>
          <span className="hover:text-foreground cursor-pointer transition-colors">Terms</span>
        </div>
      </div>
    </footer>
  );
}
