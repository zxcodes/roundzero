type CandidateWorkHistoryEntry = {
  company: string;
  title: string;
  startMonth: string | null;
  endMonth: string | null;
  currentlyWorkingHere: boolean;
  description: string | null;
};

type CandidateLinkEntry = {
  label: string;
  url: string;
};

export type CandidateProfileSnapshot = {
  headline: string | null;
  bio: string | null;
  skills: string[];
  workHistory: CandidateWorkHistoryEntry[];
  links: CandidateLinkEntry[];
};

const toTrimmedStringOrNull = (value: unknown) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const toTrimmedStringArray = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
};

const toWorkHistory = (value: unknown): CandidateWorkHistoryEntry[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (typeof entry !== "object" || entry === null) {
      return [];
    }

    const record = entry as Record<string, unknown>;
    const company = toTrimmedStringOrNull(record.company);
    const title = toTrimmedStringOrNull(record.title);

    if (!company || !title) {
      return [];
    }

    return [
      {
        company,
        title,
        startMonth: toTrimmedStringOrNull(record.startMonth),
        endMonth: toTrimmedStringOrNull(record.endMonth),
        currentlyWorkingHere: record.currentlyWorkingHere === true,
        description: toTrimmedStringOrNull(record.description),
      },
    ];
  });
};

const toLinks = (value: unknown): CandidateLinkEntry[] => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return [];
  }

  return Object.entries(value)
    .flatMap(([label, url]) => {
      const normalizedUrl = toTrimmedStringOrNull(url);
      return normalizedUrl ? [{ label, url: normalizedUrl }] : [];
    })
    .sort((a, b) => a.label.localeCompare(b.label));
};

export function parseCandidateProfileSnapshot(candidateMeta: unknown): CandidateProfileSnapshot {
  if (typeof candidateMeta !== "object" || candidateMeta === null) {
    return {
      headline: null,
      bio: null,
      skills: [],
      workHistory: [],
      links: [],
    };
  }

  const record = candidateMeta as Record<string, unknown>;

  return {
    headline: toTrimmedStringOrNull(record.headline),
    bio: toTrimmedStringOrNull(record.bio),
    skills: toTrimmedStringArray(record.skills),
    workHistory: toWorkHistory(record.workHistory),
    links: toLinks(record.links),
  };
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
