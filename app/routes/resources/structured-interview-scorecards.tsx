import { createFileRoute } from "@tanstack/react-router";

import {
  ArticleCallout,
  ArticleHero,
  ArticleLayout,
  ArticleSection,
  ArticleSources,
  FinalCta,
  MarketingContentPage,
  RelatedContent,
} from "@/features/marketing/components/content-page";
import { absoluteUrl, articleJsonLd, breadcrumbJsonLd, buildPageHead } from "@/shared/seo";

const title = "Structured Interview Scorecards: Practical Guide | RoundZero";
const description =
  "Create structured interview scorecards with job-relevant dimensions, observable anchors, consistent questions, and evidence-backed review.";
const path = "/resources/structured-interview-scorecards";
const imagePath = "/og/structured-interview-scorecards.png";
const datePublished = "2026-08-08";
const dateModified = "2026-08-08";
const breadcrumbs = [
  { name: "Home", path: "/" },
  { name: "Resources", path: "/resources" },
  { name: "Structured interview scorecards", path },
];

export const Route = createFileRoute("/resources/structured-interview-scorecards")({
  head: () =>
    buildPageHead({
      title,
      description,
      path,
      ogType: "article",
      imageUrl: absoluteUrl(imagePath),
      imageAlt: "Structured interview scorecards that preserve evidence",
      scripts: [
        articleJsonLd({
          title,
          description,
          path,
          imagePath,
          datePublished,
          dateModified,
        }),
        breadcrumbJsonLd(breadcrumbs),
      ],
    }),
  component: StructuredInterviewScorecardsPage,
});

function StructuredInterviewScorecardsPage() {
  return (
    <MarketingContentPage breadcrumbs={breadcrumbs}>
      <ArticleHero
        eyebrow="Employer guide"
        title="Structured interview scorecards that preserve evidence"
        description="Give interviewers a shared frame for what matters, what strong evidence looks like, and how to record judgment without reducing a candidate to one number."
        datePublished={datePublished}
        dateModified={dateModified}
        readingTime="8 min read"
      />

      <ArticleLayout
        toc={[
          { id: "purpose", label: "What a scorecard does" },
          { id: "dimensions", label: "Choose dimensions" },
          { id: "anchors", label: "Write evidence anchors" },
          { id: "questions", label: "Map questions" },
          { id: "evidence", label: "Record evidence" },
          { id: "review", label: "Run the review" },
          { id: "template", label: "Scorecard template" },
          { id: "sources", label: "Sources" },
        ]}
      >
        <ArticleSection id="purpose" title="A scorecard makes judgment explicit">
          <p>
            A structured interview scorecard defines the dimensions that matter for a role and the
            evidence reviewers should use to assess them. It creates a common language before the
            first candidate is discussed.
          </p>
          <p>
            The scorecard is not the interview transcript and it is not a spreadsheet of arbitrary
            numbers. It is a compact decision record: criterion, evidence, interpretation,
            confidence, and unresolved questions.
          </p>
          <ArticleCallout title="A useful scorecard changes the meeting">
            Reviewers should be able to discuss the evidence for a dimension before hearing another
            interviewer’s overall opinion. That reduces anchoring and makes disagreement specific.
          </ArticleCallout>
        </ArticleSection>

        <ArticleSection id="dimensions" title="Choose dimensions that map to the work">
          <p>
            Begin with the role outcomes, then select a small set of dimensions broad enough to hold
            meaningful evidence and distinct enough to avoid double counting.
          </p>
          <h3>A balanced set might include</h3>
          <ul>
            <li>
              <strong>Role fit:</strong> relevant experience, craft judgment, and domain
              requirements.
            </li>
            <li>
              <strong>Problem solving:</strong> framing, trade-offs, iteration, and learning.
            </li>
            <li>
              <strong>Ownership:</strong> responsibility, follow-through, and response to setbacks.
            </li>
            <li>
              <strong>Communication:</strong> clarity appropriate to the work and audience.
            </li>
          </ul>
          <p>
            RoundZero reports use these broad dimensions alongside role-specific evidence. Your own
            scorecard may need a technical, operational, leadership, safety, or customer dimension
            when it is materially different from the four above.
          </p>
        </ArticleSection>

        <ArticleSection id="anchors" title="Write observable anchors before choosing a scale">
          <p>
            Labels such as “excellent” or “poor” invite each reviewer to use a different standard.
            Describe what a reviewer would observe instead.
          </p>
          <ul>
            <li>
              <strong>Strong evidence:</strong> a specific example, clear individual contribution,
              sound trade-offs, and an outcome connected to the criterion.
            </li>
            <li>
              <strong>Mixed evidence:</strong> relevant exposure with unclear ownership, shallow
              reasoning, or an outcome that cannot be separated from the team.
            </li>
            <li>
              <strong>Concerning evidence:</strong> repeated vagueness, material contradiction,
              unsafe reasoning, or no example after reasonable follow-up.
            </li>
          </ul>
          <p>
            Add “not enough evidence” as a valid state. It is more honest than forcing uncertainty
            into the middle of a numeric scale.
          </p>
        </ArticleSection>

        <ArticleSection id="questions" title="Map each question to a reason for asking">
          <p>
            Every core question should cover at least one dimension, and every essential dimension
            should have a planned way to collect evidence. Avoid a long bank of questions with no
            relationship to the final review.
          </p>
          <ol>
            <li>Ask for a specific situation tied to the work.</li>
            <li>Clarify the candidate’s personal responsibility and constraints.</li>
            <li>Probe one consequential decision or trade-off.</li>
            <li>Ask what changed, what the result was, or what they would do differently.</li>
          </ol>
          <p>
            Comparable coverage matters more than identical wording. Adaptive follow-up can clarify
            evidence while the scorecard keeps the underlying criteria stable.
          </p>
        </ArticleSection>

        <ArticleSection id="evidence" title="Record the source, not only the conclusion">
          <p>
            Link each score or label to the answer, excerpt, work sample, or observed behavior that
            supports it. Separate a candidate’s claim from the reviewer’s interpretation.
          </p>
          <p>
            RoundZero candidate reports follow this pattern with a summary, strengths, weaknesses,
            insights, supporting excerpts, screening-question review, authenticity signals, and
            dimension-level scores. The voice step adds separate observations for clarity,
            articulation, conciseness, listening, and confidence; it does not replace role evidence.
          </p>
        </ArticleSection>

        <ArticleSection id="review" title="Review independently before discussing the ranking">
          <p>
            Ask each reviewer to complete their evidence notes before the debrief. Start the meeting
            with criteria and exceptions, not with the loudest overall recommendation.
          </p>
          <ul>
            <li>Discuss dealbreakers and missing evidence explicitly.</li>
            <li>Distinguish a job requirement from a coachable gap.</li>
            <li>Record why the final decision differs from an initial recommendation.</li>
            <li>Use rankings to organize review, not to pretend close scores are exact.</li>
          </ul>
          <ArticleCallout title="Keep the human decision visible">
            Software can assemble evidence and recommend a next step. The hiring team remains
            responsible for advancement, shortlist, rejection, and the final employment decision.
          </ArticleCallout>
        </ArticleSection>

        <ArticleSection id="template" title="A compact scorecard template">
          <ol>
            <li>
              <strong>Dimension:</strong> the job-relevant capability being assessed.
            </li>
            <li>
              <strong>Evidence expected:</strong> observable strong, mixed, and concerning signals.
            </li>
            <li>
              <strong>Question coverage:</strong> core question and permitted follow-up areas.
            </li>
            <li>
              <strong>Evidence captured:</strong> excerpt or concise factual note.
            </li>
            <li>
              <strong>Assessment:</strong> score or label, confidence, and rationale.
            </li>
            <li>
              <strong>Open question:</strong> what still needs human follow-up.
            </li>
          </ol>
        </ArticleSection>

        <ArticleSources
          sources={[
            {
              title: "Structured Interview Guide",
              publisher: "U.S. Office of Personnel Management",
              href: "https://www.opm.gov/policy-data-oversight/assessment-and-selection/structured-interviews/guide.pdf",
            },
            {
              title: "Structured Interviews: Assessment Policy FAQ",
              publisher: "U.S. Office of Personnel Management",
              href: "https://www.opm.gov/frequently-asked-questions/assessment-policy-faq/structured-interviews",
            },
            {
              title: "Uniform Guidelines on Employee Selection Procedures",
              publisher: "Electronic Code of Federal Regulations",
              href: "https://www.ecfr.gov/current/title-29/subtitle-B/chapter-XIV/part-1607",
            },
          ]}
        />
      </ArticleLayout>

      <RelatedContent
        items={[
          {
            eyebrow: "Guide",
            title: "Skills-based hiring",
            description: "Define role criteria and choose evidence before interviewing.",
            href: "/resources/skills-based-hiring",
          },
          {
            eyebrow: "Product",
            title: "AI interview platform",
            description: "See how adaptive questions collect structured evidence.",
            href: "/ai-interview-platform",
          },
          {
            eyebrow: "Product",
            title: "Candidate evaluation software",
            description: "Explore RoundZero’s evidence-backed report workflow.",
            href: "/candidate-evaluation-software",
          },
        ]}
      />

      <FinalCta
        title="Give every judgment a source."
        body="Use structured text and voice evaluation to collect comparable evidence, then review the report and make the hiring decision as a team."
      />
    </MarketingContentPage>
  );
}
