import { createFileRoute } from "@tanstack/react-router";

import {
  ContentHero,
  ContentSection,
  EvidenceList,
  FaqList,
  FinalCta,
  MarketingContentPage,
  ProcessList,
  ProductImage,
  RelatedContent,
} from "@/features/marketing/components/content-page";
import { absoluteUrl, breadcrumbJsonLd, buildPageHead } from "@/shared/seo";

const title = "Candidate Evaluation Software with Evidence | RoundZero";
const description =
  "Review candidate scores, recommendations, strengths, concerns, transcripts, and interview evidence in one structured report.";
const imagePath = "/og/candidate-evaluation-software.png";
const breadcrumbs = [
  { name: "Home", path: "/" },
  { name: "Candidate evaluation software", path: "/candidate-evaluation-software" },
];

export const Route = createFileRoute("/candidate-evaluation-software")({
  head: () =>
    buildPageHead({
      title,
      description,
      path: "/candidate-evaluation-software",
      imageUrl: absoluteUrl(imagePath),
      imageAlt: "Candidate evaluation software with evidence you can inspect",
      scripts: [breadcrumbJsonLd(breadcrumbs)],
    }),
  component: CandidateEvaluationSoftwarePage,
});

function CandidateEvaluationSoftwarePage() {
  return (
    <MarketingContentPage breadcrumbs={breadcrumbs}>
      <ContentHero
        eyebrow="Candidate evaluation software"
        title="Candidate evaluation software with evidence you can inspect."
        lead="RoundZero turns completed text and voice interviews into structured reports with scores, strengths, gaps, screening answers, authenticity signals, transcripts, and evidence from what the candidate actually said."
        supporting="The report supports a hiring decision. It does not make one: your team retains every shortlist, rejection, and final employment choice."
      />

      <ContentSection
        eyebrow="Multi-pass review"
        title="Build the report after the full signal arrives."
        lead="Post-evaluation waits for both interview stages, checks whether the conversation contains enough signal, audits the generated assessment, and persists a stable report for company review."
        muted
      >
        <ProcessList
          steps={[
            {
              label: "01 · Gather",
              title: "Load the complete interview context",
              body: "The evaluation uses text and voice transcripts, job context, required-question coverage, pre-evaluation context, and recorded interview integrity signals.",
            },
            {
              label: "02 · Evaluate",
              title: "Generate and refine the structured assessment",
              body: "RoundZero produces the report, applies deterministic checks, runs an additional audit pass, and blends usable voice evidence into communication scoring.",
            },
            {
              label: "03 · Hold",
              title: "Keep batched reports together",
              body: "When an interview belongs to a batch, its completed report waits until the batch releases so the company receives a coherent review set.",
            },
            {
              label: "04 · Decide",
              title: "Review, shortlist, or reject",
              body: "Released candidates are sorted by overall score. Reviewers can move between reports, inspect evidence, and record the company’s decision.",
            },
          ]}
        />
      </ContentSection>

      <ContentSection
        eyebrow="Inside the report"
        title="The score is the index. The evidence is the work."
        lead="A recommendation without a trail is hard to trust. RoundZero keeps the supporting details next to the outcome."
      >
        <EvidenceList
          items={[
            "Overall score and Strong shortlist, Shortlist, Borderline, or Reject recommendation",
            "Communication, problem solving, ownership, and role-fit dimensions",
            "Summary, strengths, weaknesses, and deeper insights",
            "Evidence excerpts tied to the interview",
            "Company screening answers with OK, Flag, or Dealbreaker concerns",
            "Answer-authenticity risk, explanation, and supporting signals",
            "Voice clarity, articulation, conciseness, listening, and confidence evidence",
            "Text and voice transcripts for direct review",
          ]}
        />
      </ContentSection>

      <section className="border-b border-border bg-[#edf4ef]">
        <div className="mx-auto w-full max-w-[90rem] px-6 py-12 lg:px-12 lg:py-20 xl:px-16">
          <ProductImage alt="RoundZero candidate report with a shortlist recommendation, four score dimensions, strengths, gaps, and quoted interview evidence" />
        </div>
      </section>

      <ContentSection
        eyebrow="Communication"
        title="Voice contributes evidence, not a personality score."
        lead="The voice assessment is reviewed across clarity, articulation, conciseness, listening, and confidence. Its influence on communication scoring varies with the amount of usable evidence rather than using a fixed split."
        muted
      >
        <div className="rounded-2xl border border-border/60 bg-white p-6">
          <h3 className="text-lg font-medium tracking-[-0.02em]">What RoundZero does not claim</h3>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            The report does not infer emotion, guarantee future performance, eliminate bias, or
            replace a company’s responsibility to review job-relevant evidence fairly.
          </p>
        </div>
      </ContentSection>

      <ContentSection
        eyebrow="Questions"
        title="Candidate evaluation software FAQ"
        lead="Reports are designed to make an assessment inspectable, including where the evidence is incomplete or concerning."
      >
        <FaqList
          items={[
            {
              question: "What recommendation labels does RoundZero use?",
              answer:
                "A completed report can recommend Strong shortlist, Shortlist, Borderline, or Reject. The employer reviews that recommendation and makes the actual advancement or rejection decision.",
            },
            {
              question: "Can reviewers inspect the underlying interview?",
              answer:
                "Yes. Reports preserve text and voice transcripts and show findings alongside supporting excerpts, screening-answer review, and authenticity signals.",
            },
            {
              question: "Are candidates ranked automatically?",
              answer:
                "Released reports within an evaluation batch are ordered by overall score to organize review. The ranking does not replace the employer’s comparison, shortlist, or final decision.",
            },
          ]}
        />
      </ContentSection>

      <RelatedContent
        items={[
          {
            eyebrow: "Product",
            title: "Candidate screening software",
            description: "Understand the pre-evaluation that comes before the report.",
            href: "/candidate-screening-software",
          },
          {
            eyebrow: "Product",
            title: "AI interview platform",
            description: "Explore the adaptive text and required voice interview flow.",
            href: "/ai-interview-platform",
          },
          {
            eyebrow: "Guide",
            title: "Structured interview scorecards",
            description: "Define dimensions and collect comparable job-relevant evidence.",
            href: "/resources/structured-interview-scorecards",
          },
        ]}
      />

      <FinalCta
        title="Meet the candidate after the evidence does."
        body="Review the recommendation, inspect the transcript, and spend human interview time where your team sees real reasons to continue."
      />
    </MarketingContentPage>
  );
}
