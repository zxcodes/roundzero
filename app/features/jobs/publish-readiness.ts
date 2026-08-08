export type JobRecommendedField = "workplaceType" | "employmentType" | "experienceLevel";

const COUNTRY_ALIASES: Record<string, string> = {
  US: "US",
  USA: "US",
  "UNITED STATES": "US",
  "UNITED STATES OF AMERICA": "US",
  UK: "GB",
  GB: "GB",
  "UNITED KINGDOM": "GB",
  UAE: "AE",
  "UNITED ARAB EMIRATES": "AE",
  AUSTRALIA: "AU",
  AUSTRIA: "AT",
  BELGIUM: "BE",
  BRAZIL: "BR",
  CANADA: "CA",
  CZECHIA: "CZ",
  "CZECH REPUBLIC": "CZ",
  DENMARK: "DK",
  FINLAND: "FI",
  FRANCE: "FR",
  GERMANY: "DE",
  INDIA: "IN",
  IRELAND: "IE",
  ITALY: "IT",
  JAPAN: "JP",
  MEXICO: "MX",
  NETHERLANDS: "NL",
  "NEW ZEALAND": "NZ",
  NORWAY: "NO",
  POLAND: "PL",
  PORTUGAL: "PT",
  ROMANIA: "RO",
  SINGAPORE: "SG",
  "SOUTH AFRICA": "ZA",
  SPAIN: "ES",
  SWEDEN: "SE",
  SWITZERLAND: "CH",
};

export const REMOTE_LOCATION_PUBLISH_MESSAGE =
  'Remote jobs must include an applicant country, for example "Remote (India)".';

export function normalizeJobCountry(value: string): string | null {
  return COUNTRY_ALIASES[value.trim().toUpperCase()] ?? null;
}

export function getRemoteApplicantCountry(location: string | null | undefined): string | null {
  const restriction = location?.trim().match(/^remote\s*(?:[-–—:]|\()\s*([^)]+)\)?$/i)?.[1];
  return restriction ? normalizeJobCountry(restriction) : null;
}

export function getRemoteLocationPublishIssue(job: {
  workplaceType: string | null;
  location: string | null;
}): string | null {
  if (job.workplaceType !== "remote") return null;
  return getRemoteApplicantCountry(job.location) ? null : REMOTE_LOCATION_PUBLISH_MESSAGE;
}

export function getMissingRecommendedFields(job: {
  workplaceType: string | null;
  employmentType: string | null;
  experienceLevel: string | null;
}): JobRecommendedField[] {
  const missing: JobRecommendedField[] = [];
  if (!job.workplaceType) missing.push("workplaceType");
  if (!job.employmentType) missing.push("employmentType");
  if (!job.experienceLevel) missing.push("experienceLevel");
  return missing;
}

export function getJobPublishBlockReason(
  job: {
    status: string;
    expiresAt: Date | null;
    workplaceType: string | null;
    location: string | null;
  },
  now = new Date(),
): string | null {
  if (job.status !== "draft") return "Only draft jobs can be published.";
  if (job.expiresAt && job.expiresAt <= now) {
    return "Update the expired deadline before publishing.";
  }
  return getRemoteLocationPublishIssue(job);
}
