import { z } from "zod";

const MAX_INTEGRITY_EVENT_COUNT = 100;
const MAX_COPY_SOURCES_PER_MESSAGE = 20;

export const integrityCopySourceSchema = z.object({
  // Transcript bubble id the candidate copied from. This is whatever id the
  // chat client assigns: a DB UUID for messages hydrated from the server, or a
  // client-generated id (e.g. `msg-...`) for messages streamed live this
  // session. It's only an opaque correlation key for dedup/counting, so do NOT
  // constrain it to a UUID — doing so 400s any send that copies from a live
  // bubble.
  messageId: z.string().min(1).max(128),
  charCount: z.number().int().min(0),
});

export const messageIntegritySnapshotSchema = z.object({
  copiedFrom: z.array(integrityCopySourceSchema),
  pasteCount: z.number().int().min(0),
  pasteCharCount: z.number().int().min(0),
  submittedCharCount: z.number().int().min(0),
});

export const interviewIntegrityMessageRecordSchema = messageIntegritySnapshotSchema.extend({
  messageId: z.string().uuid(),
});

export const interviewIntegritySchema = z.object({
  pasteCount: z.number().int().min(0),
  pasteCharCount: z.number().int().min(0),
  messages: z.array(interviewIntegrityMessageRecordSchema),
});

export type MessageIntegritySnapshot = z.infer<typeof messageIntegritySnapshotSchema>;
export type InterviewIntegrity = z.infer<typeof interviewIntegritySchema>;
export type IntegrityRiskLevel = "low" | "medium" | "high";

export type IntegrityRisk = {
  level: IntegrityRiskLevel;
  pasteRatio: number;
  explanation: string;
};

const emptyIntegrity = (): InterviewIntegrity => ({
  pasteCount: 0,
  pasteCharCount: 0,
  messages: [],
});

export const emptyComposeIntegritySnapshot = (): MessageIntegritySnapshot => ({
  copiedFrom: [],
  pasteCount: 0,
  pasteCharCount: 0,
  submittedCharCount: 0,
});

const sumIntegrityMessages = (messages: InterviewIntegrity["messages"]): InterviewIntegrity => {
  let pasteCount = 0;
  let pasteCharCount = 0;

  for (const entry of messages) {
    pasteCount += entry.pasteCount;
    pasteCharCount += entry.pasteCharCount;
  }

  return { pasteCount, pasteCharCount, messages };
};

export function appendCopySource(
  snapshot: MessageIntegritySnapshot,
  messageId: string,
  charCount: number,
): MessageIntegritySnapshot {
  if (charCount <= 0) {
    return snapshot;
  }

  const copiedFrom = [...snapshot.copiedFrom];
  const existingIndex = copiedFrom.findIndex((entry) => entry.messageId === messageId);
  if (existingIndex >= 0) {
    const existing = copiedFrom[existingIndex];
    if (existing) {
      copiedFrom[existingIndex] = {
        messageId,
        charCount: existing.charCount + charCount,
      };
    }
  } else if (copiedFrom.length < MAX_COPY_SOURCES_PER_MESSAGE) {
    copiedFrom.push({ messageId, charCount });
  }

  return { ...snapshot, copiedFrom };
}

export function clampMessageIntegritySnapshot(
  snapshot: MessageIntegritySnapshot,
  messageText: string,
): MessageIntegritySnapshot {
  const submittedCharCount = messageText.length;
  if (submittedCharCount === 0) {
    return emptyComposeIntegritySnapshot();
  }

  const copiedFrom = snapshot.copiedFrom
    .slice(0, MAX_COPY_SOURCES_PER_MESSAGE)
    .map((entry) => ({
      messageId: entry.messageId,
      charCount: Math.min(entry.charCount, submittedCharCount),
    }))
    .filter((entry) => entry.charCount > 0);

  return {
    copiedFrom,
    pasteCount: Math.min(snapshot.pasteCount, MAX_INTEGRITY_EVENT_COUNT),
    pasteCharCount: Math.min(snapshot.pasteCharCount, submittedCharCount),
    submittedCharCount,
  };
}

const HIGH_INTEGRITY_WEAKNESS =
  "Multiple pasted answers were detected during the text interview, which weakens confidence that the responses were composed live.";
const MEDIUM_INTEGRITY_WEAKNESS =
  "Some pasted content was detected during the text interview, which may reduce confidence in live ownership of the answers.";

const totalCopiedChars = (integrity: InterviewIntegrity): number =>
  integrity.messages.reduce(
    (sum, entry) => sum + entry.copiedFrom.reduce((inner, source) => inner + source.charCount, 0),
    0,
  );

const copySourceCount = (integrity: InterviewIntegrity): number =>
  integrity.messages.reduce((sum, entry) => sum + entry.copiedFrom.length, 0);

export function getIntegrityWeaknesses(integrity: InterviewIntegrity | undefined): string[] {
  const risk = assessIntegrityRisk(integrity);
  if (risk.level === "high") {
    return [HIGH_INTEGRITY_WEAKNESS];
  }
  if (risk.level === "medium") {
    return [MEDIUM_INTEGRITY_WEAKNESS];
  }
  return [];
}

export function getIntegrityInsight(integrity: InterviewIntegrity | undefined): string | null {
  const risk = assessIntegrityRisk(integrity);
  if (risk.level === "medium" || risk.level === "high") {
    return `Copy/paste integrity: ${risk.explanation}`;
  }
  return null;
}

export function mergeInterviewIntegrity(
  existing: InterviewIntegrity | undefined,
  messageId: string,
  snapshot: MessageIntegritySnapshot,
): InterviewIntegrity {
  const base = existing ?? emptyIntegrity();
  const messages = base.messages.filter((entry) => entry.messageId !== messageId);
  messages.push({ messageId, ...snapshot });
  return sumIntegrityMessages(messages);
}

export function assessIntegrityRisk(integrity: InterviewIntegrity | undefined): IntegrityRisk {
  if (!integrity) {
    return {
      level: "low",
      pasteRatio: 0,
      explanation: "No copy or paste activity was recorded during the text interview.",
    };
  }

  const totalSubmittedChars = integrity.messages.reduce(
    (sum, entry) => sum + entry.submittedCharCount,
    0,
  );
  const pasteRatio = totalSubmittedChars > 0 ? integrity.pasteCharCount / totalSubmittedChars : 0;
  const maxMessagePasteRatio = integrity.messages.reduce((max, entry) => {
    if (entry.submittedCharCount === 0) {
      return max;
    }
    return Math.max(max, entry.pasteCharCount / entry.submittedCharCount);
  }, 0);

  const copiedSources = copySourceCount(integrity);
  const copiedChars = totalCopiedChars(integrity);
  const copyContext =
    copiedSources > 0
      ? ` Copied from ${copiedSources} transcript message(s) (${copiedChars} chars) while composing answers.`
      : "";

  if (integrity.pasteCount >= 3 || pasteRatio >= 0.35 || maxMessagePasteRatio >= 0.6) {
    return {
      level: "high",
      pasteRatio,
      explanation: `Detected ${integrity.pasteCount} paste event(s) covering about ${Math.round(pasteRatio * 100)}% of submitted answer text.${copyContext}`,
    };
  }

  if (pasteRatio >= 0.1 || maxMessagePasteRatio >= 0.25) {
    return {
      level: "medium",
      pasteRatio,
      explanation: `Detected ${integrity.pasteCount} paste event(s) covering about ${Math.round(pasteRatio * 100)}% of submitted answer text.${copyContext}`,
    };
  }

  if (copiedSources > 0) {
    return {
      level: "low",
      pasteRatio,
      explanation: `Recorded copy from ${copiedSources} transcript message(s) but no pasted content in submitted answers.${copyContext}`,
    };
  }

  return {
    level: "low",
    pasteRatio,
    explanation: "No copy or paste activity was recorded during the text interview.",
  };
}

type ScoreAdjustmentInput = {
  communication: number;
  ownership: number;
  overall: number;
  recommendation: "strong_yes" | "yes" | "lean_no" | "no";
};

export function applyIntegrityScoreAdjustment(
  scores: ScoreAdjustmentInput,
  integrity: InterviewIntegrity | undefined,
): ScoreAdjustmentInput {
  const risk = assessIntegrityRisk(integrity);

  if (risk.level === "low") {
    return scores;
  }

  let communication = scores.communication;
  let ownership = scores.ownership;
  let overall = scores.overall;
  let recommendation = scores.recommendation;

  if (risk.level === "high") {
    communication = Math.min(communication, 5);
    ownership = Math.min(ownership, 4.5);
    overall = Math.min(overall, 5);
    if (recommendation === "strong_yes" || recommendation === "yes") {
      recommendation = "lean_no";
    }
  } else {
    communication = Math.min(communication, 6.5);
    ownership = Math.min(ownership, 5.5);
    overall = Math.min(overall, 6.5);
  }

  return {
    communication,
    ownership,
    overall,
    recommendation,
  };
}
