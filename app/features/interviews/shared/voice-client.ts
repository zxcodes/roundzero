import type { TranscriptMessage } from "@cloudflare/voice/react";

export type VoiceDisplayMessage = { role: "assistant" | "user"; text: string };

const EXPRESSIVE_TAG_RE = /\[[\w\s-]+?\]\s*/g;

const normalizeMessageKey = (message: VoiceDisplayMessage) =>
  `${message.role}:${message.text.replace(/\s+/gu, " ").trim().toLowerCase()}`;

function cleanDisplayMessage(message: VoiceDisplayMessage): VoiceDisplayMessage | null {
  const text = message.text.replace(EXPRESSIVE_TAG_RE, "").trim();
  if (!text) return null;
  return { role: message.role, text };
}

export function buildVoiceDisplayMessages(
  recoveredMessages: VoiceDisplayMessage[],
  transcript: TranscriptMessage[],
): VoiceDisplayMessage[] {
  // Cloudflare exposes `transcript` as the current React snapshot and updates
  // its active assistant entry as deltas arrive. Derive display from that
  // snapshot; never append successive snapshots into application state.
  const recovered = recoveredMessages.reduce<VoiceDisplayMessage[]>((messages, message) => {
    const cleaned = cleanDisplayMessage(message);
    if (cleaned) messages.push(cleaned);
    return messages;
  }, []);
  const live = transcript.reduce<VoiceDisplayMessage[]>((messages, message) => {
    const cleaned = cleanDisplayMessage({
      role: message.role === "assistant" ? "assistant" : "user",
      text: message.text,
    });
    if (cleaned) messages.push(cleaned);
    return messages;
  }, []);

  let overlap = Math.min(recovered.length, live.length);
  while (overlap > 0) {
    const recoveredStart = recovered.length - overlap;
    const matches = live
      .slice(0, overlap)
      .every(
        (message, index) =>
          normalizeMessageKey(message) === normalizeMessageKey(recovered[recoveredStart + index]),
      );
    if (matches) break;
    overlap -= 1;
  }

  return [...recovered, ...live.slice(overlap)];
}

export type VoiceUtteranceSnapshot = {
  interimTranscript: string | null;
  candidateMessageCount: number;
};

export async function waitForCandidateUtteranceCommit(input: {
  initialCandidateMessageCount: number;
  readSnapshot: () => VoiceUtteranceSnapshot;
  timeoutMs?: number;
  pollIntervalMs?: number;
  now?: () => number;
  sleep?: (milliseconds: number) => Promise<void>;
}): Promise<"committed" | "timeout"> {
  const timeoutMs = input.timeoutMs ?? 6_000;
  const pollIntervalMs = input.pollIntervalMs ?? 50;
  const now = input.now ?? Date.now;
  const sleep =
    input.sleep ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  const deadline = now() + timeoutMs;

  while (now() < deadline) {
    const snapshot = input.readSnapshot();
    if (
      !snapshot.interimTranscript?.trim() &&
      snapshot.candidateMessageCount > input.initialCandidateMessageCount
    ) {
      return "committed";
    }
    await sleep(Math.min(pollIntervalMs, Math.max(0, deadline - now())));
  }

  return "timeout";
}
