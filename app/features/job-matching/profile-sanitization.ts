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
const recognizedCandidateConcepts = new Set([
  "account-executive",
  "account-management",
  "accounting",
  "agile",
  "analytics",
  "angular",
  "ansible",
  "api-design",
  "artificial-intelligence",
  "aws",
  "azure",
  "backend-development",
  "backend-engineering",
  "business-analysis",
  "business-development",
  "c",
  "c-sharp",
  "c-plus-plus",
  "ci-cd",
  "cloud-architecture",
  "cloud-computing",
  "communication",
  "computer-science",
  "content-marketing",
  "css",
  "customer-success",
  "cybersecurity",
  "data-analysis",
  "data-engineering",
  "data-science",
  "database-design",
  "devops",
  "distributed-systems",
  "django",
  "docker",
  "dotnet",
  "e-commerce",
  "education",
  "elasticsearch",
  "engineering-management",
  "express-js",
  "fastapi",
  "figma",
  "finance",
  "financial-analysis",
  "flask",
  "flutter",
  "frontend-architecture",
  "frontend-development",
  "frontend-engineer",
  "frontend-engineering",
  "full-stack-development",
  "full-stack-engineering",
  "gcp",
  "git",
  "go",
  "graphql",
  "healthcare",
  "html",
  "human-resources",
  "information-technology",
  "infrastructure-as-code",
  "java",
  "javascript",
  "kafka",
  "kotlin",
  "kubernetes",
  "lead",
  "leadership",
  "legal",
  "machine-learning",
  "marketing",
  "mid",
  "mobile-development",
  "mongodb",
  "mysql",
  "nestjs",
  "next-js",
  "node-js",
  "nosql",
  "operations",
  "php",
  "postgresql",
  "principal",
  "product-design",
  "product-management",
  "project-management",
  "python",
  "quality-assurance",
  "r",
  "react",
  "react-native",
  "redis",
  "recruiting",
  "rest-apis",
  "retail",
  "ruby",
  "ruby-on-rails",
  "rust",
  "sales",
  "salesforce",
  "scala",
  "security",
  "senior",
  "software-architecture",
  "software-development",
  "software-engineering",
  "spring-boot",
  "sql",
  "staff",
  "svelte",
  "swift",
  "system-design",
  "tailwind-css",
  "team-leadership",
  "terraform",
  "testing",
  "typescript",
  "ui-design",
  "user-experience",
  "user-research",
  "vue-js",
  "web-development",
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
  return (
    fact.category === "education" ||
    recognizedCandidateConcepts.has(normalizeCanonicalId(fact.canonicalId))
  );
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
