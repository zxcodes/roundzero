/**
 * Pre-evaluation refinement.
 *
 * The pre-eval model emits `missingRequirements` and a resume-authenticity
 * check produces `redFlags` + `explanation`. Both can contain hallucinated
 * requirements that the resume actually covered, generic boilerplate, or
 * duplicates.
 *
 * This deterministic pass cleans them before they hit the DB:
 *   - normalize whitespace, dedupe, length filter, drop platitudes
 *   - drop `missingRequirements` that are clearly satisfied by the resume
 *   - drop `redFlags` that have no anchor in the resume text
 *   - clamp/round scores
 *
 * No second LLM call is needed at this stage — pre-eval volume is high and
 * cheap-only refinement is the right tradeoff. The deeper LLM audit happens
 * later in post-evaluation when there is a transcript to audit against.
 */

import { clampScore, cleanBullets, filterAnchored, isAnchoredTo } from "@/shared/ai-refine";

const MAX_MISSING_REQUIREMENTS = 6;
const MAX_RED_FLAGS = 5;
const MAX_EXPLANATION_CHARS = 800;

export type RefinedPreEval = {
  score: number;
  missingRequirements: string[];
  confidence: "low" | "medium" | "high";
  modelNextStep: "interview_invited" | "hold";
};

export type RefinedSlopCheck = {
  consistencyScore: number | null;
  redFlags: string[];
  explanation: string;
};

export function refinePreEvaluationResult(
  raw: {
    score: number;
    missingRequirements: string[];
    confidence: "low" | "medium" | "high";
    modelNextStep: "interview_invited" | "hold";
  },
  resumeText: string,
  jobRequirements: string[],
): RefinedPreEval {
  const cleaned = cleanBullets(raw.missingRequirements, {
    cap: MAX_MISSING_REQUIREMENTS,
    minWords: 2,
    maxChars: 240,
  });

  // Drop items that look already satisfied by the resume. We only do this when
  // the model's signal is non-empty — never invent "missing" items.
  const filtered = cleaned.filter((req) => {
    // If the requirement text overlaps strongly with the resume, the model
    // probably hallucinated a gap. Keep it only when the resume does NOT
    // anchor it.
    const satisfied = isAnchoredTo(req, resumeText, { minRun: 3, minOverlap: 0.6 });
    return !satisfied;
  });

  // Also keep only requirements that bear some relation to the job. This
  // catches the "made-up requirement" case where the model invents a gap that
  // the job never asked for.
  const jobText = jobRequirements.join("\n");
  const grounded =
    jobText.trim().length > 0
      ? filterAnchored(filtered, [jobText], { minRun: 2, minOverlap: 0.3 })
      : filtered;

  const score = clampScore(raw.score);
  const confidence: RefinedPreEval["confidence"] =
    raw.confidence === "low" || raw.confidence === "medium" || raw.confidence === "high"
      ? raw.confidence
      : "low";
  const modelNextStep: RefinedPreEval["modelNextStep"] =
    raw.modelNextStep === "interview_invited" || raw.modelNextStep === "hold"
      ? raw.modelNextStep
      : "hold";

  return {
    score,
    missingRequirements: grounded,
    confidence,
    modelNextStep,
  };
}

export function refineSlopCheck(
  raw: {
    consistencyScore: number | null;
    redFlags: string[];
    explanation: string;
  },
  resumeText: string,
): RefinedSlopCheck {
  const cleaned = cleanBullets(raw.redFlags, {
    cap: MAX_RED_FLAGS,
    minWords: 3,
    maxChars: 280,
  });
  const grounded = filterAnchored(cleaned, [resumeText], {
    minRun: 3,
    minOverlap: 0.4,
  });

  const explanationRaw = typeof raw.explanation === "string" ? raw.explanation.trim() : "";
  const consistencyScore =
    typeof raw.consistencyScore === "number" && Number.isFinite(raw.consistencyScore)
      ? clampScore(raw.consistencyScore)
      : null;

  let explanation =
    explanationRaw.length >= 12
      ? explanationRaw.slice(0, MAX_EXPLANATION_CHARS)
      : grounded.length > 0
        ? "Authenticity concerns flagged — see redFlags for grounded examples."
        : "No authenticity concerns detected.";

  // Cross-field consistency enforcement: if no grounded red flags remain and
  // the model still claims high consistency, explanation must not allege fraud.
  if (grounded.length === 0 && consistencyScore !== null && consistencyScore >= 80) {
    explanation = "No authenticity concerns detected.";
  }

  return {
    consistencyScore,
    redFlags: grounded,
    explanation,
  };
}
