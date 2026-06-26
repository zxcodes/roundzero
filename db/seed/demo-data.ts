// @ts-nocheck
import { clampScore, pick, randomInt } from "./util";

export const recommendations = ["strong_yes", "yes", "lean_no", "no"] as const;
export type DemoRecommendation = (typeof recommendations)[number];

export const strengthPool = [
  "Strong system design fundamentals",
  "Clear communication under ambiguity",
  "High ownership and follow-through",
  "Thoughtful tradeoff analysis",
  "Good test strategy and quality mindset",
  "Pragmatic product sense",
  "Structured debugging under production pressure",
  "Collaborative cross-functional execution",
] as const;

export const weaknessPool = [
  "Needs stronger depth in distributed systems",
  "Can improve query optimization patterns",
  "Limited examples of mentoring at scale",
  "Occasional over-index on implementation details",
  "Needs clearer prioritization in ambiguous scenarios",
  "Could provide more production incident examples",
] as const;

export const insightPool = [
  "Performs best when scope and ownership are explicit",
  "Likely to ramp quickly in TypeScript-heavy codebases",
  "Would benefit from onboarding into incident response practices",
  "Demonstrates collaborative behavior with cross-functional teams",
  "Shows strong curiosity and coachability",
  "Comfortable making pragmatic tradeoffs under time pressure",
] as const;

export const evidencePool = [
  "Explained a concrete launch with measurable customer impact and clear success metrics.",
  "Articulated tradeoffs between speed and reliability with a credible fallback plan.",
  "Walked through a production incident with structured root-cause analysis.",
  "Demonstrated end-to-end ownership from scoping through rollout and follow-up.",
  "Asked clarifying questions before committing to an architecture decision.",
  "Provided specific examples of collaborating with design and product under ambiguity.",
] as const;

export const screeningQuestionPool = [
  "What are your salary expectations for this role?",
  "What is your notice period and earliest start date?",
  "Are you authorized to work without sponsorship?",
  "Are you open to hybrid/onsite requirements if needed?",
] as const;

const salaryAnswers = [
  "$145k–$165k base",
  "$130k–$150k base",
  "$155k–$175k base",
  "$140k–$160k base",
  "$120k–$140k base",
] as const;

export function recommendationForOverall(overall: number): DemoRecommendation {
  if (overall >= 8.5) return "strong_yes";
  if (overall >= 7) return "yes";
  if (overall >= 5.5) return "lean_no";
  return "no";
}

export function makeScoresFromOverall(overall: number, seed: string) {
  const base = clampScore(overall);
  const communication = clampScore(base + randomInt(`${seed}-comm`, -4, 4) / 10);
  const problemSolving = clampScore(base + randomInt(`${seed}-ps`, -5, 5) / 10);
  const ownership = clampScore(base + randomInt(`${seed}-own`, -4, 4) / 10);
  const roleFit = clampScore(base + randomInt(`${seed}-fit`, -5, 5) / 10);

  return {
    communication,
    problemSolving,
    ownership,
    roleFit,
    overall: clampScore((communication + problemSolving + ownership + roleFit) / 4),
  };
}

export function buildReportSummary(candidateName: string, jobTitle: string, overall: number) {
  if (overall >= 8.5) {
    return `${candidateName} is a standout candidate for ${jobTitle} — strong signal across technical depth, communication, and ownership.`;
  }
  if (overall >= 7) {
    return `${candidateName} shows solid readiness for ${jobTitle} with credible production examples and structured reasoning.`;
  }
  if (overall >= 5.5) {
    return `${candidateName} demonstrates baseline competence for ${jobTitle}, but gaps remain before a confident hire recommendation.`;
  }
  return `${candidateName} does not currently meet the bar for ${jobTitle} based on interview depth and role-specific examples.`;
}

export function buildReportContent(input: {
  candidateName: string;
  jobTitle: string;
  overall: number;
  index: number;
}) {
  const recommendation = recommendationForOverall(input.overall);

  return {
    summary: buildReportSummary(input.candidateName, input.jobTitle, input.overall),
    strengths: [pick(strengthPool, input.index), pick(strengthPool, input.index + 3)],
    weaknesses: [pick(weaknessPool, input.index)],
    insights: [pick(insightPool, input.index), pick(insightPool, input.index + 2)],
    evidence: [pick(evidencePool, input.index), pick(evidencePool, input.index + 1)],
    screeningAnswers: [
      {
        question: screeningQuestionPool[0],
        answer: pick(salaryAnswers, input.index),
        concern: input.overall >= 7 ? "none" : input.overall >= 5.5 ? "minor" : "dealbreaker",
        notes:
          input.overall >= 7
            ? "Aligned with role range."
            : input.overall >= 5.5
              ? "Slightly above band — worth discussing."
              : "Expectations materially above budget.",
      },
      {
        question: screeningQuestionPool[1],
        answer: pick(["2 weeks", "3 weeks", "4 weeks", "Immediate"], input.index),
        concern: "none",
        notes: "Reasonable start timeline.",
      },
    ],
    recommendation,
  };
}

export function buildRoleSummary(title: string, seed: string) {
  const focusAreas = [
    "owning ambiguous product surfaces",
    "shipping production-quality TypeScript code",
    "driving cross-functional execution",
    "debugging under real production constraints",
    "balancing speed and quality",
  ];

  return `Candidate for ${title}. Strong on ${pick(focusAreas, randomInt(`${seed}-focus`, 0, focusAreas.length - 1))}.`;
}

export {
  buildCommunicationAnalysis,
  buildInterviewChatMessages,
  buildVoiceTranscriptMessages,
} from "./interview-transcripts";

/** Descending 0–10 scores spread for ranked demo reports. */
export function spreadScores(count: number, top = 9.4, bottom = 4.2): number[] {
  if (count <= 1) return [clampScore(top)];

  const scores: number[] = [];
  for (let i = 0; i < count; i++) {
    const ratio = i / (count - 1);
    const raw = top - (top - bottom) * ratio;
    scores.push(clampScore(Math.round(raw * 10) / 10));
  }
  return scores;
}