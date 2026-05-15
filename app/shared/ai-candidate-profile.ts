import { z } from "zod";

const workHistoryEntrySchema = z
  .object({
    company: z.string().min(1),
    title: z.string().min(1),
    startMonth: z.string().nullable().default(null),
    endMonth: z.string().nullable().default(null),
    currentlyWorkingHere: z.boolean().default(false),
    description: z.string().nullable().default(null),
  })
  .transform((entry) => ({
    company: entry.company,
    title: entry.title,
    startMonth: entry.startMonth,
    endMonth: entry.endMonth,
    currentlyWorkingHere: entry.currentlyWorkingHere,
    description: entry.description,
  }));

const workHistorySchema = z.array(z.unknown()).transform((arr) =>
  arr.flatMap((entry) => {
    const parsed = workHistoryEntrySchema.safeParse(entry);
    return parsed.success ? [parsed.data] : [];
  }),
);

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
    bio: z.string().nullable().default(null),
    skills: z.array(z.string()).default([]),
    workHistory: workHistorySchema.default([]),
    links: linksSchema,
  })
  .catch(() => ({
    headline: null,
    bio: null,
    skills: [],
    workHistory: [],
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
    bio: snapshot.bio ?? "Not provided",
    skills: snapshot.skills.length > 0 ? snapshot.skills : ["Not provided"],
    workHistory:
      snapshot.workHistory.length > 0
        ? snapshot.workHistory.map((entry) => ({
            company: entry.company,
            title: entry.title,
            startMonth: entry.startMonth,
            endMonth: entry.endMonth,
            currentlyWorkingHere: entry.currentlyWorkingHere,
            description: entry.description,
          }))
        : ["Not provided"],
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

  if (snapshot.bio) {
    lines.push(`Bio: ${snapshot.bio}`);
  }

  if (snapshot.skills.length > 0) {
    lines.push(`Skills: ${snapshot.skills.join(", ")}`);
  }

  if (snapshot.workHistory.length > 0) {
    lines.push(
      "Work history:",
      ...snapshot.workHistory.map((entry) => {
        const timeline = [entry.startMonth, entry.currentlyWorkingHere ? "Present" : entry.endMonth]
          .filter((value): value is string => typeof value === "string" && value.length > 0)
          .join(" to ");

        const parts = [`- ${entry.title} at ${entry.company}`];
        if (timeline) {
          parts.push(`(${timeline})`);
        }
        if (entry.description) {
          parts.push(`: ${entry.description}`);
        }

        return parts.join(" ");
      }),
    );
  }

  if (snapshot.links.length > 0) {
    lines.push("Links:", ...snapshot.links.map((entry) => `- ${entry.label}: ${entry.url}`));
  }

  return lines.join("\n").trim();
}
