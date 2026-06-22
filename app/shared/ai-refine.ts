/**
 * Shared primitives for cleaning model-generated content before it is written
 * to the database. Every AI-produced report, evaluation, or assessment runs
 * through these helpers so we never persist raw model slop.
 *
 * The whole layer assumes the model output has already been parsed through a
 * Zod schema (shape is correct). These helpers operate on the content itself:
 * dedupe, length filter, generic-platitude filter, transcript anchoring, and
 * score sanity.
 */

import { CANDIDATE_SCORE_DEFAULT, clampCandidateScore } from "@/shared/score";

const WORD_RE = /[a-z0-9]+/g;

const PLATITUDE_PATTERNS: RegExp[] = [
  // Generic positive boilerplate with no specifics.
  /^(the candidate|they|he|she) (is|seems|appears) (a )?(good|great|strong|excellent) (communicator|listener|engineer|developer|fit|candidate)\.?$/i,
  /^(strong|good|great|excellent) communication skills\.?$/i,
  /^(strong|good|great) (technical|engineering|problem[- ]solving) skills\.?$/i,
  /^(demonstrated|showed|displayed) (good|strong|clear) ownership\.?$/i,
  /^(provided|gave) (concrete|clear|good) examples? from prior work\.?$/i,
  /^(communicated|communicates) clearly and stayed? on topic\.?$/i,
  /^(could|should) (improve|provide) (stronger|better|more) /i,
  /^limited depth on measurable outcomes\.?$/i,
  /^automatic fallback /i,
  /^heuristic fallback:?/i,
  /^pre[_ ]evaluation[_ ]unavailable$/i,
  /^(no|n\/a|none|tbd|unknown|not (provided|specified|available|asked))\.?$/i,
];

export type CleanBulletsOptions = {
  minWords?: number;
  maxChars?: number;
  cap: number;
  rejectPlatitudes?: boolean;
};

/**
 * Normalize whitespace, strip leading bullet/quote characters, collapse
 * internal whitespace, and trim. Returns null if nothing meaningful is left.
 */
export function normalizeBullet(raw: string): string | null {
  if (typeof raw !== "string") return null;
  const stripped = raw
    .replace(/^\s*[-*•·–—]+\s*/, "")
    .replace(/^\s*["'`]+/, "")
    .replace(/["'`]+\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
  return stripped.length > 0 ? stripped : null;
}

/**
 * Heuristic: does this item look like generic AI-generated filler that says
 * nothing specific? Matches a short list of phrases we have observed weak
 * models emit verbatim.
 */
export function isPlatitude(item: string): boolean {
  if (item.length < 12) return true;
  return PLATITUDE_PATTERNS.some((re) => re.test(item));
}

/**
 * Deterministic cleanup for any bullet-style string array (strengths,
 * weaknesses, insights, missing requirements, red flags, evidence quotes).
 *
 * - Normalizes whitespace
 * - Filters by word count and char length
 * - Drops near-duplicates (case-insensitive, whitespace normalized)
 * - Optionally drops well-known platitudes
 * - Caps the array length
 */
export function cleanBullets(input: unknown, opts: CleanBulletsOptions): string[] {
  const minWords = opts.minWords ?? 3;
  const maxChars = opts.maxChars ?? 400;
  if (!Array.isArray(input)) return [];

  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input) {
    const normalized = normalizeBullet(typeof raw === "string" ? raw : String(raw ?? ""));
    if (!normalized) continue;
    if (normalized.length > maxChars) continue;
    const words = normalized.match(WORD_RE) ?? [];
    if (words.length < minWords) continue;
    if (opts.rejectPlatitudes !== false && isPlatitude(normalized)) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
    if (out.length >= opts.cap) break;
  }
  return out;
}

/**
 * Tokenize a string into lowercased word tokens for substring matching.
 */
function tokenize(text: string): string[] {
  return text.toLowerCase().match(WORD_RE) ?? [];
}

/**
 * Returns true if at least `minRun` consecutive tokens from `item` appear
 * consecutively in `source`. Cheap and robust enough for "is this near-verbatim
 * from the transcript / resume?"
 */
export function isAnchoredTo(
  item: string,
  source: string,
  opts: { minRun?: number; minOverlap?: number } = {},
): boolean {
  const minRun = opts.minRun ?? 4;
  const minOverlap = opts.minOverlap ?? 0.45;
  const itemTokens = tokenize(item);
  if (itemTokens.length === 0) return false;
  const sourceTokens = tokenize(source);
  if (sourceTokens.length === 0) return false;

  // Fast path: enough consecutive tokens (typical for near-verbatim quotes).
  if (itemTokens.length >= minRun) {
    const sourceJoined = ` ${sourceTokens.join(" ")} `;
    for (let i = 0; i + minRun <= itemTokens.length; i++) {
      const run = itemTokens.slice(i, i + minRun).join(" ");
      if (sourceJoined.includes(` ${run} `)) return true;
    }
  }

  // Fallback: enough content-word overlap (for paraphrased claims).
  const sourceSet = new Set(sourceTokens);
  const hits = itemTokens.filter((t) => t.length > 3 && sourceSet.has(t)).length;
  const denom = Math.max(1, itemTokens.filter((t) => t.length > 3).length);
  return hits / denom >= minOverlap;
}

/**
 * Filter items keeping only those that anchor against at least one of the
 * supplied source texts (e.g. transcript, resume, candidate summary).
 */
export function filterAnchored(
  items: string[],
  sources: string[],
  opts: { minRun?: number; minOverlap?: number } = {},
): string[] {
  if (sources.length === 0) return items;
  return items.filter((item) => sources.some((src) => isAnchoredTo(item, src, opts)));
}

// ─── Untrusted-text sanitization ───────────────────────────────────────────

// Patterns that look like prompt-injection attempts pasted inside resumes,
// candidate profiles, or candidate chat messages. We strip them defensively
// before passing the text to any downstream model. The patterns are
// intentionally conservative — only obviously control-shaped content.
const INJECTION_LINE_PATTERNS: RegExp[] = [
  /^\s*(system|assistant|developer|user|interviewer|candidate)\s*[:-]\s*/i,
  /^\s*###?\s*(instructions?|system|prompt)\b/i,
  /^\s*<\/?(system|assistant|user|instructions?)\b/i,
  /\bignore\b.*\b(previous|above|prior|all)\b.*\b(instructions?|prompt|message)/i,
  /\bdisregard\b.*\b(previous|prior|above)\b/i,
  /\boverride\b.*\b(instructions?|prompt|system)/i,
];

/**
 * Strip prompt-injection-shaped lines from a free-text blob (resume body,
 * candidate profile, single chat message). Truncates pathologically long
 * input. Never throws — always returns a safe string.
 *
 * This is a soft defence layer. The real safety net is "never put
 * untrusted content into the system prompt", but in practice we have to —
 * resume text is the whole point of the evaluation. This helper just makes
 * the obvious attacks ineffective.
 */
export function sanitizeUntrustedText(
  input: unknown,
  maxChars: number = LIMITS.UNTRUSTED_TEXT,
): string {
  if (typeof input !== "string") return "";
  const lines = input.split(/\r?\n/);
  const kept: string[] = [];
  for (const line of lines) {
    if (INJECTION_LINE_PATTERNS.some((re) => re.test(line))) continue;
    // Drop role markers that appear mid-line.
    const cleaned = line.replace(
      /\b(SYSTEM|ASSISTANT|INTERVIEWER|CANDIDATE|USER|DEVELOPER)\s*:\s*/g,
      "",
    );
    kept.push(cleaned);
  }
  const joined = kept
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return joined.length > maxChars ? `${joined.slice(0, maxChars)}…[truncated]` : joined;
}

// ─── Transcript helpers ────────────────────────────────────────────────────

export type TranscriptMessage = { role: "assistant" | "candidate"; content: string };

/**
 * Defensively clean a list of transcript messages produced by the chat agent
 * before they are fed back into a model for evaluation.
 *
 * - Drops non-string content
 * - Caps each message length
 * - Sanitizes injection-shaped lines from candidate content
 *   (assistant content is trusted — it came from our own model with our
 *    own system prompt and tools)
 */
export function sanitizeTranscriptMessages(
  messages: ReadonlyArray<TranscriptMessage>,
): TranscriptMessage[] {
  const out: TranscriptMessage[] = [];
  for (const message of messages) {
    if (message.role !== "assistant" && message.role !== "candidate") continue;
    if (typeof message.content !== "string") continue;
    const trimmed = message.content.trim();
    if (trimmed.length === 0) continue;
    const safe =
      message.role === "candidate"
        ? sanitizeUntrustedText(trimmed, LIMITS.TRANSCRIPT_MESSAGE)
        : trimmed.slice(0, LIMITS.TRANSCRIPT_MESSAGE);
    if (safe.length === 0) continue;
    out.push({ role: message.role, content: safe });
  }
  return out;
}

/**
 * Threshold check: does this transcript carry enough candidate signal to
 * justify generating a full report? Used to short-circuit the post-eval
 * workflow with an `evaluation_failed` outcome instead of synthesizing a
 * report from an essentially empty interview.
 */
export function transcriptHasEnoughSignal(
  messages: ReadonlyArray<TranscriptMessage>,
  opts: { minCandidateTurns?: number; minCandidateWords?: number } = {},
): { ok: true } | { ok: false; reason: string } {
  const minTurns = opts.minCandidateTurns ?? 2;
  const minWords = opts.minCandidateWords ?? 30;
  const candidate = messages.filter((m) => m.role === "candidate");
  if (candidate.length < minTurns) {
    return {
      ok: false,
      reason: `candidate produced only ${candidate.length} turn(s); need at least ${minTurns}`,
    };
  }
  const words = candidate.reduce((acc, m) => acc + (m.content.match(WORD_RE)?.length ?? 0), 0);
  if (words < minWords) {
    return {
      ok: false,
      reason: `candidate produced only ${words} word(s); need at least ${minWords}`,
    };
  }
  return { ok: true };
}

/**
 * Audit screening-question coverage from the actual transcript. Returns the
 * set of question indexes (1-based) for which at least one assistant turn
 * appears to have referenced the question text.
 *
 * Use this in post-eval to override the interview agent's self-reported
 * coverage state — the agent can mark a question "answered" without ever
 * asking it.
 */
export function auditScreeningCoverage(
  questions: ReadonlyArray<string>,
  messages: ReadonlyArray<TranscriptMessage>,
): Set<number> {
  const covered = new Set<number>();
  const assistantText = messages
    .filter((m) => m.role === "assistant")
    .map((m) => m.content)
    .join("\n");
  if (assistantText.length === 0) return covered;
  questions.forEach((question, idx) => {
    if (isAnchoredTo(question, assistantText, { minRun: 3, minOverlap: 0.4 })) {
      covered.add(idx + 1);
    }
  });
  return covered;
}

// ─── Content moderation ───────────────────────────────────────────────────

/**
 * Simple content moderation check for candidate transcripts.
 * Detects obviously abusive, spammy, or pathological content.
 * Returns a quality flag that can be factored into evaluation.
 */
export function moderateTranscript(messages: ReadonlyArray<TranscriptMessage>): {
  quality: "normal" | "low";
  reason?: string;
} {
  const candidate = messages.filter((m) => m.role === "candidate");
  if (candidate.length === 0) {
    return { quality: "normal" };
  }

  const totalChars = candidate.reduce((acc, m) => acc + m.content.length, 0);
  const totalWords = candidate.reduce((acc, m) => acc + (m.content.match(WORD_RE)?.length ?? 0), 0);

  // Check for pathologically long messages (likely spam/garbage)
  if (totalChars > 50000) {
    return {
      quality: "low",
      reason: `Candidate transcript is excessively long (${totalChars} chars)`,
    };
  }

  // Check for extremely high word count (likely spam/garbage)
  if (totalWords > 10000) {
    return {
      quality: "low",
      reason: `Candidate transcript has excessive word count (${totalWords} words)`,
    };
  }

  // Check for repetitive content (same message repeated many times)
  const uniqueMessages = new Set(candidate.map((m) => m.content.trim()));
  if (candidate.length > 5 && uniqueMessages.size < candidate.length * 0.5) {
    return {
      quality: "low",
      reason: "Candidate transcript contains significant repetitive content",
    };
  }

  // Simple abusive language detection (basic profanity patterns)
  const abusivePatterns = [/\b(fuck|shit|damn|hell|bitch|bastard|ass|crap|piss)\b/gi];
  const allText = candidate
    .map((m) => m.content)
    .join(" ")
    .toLowerCase();
  const abusiveMatches = abusivePatterns.reduce((count, pattern) => {
    const matches = allText.match(pattern);
    return count + (matches?.length ?? 0);
  }, 0);

  // Allow some casual language but flag excessive abuse
  if (abusiveMatches > 10) {
    return {
      quality: "low",
      reason: `Candidate transcript contains excessive abusive language (${abusiveMatches} instances)`,
    };
  }

  return { quality: "normal" };
}

export function clampScore(value: unknown, fallback = CANDIDATE_SCORE_DEFAULT): number {
  return clampCandidateScore(value, fallback);
}

// ─── Date context ─────────────────────────────────────────────────────────

/**
 * Get the current date in ISO format (YYYY-MM-DD) for AI model context.
 * Centralized so the format is consistent across all prompts and can be
 * stubbed in tests.
 */
export function getModelDateContext(): string {
  return new Date().toISOString().split("T")[0];
}

// ─── Context size limits ───────────────────────────────────────────────────

/**
 * Centralized context size limits for AI model prompts.
 * These caps prevent token overflows and ensure consistent behavior
 * across all AI interactions. Tune these together when model context
 * budgets change.
 */
export const LIMITS = {
  /** Maximum characters for resume text in prompts */
  RESUME_TEXT: 12000,
  /** Maximum characters for candidate profile summary */
  CANDIDATE_SUMMARY: 12000,
  /** Maximum characters for interview transcript */
  TRANSCRIPT: 15000,
  /** Maximum characters per message in transcript sanitization */
  TRANSCRIPT_MESSAGE: 4000,
  /** Maximum characters for untrusted text sanitization */
  UNTRUSTED_TEXT: 16000,
} as const;

/**
 * Recompute an `overall` score from per-dimension scores, anchored to the
 * mean. Allows the model's own holistic judgement to nudge the average within
 * `maxDelta` points, but never wildly disagree (no marketing-fluff bumps).
 */
export function recomputeOverall(
  dimensions: number[],
  modelOverall: number,
  maxDelta = 0.8,
): number {
  if (dimensions.length === 0) return clampScore(modelOverall);
  const mean = dimensions.reduce((a, b) => a + b, 0) / dimensions.length;
  const bounded = Math.max(mean - maxDelta, Math.min(mean + maxDelta, modelOverall));
  return clampScore(bounded);
}
