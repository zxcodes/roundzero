import { z } from "zod";

const linksSchema = z.record(z.string(), z.string()).transform((record) =>
  Object.entries(record)
    .flatMap(([label, url]) => {
      const trimmed = url.trim();
      return trimmed.length > 0 ? [{ label, url: trimmed }] : [];
    })
    .sort((a, b) => a.label.localeCompare(b.label)),
);

const candidateProfileSnapshotSchema = z
  .object({
    headline: z.string().nullable().default(null),
    skills: z.array(z.string()).default([]),
    links: linksSchema,
  })
  .catch(() => ({
    headline: null,
    skills: [],
    links: [],
  }));

export type CandidateProfileSnapshot = z.infer<typeof candidateProfileSnapshotSchema>;

export function parseCandidateProfileSnapshot(candidateMeta: unknown): CandidateProfileSnapshot {
  return candidateProfileSnapshotSchema.parse(candidateMeta);
}

export function buildCandidateProfilePromptPayload(candidateMeta: unknown) {
  const snapshot = parseCandidateProfileSnapshot(candidateMeta);

  return {
    headline: snapshot.headline ?? "Not provided",
    skills: snapshot.skills.length > 0 ? snapshot.skills : ["Not provided"],
    links:
      snapshot.links.length > 0
        ? snapshot.links.map((entry) => `${entry.label}: ${entry.url}`)
        : ["Not provided"],
  };
}

export function buildCandidateProfileSummary(candidateMeta: unknown) {
  const snapshot = parseCandidateProfileSnapshot(candidateMeta);
  const lines: string[] = [];

  if (snapshot.headline) {
    lines.push(`Headline: ${snapshot.headline}`);
  }

  if (snapshot.skills.length > 0) {
    lines.push(`Skills: ${snapshot.skills.join(", ")}`);
  }

  if (snapshot.links.length > 0) {
    lines.push("Links:", ...snapshot.links.map((entry) => `- ${entry.label}: ${entry.url}`));
  }

  return lines.join("\n").trim();
}
