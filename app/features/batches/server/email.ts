import { jsx } from "react/jsx-runtime";

import { loginUrlForEmailAction } from "@/features/auth/signup-search";
import { BatchDigestEmailTemplate } from "@/features/notifications/components/batch-digest-email-template";
import {
  getNotificationById,
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
    const notification = await getNotificationById(db, { id: input.notificationId });
    if (notification?.emailDeliveryStatus === "sent") {
      return;
    }
    if (!isEmailDeliveryConfigured()) {
      await markNotificationEmailSkipped(db, {
        id: input.notificationId,
        reason: "Email delivery is not configured",
      });
      return;
    }

    const appUrl = appEnv.APP_URL;
    const batchUrl = appUrl
      ? loginUrlForEmailAction(appUrl, "company", `/dashboard/job-batches/${input.batchId}`)
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
      throw error;
    }
  } finally {
    await db.end();
  }
}
