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

const title = "Skills-Based Hiring: An Evidence-First Guide | RoundZero";
const description =
  "Build a skills-based hiring process with job-relevant criteria, consistent evidence, structured interviews, and accountable human decisions.";
const path = "/resources/skills-based-hiring";
const imagePath = "/og/skills-based-hiring.png";
const datePublished = "2026-08-08";
const dateModified = "2026-08-08";
const breadcrumbs = [
  { name: "Home", path: "/" },
  { name: "Resources", path: "/resources" },
  { name: "Skills-based hiring", path },
];

export const Route = createFileRoute("/resources/skills-based-hiring")({
  head: () =>
    buildPageHead({
      title,
      description,
      path,
      ogType: "article",
      imageUrl: absoluteUrl(imagePath),
      imageAlt: "Skills-based hiring: an evidence-first process",
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
  component: SkillsBasedHiringPage,
});

function SkillsBasedHiringPage() {
  return (
    <MarketingContentPage breadcrumbs={breadcrumbs}>
      <ArticleHero
        eyebrow="Employer guide"
        title="Skills-based hiring: a practical evidence-first process"
        description="Replace vague proxies with job-relevant criteria, comparable evidence, and a review process that keeps people accountable for the final decision."
        datePublished={datePublished}
        dateModified={dateModified}
        readingTime="9 min read"
      />

      <ArticleLayout
        toc={[
          { id: "definition", label: "What skills-based hiring means" },
          { id: "criteria", label: "Define criteria" },
          { id: "evidence", label: "Choose useful evidence" },
          { id: "screening", label: "Screen consistently" },
          { id: "interviews", label: "Structure interviews" },
          { id: "decisions", label: "Make accountable decisions" },
          { id: "checklist", label: "Implementation checklist" },
          { id: "sources", label: "Sources" },
        ]}
      >
        <ArticleSection id="definition" title="What skills-based hiring actually means">
          <p>
            Skills-based hiring evaluates whether a person can perform the work instead of treating
            a degree, previous title, employer name, or résumé keyword as proof on its own. Those
            details can add context, but they should not silently become the decision rule.
          </p>
          <p>
            A credible process connects every major hiring criterion to observable evidence. That
            evidence might come from prior work, a candidate’s explanation of a decision, a work
            sample, or a structured answer grounded in a real situation.
          </p>
          <ArticleCallout title="The practical test">
            If the team cannot describe what good evidence looks like before reviewing candidates,
            the process is still relying on intuition more than skills.
          </ArticleCallout>
        </ArticleSection>

        <ArticleSection id="criteria" title="Start with the work, then define the criteria">
          <p>
            Rewrite the role around outcomes and recurring decisions. Separate genuine requirements
            from preferences that merely resemble people who held the role before.
          </p>
          <ol>
            <li>
              List the outcomes expected in the first six to twelve months, such as improving a
              conversion funnel or owning a production service.
            </li>
            <li>
              Name the skills required to reach those outcomes: analysis, stakeholder communication,
              debugging, prioritization, domain judgment, or craft expertise.
            </li>
            <li>
              Identify constraints that are truly non-negotiable, including location, schedule,
              authorization, certification, or language requirements.
            </li>
            <li>
              Remove criteria that cannot be tied to the work or a legitimate operational need.
            </li>
          </ol>
          <p>
            Keep the list short enough to use. When everything is essential, reviewers tend to
            improvise and overweight whichever detail is easiest to notice.
          </p>
        </ArticleSection>

        <ArticleSection id="evidence" title="Decide what evidence would change your mind">
          <p>
            Strong evidence is specific enough to verify and relevant enough to predict the work.
            “Led a migration” becomes more useful when the candidate can explain the constraints,
            their contribution, the trade-offs, and what happened afterward.
          </p>
          <h3>Useful evidence often includes</h3>
          <ul>
            <li>A concrete situation and the candidate’s individual responsibility.</li>
            <li>The reasoning behind a choice, including alternatives that were rejected.</li>
            <li>A measurable or observable result, with appropriate context.</li>
            <li>
              A mistake, change of direction, or limitation the candidate can discuss clearly.
            </li>
          </ul>
          <p>
            Do not confuse polished storytelling with job capability. The goal is to understand the
            work, not to reward one communication style across every dimension.
          </p>
        </ArticleSection>

        <ArticleSection
          id="screening"
          title="Use screening to find missing evidence, not perfect résumés"
        >
          <p>
            Many legacy ATS screening workflows use exact keywords, Boolean queries, or pattern
            matching to reduce a large applicant pool. That can be useful for locating a required
            term, but it is a weak substitute for reading. It rewards candidates who predict the
            expected vocabulary and can miss comparable experience described through a different
            title, tool, industry, or career path.
          </p>
          <p>
            A first pass should identify demonstrated fit, material gaps, and questions worth
            testing. It should not claim certainty from a short application or silently convert a
            score into an employment decision.
          </p>
          <p>
            RoundZero’s pre-evaluation follows that boundary. A role-specific LLM reads each
            submitted résumé alongside the job and considers responsibilities, outcomes,
            requirements, consistency, and transferable evidence together. It surfaces a profile
            match score, confidence, and missing requirements, then routes stronger fits toward
            deeper evaluation. The company can still inspect the application and keeps control of
            rejection and advancement.
          </p>
          <ArticleCallout title="Keep safeguards outside the model too">
            Define deterministic rules for minimum evidence, low confidence, and required
            constraints. A model recommendation should not be the only control protecting a
            high-impact decision.
          </ArticleCallout>
        </ArticleSection>

        <ArticleSection
          id="interviews"
          title="Ask comparable questions and allow relevant follow-up"
        >
          <p>
            Structure does not require a rigid script. It means candidates are assessed against the
            same dimensions, while follow-up questions respond to the evidence each person provides.
          </p>
          <p>
            Begin with any role-specific screening questions, then probe claims from the résumé and
            earlier answers. Ask one question at a time, seek concrete examples, and record the
            evidence supporting each judgment. If the role depends on spoken communication, evaluate
            it directly and label that signal separately from problem solving or role fit.
          </p>
        </ArticleSection>

        <ArticleSection id="decisions" title="Make the final review traceable">
          <p>
            A recommendation is useful only when reviewers can see why it exists. Preserve the
            candidate’s answers, supporting excerpts, strengths, concerns, unresolved requirements,
            and dimension-level scores. Then ask reviewers to record their own decision and
            rationale.
          </p>
          <p>
            Compare candidates against the role before comparing them with one another. Rankings can
            organize a batch, but they should not erase meaningful differences in experience or turn
            close scores into false precision.
          </p>
        </ArticleSection>

        <ArticleSection id="checklist" title="A compact implementation checklist">
          <ul>
            <li>Define four to six job-relevant dimensions before applications arrive.</li>
            <li>Write observable positive, mixed, and concerning evidence for each dimension.</li>
            <li>Separate true constraints from preferences and credentials.</li>
            <li>Use the same core questions while allowing evidence-driven follow-ups.</li>
            <li>Preserve transcripts, excerpts, and reviewer reasoning alongside scores.</li>
            <li>Audit outcomes and update criteria when they do not reflect the actual work.</li>
          </ul>
        </ArticleSection>

        <ArticleSources
          sources={[
            {
              title: "Skills-First Hiring Starter Kit",
              publisher: "U.S. Departments of Labor and Commerce",
              href: "https://www.dol.gov/sites/dolgov/files/OPA/GoodJobs/Toolkit/skills-first-starter-kit.pdf",
            },
            {
              title: "Structured Interview Guide",
              publisher: "U.S. Office of Personnel Management",
              href: "https://www.opm.gov/policy-data-oversight/assessment-and-selection/structured-interviews/guide.pdf",
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
            title: "Structured interview scorecards",
            description: "Turn role criteria into observable dimensions and review anchors.",
            href: "/resources/structured-interview-scorecards",
          },
          {
            eyebrow: "Product",
            title: "Candidate screening software",
            description: "See how RoundZero pre-evaluates submitted applications.",
            href: "/candidate-screening-software",
          },
          {
            eyebrow: "Product",
            title: "Candidate evaluation software",
            description: "Review reports with evidence, concerns, and recommendations attached.",
            href: "/candidate-evaluation-software",
          },
        ]}
      />

      <FinalCta
        title="Make evidence the start of the conversation."
        body="Create a role around the work, pre-evaluate every submitted application, and give selected candidates a structured way to demonstrate what they know."
      />
    </MarketingContentPage>
  );
}
