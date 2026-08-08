import { createFileRoute } from "@tanstack/react-router";

import { InterviewTranscript } from "@/features/interviews/components/interview-transcript";
import {
  ContentHero,
  ContentSection,
  EvidenceList,
  FaqList,
  FinalCta,
  MarketingContentPage,
  ProcessList,
  RelatedContent,
} from "@/features/marketing/components/content-page";
import { absoluteUrl, breadcrumbJsonLd, buildPageHead } from "@/shared/seo";

const title = "Adaptive AI Interview Platform | RoundZero";
const description =
  "Run asynchronous, adaptive text and voice interviews that probe real experience and produce evidence for human review.";
const imagePath = "/og/ai-interview-platform.png";
const breadcrumbs = [
  { name: "Home", path: "/" },
  { name: "AI interview platform", path: "/ai-interview-platform" },
];

export const Route = createFileRoute("/ai-interview-platform")({
  head: () =>
    buildPageHead({
      title,
      description,
      path: "/ai-interview-platform",
      imageUrl: absoluteUrl(imagePath),
      imageAlt: "Adaptive AI interviews that follow the answer",
      scripts: [breadcrumbJsonLd(breadcrumbs)],
    }),
  component: AiInterviewPlatformPage,
});

function AiInterviewPlatformPage() {
  return (
    <MarketingContentPage breadcrumbs={breadcrumbs}>
      <ContentHero
        eyebrow="AI interview platform"
        title="An AI interview platform that follows the answer."
        lead="Zero starts with company screening questions, then follows the candidate’s actual work into projects, tradeoffs, outcomes, and judgment—one focused question at a time."
        supporting="This is an asynchronous text interview followed by a short voice conversation. It is not a fixed one-way video questionnaire."
      />

      <ContentSection
        eyebrow="Selective by design"
        title="Interview the candidates worth deeper time."
        lead="RoundZero does not force every applicant through a long assessment. Pre-evaluation identifies strong fits, then capacity-aware batches issue interview invitations."
        muted
      >
        <ProcessList
          steps={[
            {
              label: "01 · Invite",
              title: "Launch a protected evaluation slot",
              body: "Selected candidates receive a RoundZero invitation with a 12-hour completion window while the text interview is pending or in progress.",
            },
            {
              label: "02 · Screen",
              title: "Cover the questions your team requires",
              body: "Zero asks company-supplied screening questions first, in order, and records whether each answer was covered or skipped.",
            },
            {
              label: "03 · Probe",
              title: "Follow the strongest role-relevant evidence",
              body: "The conversation moves into selected résumé claims, technical depth, ownership, decisions, outcomes, gaps, and inconsistencies. Follow-ups adapt to what the candidate says.",
            },
            {
              label: "04 · Speak",
              title: "Complete the required voice assessment",
              body: "After chat, the candidate completes an approximately five-minute browser voice conversation that contributes communication evidence to the report.",
            },
          ]}
        />
      </ContentSection>

      <ContentSection
        eyebrow="Conversation rules"
        title="Depth without an interrogation script."
        lead="The current candidate interface estimates a 15–20 minute full evaluation, but Zero does not chase a fixed turn count. It stops when another question is unlikely to improve the signal or the candidate chooses to end the interview."
      >
        <EvidenceList
          items={[
            "One question at a time in plain conversational language",
            "Screening-question coverage is audited and unasked questions are flagged",
            "Résumé-grounded questions when candidate history is available",
            "Follow-ups on vague answers, tradeoffs, and concrete outcomes",
            "Material missing requirements and consistency concerns can be probed",
            "Candidates can explicitly end the interview",
          ]}
        />
      </ContentSection>

      <ContentSection
        eyebrow="After the conversation"
        title="Keep the transcript. Review the evidence."
        lead="Text and voice are inputs to a multi-pass report, not disposable chat. The company can inspect what was said alongside the resulting recommendation and scores."
        muted
      >
        <div className="marketing-report-frame bg-muted/20">
          <div className="border-b border-border/60 bg-white px-5 py-4">
            <p className="text-sm font-medium tracking-[-0.02em]">Interview transcript</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Full conversation between Zero and Olivia Bennett
            </p>
          </div>
          <div className="bg-muted/20">
            <InterviewTranscript
              userLabel="Olivia Bennett"
              messages={[
                {
                  role: "assistant",
                  content:
                    "Tell me about the product launch on your résumé. What did you personally own, and what made the work difficult?",
                },
                {
                  role: "candidate",
                  content:
                    "I owned discovery and rollout for a new onboarding flow. The main constraint was shipping without disrupting existing enterprise customers, so I worked with support and engineering to stage the release by account type.",
                },
                {
                  role: "assistant",
                  content:
                    "How did you decide that staged rollout was the right trade-off, and what evidence told you it was working?",
                },
                {
                  role: "candidate",
                  content:
                    "We compared activation and support volume across each cohort. Activation improved by 18%, while ticket volume stayed within the threshold we agreed on before expanding the rollout.",
                },
              ]}
            />
          </div>
        </div>
      </ContentSection>

      <ContentSection
        eyebrow="Candidate experience"
        title="Clear steps, no scheduling thread."
        lead="Candidates see the role, company, deadline, interview status, persistent transcript, and a separate voice tab. The voice step asks for a quiet place and a working microphone."
      >
        <div className="space-y-4 text-sm leading-7 text-muted-foreground">
          <p>
            The chat transcript remains visible when the interview finishes. Candidates choose when
            to continue to voice instead of being pulled away from Zero’s closing message.
          </p>
          <p>
            If an interview expires or is cancelled, the candidate sees the terminal state. If a
            technical evaluation step fails, the application can be retried by the company rather
            than silently disappearing.
          </p>
        </div>
      </ContentSection>

      <ContentSection
        eyebrow="Questions"
        title="AI interview platform FAQ"
        lead="Candidates receive a defined window and clear stages, while the conversation stays responsive to their evidence."
        muted
      >
        <FaqList
          items={[
            {
              question: "Is the interview video-based?",
              answer:
                "No. RoundZero uses an adaptive text conversation followed by a short browser-based voice assessment. It does not require a camera or record video.",
            },
            {
              question: "How long does the interview take?",
              answer:
                "The candidate interface estimates 15–20 minutes for the full evaluation, and the voice conversation is designed to take approximately five minutes. Text length varies because questions adapt to the evidence.",
            },
            {
              question: "Can employers add their own questions?",
              answer:
                "Yes. Zero asks the company’s required screening questions first, then moves into résumé-grounded and role-specific follow-up.",
            },
          ]}
        />
      </ContentSection>

      <RelatedContent
        items={[
          {
            eyebrow: "Product",
            title: "Candidate screening software",
            description: "See how applications reach the selective interview pool.",
            href: "/candidate-screening-software",
          },
          {
            eyebrow: "Product",
            title: "Candidate evaluation software",
            description: "See what RoundZero builds from the completed interview.",
            href: "/candidate-evaluation-software",
          },
          {
            eyebrow: "Candidate guide",
            title: "What to expect in an AI interview",
            description: "Prepare for the text and voice experience without scripting answers.",
            href: "/resources/ai-interview-guide",
          },
        ]}
      />

      <FinalCta
        title="Let the first interview happen on candidate time."
        body="Give strong applicants a structured way to show how they think, then bring your team into the process with the transcript and evidence ready."
      />
    </MarketingContentPage>
  );
}
