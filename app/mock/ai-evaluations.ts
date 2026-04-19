export type MockAiRecommendation = "strong_hire" | "consider" | "needs_signal" | "pass";

export type MockAiEvaluationState =
  | "not_evaluated"
  | "needs_clarification"
  | "evaluated"
  | "shortlisted"
  | "rejected";

export type MockAiDimension = {
  label: string;
  score: number;
  summary: string;
};

export type MockAiEvidence = {
  label: string;
  quote: string;
};

export type MockAiQuestion = {
  id: string;
  stage: string;
  question: string;
  answer: string;
  tested: string;
  signal: "positive" | "mixed" | "negative";
  dimension: string;
  scoreImpact: string;
  evaluatorNote: string;
  evidenceLabels: string[];
};

export type MockAiEvaluation = {
  state: MockAiEvaluationState;
  score: number | null;
  confidence: "low" | "medium" | "high";
  recommendation: MockAiRecommendation;
  summary: string;
  strengths: string[];
  concerns: string[];
  dimensions: MockAiDimension[];
  evidence: MockAiEvidence[];
  questionTimeline: MockAiQuestion[];
};

const mockEvaluations: MockAiEvaluation[] = [
  {
    state: "evaluated",
    score: 8.4,
    confidence: "high",
    recommendation: "strong_hire",
    summary:
      "Strong technical depth with clear ownership signals. Best suited for roles that need senior execution without heavy ramp-up.",
    strengths: [
      "Explained distributed-system tradeoffs with concrete failure modes.",
      "Showed strong ownership of a high-traffic migration, not just task execution.",
      "Communicated architecture decisions in a structured, interviewer-friendly way.",
    ],
    concerns: [
      "Observability examples leaned practical but not deeply strategic.",
      "Could use more detail on incident response leadership.",
    ],
    dimensions: [
      {
        label: "Technical depth",
        score: 9.1,
        summary: "Strong systems reasoning and pragmatic tradeoff analysis.",
      },
      {
        label: "Communication",
        score: 8.0,
        summary: "Clear, direct, and able to explain decisions without over-talking.",
      },
      {
        label: "Experience match",
        score: 8.2,
        summary: "Recent scope maps well to the role's seniority and ownership needs.",
      },
    ],
    evidence: [
      {
        label: "Architecture judgment",
        quote:
          "We accepted at-least-once delivery because the product needed recovery guarantees more than strict ordering.",
      },
      {
        label: "Ownership signal",
        quote:
          "I owned the migration plan, rollback checklist, and the customer-facing comms for launch week.",
      },
    ],
    questionTimeline: [
      {
        id: "q1",
        stage: "Architecture judgment",
        question:
          "Walk me through a system you designed where reliability mattered more than raw speed.",
        answer:
          "I described a notification pipeline where we accepted at-least-once delivery, added client-side deduplication, and used replayable streams so offline clients could recover without losing events.",
        tested: "System design tradeoffs, delivery semantics, failure recovery",
        signal: "positive",
        dimension: "Technical depth",
        scoreImpact: "+0.8",
        evaluatorNote:
          "Strong answer. The candidate named the core tradeoff, explained why the product needed recovery guarantees, and connected the design to user impact.",
        evidenceLabels: ["Architecture judgment", "Reliability"],
      },
      {
        id: "q2",
        stage: "Ownership validation",
        question: "What part of that migration were you personally accountable for?",
        answer:
          "I owned the rollout plan, rollback checklist, internal comms, and launch monitoring. The platform team reviewed the stream configuration, but I drove the migration sequencing.",
        tested: "Ownership vs contribution, launch responsibility, seniority signal",
        signal: "positive",
        dimension: "Experience match",
        scoreImpact: "+0.6",
        evaluatorNote:
          "Good ownership clarity. They separated their accountability from platform-team support instead of overstating scope.",
        evidenceLabels: ["Ownership signal"],
      },
      {
        id: "q3",
        stage: "Operational depth",
        question: "How did you know the system was healthy after launch?",
        answer:
          "We watched error rates, publish latency, queue depth, and client reconnect volume. I mostly used existing dashboards and added a few targeted alerts around delayed delivery.",
        tested: "Observability maturity, incident readiness, production debugging",
        signal: "mixed",
        dimension: "Technical depth",
        scoreImpact: "-0.2",
        evaluatorNote:
          "Practical answer, but less strategic than the rest of the interview. They understand operational basics but did not describe deeper SLO thinking.",
        evidenceLabels: ["Observability gap"],
      },
    ],
  },
  {
    state: "needs_clarification",
    score: 6.9,
    confidence: "medium",
    recommendation: "needs_signal",
    summary:
      "Good baseline match, but the evaluation needs more signal around production ownership and role-specific depth.",
    strengths: [
      "Relevant stack overlap with the role.",
      "Good product sense and practical implementation instincts.",
    ],
    concerns: [
      "Resume claims are broad compared with interview examples.",
      "Needs clarification on scale, ownership, and debugging depth.",
    ],
    dimensions: [
      {
        label: "Technical depth",
        score: 6.7,
        summary: "Solid fundamentals, but several answers stopped before deeper tradeoffs.",
      },
      {
        label: "Communication",
        score: 7.4,
        summary: "Easy to follow, with occasional gaps in specificity.",
      },
      {
        label: "Experience match",
        score: 6.5,
        summary: "Likely adjacent fit, but seniority evidence is incomplete.",
      },
    ],
    evidence: [
      {
        label: "Clarification needed",
        quote:
          "I contributed to the system design, but the exact scaling decisions were mostly handled by the platform team.",
      },
    ],
    questionTimeline: [
      {
        id: "q1",
        stage: "Scope clarification",
        question: "Which design decisions were yours versus decisions made by the platform team?",
        answer:
          "I contributed to the system design, but the exact scaling decisions were mostly handled by the platform team.",
        tested: "Ownership clarity, seniority evidence, resume consistency",
        signal: "mixed",
        dimension: "Experience match",
        scoreImpact: "-0.4",
        evaluatorNote:
          "Honest answer, but it reduces confidence in senior ownership claims. Follow-up questions should probe independent decision-making.",
        evidenceLabels: ["Clarification needed"],
      },
      {
        id: "q2",
        stage: "Role alignment",
        question: "Tell me about a time you debugged a production issue without a clear owner.",
        answer:
          "I usually started by checking logs and asking the owning team for context. If it touched my feature, I would patch it or write a ticket.",
        tested: "Ambiguity handling, production ownership, initiative",
        signal: "mixed",
        dimension: "Technical depth",
        scoreImpact: "-0.2",
        evaluatorNote: "Reasonable baseline, but not yet enough signal for a high-ownership role.",
        evidenceLabels: ["Needs deeper signal"],
      },
    ],
  },
  {
    state: "evaluated",
    score: 7.6,
    confidence: "high",
    recommendation: "consider",
    summary:
      "A credible candidate with balanced skills. Strong enough to keep in the process, though not the clearest top-ranked profile.",
    strengths: [
      "Good delivery record across frontend and backend work.",
      "Reasonable debugging approach with practical incident examples.",
      "Strong collaboration signal.",
    ],
    concerns: [
      "Less depth in architecture than stronger candidates.",
      "May need support on ambiguous platform-level ownership.",
    ],
    dimensions: [
      {
        label: "Technical depth",
        score: 7.2,
        summary: "Good applied knowledge, moderate depth on systems design.",
      },
      {
        label: "Communication",
        score: 8.1,
        summary: "Strong explanation quality and concise examples.",
      },
      {
        label: "Experience match",
        score: 7.5,
        summary: "Relevant enough for the role, with some seniority caveats.",
      },
    ],
    evidence: [
      {
        label: "Debugging process",
        quote:
          "I first check the blast radius, then isolate whether the regression is data, network, or rendering related.",
      },
    ],
    questionTimeline: [
      {
        id: "q1",
        stage: "Debugging process",
        question:
          "A release causes intermittent UI failures for 5% of users. What do you do first?",
        answer:
          "I first check blast radius, then isolate whether the regression is data, network, or rendering related. I would compare affected sessions against browser, feature flag, and API response patterns.",
        tested: "Debugging structure, incident triage, practical reasoning",
        signal: "positive",
        dimension: "Technical depth",
        scoreImpact: "+0.4",
        evaluatorNote:
          "Strong practical debugging path. The candidate structured the problem before jumping to implementation.",
        evidenceLabels: ["Debugging process"],
      },
      {
        id: "q2",
        stage: "Collaboration",
        question: "How do you communicate risk when a fix needs more time than the business wants?",
        answer:
          "I explain the smallest safe fix, the risk of rushing, and the fallback if we need to ship a temporary mitigation.",
        tested: "Communication quality, judgment, stakeholder handling",
        signal: "positive",
        dimension: "Communication",
        scoreImpact: "+0.3",
        evaluatorNote: "Good concise answer with a useful product-risk frame.",
        evidenceLabels: ["Communication clarity"],
      },
    ],
  },
  {
    state: "not_evaluated",
    score: null,
    confidence: "low",
    recommendation: "needs_signal",
    summary:
      "The candidate has applied, but RoundZero has not generated an evaluation yet. Review the submitted profile or wait for screening to complete.",
    strengths: [],
    concerns: [],
    dimensions: [],
    evidence: [],
    questionTimeline: [],
  },
  {
    state: "shortlisted",
    score: 9.0,
    confidence: "high",
    recommendation: "strong_hire",
    summary:
      "Top-tier match with unusually strong alignment across role requirements, communication quality, and ownership evidence.",
    strengths: [
      "Connected technical choices to business constraints without losing implementation detail.",
      "Showed repeated ownership across ambiguous launches.",
      "Matched the role's seniority and domain expectations closely.",
    ],
    concerns: ["Compensation expectations may need early alignment."],
    dimensions: [
      {
        label: "Technical depth",
        score: 9.3,
        summary: "Excellent depth across architecture, debugging, and operational tradeoffs.",
      },
      {
        label: "Communication",
        score: 8.8,
        summary: "Concise and credible, with clear framing of complex decisions.",
      },
      {
        label: "Experience match",
        score: 9.0,
        summary: "Very close match for the role's expected scope.",
      },
    ],
    evidence: [
      {
        label: "Role fit",
        quote:
          "The hardest part was aligning product urgency with a migration plan that would not create hidden reliability debt.",
      },
    ],
    questionTimeline: [
      {
        id: "q1",
        stage: "Senior ownership",
        question: "Describe a project where you owned the technical direction end to end.",
        answer:
          "The hardest part was aligning product urgency with a migration plan that would not create hidden reliability debt.",
        tested: "Technical leadership, product judgment, ownership",
        signal: "positive",
        dimension: "Experience match",
        scoreImpact: "+0.9",
        evaluatorNote:
          "Excellent signal. The answer combines technical ownership with product and operational constraints.",
        evidenceLabels: ["Role fit", "Ownership"],
      },
      {
        id: "q2",
        stage: "Tradeoff reasoning",
        question: "What did you deliberately choose not to build?",
        answer:
          "We avoided a full event-sourcing rewrite. It would have improved auditability, but it created too much migration risk for the immediate reliability target.",
        tested: "Pragmatism, scope control, architecture judgment",
        signal: "positive",
        dimension: "Technical depth",
        scoreImpact: "+0.7",
        evaluatorNote:
          "High-quality constraint thinking. The candidate can avoid over-engineering while preserving future optionality.",
        evidenceLabels: ["Pragmatic architecture"],
      },
    ],
  },
  {
    state: "rejected",
    score: 4.8,
    confidence: "high",
    recommendation: "pass",
    summary:
      "The interview produced weak role alignment and limited evidence of the required ownership level.",
    strengths: ["Communicates honestly about scope and limitations."],
    concerns: [
      "Limited production-scale examples.",
      "Answers remained implementation-level for a role requiring system ownership.",
    ],
    dimensions: [
      {
        label: "Technical depth",
        score: 4.9,
        summary: "Can implement defined work, but did not show senior-level design judgment.",
      },
      {
        label: "Communication",
        score: 6.1,
        summary: "Clear enough, but examples lacked depth.",
      },
      {
        label: "Experience match",
        score: 3.8,
        summary: "Mismatch against the role's expected ownership scope.",
      },
    ],
    evidence: [
      {
        label: "Scope mismatch",
        quote: "Most architecture decisions were already made before I joined the project.",
      },
    ],
    questionTimeline: [
      {
        id: "q1",
        stage: "Ownership mismatch",
        question: "Which architecture decisions did you personally make on that project?",
        answer: "Most architecture decisions were already made before I joined the project.",
        tested: "Resume claim validation, ownership scope, seniority fit",
        signal: "negative",
        dimension: "Experience match",
        scoreImpact: "-0.9",
        evaluatorNote: "This directly weakens the claimed senior ownership level for this role.",
        evidenceLabels: ["Scope mismatch"],
      },
      {
        id: "q2",
        stage: "Technical depth",
        question: "How would you change the architecture if traffic doubled?",
        answer:
          "I would add caching and maybe split the service if needed, but I would need to inspect the current setup first.",
        tested: "Scaling intuition, specificity, systems reasoning",
        signal: "negative",
        dimension: "Technical depth",
        scoreImpact: "-0.5",
        evaluatorNote:
          "Answer is plausible but generic. It lacks specific bottleneck analysis or measurement strategy.",
        evidenceLabels: ["Generic scaling answer"],
      },
    ],
  },
];

export const getMockAiEvaluation = (applicationId: string) => {
  const hash = Array.from(applicationId).reduce((total, char) => total + char.charCodeAt(0), 0);
  return mockEvaluations[hash % mockEvaluations.length];
};
