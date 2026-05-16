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

export function clampScore(value: unknown, fallback = 50): number {
  const n = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/**
 * Recompute an `overall` score from per-dimension scores, anchored to the
 * mean. Allows the model's own holistic judgement to nudge the average within
 * `maxDelta` points, but never wildly disagree (no marketing-fluff bumps).
 */
export function recomputeOverall(dimensions: number[], modelOverall: number, maxDelta = 8): number {
  if (dimensions.length === 0) return clampScore(modelOverall);
  const mean = dimensions.reduce((a, b) => a + b, 0) / dimensions.length;
  const bounded = Math.max(mean - maxDelta, Math.min(mean + maxDelta, modelOverall));
  return clampScore(bounded);
}
