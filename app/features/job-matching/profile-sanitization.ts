import {
  candidateMatchingProfileSchema,
  jobMatchingProfileSchema,
  type CandidateMatchingProfile,
  type CandidateMatchingProfileGeneration,
  type JobMatchingProfile,
  type JobMatchingProfileGeneration,
} from "./schemas";

const unsafeText =
  /(?:\b(?:19|20)\d{2}\b|[\w.+-]+@[\w.-]+|https?:\/\/|\b(?:phone|email|address|born|citizen(?:ship)?|nationality|gender|race|religion|disability|visa|veteran)\b)/i;
const genericLabel =
  /^(?:(?:required|preferred)[ -]?(?:skill|capability|technology)|responsibility|requirement|role|domain|skill|technology|professional|transferable skills?|communication skills?)$/i;

const assertSafeText = (value: string) => {
  if (unsafeText.test(value))
    throw new Error("Matching profile contains private or source-identifying text");
  if (genericLabel.test(value.trim()))
    throw new Error("Matching profile contains a generic category-name item");
};

const assertUniqueItems = (items: Array<{ id: string; label: string; context?: string }>) => {
  const ids = new Set<string>();
  for (const item of items) {
    if (ids.has(item.id)) throw new Error("Matching profile contains duplicate item IDs");
    ids.add(item.id);
    assertSafeText(item.label);
    if (item.context) assertSafeText(item.context);
  }
};

const withIds = <T extends { id: string }>(category: string, items: T[]): T[] =>
  items.map((item, index) => ({ ...item, id: `${category}-${index + 1}` }));

const normalizedFamilies = (primary: string, adjacent: string[]) => [
  ...new Set(adjacent.filter((family) => family !== "other" && family !== primary)),
];

export function validateCandidateMatchingProfile(
  profile: CandidateMatchingProfile | CandidateMatchingProfileGeneration,
): CandidateMatchingProfile {
  if (profile.primaryFunctionalFamily === "other") {
    throw new Error("Candidate matching profile has no usable functional identity");
  }
  const normalized = {
    ...profile,
    adjacentFunctionalFamilies: normalizedFamilies(
      profile.primaryFunctionalFamily,
      profile.adjacentFunctionalFamilies,
    ) as CandidateMatchingProfile["adjacentFunctionalFamilies"],
    roleIdentities: withIds("role", profile.roleIdentities),
    capabilities: withIds("capability", profile.capabilities),
    technologies: withIds("technology", profile.technologies),
    domains: withIds("domain", profile.domains),
  };
  assertSafeText(normalized.summary);
  assertUniqueItems([
    ...normalized.roleIdentities,
    ...normalized.capabilities,
    ...normalized.technologies,
    ...normalized.domains,
  ]);
  return candidateMatchingProfileSchema.parse(normalized);
}

export function validateJobMatchingProfile(
  profile: JobMatchingProfile | JobMatchingProfileGeneration,
): JobMatchingProfile {
  const functionalFamilies = [
    ...new Set(profile.functionalFamilies.filter((family) => family !== "other")),
  ];
  if (functionalFamilies.length === 0) {
    throw new Error("Job matching profile has no usable functional identity");
  }
  const normalized = {
    ...profile,
    functionalFamilies: functionalFamilies as JobMatchingProfile["functionalFamilies"],
    roleIdentity: { ...profile.roleIdentity, id: "role-1" },
    responsibilities: withIds("responsibility", profile.responsibilities),
    requiredCapabilities: withIds("required-capability", profile.requiredCapabilities),
    preferredCapabilities: withIds("preferred-capability", profile.preferredCapabilities),
    requiredTechnologies: withIds("required-technology", profile.requiredTechnologies),
    preferredTechnologies: withIds("preferred-technology", profile.preferredTechnologies),
    domains: withIds("domain", profile.domains),
  };
  assertSafeText(normalized.roleIdentity.label);
  assertSafeText(normalized.roleIdentity.summary);
  assertUniqueItems([
    normalized.roleIdentity,
    ...normalized.responsibilities,
    ...normalized.requiredCapabilities,
    ...normalized.preferredCapabilities,
    ...normalized.requiredTechnologies,
    ...normalized.preferredTechnologies,
    ...normalized.domains,
  ]);
  return jobMatchingProfileSchema.parse(normalized);
}
