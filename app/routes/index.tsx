import {
  Alert02Icon,
  ArrowRightDoubleIcon,
  Briefcase01Icon,
  BubbleChatIcon,
  CheckmarkCircle02Icon,
  RankingIcon,
  TextIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
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
      <HowItWorksSection />
      <InterviewSection />
      <ReportSection />
      <RankingSection />
      <PricingSection />
      <FAQSection />
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
            <span className="text-xs font-medium text-primary">Hiring just changed</span>
          </div>
          <h1 className="text-[2.5rem] font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.5rem]">
            Candidates use AI{" "}
            <span className="bg-linear-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              to apply.
            </span>
            <br />
            Now you can use AI to screen.
          </h1>
          <p className="max-w-lg text-base leading-relaxed text-muted-foreground lg:text-lg">
            AI-polished resumes and one-click applications have buried your inbox. RoundZero
            interviews every candidate for you and delivers scored reports with evidence, so your
            team only talks to people worth their time.
          </p>
          <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center">
            <Button size="lg" asChild>
              <Link to="/company/login">For employers</Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link to="/candidate/login">For job seekers</Link>
            </Button>
          </div>
        </div>

        {/* Right — mock report card */}
        <div className="animate-fade-in-up stagger-2 lg:ml-auto lg:max-w-md">
          <div className="rounded-4xl border border-border/60 bg-card p-5 shadow-sm">
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
// How it works
// ---------------------------------------------------------------------------

const steps = [
  {
    number: "01",
    icon: Briefcase01Icon,
    title: "Post a job",
    description:
      "Describe the role, requirements, and what good looks like. RoundZero builds an interview script tailored to the position.",
  },
  {
    number: "02",
    icon: BubbleChatIcon,
    title: "AI interviews every applicant",
    description:
      "Each candidate completes an async, adaptive interview — probing their experience, validating claims, and testing role-relevant knowledge.",
  },
  {
    number: "03",
    icon: TextIcon,
    title: "Get scored reports",
    description:
      "Your team receives ranked candidates with evidence-backed scores across technical depth, communication, and experience. No black boxes.",
  },
];

function HowItWorksSection() {
  return (
    <section className="border-t border-border/40">
      <div className="mx-auto max-w-6xl px-6 py-20 lg:px-8 lg:py-28">
        <div className="text-center">
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary">
            How it works
          </p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight lg:text-3xl">
            Three steps. Zero scheduling.
          </h2>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.number}
              className="relative rounded-4xl border border-border/60 bg-card p-6 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10">
                  <HugeiconsIcon icon={step.icon} strokeWidth={2} className="size-5 text-primary" />
                </div>
                <span className="font-mono text-2xl font-bold text-muted-foreground/20">
                  {step.number}
                </span>
              </div>
              <h3 className="mt-4 text-base font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
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
        <div className="overflow-hidden rounded-4xl border border-border/60 bg-card shadow-sm">
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
              text="We used a pub/sub model with Redis Streams for message brokering. The main tradeoff was latency vs. ordering guarantees, so we chose at-least-once delivery with client-side dedup."
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
            Beyond keyword matching
          </p>
          <h2 className="text-2xl font-bold tracking-tight lg:text-3xl">
            Your ATS filters keywords. RoundZero interviews candidates.
          </h2>
          <p className="text-base leading-relaxed text-muted-foreground">
            Keyword filters were built for a world where humans wrote resumes. That world is gone.
            RoundZero runs adaptive interviews that probe weak answers, validate claims, and catch
            inconsistencies, the way a senior interviewer would.
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
        className={`max-w-[85%] rounded-4xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
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
          <div className="rounded-4xl border border-border/60 bg-card shadow-sm">
            <div className="border-b border-border/40 px-5 py-3">
              <p className="text-sm font-medium">Report: Sarah Chen</p>
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
        <div className="overflow-hidden rounded-4xl border border-border/60 bg-card shadow-sm">
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
            500 applicants. 5 worth talking to. Found in minutes.
          </h2>
          <p className="text-base leading-relaxed text-muted-foreground">
            Every candidate is scored across technical depth, communication, and experience, then
            ranked with clear hire/pass recommendations. No more scrolling through hundreds of
            applications hoping to spot the right one.
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
// Pricing
// ---------------------------------------------------------------------------

type PricingFeature = {
  text: string;
  included: boolean;
};

type PricingTier = {
  name: string;
  price: string;
  period: string;
  description: string;
  features: PricingFeature[];
  cta: string;
  highlighted?: boolean;
};

const pricingTiers: PricingTier[] = [
  {
    name: "Starter",
    price: "$0",
    period: "forever",
    description: "Try RoundZero on your next hire. No commitment.",
    cta: "Get started free",
    features: [
      { text: "Up to 3 active job postings", included: true },
      { text: "AI interviews for every applicant", included: true },
      { text: "Scored candidate reports", included: true },
      { text: "Ranked shortlists", included: true },
      { text: "Email support", included: true },
      { text: "Custom evaluation criteria", included: false },
      { text: "Team seats & collaboration", included: false },
      { text: "API access", included: false },
    ],
  },
  {
    name: "Pro",
    price: "$149",
    period: "per month",
    description: "For teams actively hiring across multiple roles.",
    cta: "Start free trial",
    highlighted: true,
    features: [
      { text: "Unlimited active job postings", included: true },
      { text: "AI interviews for every applicant", included: true },
      { text: "Scored candidate reports", included: true },
      { text: "Ranked shortlists", included: true },
      { text: "Priority support", included: true },
      { text: "Custom evaluation criteria", included: true },
      { text: "Up to 5 team seats", included: true },
      { text: "API access", included: false },
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "tailored",
    description: "High-volume hiring with dedicated support.",
    cta: "Talk to us",
    features: [
      { text: "Unlimited active job postings", included: true },
      { text: "AI interviews for every applicant", included: true },
      { text: "Scored candidate reports", included: true },
      { text: "Ranked shortlists", included: true },
      { text: "Dedicated account manager", included: true },
      { text: "Custom evaluation criteria", included: true },
      { text: "Unlimited team seats", included: true },
      { text: "API access & integrations", included: true },
    ],
  },
];

function PricingSection() {
  return (
    <section className="border-t border-border/40">
      <div className="mx-auto max-w-6xl px-6 py-20 lg:px-8 lg:py-28">
        <div className="text-center">
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary">Pricing</p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight lg:text-3xl">
            Simple pricing. No per-candidate fees.
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-base leading-relaxed text-muted-foreground">
            Every plan includes AI interviews and scored reports for all applicants. Pay for the
            capacity you need, not per candidate screened.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {pricingTiers.map((tier) => (
            <PricingCard key={tier.name} tier={tier} />
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingCard({ tier }: { tier: PricingTier }) {
  return (
    <div
      className={`relative flex flex-col rounded-4xl border bg-card p-6 shadow-sm ${
        tier.highlighted ? "border-primary/30 ring-1 ring-primary/20" : "border-border/60"
      }`}
    >
      {tier.highlighted ? (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-[11px] font-semibold text-primary-foreground">
          Most popular
        </div>
      ) : null}

      <div>
        <p className="text-sm font-semibold">{tier.name}</p>
        <div className="mt-3 flex items-baseline gap-1">
          <span className="text-3xl font-bold tracking-tight">{tier.price}</span>
          <span className="text-sm text-muted-foreground">/ {tier.period}</span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{tier.description}</p>
      </div>

      <ul className="mt-6 flex-1 space-y-2.5">
        {tier.features.map((feature) => (
          <li key={feature.text} className="flex items-start gap-2.5 text-[13px]">
            <HugeiconsIcon
              icon={Tick02Icon}
              strokeWidth={2.5}
              className={`mt-0.5 size-3.5 shrink-0 ${
                feature.included ? "text-primary" : "text-muted-foreground/30"
              }`}
            />
            <span className={feature.included ? "text-foreground" : "text-muted-foreground/50"}>
              {feature.text}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-6">
        <Button
          variant={tier.highlighted ? "default" : "outline"}
          className="w-full"
          size="lg"
          asChild
        >
          <Link to="/company/login">{tier.cta}</Link>
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FAQ
// ---------------------------------------------------------------------------

const faqItems = [
  {
    question: "How does the AI interview work?",
    answer:
      "Candidates complete an async chat-based interview — no scheduling, no video. The AI adapts its questions based on the role requirements and the candidate's responses, probing weak answers and validating resume claims. Interviews typically take 20–40 minutes and can be completed anytime.",
  },
  {
    question: "What do candidate reports include?",
    answer:
      "Each report scores candidates across technical depth, communication quality, and experience credibility. It includes specific strengths, areas of concern, key insights from the interview, and a clear hire/consider/pass recommendation — all backed by evidence from the actual conversation.",
  },
  {
    question: "Can candidates cheat or use AI to answer?",
    answer:
      "The interview is designed to be adaptive. It follows up on vague answers, asks for specifics about claimed experience, and cross-references responses against the resume. Copied or AI-generated answers are flagged as inconsistent because they lack the context-specific details that real experience produces.",
  },
  {
    question: "How long before I see results?",
    answer:
      "Candidates can complete interviews at their own pace, typically within a few days of applying. Reports are generated immediately after the interview ends. Your team gets scored, ranked candidates without waiting for manual screening rounds.",
  },
  {
    question: "Do candidates need to install anything?",
    answer:
      "No. The entire experience runs in the browser — candidates apply, complete the interview, and track their application status from one place. No apps, plugins, or calendar links required.",
  },
  {
    question: "What happens to candidates who aren't a strong fit?",
    answer:
      "Candidates who are a partial match may be asked 2–3 clarifying questions to fill gaps before a final evaluation. Everyone receives clear status updates throughout the process — no ghosting, no black holes.",
  },
  {
    question: "Can I customize what the AI evaluates?",
    answer:
      "On the Pro and Enterprise plans, you can define custom evaluation criteria tailored to the role. The AI uses your job requirements, interview questions, and weighting preferences to score candidates on what matters most to your team.",
  },
];

function FAQSection() {
  return (
    <section className="border-t border-border/40">
      <div className="mx-auto max-w-6xl px-6 py-20 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-2xl">
          <div className="text-center">
            <p className="text-[11px] font-bold uppercase tracking-widest text-primary">FAQ</p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight lg:text-3xl">Common questions</h2>
          </div>

          <Accordion type="single" collapsible className="mt-10">
            {faqItems.map((item, index) => (
              <AccordionItem key={item.question} value={`faq-${index}`}>
                <AccordionTrigger>{item.question}</AccordionTrigger>
                <AccordionContent>
                  <p className="text-muted-foreground">{item.answer}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
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
            Stop reading resumes.
            <br />
            Start reading reports.
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-muted-foreground">
            Post your first job and let RoundZero run the first round. Every candidate interviewed,
            scored, and explained before your team spends a single minute.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link to="/company/login">For employers</Link>
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
