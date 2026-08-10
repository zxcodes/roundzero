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
