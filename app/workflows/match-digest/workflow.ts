import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from "cloudflare:workers";

import { MATCHING_CONFIG } from "@/features/job-matching/config";
import {
  createJobMatchDigestNotification,
  getJobMatchDigestNotification,
  listDigestCandidates,
  lockCandidateDigestMatches,
  markCandidateDigestMatchesNotified,
} from "@/features/job-matching/queries/queries_sql";
import { getNotificationById } from "@/features/notifications/queries/queries_sql";
import {
  deliverNotificationEmail,
  sendNotificationEmail,
} from "@/features/notifications/services/email";
import { getDb } from "@/shared/db";
import { asSqlTransaction } from "@/shared/db-transaction";

export class MatchDigestWorkflow extends WorkflowEntrypoint<Env> {
  async run(_event: WorkflowEvent<unknown>, step: WorkflowStep) {
    if (String(this.env.MATCH_DIGEST_ENABLED) !== "true") return { disabled: true };

    const digestDate = await step.do("resolve-digest-date", async () =>
      new Date().toISOString().slice(0, 10),
    );
    const candidates = await step.do("list-digest-candidates", async () => {
      const db = getDb();
      return await listDigestCandidates(db);
    });

    let created = 0;
    for (const candidate of candidates) {
      const result = await step.do(`create-digest-${candidate.userId}`, async () => {
        const db = getDb();
        const dedupeKey = `job-matches:${digestDate}`;
        return await db.begin(async (tx) => {
          const transaction = asSqlTransaction(tx);
          const matches = await lockCandidateDigestMatches(transaction, {
            candidateId: candidate.userId,
            matchLimit: String(MATCHING_CONFIG.digestJobLimit),
          });
          if (matches.length === 0) {
            const existing = await getJobMatchDigestNotification(transaction, {
              userId: candidate.userId,
              dedupeKey,
            });
            return existing ? { notification: existing, created: false } : null;
          }

          const payload = {
            digestDate,
            jobs: matches.map((match) => ({
              jobId: match.jobId,
              title: match.title,
              companyName: match.companyName,
            })),
          };
          const notification = await createJobMatchDigestNotification(transaction, {
            userId: candidate.userId,
            payload,
            dedupeKey,
          });
          if (!notification) {
            const existing = await getJobMatchDigestNotification(transaction, {
              userId: candidate.userId,
              dedupeKey,
            });
            return existing ? { notification: existing, created: false } : null;
          }

          await markCandidateDigestMatchesNotified(transaction, {
            candidateId: candidate.userId,
            jobIds: matches.map((match) => match.jobId),
          });
          return { notification, created: true };
        });
      });
      if (!result) continue;
      if (result.created) created += 1;

      await step.do(
        `deliver-digest-${candidate.userId}`,
        { retries: { limit: 3, delay: "30 seconds", backoff: "exponential" } },
        async () => {
          const db = getDb();
          await deliverNotificationEmail(db, {
            notification: result.notification,
            recipient: { email: candidate.email },
            sendEmail: sendNotificationEmail,
          });
          const delivered = await getNotificationById(db, { id: result.notification.id });
          if (delivered?.emailDeliveryStatus === "failed") {
            throw new Error(delivered.emailDeliveryError ?? "Digest email delivery failed");
          }
        },
      );
    }

    return { candidates: candidates.length, created };
  }
}
