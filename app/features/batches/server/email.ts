import { env } from "cloudflare:workers";
import { jsx } from "react/jsx-runtime";
import { Resend } from "resend";
import { BatchDigestEmailTemplate } from "@/features/notifications/components/batch-digest-email-template";
import {
  markNotificationEmailDelivered,
  markNotificationEmailFailed,
  markNotificationEmailSkipped,
} from "@/features/notifications/queries/queries_sql";
import { getDb } from "@/shared/db";

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
  const resendApiKey = env.RESEND_API_KEY;
  const resendFromEmail = env.RESEND_FROM_EMAIL;

  if (!resendApiKey || !resendFromEmail) {
    await markNotificationEmailSkipped(db, {
      id: input.notificationId,
      reason: "Email delivery is not configured",
    });
    return;
  }

  const appUrl = env.APP_URL ?? "";
  const batchUrl = appUrl
    ? new URL(`/dashboard/job-batches/${input.batchId}`, appUrl).toString()
    : `/dashboard/job-batches/${input.batchId}`;

  try {
    const resend = new Resend(resendApiKey);
    const response = await resend.emails.send({
      from: `RoundZero <${resendFromEmail}>`,
      to: input.to,
      subject: `${input.reportCount} new ${input.reportCount === 1 ? "evaluation" : "evaluations"} ready — ${input.jobTitle}`,
      react: jsx(BatchDigestEmailTemplate, {
        jobTitle: input.jobTitle,
        reportCount: input.reportCount,
        topScore: input.topScore,
        topCandidateName: input.topCandidateName,
        batchUrl,
      }),
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    await markNotificationEmailDelivered(db, {
      id: input.notificationId,
      providerMessageId: response.data?.id ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown email delivery failure";
    await markNotificationEmailFailed(db, {
      id: input.notificationId,
      errorMessage: message,
    });
  }
}
