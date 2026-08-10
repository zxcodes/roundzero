import { getAgentByName } from "agents";
import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";

import { ACCOUNT_CLEANUP_SWEEP_LIMIT } from "@/features/accounts/config";
import { listAccountsPendingErasure } from "@/features/accounts/queries/queries_sql";
import { eraseDeletedAccount } from "@/features/accounts/server/cleanup";
import { getDb } from "@/shared/db";

type SweepEntry =
  | { userId: string; status: "ok"; erased: boolean }
  | { userId: string; status: "error"; message: string };

/**
 * Scheduled sweep that anonymizes soft-deleted accounts past the 30-day grace
 * period. Each user runs in its own step so one failure cannot block the rest.
 */
export class AccountCleanupWorkflow extends WorkflowEntrypoint<Env> {
  async run(_event: WorkflowEvent<unknown>, step: WorkflowStep) {
    const rows = await step.do(
      "list_pending_accounts",
      { retries: { limit: 3, delay: "10 seconds", backoff: "exponential" } },
      async () => {
        const sql = getDb();
        return await listAccountsPendingErasure(sql, { limit: ACCOUNT_CLEANUP_SWEEP_LIMIT });
      },
    );

    if (rows.length === 0) {
      return { swept: 0 };
    }

    const results: SweepEntry[] = [];
    for (const row of rows) {
      let entry: SweepEntry;
      try {
        entry = await step.do(
          `erase-${row.id}`,
          { retries: { limit: 1, delay: "10 seconds", backoff: "exponential" } },
          async (): Promise<SweepEntry> => {
            const db = getDb();
            const result = await eraseDeletedAccount(db, this.env.RESUMES, row.id, {
              eraseVoiceHistory: async (interviewId) => {
                const voiceAgent = await getAgentByName(
                  this.env.VoiceAssessmentAgent,
                  interviewId,
                  { locationHint: "enam" },
                );
                await voiceAgent.eraseConversationHistory();
              },
            });
            return { userId: row.id, status: "ok", erased: result.erased };
          },
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[AccountCleanupWorkflow] erase failed for ${row.id}: ${message}`, error);
        entry = {
          userId: row.id,
          status: "error",
          message,
        };
      }
      results.push(entry);
    }

    return { swept: rows.length, results };
  }
}
