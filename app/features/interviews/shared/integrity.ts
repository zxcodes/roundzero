import { z } from "zod";

const MAX_INTEGRITY_EVENT_COUNT = 100;

export const messageIntegritySnapshotSchema = z.object({
  copyCount: z.number().int().min(0),
  pasteCount: z.number().int().min(0),
  pasteCharCount: z.number().int().min(0),
  submittedCharCount: z.number().int().min(0),
});

export const interviewIntegrityMessageRecordSchema = messageIntegritySnapshotSchema.extend({
  messageId: z.string().uuid(),
});

export const interviewIntegritySchema = z.object({
  copyCount: z.number().int().min(0),
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
  copyCount: 0,
  pasteCount: 0,
  pasteCharCount: 0,
  messages: [],
});

const emptyIntegritySnapshot = (): MessageIntegritySnapshot => ({
  copyCount: 0,
  pasteCount: 0,
  pasteCharCount: 0,
  submittedCharCount: 0,
});

const sumIntegrityMessages = (messages: InterviewIntegrity["messages"]): InterviewIntegrity => {
  let copyCount = 0;
  let pasteCount = 0;
  let pasteCharCount = 0;

  for (const entry of messages) {
    copyCount += entry.copyCount;
    pasteCount += entry.pasteCount;
    pasteCharCount += entry.pasteCharCount;
  }

  return { copyCount, pasteCount, pasteCharCount, messages };
};

export function clampMessageIntegritySnapshot(
  snapshot: MessageIntegritySnapshot,
  messageText: string,
): MessageIntegritySnapshot {
  const submittedCharCount = messageText.length;
  if (submittedCharCount === 0) {
    return emptyIntegritySnapshot();
  }

  return {
    copyCount: Math.min(snapshot.copyCount, MAX_INTEGRITY_EVENT_COUNT),
    pasteCount: Math.min(snapshot.pasteCount, MAX_INTEGRITY_EVENT_COUNT),
    pasteCharCount: Math.min(snapshot.pasteCharCount, submittedCharCount),
    submittedCharCount,
  };
}

const HIGH_INTEGRITY_WEAKNESS =
  "Multiple pasted answers were detected during the text interview, which weakens confidence that the responses were composed live.";
const MEDIUM_INTEGRITY_WEAKNESS =
  "Some pasted content was detected during the text interview, which may reduce confidence in live ownership of the answers.";

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

  if (integrity.pasteCount >= 3 || pasteRatio >= 0.35 || maxMessagePasteRatio >= 0.6) {
    return {
      level: "high",
      pasteRatio,
      explanation: `Detected ${integrity.pasteCount} paste event(s) covering about ${Math.round(pasteRatio * 100)}% of submitted answer text.`,
    };
  }

  if (pasteRatio >= 0.1 || maxMessagePasteRatio >= 0.25) {
    return {
      level: "medium",
      pasteRatio,
      explanation: `Detected ${integrity.pasteCount} paste event(s) covering about ${Math.round(pasteRatio * 100)}% of submitted answer text.`,
    };
  }

  if (integrity.copyCount > 0) {
    return {
      level: "low",
      pasteRatio,
      explanation: `Recorded ${integrity.copyCount} copy event(s) but no pasted answer content.`,
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
