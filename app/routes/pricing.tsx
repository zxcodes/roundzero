import { createFileRoute } from "@tanstack/react-router";

import {
  ContentHero,
  ContentSection,
  FaqList,
  FinalCta,
  MarketingContentPage,
  RelatedContent,
} from "@/features/marketing/components/content-page";
import { MarketingPricingSection } from "@/features/marketing/components/pricing-section";
import { absoluteUrl, breadcrumbJsonLd, buildPageHead } from "@/shared/seo";

const title = "RoundZero Pricing | AI Candidate Screening Plans";
const description =
  "Compare RoundZero plans for active jobs, AI pre-evaluation, evidence-backed candidate reports, teammates, job creation, and imports.";
const imagePath = "/og/pricing.png";
const breadcrumbs = [
  { name: "Home", path: "/" },
  { name: "Pricing", path: "/pricing" },
];

export const Route = createFileRoute("/pricing")({
  head: () =>
    buildPageHead({
      title,
      description,
      path: "/pricing",
      imageUrl: absoluteUrl(imagePath),
      imageAlt: "RoundZero pricing that starts with one role and scales with hiring",
      scripts: [breadcrumbJsonLd(breadcrumbs)],
    }),
  component: PricingPage,
});

function PricingPage() {
  return (
    <MarketingContentPage breadcrumbs={breadcrumbs}>
      <ContentHero
        eyebrow="Pricing"
        title="RoundZero pricing that starts with one role and scales with hiring."
        lead="Every plan pre-evaluates submitted applications. Choose how many active roles, evidence-backed reports, and teammates your hiring workflow needs."
        supporting="Draft jobs are always free to prepare. An active-job slot is used only when a job is open."
        secondaryHref="/compare"
        secondaryLabel="Compare platforms"
      />

      <MarketingPricingSection showIntro={false} className="[&>div]:pt-14 lg:[&>div]:pt-20" />

      <ContentSection
        eyebrow="How capacity works"
        title="Pay for the review scope you choose."
        lead="RoundZero separates the number of open roles from the number of deep evaluation reports committed to each role."
        muted
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            {
              title: "Active jobs",
              body: "Only open jobs count toward the plan limit. Create and edit drafts without consuming an active slot.",
            },
            {
              title: "Reports per job",
              body: "Set an evaluation-report target for each job within the plan limit. Once set, the target can increase but cannot decrease.",
            },
            {
              title: "Every application",
              body: "AI pre-evaluation runs for submitted applicants on every plan. Deeper text and voice interviews are selective and capacity-aware.",
            },
            {
              title: "Team seats",
              body: "Plan teammate limits count invited members beyond the company owner, including pending invitations that reserve a slot.",
            },
          ].map((item) => (
            <article key={item.title} className="rounded-2xl border border-border/60 bg-white p-5">
              <h3 className="text-lg font-medium tracking-[-0.02em]">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.body}</p>
            </article>
          ))}
        </div>
      </ContentSection>

      <ContentSection
        eyebrow="Included workflow"
        title="The free plan is a real hiring loop."
        lead="Post one active job, receive pre-evaluation on submitted applications, and release evidence-backed reports within the plan’s per-job limit. Paid plans expand capacity and workflow tools."
      >
        <div className="border-t border-black/15">
          <div className="grid gap-3 border-b border-black/15 py-5 sm:grid-cols-[12rem_1fr]">
            <h3 className="font-medium">Paid plans</h3>
            <p className="text-sm leading-6 text-muted-foreground">
              Add AI-assisted job creation, more active roles, more evaluation reports, and more
              teammates.
            </p>
          </div>
          <div className="grid gap-3 border-b border-black/15 py-5 sm:grid-cols-[12rem_1fr]">
            <h3 className="font-medium">Growth and Scale</h3>
            <p className="text-sm leading-6 text-muted-foreground">
              Import existing jobs from supported public boards or CSV, review normalized details,
              and keep imported roles safely in draft until publication.
            </p>
          </div>
          <div className="grid gap-3 border-b border-black/15 py-5 sm:grid-cols-[12rem_1fr]">
            <h3 className="font-medium">At capacity</h3>
            <p className="text-sm leading-6 text-muted-foreground">
              Existing hiring records remain available. Open another role or increase a report
              target after moving to a plan with the required capacity.
            </p>
          </div>
        </div>
      </ContentSection>

      <ContentSection
        eyebrow="Questions"
        title="Pricing FAQ"
        lead="Plan limits follow the parts of the workflow that create ongoing hiring capacity."
        muted
      >
        <FaqList
          items={[
            {
              question: "Do draft jobs count toward the active-job limit?",
              answer:
                "No. Drafts are free to create and edit. A job uses an active slot only while it is open.",
            },
            {
              question: "Is every application pre-evaluated?",
              answer:
                "Yes. Every plan includes AI pre-evaluation for submitted applications. Per-job report limits apply to the deeper text and voice evaluation workflow.",
            },
            {
              question: "Which plans include job importing?",
              answer:
                "Growth and Scale include importing from supported public job boards and CSV. Imported roles remain drafts until a company reviews and publishes them.",
            },
          ]}
        />
      </ContentSection>

      <RelatedContent
        items={[
          {
            eyebrow: "Product",
            title: "Candidate screening software",
            description: "See what every submitted application receives.",
            href: "/candidate-screening-software",
          },
          {
            eyebrow: "Product",
            title: "AI interview platform",
            description: "Understand the selective interview workflow behind each report.",
            href: "/ai-interview-platform",
          },
          {
            eyebrow: "Compare",
            title: "RoundZero and other hiring platforms",
            description: "Compare focus, workflow scope, and published pricing context.",
            href: "/compare",
          },
        ]}
      />

      <FinalCta
        title="Start with the next role."
        body="Create a draft without using an active slot, publish when the role is ready, and expand the plan only when your hiring scope grows."
      />
    </MarketingContentPage>
  );
}
