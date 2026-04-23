import type { Sql } from "postgres";
import { jsx } from "react/jsx-runtime";
import { Resend } from "resend";
import { NotificationEmailTemplate } from "@/features/notifications/components/notification-email-template";
import { getNotificationPresentation } from "@/features/notifications/config";
import {
  markNotificationEmailDelivered,
  markNotificationEmailFailed,
  markNotificationEmailSkipped,
} from "@/features/notifications/queries/queries_sql";
import { serverEnv } from "@/shared/env.server";

type NotificationRecord = {
  id: string;
  type: string;
  payload: unknown;
};

type NotificationEmailRecipient = {
  email: string;
};

type NotificationEmailMessage = {
  to: string;
  fromName: string;
  subject: string;
  react: ReturnType<typeof jsx>;
};

type NotificationEmailSendResult = {
  providerMessageId: string | null;
};

export type NotificationEmailSender = (
  message: NotificationEmailMessage,
) => Promise<NotificationEmailSendResult>;

function getNotificationFromName(type: string): string {
  switch (type) {
    case "application_status_changed":
    case "job_published":
    case "job_archived":
    case "job_closed":
      return "RoundZero Update";
    case "new_applicant":
    case "application_withdrawn":
      return "RoundZero Alert";
    default:
      return "RoundZero";
  }
}

export const sendNotificationEmailViaResend: NotificationEmailSender = async (message) => {
  const resend = new Resend(serverEnv.RESEND_API_KEY);
  const response = await resend.emails.send({
    from: `${message.fromName} <${serverEnv.RESEND_FROM_EMAIL}>`,
    to: message.to,
    subject: message.subject,
    react: message.react,
  });

  if (response.error) {
    throw new Error(response.error.message);
  }

  return {
    providerMessageId: response.data?.id ?? null,
  };
};

export async function deliverNotificationEmail(
  db: Sql,
  input: {
    notification: NotificationRecord;
    recipient: NotificationEmailRecipient | null;
    sendEmail?: NotificationEmailSender;
  },
) {
  if (!input.recipient?.email) {
    await markNotificationEmailSkipped(db, {
      id: input.notification.id,
      reason: "Recipient email unavailable",
    });
    return;
  }

  const presentation = getNotificationPresentation(input.notification);
  if (!presentation) {
    await markNotificationEmailSkipped(db, {
      id: input.notification.id,
      reason: "Notification payload could not be rendered",
    });
    return;
  }

  const appUrl = serverEnv.APP_URL;
  let pathname = String(presentation.to);
  for (const [key, value] of Object.entries(presentation.params)) {
    pathname = pathname.replace(`$${key}`, String(value));
  }
  const link = appUrl ? new URL(pathname, appUrl).toString() : null;

  const sendEmail = input.sendEmail;
  if (
    !sendEmail ||
    (sendEmail === sendNotificationEmailViaResend &&
      (!serverEnv.RESEND_API_KEY || !serverEnv.RESEND_FROM_EMAIL))
  ) {
    await markNotificationEmailSkipped(db, {
      id: input.notification.id,
      reason: "Email delivery is not configured",
    });
    return;
  }

  try {
    const delivery = await sendEmail({
      to: input.recipient.email,
      fromName: getNotificationFromName(input.notification.type),
      subject: presentation.title,
      react: jsx(NotificationEmailTemplate, {
        previewText: presentation.title,
        body: presentation.body,
        ctaHref: link,
      }),
    });

    await markNotificationEmailDelivered(db, {
      id: input.notification.id,
      providerMessageId: delivery.providerMessageId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown email delivery failure";
    await markNotificationEmailFailed(db, {
      id: input.notification.id,
      errorMessage: message,
    });
  }
}
