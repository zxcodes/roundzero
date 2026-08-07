import { ArrowRight01Icon, ArrowUpRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { type ChangeEvent, useState } from "react";

import { PublicFooter, PublicHeader } from "@/components/public-layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PLAN_CONFIGS, SUBSCRIPTION_PLANS } from "@/features/billing/config";
import { absoluteUrl, buildPageHead, comparisonPageJsonLd } from "@/shared/seo";

const compareTitle = "RoundZero vs HireVue, Workable & More | Compare";
const compareDescription =
  "Compare RoundZero with HireVue, Spark Hire, Willo, Workable, Ashby, Greenhouse, and Lever on screening, candidate experience, pricing, and hiring savings.";

const screeningVendors = [
  {
    name: "HireVue",
    price: "Custom pricing",
    context: "Essential through Premium",
    emphasis:
      "Automated hiring workflows, candidate experience, ATS integrations, and 24/7 support.",
    distinction:
      "RoundZero publishes self-serve plan limits and focuses on evidence before a human first interview.",
    source: "https://www.hirevue.com/pricing",
  },
  {
    name: "Spark Hire",
    price: "$249/month billed annually, or $299 monthly",
    context:
      "Video interviewing includes unlimited annual jobs, users, and video interviews. Recruit Pro ATS starts at $335/month annually.",
    emphasis: "Video interviews plus AI transcripts, summaries, and scoring.",
    distinction:
      "RoundZero combines applicant pre-evaluation, adaptive text and voice interviews, and evidence-backed reports in one workflow.",
    source: "https://www.sparkhire.com/pricing",
  },
  {
    name: "Willo",
    price: "$59 per live role",
    context:
      "Lite is pay-as-you-go with up to 5 roles, 5 users, and 150 assessed candidates per role. Enterprise starts at $3,799/year in USD.",
    emphasis: "ATS integrations, AI transcription, summaries, and benchmarking.",
    distinction:
      "RoundZero prices by plan capacity and adds pre-evaluation before selected candidates complete the adaptive interview.",
    source: "https://www.willo.video/pricing",
  },
];

const atsVendors = [
  {
    name: "Workable",
    price: "From $299/month ($3,588/year)",
    context:
      "Standard pricing for 1–20 employees. Video interviews are a $109/month Standard add-on; the AI agent includes 3,000 credits before usage pricing.",
    emphasis: "ATS, sourcing, and reporting.",
    distinction:
      "RoundZero is narrower: it is built for early screening and first-round interview evidence, not a complete ATS suite.",
    source: "https://www.workable.com/pricing",
  },
  {
    name: "Ashby",
    price: "$400/month",
    context:
      "Foundations covers up to 100 employees, with a 10% annual discount available. Larger plans are custom; AI notetaker is a paid add-on.",
    emphasis: "All-in-one ATS, scheduling, CRM, and analytics.",
    distinction:
      "RoundZero can complement an ATS when the priority is asynchronous evaluation and evidence before live interviews.",
    source: "https://www.ashbyhq.com/pricing",
  },
  {
    name: "Greenhouse",
    price: "Custom pricing",
    context: "Core, Plus, and Pro pricing varies with hiring volume and complexity.",
    emphasis: "Structured interview kits and scorecards, scheduling, reporting, and AI notetaker.",
    distinction:
      "RoundZero concentrates on automating repetitive early evaluation rather than administering the full hiring lifecycle.",
    source: "https://www.greenhouse.com/pricing",
  },
  {
    name: "Lever",
    price: "Custom quote",
    context: "Pricing scales with team size and hiring needs.",
    emphasis:
      "ATS and CRM, reporting, AI screening, and unlimited AI interview transcripts and summaries.",
    distinction:
      "RoundZero offers transparent self-serve tiers for teams seeking a focused pre-evaluation and first-round interview workspace.",
    source: "https://www.lever.co/pricing/",
  },
];

export const Route = createFileRoute("/compare")({
  head: () =>
    buildPageHead({
      title: compareTitle,
      description: compareDescription,
      path: "/compare",
      imageAlt: "Compare RoundZero with hiring screening platforms and ATS suites",
      scripts: [
        comparisonPageJsonLd({
          title: compareTitle,
          description: compareDescription,
          items: [
            { name: "RoundZero", url: absoluteUrl("/") },
            ...[...screeningVendors, ...atsVendors].map((vendor) => ({
              name: vendor.name,
              url: vendor.source,
            })),
          ],
        }),
      ],
    }),
  component: ComparePage,
});

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

const parsePlanPrice = (priceLabel: string) => Number(priceLabel.replace(/[^0-9.]/g, ""));

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const hoursFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function ComparePage() {
  return (
    <div className="marketing-page min-h-svh bg-background text-foreground">
      <a href="#main-content" className="marketing-skip-link">
        Skip to main content
      </a>
      <PublicHeader />
      <main id="main-content">
        <Hero />
        <FlowComparison />
        <SavingsCalculator />
        <RoundZeroPlans />
        <VendorComparison />
        <ScopeSection />
        <ClosingCta />
      </main>
      <PublicFooter />
    </div>
  );
}

function Hero() {
  return (
    <section className="border-b border-border bg-white">
      <div className="mx-auto w-full max-w-360 px-6 py-20 lg:px-12 lg:py-28 xl:px-16">
        <span className="marketing-eyebrow">Compare hiring workflows</span>
        <h1 className="mt-5 max-w-5xl text-balance text-[clamp(3rem,7vw,7rem)] font-medium leading-[0.92] tracking-[-0.06em]">
          Spend interviews on finalists, not maybes.
        </h1>
        <div className="mt-8 grid gap-7 lg:grid-cols-12 lg:items-end">
          <p className="max-w-2xl text-lg leading-8 text-muted-foreground lg:col-span-7">
            Compare RoundZero with HireVue, Spark Hire, Willo, Workable, Ashby, Greenhouse, and
            Lever. See how a focused, asynchronous first round can give candidates more flexibility
            and give your team evidence before spending time live.
          </p>
          <div className="flex flex-wrap gap-3 lg:col-span-5 lg:justify-end">
            <Button size="lg" className="rounded-full" asChild>
              <a href="#calculator">Calculate savings</a>
            </Button>
            <Button size="lg" variant="outline" className="rounded-full" asChild>
              <Link to="/company/login">Start free</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function FlowComparison() {
  const flows = [
    {
      title: "Traditional first round",
      steps: [
        "Review resumes",
        "Coordinate calendars",
        "Repeat the same opening questions",
        "Compare notes after the call",
      ],
    },
    {
      title: "RoundZero first round",
      steps: [
        "Every applicant receives AI pre-evaluation",
        "Selected candidates respond on their own time",
        "Adaptive text interviews and voice assessments probe claims",
        "Review evidence-backed reports before meeting",
      ],
    },
  ];

  return (
    <section className="border-b border-border bg-[#f3f5f3]">
      <div className="mx-auto w-full max-w-360 px-6 py-20 lg:px-12 lg:py-28 xl:px-16">
        <div className="grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <span className="marketing-eyebrow">The workflow shift</span>
            <h2 className="mt-5 text-balance text-4xl font-medium leading-none tracking-[-0.045em] lg:text-5xl">
              Evidence arrives before the meeting.
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:col-span-7 lg:col-start-6">
            {flows.map((flow, flowIndex) => (
              <article key={flow.title} className="border-t border-black/15 pt-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  Flow 0{flowIndex + 1}
                </p>
                <h3 className="mt-3 text-xl font-medium tracking-[-0.03em]">{flow.title}</h3>
                <ol className="mt-6 flex flex-col gap-0">
                  {flow.steps.map((step, index) => (
                    <li
                      key={step}
                      className="grid grid-cols-[2rem_1fr] border-t border-black/10 py-4 text-sm leading-6"
                    >
                      <span className="font-mono text-xs text-muted-foreground">{index + 1}</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function SavingsCalculator() {
  const [roles, setRoles] = useState("3");
  const [candidates, setCandidates] = useState("10");
  const [interviewMinutes, setInterviewMinutes] = useState("30");
  const [interviewers, setInterviewers] = useState("1");
  const [hourlyCost, setHourlyCost] = useState("60");
  const [reviewMinutes, setReviewMinutes] = useState("5");

  const normalizedRoles = clamp(Number(roles), 1, 100);
  const normalizedCandidates = clamp(Number(candidates), 1, 50);
  const normalizedInterviewMinutes = clamp(Number(interviewMinutes), 10, 180);
  const normalizedInterviewers = clamp(Number(interviewers), 1, 10);
  const normalizedHourlyCost = clamp(Number(hourlyCost), 10, 500);
  const normalizedReviewMinutes = clamp(Number(reviewMinutes), 1, 60);
  const reports = normalizedRoles * normalizedCandidates;
  const traditionalHours = reports * (normalizedInterviewMinutes / 60) * normalizedInterviewers;
  const reviewHours = reports * (normalizedReviewMinutes / 60);
  const hoursReturned = Math.max(0, traditionalHours - reviewHours);
  const grossSavings = hoursReturned * normalizedHourlyCost;
  const recommendedPlan =
    SUBSCRIPTION_PLANS.map((plan) => PLAN_CONFIGS[plan]).find(
      (plan) =>
        plan.includedJobs >= normalizedRoles && plan.includedReportsPerJob >= normalizedCandidates,
    ) ?? PLAN_CONFIGS.scale;
  const planCost = parsePlanPrice(recommendedPlan.priceLabel);
  const netSavings = Math.max(0, grossSavings - planCost);

  const onRolesChange = (event: ChangeEvent<HTMLInputElement>) => setRoles(event.target.value);
  const onCandidatesChange = (event: ChangeEvent<HTMLInputElement>) =>
    setCandidates(event.target.value);
  const onInterviewMinutesChange = (event: ChangeEvent<HTMLInputElement>) =>
    setInterviewMinutes(event.target.value);
  const onInterviewersChange = (event: ChangeEvent<HTMLInputElement>) =>
    setInterviewers(event.target.value);
  const onHourlyCostChange = (event: ChangeEvent<HTMLInputElement>) =>
    setHourlyCost(event.target.value);
  const onReviewMinutesChange = (event: ChangeEvent<HTMLInputElement>) =>
    setReviewMinutes(event.target.value);
  const onRolesBlur = () => setRoles(String(normalizedRoles));
  const onCandidatesBlur = () => setCandidates(String(normalizedCandidates));
  const onInterviewMinutesBlur = () => setInterviewMinutes(String(normalizedInterviewMinutes));
  const onInterviewersBlur = () => setInterviewers(String(normalizedInterviewers));
  const onHourlyCostBlur = () => setHourlyCost(String(normalizedHourlyCost));
  const onReviewMinutesBlur = () => setReviewMinutes(String(normalizedReviewMinutes));

  return (
    <section id="calculator" className="scroll-mt-20 border-b border-border bg-white">
      <div className="mx-auto w-full max-w-360 px-6 py-20 lg:px-12 lg:py-28 xl:px-16">
        <div className="max-w-3xl">
          <span className="marketing-eyebrow">Hiring-time ledger</span>
          <h2 className="mt-5 text-balance text-4xl font-medium leading-none tracking-[-0.045em] lg:text-6xl">
            Put a number on the first round.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
            Adjust the assumptions to estimate interview labor that an asynchronous RoundZero review
            could return during one hiring cycle.
          </p>
        </div>

        <Card
          variant="bordered"
          className="mt-12 overflow-hidden rounded-3xl lg:grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]"
        >
          <div className="py-7 lg:py-9">
            <CardHeader>
              <CardTitle className="text-xl">Monthly assumptions</CardTitle>
              <CardDescription>One hiring cycle using a single month of RoundZero.</CardDescription>
            </CardHeader>
            <CardContent className="mt-7">
              <FieldGroup className="grid gap-5 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="roles">Active roles</FieldLabel>
                  <Input
                    id="roles"
                    type="number"
                    min={1}
                    max={100}
                    value={roles}
                    onChange={onRolesChange}
                    onBlur={onRolesBlur}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="candidates">First-round candidates per role</FieldLabel>
                  <Input
                    id="candidates"
                    type="number"
                    min={1}
                    max={50}
                    value={candidates}
                    onChange={onCandidatesChange}
                    onBlur={onCandidatesBlur}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="interview-minutes">Interview minutes</FieldLabel>
                  <Input
                    id="interview-minutes"
                    type="number"
                    min={10}
                    max={180}
                    value={interviewMinutes}
                    onChange={onInterviewMinutesChange}
                    onBlur={onInterviewMinutesBlur}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="interviewers">Interviewers per call</FieldLabel>
                  <Input
                    id="interviewers"
                    type="number"
                    min={1}
                    max={10}
                    value={interviewers}
                    onChange={onInterviewersChange}
                    onBlur={onInterviewersBlur}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="hourly-cost">Loaded hourly cost (USD)</FieldLabel>
                  <Input
                    id="hourly-cost"
                    type="number"
                    min={10}
                    max={500}
                    value={hourlyCost}
                    onChange={onHourlyCostChange}
                    onBlur={onHourlyCostBlur}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="review-minutes">Report-review minutes</FieldLabel>
                  <Input
                    id="review-minutes"
                    type="number"
                    min={1}
                    max={60}
                    value={reviewMinutes}
                    onChange={onReviewMinutesChange}
                    onBlur={onReviewMinutesBlur}
                  />
                </Field>
              </FieldGroup>
            </CardContent>
          </div>
          <div className="border-t border-border bg-[#f3f5f3] py-7 lg:border-l lg:border-t-0 lg:py-9">
            <CardHeader>
              <CardTitle className="text-xl">Estimated hiring-cycle return</CardTitle>
              <CardDescription>
                {reports} reports · {recommendedPlan.name} plan at {recommendedPlan.priceLabel}
                /month
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-7">
              <dl className="border-t border-black/15">
                <LedgerRow
                  label="Traditional interview labor"
                  value={`${hoursFormatter.format(traditionalHours)} hours`}
                />
                <LedgerRow
                  label="RoundZero report review"
                  value={`${hoursFormatter.format(reviewHours)} hours`}
                />
                <LedgerRow
                  label="Hours returned"
                  value={`${hoursFormatter.format(hoursReturned)} hours`}
                  strong
                />
                <LedgerRow label="Gross labor savings" value={usdFormatter.format(grossSavings)} />
                <LedgerRow
                  label={`${recommendedPlan.name} monthly plan`}
                  value={`−${usdFormatter.format(planCost)}`}
                />
              </dl>
              <div className="mt-8 border-t-2 border-foreground pt-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  Estimated net savings
                </p>
                <p className="mt-2 text-5xl font-medium tracking-[-0.055em]">
                  {usdFormatter.format(netSavings)}
                </p>
              </div>
            </CardContent>
            <CardFooter className="mt-8 border-t border-black/10 text-xs leading-5 text-muted-foreground">
              Formula: roles × candidates × interview time × interviewers, less report-review time
              and the recommended plan. Estimates exclude implementation, add-ons, and taxes. This
              compares replaced interview labor—not every ATS feature.
            </CardFooter>
          </div>
        </Card>
      </div>
    </section>
  );
}

function LedgerRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-5 border-b border-black/10 py-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className={strong ? "text-lg font-medium" : "font-mono text-sm"}>{value}</dd>
    </div>
  );
}

function RoundZeroPlans() {
  return (
    <section className="border-b border-border bg-[#f3f5f3]">
      <div className="mx-auto w-full max-w-360 px-6 py-20 lg:px-12 lg:py-28 xl:px-16">
        <div className="grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <span className="marketing-eyebrow">RoundZero pricing</span>
            <h2 className="mt-5 text-4xl font-medium leading-none tracking-[-0.045em]">
              Transparent capacity, from the start.
            </h2>
            <p className="mt-5 text-sm leading-6 text-muted-foreground">
              All applicants receive AI pre-evaluation. Paid plans add AI job creation; Growth and
              Scale include job import.
            </p>
          </div>
          <div className="grid gap-px overflow-hidden border border-black/10 bg-black/10 sm:grid-cols-2 lg:col-span-7 lg:col-start-6 lg:grid-cols-4">
            {SUBSCRIPTION_PLANS.map((plan) => {
              const config = PLAN_CONFIGS[plan];
              return (
                <article key={plan} className="bg-white p-5">
                  <h3 className="font-medium">{config.name}</h3>
                  <p className="mt-4 text-3xl font-medium tracking-[-0.04em]">
                    {config.priceLabel}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{config.periodLabel}</p>
                  <p className="mt-6 text-sm leading-6">
                    {config.includedJobs} active {config.includedJobs === 1 ? "job" : "jobs"}
                    <br />
                    {config.includedReportsPerJob} reports per job
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function VendorComparison() {
  return (
    <section className="border-b border-border bg-white">
      <div className="mx-auto w-full max-w-360 px-6 py-20 lg:px-12 lg:py-28 xl:px-16">
        <div className="max-w-3xl">
          <span className="marketing-eyebrow">The market</span>
          <h2 className="mt-5 text-balance text-4xl font-medium leading-none tracking-[-0.045em] lg:text-6xl">
            Choose the scope your team actually needs.
          </h2>
          <p className="mt-5 text-base leading-7 text-muted-foreground">
            Official pricing and product emphasis verified August 7, 2026. Prices can change; follow
            each source for current terms.
          </p>
        </div>
        <VendorGroup title="Screening & interview platforms" vendors={screeningVendors} />
        <VendorGroup title="Full ATS suites" vendors={atsVendors} />
      </div>
    </section>
  );
}

type Vendor = (typeof screeningVendors)[number];

function VendorGroup({ title, vendors }: { title: string; vendors: Vendor[] }) {
  return (
    <div className="mt-16">
      <h3 className="border-b border-black/15 pb-4 font-mono text-xs uppercase tracking-[0.12em]">
        {title}
      </h3>
      <div>
        {vendors.map((vendor) => (
          <article
            key={vendor.name}
            className="grid gap-5 border-b border-black/10 py-7 md:grid-cols-12 md:gap-7"
          >
            <div className="md:col-span-3">
              <h4 className="text-xl font-medium tracking-[-0.03em]">RoundZero vs {vendor.name}</h4>
              <p className="mt-2 text-sm font-medium">{vendor.price}</p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{vendor.context}</p>
            </div>
            <div className="md:col-span-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Official-site emphasis
              </p>
              <p className="mt-2 text-sm leading-6">{vendor.emphasis}</p>
            </div>
            <div className="md:col-span-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                RoundZero distinction
              </p>
              <p className="mt-2 text-sm leading-6">{vendor.distinction}</p>
            </div>
            <div className="md:col-span-1 md:text-right">
              <a
                href={vendor.source}
                target="_blank"
                rel="nofollow noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm underline underline-offset-4"
              >
                Source
                <HugeiconsIcon icon={ArrowUpRight01Icon} strokeWidth={2} className="size-4" />
              </a>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function ScopeSection() {
  return (
    <section className="border-b border-border bg-[#f3f5f3]">
      <div className="mx-auto grid w-full max-w-360 gap-8 px-6 py-20 md:grid-cols-2 lg:px-12 lg:py-28 xl:px-16">
        <article className="border-t border-black/15 pt-6">
          <span className="marketing-eyebrow">What it replaces</span>
          <h2 className="mt-4 text-3xl font-medium tracking-[-0.04em]">
            Repetitive early evaluation.
          </h2>
          <p className="mt-5 max-w-xl leading-7 text-muted-foreground">
            Resume-only triage, repeated opening screens, scheduling a first call with every maybe,
            and unstructured notes without a visible evidence trail.
          </p>
        </article>
        <article className="border-t border-black/15 pt-6">
          <span className="marketing-eyebrow">What it doesn’t</span>
          <h2 className="mt-4 text-3xl font-medium tracking-[-0.04em]">
            The rest of enterprise recruiting.
          </h2>
          <p className="mt-5 max-w-xl leading-7 text-muted-foreground">
            RoundZero does not replace enterprise CRM, offer management, onboarding, or compliance
            administration. It can complement a full ATS by improving the work before a human
            interview.
          </p>
        </article>
      </div>
    </section>
  );
}

function ClosingCta() {
  return (
    <section className="bg-white">
      <div className="mx-auto w-full max-w-360 px-6 py-20 text-center lg:px-12 lg:py-28 xl:px-16">
        <span className="marketing-eyebrow">Start with the next role</span>
        <h2 className="mx-auto mt-5 max-w-4xl text-balance text-5xl font-medium leading-[0.96] tracking-[-0.055em] lg:text-7xl">
          Meet candidates after the evidence does.
        </h2>
        <Button size="lg" className="mt-8 rounded-full" asChild>
          <Link to="/company/login">
            Start free
            <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
