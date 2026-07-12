import { jsx } from "react/jsx-runtime";

import { BatchDigestEmailTemplate } from "@/features/notifications/components/batch-digest-email-template";
import {
  markNotificationEmailDelivered,
  markNotificationEmailFailed,
  markNotificationEmailSkipped,
} from "@/features/notifications/queries/queries_sql";
import { getDb } from "@/shared/db";
import { isEmailDeliveryConfigured, sendReactTransactionalEmail } from "@/shared/email";
import { appEnv } from "@/shared/env.app";

type BatchDigestEmailInput = {
  notificationId: string;
  to: string;
  batchId: string;
  jobTitle: string;
  reportCount: number;
  topScore: number | null;
  topCandidateName: string | null;
};

export async function sendBatchDigestEmail(input: BatchDigestEmailInput): Promise<void> {
  const db = getDb();
  try {
    if (!isEmailDeliveryConfigured()) {
      await markNotificationEmailSkipped(db, {
        id: input.notificationId,
        reason: "Email delivery is not configured",
      });
      return;
    }

    const appUrl = appEnv.APP_URL;
    const batchUrl = appUrl
      ? new URL(`/dashboard/job-batches/${input.batchId}`, appUrl).toString()
      : `/dashboard/job-batches/${input.batchId}`;

    try {
      const delivery = await sendReactTransactionalEmail({
        to: input.to,
        fromName: "RoundZero",
        subject: `${input.reportCount} new ${input.reportCount === 1 ? "evaluation" : "evaluations"} ready — ${input.jobTitle}`,
        react: jsx(BatchDigestEmailTemplate, {
          jobTitle: input.jobTitle,
          reportCount: input.reportCount,
          topScore: input.topScore,
          topCandidateName: input.topCandidateName,
          batchUrl,
        }),
      });

      await markNotificationEmailDelivered(db, {
        id: input.notificationId,
        providerMessageId: delivery.providerMessageId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown email delivery failure";
      await markNotificationEmailFailed(db, {
        id: input.notificationId,
        errorMessage: message,
      });
    }
  } finally {
    await db.end();
  }
}
