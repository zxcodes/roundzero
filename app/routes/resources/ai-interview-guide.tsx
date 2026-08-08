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

const title = "AI Interview Guide for Candidates | RoundZero";
const description =
  "Learn what to expect from a RoundZero AI interview, including timing, adaptive text questions, the voice step, preparation, and employer reports.";
const path = "/resources/ai-interview-guide";
const imagePath = "/og/ai-interview-guide.png";
const datePublished = "2026-08-08";
const dateModified = "2026-08-08";
const breadcrumbs = [
  { name: "Home", path: "/" },
  { name: "Resources", path: "/resources" },
  { name: "AI interview guide", path },
];

export const Route = createFileRoute("/resources/ai-interview-guide")({
  head: () =>
    buildPageHead({
      title,
      description,
      path,
      ogType: "article",
      imageUrl: absoluteUrl(imagePath),
      imageAlt: "What candidates can expect from a RoundZero AI interview",
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
  component: AiInterviewGuidePage,
});

function AiInterviewGuidePage() {
  return (
    <MarketingContentPage breadcrumbs={breadcrumbs}>
      <ArticleHero
        eyebrow="Candidate guide"
        title="What to expect from a RoundZero AI interview"
        description="Understand the invitation, adaptive text conversation, required voice step, timing, and the evidence the hiring team receives when you finish."
        datePublished={datePublished}
        dateModified={dateModified}
        readingTime="8 min read"
      />

      <ArticleLayout
        toc={[
          { id: "overview", label: "How the interview works" },
          { id: "invitation", label: "Invitation and timing" },
          { id: "prepare", label: "How to prepare" },
          { id: "chat", label: "The text interview" },
          { id: "voice", label: "The voice step" },
          { id: "answers", label: "How to answer" },
          { id: "after", label: "What happens after" },
          { id: "privacy", label: "Privacy and control" },
          { id: "sources", label: "Sources" },
        ]}
      >
        <ArticleSection id="overview" title="The interview has two connected parts">
          <p>
            RoundZero is an asynchronous first-round evaluation. You complete an adaptive text
            conversation and then a short browser-based voice assessment. There is no video step.
          </p>
          <p>
            The text interview gathers role-specific evidence from your experience and answers. The
            voice step evaluates spoken communication separately. Both must be complete before the
            hiring team receives the final candidate report.
          </p>
          <ArticleCallout title="You are not speaking to a live hiring manager">
            Zero, RoundZero’s interviewer, asks one question at a time and adapts to what you say.
            The hiring team reviews the resulting evidence and remains responsible for every hiring
            decision.
          </ArticleCallout>
        </ArticleSection>

        <ArticleSection id="invitation" title="Open the invitation when you have time to finish">
          <p>
            Selected candidates receive an interview invitation when an evaluation batch launches.
            The text interview remains available for twelve hours after that window begins, so plan
            for a quiet block rather than opening it between other tasks. Once the text interview is
            complete, the voice step does not automatically expire at that deadline.
          </p>
          <p>
            The candidate interface estimates 15–20 minutes for the full evaluation. The exact text
            conversation is adaptive rather than a fixed number of questions, and the separate voice
            conversation is designed to take about five minutes.
          </p>
        </ArticleSection>

        <ArticleSection id="prepare" title="Prepare examples, not a script">
          <ul>
            <li>
              Read the job description and identify the requirements you can support with real work.
            </li>
            <li>
              Choose two or three examples involving decisions, constraints, outcomes, or setbacks.
            </li>
            <li>Know which parts you personally owned and which belonged to the wider team.</li>
            <li>Use a supported browser, stable connection, quiet room, and working microphone.</li>
            <li>
              Set aside enough uninterrupted time to complete the text interview before its deadline
              and continue to the voice step promptly.
            </li>
          </ul>
          <p>
            You do not need to memorize perfect wording. Specific, honest explanations give the
            interviewer more useful material for follow-up than polished generalities.
          </p>
        </ArticleSection>

        <ArticleSection id="chat" title="The text conversation follows your evidence">
          <p>
            Company screening questions come first when the employer has added them. Zero then uses
            the role, your submitted résumé, and your previous answers to ask relevant follow-ups
            one at a time.
          </p>
          <p>
            There is no fixed turn count. The conversation can probe ownership, decisions, outcomes,
            gaps, or apparent inconsistencies until there is enough evidence to complete the
            evaluation.
          </p>
          <ArticleCallout title="If a question does not fit your experience">
            Say so plainly, then offer the closest relevant example and explain the difference. Do
            not invent experience to make an answer look complete.
          </ArticleCallout>
        </ArticleSection>

        <ArticleSection id="voice" title="The required voice step is short and browser-based">
          <p>
            After the text conversation, you continue to a voice interaction with Zero. Allow
            microphone access, listen to each prompt, and answer naturally. The experience is audio
            only; it does not ask for camera access or record video.
          </p>
          <p>
            The report can include observations about clarity, articulation, conciseness, listening,
            and confidence. Those communication signals are combined with the broader interview
            dynamically rather than treated as a fixed percentage of the final evaluation.
          </p>
        </ArticleSection>

        <ArticleSection id="answers" title="Make each answer easy to follow">
          <ol>
            <li>
              <strong>Set the context:</strong> describe the situation and why it mattered.
            </li>
            <li>
              <strong>Name your part:</strong> separate your decisions from the team’s work.
            </li>
            <li>
              <strong>Explain the reasoning:</strong> include constraints and trade-offs.
            </li>
            <li>
              <strong>Close the loop:</strong> share the outcome, learning, or what you would
              change.
            </li>
          </ol>
          <p>
            Concise does not mean shallow. Start with the direct answer, then add the detail needed
            to support it. If you need a moment to think during voice, take it.
          </p>
        </ArticleSection>

        <ArticleSection
          id="after"
          title="The hiring team receives a report after both parts are complete"
        >
          <p>
            RoundZero generates a report with a summary, strengths, weaknesses, insights, supporting
            evidence, screening-answer review, dimension-level scores, authenticity signals, and a
            recommendation. The report also preserves the interview transcripts.
          </p>
          <p>
            Reports may be held until the employer’s evaluation batch is ready and are ranked within
            that batch by overall score. The software does not make the final employment decision;
            the company reviews the evidence and decides what happens next.
          </p>
        </ArticleSection>

        <ArticleSection
          id="privacy"
          title="Read the terms and ask the employer when something is unclear"
        >
          <p>
            RoundZero processes the information you submit and the interview conversation to provide
            the evaluation service. Review the{" "}
            <a className="text-foreground underline underline-offset-4" href="/privacy">
              Privacy Policy
            </a>{" "}
            and{" "}
            <a className="text-foreground underline underline-offset-4" href="/tos">
              Terms of Service
            </a>{" "}
            before you begin.
          </p>
          <p>
            For accommodations, role-specific process questions, deadline changes, or a decision
            made by the employer, contact the hiring company directly. RoundZero provides the
            evaluation workflow; the employer owns the hiring process and decision.
          </p>
        </ArticleSection>

        <ArticleSources
          sources={[
            {
              title: "RoundZero Privacy Policy",
              publisher: "RoundZero",
              href: "/privacy",
            },
            {
              title: "RoundZero Terms of Service",
              publisher: "RoundZero",
              href: "/tos",
            },
            {
              title: "Open jobs on RoundZero",
              publisher: "RoundZero",
              href: "/jobs",
            },
          ]}
        />
      </ArticleLayout>

      <RelatedContent
        items={[
          {
            eyebrow: "Browse",
            title: "Open jobs",
            description: "Explore roles currently accepting applications on RoundZero.",
            href: "/jobs",
          },
          {
            eyebrow: "Product",
            title: "AI interview platform",
            description: "See the complete text, voice, and report workflow.",
            href: "/ai-interview-platform",
          },
          {
            eyebrow: "Guide",
            title: "Skills-based hiring",
            description: "Understand the evidence-first process behind the evaluation.",
            href: "/resources/skills-based-hiring",
          },
        ]}
      />

      <FinalCta
        title="Ready to show the work behind your résumé?"
        body="Browse open roles and apply with a profile that gives relevant experience a structured path into the hiring conversation."
        audience="candidate"
      />
    </MarketingContentPage>
  );
}
