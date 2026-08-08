import { createFileRoute } from "@tanstack/react-router";

import {
  ContentHero,
  ContentSection,
  FinalCta,
  MarketingContentPage,
  RelatedContent,
} from "@/features/marketing/components/content-page";
import { absoluteUrl, breadcrumbJsonLd, buildPageHead } from "@/shared/seo";

const title = "Hiring and AI Interview Resources | RoundZero";
const description =
  "Practical guides to skills-based hiring, structured interview scorecards, and preparing for an AI interview.";
const imagePath = "/og/resources.png";
const breadcrumbs = [
  { name: "Home", path: "/" },
  { name: "Resources", path: "/resources" },
];

export const Route = createFileRoute("/resources/")({
  head: () =>
    buildPageHead({
      title,
      description,
      path: "/resources",
      imageUrl: absoluteUrl(imagePath),
      imageAlt: "Hiring and AI interview resources from RoundZero",
      scripts: [breadcrumbJsonLd(breadcrumbs)],
    }),
  component: ResourcesPage,
});

function ResourcesPage() {
  return (
    <MarketingContentPage breadcrumbs={breadcrumbs}>
      <ContentHero
        eyebrow="Resources"
        title="Hiring and AI interview resources for clearer decisions."
        lead="Practical guides for teams designing an evaluation process and candidates preparing to show their work in an AI-led interview."
        supporting="These guides explain the process plainly. They do not promise bias-free decisions, guaranteed outcomes, or shortcuts around real experience."
      />

      <ContentSection
        eyebrow="For hiring teams"
        title="Design the process before choosing the outcome."
        lead="Define job-relevant evidence, ask comparable questions, and keep the reasoning visible when your team reviews candidates."
        muted
      >
        <div className="space-y-4">
          <a
            href="/resources/skills-based-hiring"
            className="group block rounded-2xl border border-border/60 bg-white p-6"
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Employer guide · 9 min
            </span>
            <h3 className="mt-3 text-2xl font-medium tracking-[-0.035em] group-hover:underline group-hover:underline-offset-4">
              Skills-based hiring: a practical evidence-first process
            </h3>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Move from credentials and keywords toward criteria, work evidence, structured
              follow-up, and accountable human review.
            </p>
          </a>
          <a
            href="/resources/structured-interview-scorecards"
            className="group block rounded-2xl border border-border/60 bg-white p-6"
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Employer guide · 8 min
            </span>
            <h3 className="mt-3 text-2xl font-medium tracking-[-0.035em] group-hover:underline group-hover:underline-offset-4">
              Structured interview scorecards that preserve evidence
            </h3>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Define dimensions, observable anchors, question coverage, and a review record your
              team can compare without reducing a candidate to one number.
            </p>
          </a>
        </div>
      </ContentSection>

      <ContentSection
        eyebrow="For candidates"
        title="Know the format before the invitation arrives."
        lead="An AI-led interview feels less opaque when the stages, timing, follow-ups, voice step, and report are explained in advance."
      >
        <a
          href="/resources/ai-interview-guide"
          className="group block rounded-2xl border border-border/60 bg-muted/25 p-6"
        >
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Candidate guide · 8 min
          </span>
          <h3 className="mt-3 text-2xl font-medium tracking-[-0.035em] group-hover:underline group-hover:underline-offset-4">
            What to expect from a RoundZero AI interview
          </h3>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Prepare your environment and examples, understand adaptive follow-ups, and learn what
            the hiring team receives after text and voice are complete.
          </p>
        </a>
      </ContentSection>

      <RelatedContent
        title="Explore the product behind the process"
        items={[
          {
            eyebrow: "Product",
            title: "Candidate screening software",
            description: "See how submitted applications receive pre-evaluation.",
            href: "/candidate-screening-software",
          },
          {
            eyebrow: "Product",
            title: "AI interview platform",
            description: "Explore adaptive text and voice evaluation.",
            href: "/ai-interview-platform",
          },
          {
            eyebrow: "Product",
            title: "Candidate evaluation software",
            description: "Review the report, evidence, and ranked batch workflow.",
            href: "/candidate-evaluation-software",
          },
        ]}
      />

      <FinalCta
        title="Put the process into practice."
        body="Create a role with clear requirements, receive pre-evaluation on every submitted application, and review selected candidates with the evidence attached."
      />
    </MarketingContentPage>
  );
}
