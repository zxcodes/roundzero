import { ArrowRight01Icon, ArrowRight02Icon } from "@hugeicons/core-free-icons";
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
import { currentUserQueryKey, getCurrentUser } from "@/features/auth/server/functions";
import { MarketingPricingSection } from "@/features/marketing/components/pricing-section";
import {
  buildPageHead,
  DEFAULT_META_TITLE,
  HOMEPAGE_META_DESCRIPTION,
  homepageJsonLd,
} from "@/shared/seo";

export const Route = createFileRoute("/")({
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.fetchQuery({
      queryKey: currentUserQueryKey,
      queryFn: () => getCurrentUser(),
      staleTime: 30_000,
    });

    if (user?.role) {
      throw redirect({ to: "/dashboard" });
    }
  },
  head: () =>
    buildPageHead({
      title: DEFAULT_META_TITLE,
      description: HOMEPAGE_META_DESCRIPTION,
      path: "/",
      scripts: [homepageJsonLd(faq)],
    }),
  component: HomePage,
});

function HomePage() {
  return (
    <div className="marketing-page min-h-svh bg-background text-foreground">
      <a href="#main-content" className="marketing-skip-link">
        Skip to main content
      </a>
      <PublicHeader />
      <main id="main-content">
        <Hero />
        <HowItWorks />
        <ReportSection />
        <CandidateSection />
        <MarketingPricingSection />
        <FaqSection />
        <ClosingSection />
      </main>
      <PublicFooter />
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <span className="marketing-eyebrow">{children}</span>;
}

function PrimaryCta({ children }: { children: React.ReactNode }) {
  return (
    <Button size="lg" className="h-11 rounded-full px-5 font-medium" asChild>
      <Link to="/company/login">
        {children}
        <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-4" />
      </Link>
    </Button>
  );
}

function Hero() {
  return (
    <section className="marketing-hero relative overflow-hidden">
      <div className="mx-auto w-full max-w-360 px-6 pb-0 pt-16 lg:px-12 lg:pt-24 xl:px-16">
        <div className="marketing-rise w-full text-left">
          <Eyebrow>Early access</Eyebrow>
          <h1 className="mt-4 text-[clamp(2rem,3.6vw,4rem)] font-semibold leading-[1.06] tracking-[-0.035em] sm:whitespace-nowrap">
            Review candidates, not <span className="marketing-hero-highlight">resumes</span>.
          </h1>
          <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <p className="min-w-0 max-w-xl text-[clamp(0.95rem,1.2vw,1.05rem)] leading-relaxed text-muted-foreground">
              Pre-screen every applicant and review evidence-backed reports on selected candidates
              before scheduling a human interview.
            </p>
            <div className="flex shrink-0 items-center gap-4">
              <PrimaryCta>Post a job</PrimaryCta>
              <Link
                to="/"
                hash="product"
                className="inline-flex items-center gap-0.5 text-sm text-foreground transition-colors hover:text-foreground/70"
              >
                See how it works
                <HugeiconsIcon icon={ArrowRight02Icon} strokeWidth={2} className="size-3.5" />
              </Link>
            </div>
          </div>
        </div>

        <div className="marketing-rise marketing-hero-app mt-10 lg:mt-14">
          <img
            src="/marketing/report.png"
            alt="RoundZero application showing the complete candidate report with navigation, recommendation, verdict, and evidence"
            className="marketing-hero-app-image"
            width={2940}
            height={1676}
            loading="eager"
            fetchPriority="high"
            decoding="async"
          />
        </div>
      </div>
    </section>
  );
}

const supportedImportPlatforms = ["Greenhouse", "Lever", "Ashby", "Recruitee", "SmartRecruiters"];

function JobImportPanel() {
  return (
    <aside
      aria-labelledby="job-import-heading"
      className="mt-16 overflow-hidden rounded-[2rem] bg-[#f3f5f3] lg:mt-24"
    >
      <div className="grid lg:grid-cols-[minmax(18rem,0.8fr)_minmax(0,1.2fr)]">
        <div className="px-6 py-8 sm:px-8 lg:px-10 lg:py-10">
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            Start without starting over
          </span>
          <h3
            id="job-import-heading"
            className="mt-4 max-w-md text-balance text-[clamp(1.65rem,2.5vw,2.4rem)] font-medium leading-[1.05] tracking-[-0.04em]"
          >
            Import the jobs you already have.
          </h3>
          <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">
            Bring in existing postings, check the details, and keep every imported role safely in
            draft.
          </p>
        </div>

        <div className="border-t border-black/10 bg-white/65 px-6 py-8 sm:px-8 lg:border-l lg:border-t-0 lg:px-10 lg:py-10">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            Supported sources
          </p>
          <ul
            aria-label="Supported job platforms"
            className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-4"
          >
            {supportedImportPlatforms.map((platform) => (
              <li
                key={platform}
                className="text-[0.95rem] font-semibold tracking-[-0.025em] text-foreground/75"
              >
                {platform}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-black/10 pt-5">
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-foreground/65">
              Careers URL or CSV
            </span>
            <span className="font-mono text-[10px] text-muted-foreground" aria-hidden="true">
              →
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-foreground/65">
              Review
            </span>
            <span className="font-mono text-[10px] text-muted-foreground" aria-hidden="true">
              →
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-foreground/65">
              Drafts
            </span>
            <span className="ml-auto rounded-full border border-black/12 bg-white/70 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              Growth &amp; Scale
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}

const steps = [
  {
    number: "01",
    title: "Post the role",
    body: "Describe the work, the standards, and the practical constraints. RoundZero turns them into a structured evaluation.",
  },
  {
    number: "02",
    title: "Selected candidates interview",
    body: "Strong matches complete an adaptive first interview on their own time. Zero probes claims, asks follow-ups, and checks role fit.",
  },
  {
    number: "03",
    title: "Review the evidence",
    body: "Your team receives ranked reports with a recommendation, clear concerns, and the conversation behind every score.",
  },
];

function HowItWorks() {
  return (
    <section id="product" className="scroll-mt-20 border-b border-border bg-white">
      <div className="mx-auto w-full max-w-360 px-5 py-20 sm:px-8 lg:px-12 lg:py-32 xl:px-16">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-28">
              <Eyebrow>How it works</Eyebrow>
              <h2 className="mt-5 max-w-xl text-balance text-[clamp(2.5rem,4.8vw,4.8rem)] font-medium leading-[0.98] tracking-[-0.052em]">
                One complete first round. No scheduling.
              </h2>
              <p className="mt-6 max-w-md text-[1.02rem] leading-7 text-muted-foreground">
                RoundZero does the repetitive work before a human interview and keeps the decision
                trail visible.
              </p>
            </div>
          </div>

          <ol className="border-t border-black/12 lg:col-span-6 lg:col-start-7">
            {steps.map((step) => (
              <li
                key={step.number}
                className="grid gap-5 border-b border-black/12 py-9 sm:grid-cols-[72px_1fr] lg:py-11"
              >
                <span className="font-mono text-xs tracking-[0.12em] text-muted-foreground">
                  {step.number}
                </span>
                <div>
                  <h3 className="text-[clamp(1.45rem,2vw,2rem)] font-medium tracking-[-0.035em]">
                    {step.title}
                  </h3>
                  <p className="mt-3 max-w-lg text-[0.98rem] leading-7 text-muted-foreground">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <JobImportPanel />
      </div>
    </section>
  );
}

function ReportSection() {
  return (
    <section className="overflow-hidden border-b border-border bg-[#f3f5f3]">
      <div className="mx-auto grid w-full max-w-[100rem] items-center gap-12 px-5 py-20 sm:px-8 lg:grid-cols-12 lg:gap-8 lg:px-12 lg:py-32 xl:px-16">
        <div className="lg:col-span-4 lg:col-start-2">
          <Eyebrow>A report, not a ranking</Eyebrow>
          <h2 className="mt-5 text-balance text-[clamp(2.5rem,3.8vw,3.6rem)] font-medium leading-[0.98] tracking-[-0.052em]">
            Every recommendation shows its work.
          </h2>
          <p className="mt-6 max-w-md text-[1.02rem] leading-7 text-muted-foreground">
            Read the verdict, see the strengths and concerns, then trace each conclusion back to
            what the candidate actually said.
          </p>
          <dl className="mt-10 border-t border-black/12">
            <div className="grid grid-cols-[110px_1fr] border-b border-black/12 py-4 text-sm">
              <dt className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                Outcome
              </dt>
              <dd className="font-medium">Shortlist or reject with context</dd>
            </div>
            <div className="grid grid-cols-[110px_1fr] border-b border-black/12 py-4 text-sm">
              <dt className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                Evidence
              </dt>
              <dd className="font-medium">Quoted from the interview</dd>
            </div>
            <div className="grid grid-cols-[110px_1fr] border-b border-black/12 py-4 text-sm">
              <dt className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                Signal
              </dt>
              <dd className="font-medium">Strengths, concerns, and role fit</dd>
            </div>
          </dl>
        </div>

        <div className="marketing-report-frame lg:col-span-7 lg:col-start-6">
          <img
            src="/marketing/report-product.png"
            alt="A close view of a RoundZero report with candidate verdict, strengths, concerns, and interview evidence"
            width={2342}
            height={1568}
            loading="lazy"
            decoding="async"
          />
        </div>
      </div>
    </section>
  );
}

function CandidateSection() {
  return (
    <section className="border-b border-border bg-white">
      <div className="mx-auto grid w-full max-w-360 items-start gap-12 px-5 py-20 sm:px-8 lg:grid-cols-12 lg:px-12 lg:py-32 xl:px-16">
        <div className="lg:col-span-5">
          <Eyebrow>For candidates</Eyebrow>
          <h2 className="mt-5 max-w-xl text-balance text-[clamp(2.5rem,4.6vw,4.6rem)] font-medium leading-[0.98] tracking-[-0.052em]">
            Find the fit. Then show your thinking.
          </h2>
          <p className="mt-6 max-w-md text-[1.02rem] leading-7 text-muted-foreground">
            Upload your résumé once. RoundZero ranks open roles against your experience and emails
            you when a strong match appears. You choose where to apply, then interview on your own
            time.
          </p>
          <ul className="mt-9 space-y-3">
            {[
              "See open roles ranked by fit.",
              "Get one email when new strong matches appear.",
              "Apply when the role feels right. Nothing is automatic.",
              "Complete the first interview without scheduling.",
            ].map((item) => (
              <li key={item} className="flex items-center gap-3 text-sm text-foreground/80">
                <span className="size-1.5 shrink-0 rounded-full bg-[#2f7a4d]" />
                {item}
              </li>
            ))}
          </ul>
          <Link
            to="/candidate/login"
            className="mt-9 inline-flex items-center gap-1.5 text-sm font-medium hover:text-foreground/70"
          >
            Find matched jobs
            <HugeiconsIcon icon={ArrowRight02Icon} strokeWidth={2} className="size-4" />
          </Link>
        </div>

        <div className="lg:col-span-6 lg:col-start-7">
          <div className="rounded-[2rem] bg-[#f3f5f3] p-6 sm:p-8 lg:p-10">
            <div>
              <span className="inline-flex rounded-full bg-[#dcebe0] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-(--marketing-success-ink)">
                Strong fit
              </span>
              <h3 className="mt-5 text-[clamp(1.65rem,2.6vw,2.35rem)] font-medium leading-tight tracking-[-0.04em]">
                Senior Full-Stack Engineer
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">Remote · Full time</p>
            </div>

            <div className="mt-7 max-w-2xl">
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                Why it matches
              </p>
              <p className="mt-2 text-[clamp(1rem,1.5vw,1.18rem)] leading-7 text-foreground/70">
                Your TypeScript product work, API experience, and PostgreSQL background align with
                the role.
              </p>
            </div>

            <div className="mt-9 rounded-3xl bg-white/85 p-6 sm:p-7">
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                After you apply
              </p>

              <div className="mt-7 space-y-7">
                <div className="grid gap-2 sm:grid-cols-[88px_1fr] sm:gap-4">
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    Zero
                  </span>
                  <p className="text-[clamp(1rem,1.5vw,1.15rem)] leading-7">
                    What broke when a client reconnected after being offline?
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-[88px_1fr] sm:gap-4">
                  <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    Candidate
                  </span>
                  <p className="text-[clamp(1rem,1.5vw,1.15rem)] leading-7 text-muted-foreground">
                    We replayed the missed entries, then deduplicated them against a sliding window
                    in IndexedDB. The tradeoff was storage pressure on long offline sessions.
                  </p>
                </div>
              </div>

              <p className="mt-7 rounded-2xl bg-[#eaf3ed] px-4 py-3 font-mono text-[10px] uppercase leading-5 tracking-[0.12em] text-(--marketing-success-ink)">
                Observed signal: explains failure modes and tradeoffs with concrete detail
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const faq = [
  {
    question: "How does job matching work?",
    answer:
      "Candidates upload a résumé, and RoundZero compares their experience with current open jobs. Each candidate gets a ranked feed with reasons for every match and can opt into one daily email when new strong matches appear. RoundZero never applies on a candidate's behalf.",
  },
  {
    question: "How does the interview work?",
    answer:
      "Candidates complete an adaptive interview on their own time. Zero asks role-specific questions, follows up on vague answers, and validates claims against the résumé. The candidate interface estimates 15–20 minutes for the full evaluation, followed by an approximately five-minute voice assessment.",
  },
  {
    question: "What is included in a candidate report?",
    answer:
      "Each report contains a recommendation, an overall score, role-specific dimensions, strengths, concerns, and evidence from the interview. Your team can see why the candidate received the result.",
  },
  {
    question: "Does this replace every human interview?",
    answer:
      "No. RoundZero replaces the repetitive first round. Your team still speaks to the candidates who deserve deeper time and attention.",
  },
  {
    question: "Can candidates use AI to answer?",
    answer:
      "RoundZero checks for consistency and depth, asks for context that generic answers cannot supply, and follows up when a response lacks specifics. Suspicious signals are included in the evaluation.",
  },
  {
    question: "Does it work outside technical hiring?",
    answer:
      "Yes. RoundZero can evaluate any role with clear responsibilities, requirements, and success criteria. The interview and report adapt to the job.",
  },
];

function FaqSection() {
  return (
    <section className="border-b border-border bg-[#f7f7f8]">
      <div className="mx-auto grid w-full max-w-360 gap-10 px-5 py-20 sm:px-8 lg:grid-cols-12 lg:px-12 lg:py-28 xl:px-16">
        <div className="lg:col-span-4">
          <Eyebrow>Questions</Eyebrow>
          <h2 className="mt-5 text-[clamp(2.4rem,4vw,4rem)] font-medium leading-none tracking-tighter">
            The useful answers.
          </h2>
        </div>
        <div className="lg:col-span-7 lg:col-start-6">
          <Accordion type="single" collapsible className="w-full border-t border-black/12">
            {faq.map((item, index) => (
              <AccordionItem key={item.question} value={`question-${index}`}>
                <AccordionTrigger className="py-6 text-left text-base font-medium hover:no-underline">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent>
                  <p className="max-w-[62ch] pb-3 text-[0.95rem] leading-7 text-muted-foreground">
                    {item.answer}
                  </p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}

function ClosingSection() {
  return (
    <section className="marketing-closing relative overflow-hidden">
      <div className="marketing-mesh" aria-hidden="true" />
      <div className="relative z-10 mx-auto w-full max-w-360 px-5 py-16 text-center sm:px-8 lg:px-12 lg:py-24 xl:px-16">
        <div className="marketing-closing-glass mx-auto max-w-6xl px-5 py-16 sm:px-10 lg:px-16 lg:py-24">
          <Eyebrow>Start with one role</Eyebrow>
          <h2 className="mx-auto mt-7 max-w-4xl text-balance text-[clamp(3rem,6.4vw,6.5rem)] font-medium leading-[0.92] tracking-[-0.065em]">
            Stop spending interviews on maybes.
          </h2>
          <p className="mx-auto mt-7 max-w-lg text-[1.05rem] leading-7 text-[#5f6169]">
            Post a job. Let strong candidates show their work. Meet the people who earn the time.
          </p>
          <div className="mt-9 flex justify-center">
            <PrimaryCta>Post your first job</PrimaryCta>
          </div>
        </div>
      </div>
    </section>
  );
}
