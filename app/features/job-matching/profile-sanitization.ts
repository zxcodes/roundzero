import type { CandidateMatchingProfile, JobMatchingProfile } from "./schemas";

const prohibitedTokenPattern =
  /(?:^|-)(?:age|aged|citizen|citizenship|disability|disabled|ethnic|ethnicity|female|gender|male|married|nationality|nonbinary|race|religion|religious|sponsorship|veteran|visa)(?:-|$)/i;
const organizationPattern =
  /(?:^|-)(?:academy|college|company|corp|corporation|gmbh|inc|institute|llc|ltd|school|university)(?:-|$)/i;
const dateOrContactPattern =
  /(?:\b(?:19|20)\d{2}\b|\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b|@|\b\+?\d[\d ()-]{7,}\d\b)/;
const educationPattern =
  /^(?:associate|associates|bachelor|bachelors|doctorate|doctoral|high-school|master|masters|phd)(?:-[a-z0-9]+)*$/;
const semanticPrefixPattern =
  /^(?:(?:preferred|required)-skill|certification|domain|education|requirement|responsibility|role-family|seniority|skill)-/;
const canonicalAliases = new Map([
  ["cicd", "ci-cd"],
  ["node", "node-js"],
  ["nodejs", "node-js"],
  ["postgres", "postgresql"],
  ["react-js", "react"],
]);

export const normalizeCanonicalId = (value: string): string => {
  let normalized = value;
  while (semanticPrefixPattern.test(normalized)) {
    normalized = normalized.replace(semanticPrefixPattern, "");
  }
  return canonicalAliases.get(normalized) ?? normalized;
};

const humanizeCanonicalId = (value: string): string =>
  value
    .split("-")
    .filter(Boolean)
    .map((part, index) => (index === 0 ? `${part.charAt(0).toUpperCase()}${part.slice(1)}` : part))
    .join(" ");

const isSafeFact = (fact: CandidateMatchingProfile["facts"][number]): boolean => {
  const values = [fact.id, fact.canonicalId];
  if (values.some((value) => dateOrContactPattern.test(value))) return false;
  if (prohibitedTokenPattern.test(fact.canonicalId)) return false;
  if (/(?:^|-)(?:at|for)(?:-|$)/i.test(fact.canonicalId)) return false;
  if (organizationPattern.test(fact.canonicalId)) return false;
  if (fact.category === "education" && !educationPattern.test(fact.canonicalId)) return false;
  return true;
};

/**
 * Removes model-authored display text and identifiers before a candidate profile
 * can be persisted or sent to the reranker. Role-family facts carry the useful
 * signal, so recent title strings are intentionally not retained.
 */
export function sanitizeCandidateMatchingProfile(
  profile: CandidateMatchingProfile,
): CandidateMatchingProfile {
  const facts = new Map<string, CandidateMatchingProfile["facts"][number]>();
  for (const fact of profile.facts) {
    if (!isSafeFact(fact)) continue;
    const canonicalId = normalizeCanonicalId(fact.canonicalId);
    const key = `${fact.category}:${canonicalId}`;
    facts.set(key, {
      id: `${fact.category.replaceAll("_", "-")}-${canonicalId}`,
      category: fact.category,
      canonicalId,
      label: humanizeCanonicalId(canonicalId),
    });
  }

  return {
    recentTitles: [],
    experienceYearsBucket: profile.experienceYearsBucket,
    facts: [...facts.values()],
  };
}

export function normalizeJobMatchingProfile(profile: JobMatchingProfile): JobMatchingProfile {
  const facts = new Map<string, JobMatchingProfile["facts"][number]>();
  for (const fact of profile.facts) {
    const canonicalId = normalizeCanonicalId(fact.canonicalId);
    const key = `${fact.category}:${canonicalId}`;
    facts.set(key, {
      id: `${fact.category.replaceAll("_", "-")}-${canonicalId}`,
      category: fact.category,
      canonicalId,
      label: humanizeCanonicalId(canonicalId),
    });
  }

  return { facts: [...facts.values()] };
}
