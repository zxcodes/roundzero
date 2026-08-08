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

const title = "AI Candidate Screening Software | RoundZero";
const description =
  "Move beyond keyword-based ATS filters with AI candidate screening that reads each résumé against the role and surfaces evidence for human review.";
const imagePath = "/og/candidate-screening-software.png";
const breadcrumbs = [
  { name: "Home", path: "/" },
  { name: "Candidate screening software", path: "/candidate-screening-software" },
];

export const Route = createFileRoute("/candidate-screening-software")({
  head: () =>
    buildPageHead({
      title,
      description,
      path: "/candidate-screening-software",
      imageUrl: absoluteUrl(imagePath),
      imageAlt: "Candidate screening software built for evidence",
      scripts: [breadcrumbJsonLd(breadcrumbs)],
    }),
  component: CandidateScreeningSoftwarePage,
});

function CandidateScreeningSoftwarePage() {
  return (
    <MarketingContentPage breadcrumbs={breadcrumbs}>
      <ContentHero
        eyebrow="Candidate screening software"
        title="Candidate screening software that screens for evidence."
        lead="RoundZero reviews every submitted application against the work itself, surfaces fit and missing evidence, and sends the strongest candidates into a structured interview workflow."
        supporting="Pre-evaluation supports the first decision. Your team can inspect applicants throughout the pipeline and keeps control of every shortlist or rejection."
      />

      <ContentSection
        eyebrow="The first pass"
        title="A résumé is input, not the verdict."
        lead="Keyword filters reward wording. RoundZero looks for role-relevant work, outcomes, consistency, and missing requirements before deciding whether deeper evaluation is warranted."
        muted
      >
        <ProcessList
          steps={[
            {
              label: "01 · Apply",
              title: "Start with the candidate’s submitted profile",
              body: "Every application includes a résumé snapshot tied to the role, so the screening record reflects what the candidate actually submitted at apply time.",
            },
            {
              label: "02 · Read",
              title: "Evaluate the role and résumé together",
              body: "RoundZero classifies the role and uses a role-specific evaluation to assess demonstrated work, outcomes, requirements, and consistency instead of exact keyword overlap alone.",
            },
            {
              label: "03 · Route",
              title: "Pool strong fits for deeper evaluation",
              body: "A profile match score, confidence, missing requirements, and deterministic safeguards decide whether the application enters the interview pool or remains under company review.",
            },
          ]}
        />
      </ContentSection>

      <ContentSection
        eyebrow="Beyond keyword filters"
        title="An ATS can store the résumé. That does not mean it understands it."
        lead="Legacy ATS screening workflows often depend on exact keywords, Boolean rules, and pattern matching. Those tools can find a phrase, but they struggle to judge whether different wording describes relevant experience."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <article className="rounded-2xl border border-border/60 bg-muted/25 p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Keyword-based filtering
            </p>
            <h3 className="mt-3 text-xl font-medium tracking-[-0.03em]">
              Matches the words on the page.
            </h3>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              Exact-term and Boolean filters reward candidates who use the expected phrasing. A
              relevant project can be missed when the résumé uses a different title, tool, or way of
              describing the same underlying work.
            </p>
          </article>
          <article className="rounded-2xl border border-border/60 bg-white p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--marketing-success-ink)]">
              RoundZero pre-evaluation
            </p>
            <h3 className="mt-3 text-xl font-medium tracking-[-0.03em]">
              Reads the résumé in the context of the role.
            </h3>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              A role-specific LLM evaluation considers demonstrated work, responsibilities,
              outcomes, requirements, and consistency together. It surfaces relevant evidence,
              missing requirements, a match score, and confidence for the hiring team to inspect.
            </p>
          </article>
        </div>
        <p className="mt-5 border-l border-black/20 pl-4 text-sm leading-6 text-muted-foreground">
          This is a better-informed first pass, not an automatic employment decision. RoundZero can
          route stronger evidence toward deeper evaluation; the company retains control of
          advancement, rejection, and the final hire.
        </p>
      </ContentSection>

      <ContentSection
        eyebrow="Visible output"
        title="See the signal behind the status."
        lead="Pre-screening becomes part of the applicant timeline rather than disappearing inside an opaque filter."
      >
        <EvidenceList
          items={[
            "A 0–10 profile match score and confidence level",
            "Role requirements that still lack evidence",
            "Consistency signals with conservative fallbacks",
            "The candidate’s profile and submitted résumé",
            "A clear pipeline state for company review",
            "Manual rejection remains available before evaluation completes",
          ]}
        />
      </ContentSection>

      <ContentSection
        eyebrow="From screen to interview"
        title="The first pass leads somewhere useful."
        lead="Candidates who meet the routing rules wait in a job-specific pool. Invitations are issued in batches within the report capacity your team selected for that role."
        muted
      >
        <ProductImage alt="RoundZero candidate report showing a recommendation, scores, strengths, gaps, and interview evidence" />
        <p className="mt-5 text-sm leading-6 text-muted-foreground">
          Screening does not produce the final report. Selected candidates first complete the
          adaptive text and voice interview, then RoundZero generates the evidence-backed review
          your team sees here.
        </p>
      </ContentSection>

      <ContentSection
        eyebrow="Decision boundary"
        title="Automation prepares the review. People make the call."
        lead="RoundZero helps decide where deeper evaluation is worthwhile. It does not hire, reject, or claim to remove human judgment from employment decisions."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-border/60 bg-muted/25 p-5">
            <h3 className="text-base font-medium">RoundZero handles</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Resume extraction, role-specific pre-evaluation, missing-evidence detection, routing,
              batching, and pipeline updates.
            </p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-white p-5">
            <h3 className="text-base font-medium">Your team decides</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Who advances, who is shortlisted, what follow-up is needed, and who ultimately joins
              the team.
            </p>
          </div>
        </div>
      </ContentSection>

      <ContentSection
        eyebrow="Questions"
        title="Candidate screening software FAQ"
        lead="The important boundary is simple: screening organizes evidence and deeper evaluation. Your team owns the hiring decision."
        muted
      >
        <FaqList
          items={[
            {
              question: "Does RoundZero automatically reject applicants?",
              answer:
                "No. Pre-evaluation can route an application into the interview pool or hold it for company review, but the employer controls rejection, advancement, and the final decision.",
            },
            {
              question: "Does every applicant receive an AI interview?",
              answer:
                "Every submitted application receives pre-evaluation. Longer text and voice interviews are reserved for selected candidates within the report capacity chosen for the job.",
            },
            {
              question: "What does the first evaluation use?",
              answer:
                "It reviews the submitted résumé snapshot alongside the job, including requirements and role context. Company screening questions are asked later during the text interview.",
            },
            {
              question: "How is this different from an ATS keyword filter?",
              answer:
                "Keyword and Boolean filters look for expected terms. RoundZero uses a role-specific LLM evaluation to consider the meaning of demonstrated work, responsibilities, outcomes, requirements, and gaps even when the résumé uses different wording.",
            },
          ]}
        />
      </ContentSection>

      <RelatedContent
        items={[
          {
            eyebrow: "Product",
            title: "AI interview platform",
            description: "See how selected candidates complete adaptive text and voice interviews.",
            href: "/ai-interview-platform",
          },
          {
            eyebrow: "Product",
            title: "Candidate evaluation software",
            description: "Explore the reports, evidence, recommendations, and ranked review flow.",
            href: "/candidate-evaluation-software",
          },
          {
            eyebrow: "Guide",
            title: "Skills-based hiring",
            description: "Build a hiring process around job-relevant evidence instead of proxies.",
            href: "/resources/skills-based-hiring",
          },
        ]}
      />

      <FinalCta
        title="Review the work before booking the call."
        body="Post an open role, let every applicant receive pre-evaluation, and reserve deeper interviews for candidates with relevant evidence."
      />
    </MarketingContentPage>
  );
}
