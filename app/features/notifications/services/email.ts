import type { Sql } from "postgres";
import type { ReactElement } from "react";
import { jsx } from "react/jsx-runtime";
import { NotificationEmailTemplate } from "@/features/notifications/components/notification-email-template";
import { getNotificationPresentation } from "@/features/notifications/config";
import {
  markNotificationEmailDelivered,
  markNotificationEmailFailed,
  markNotificationEmailSkipped,
} from "@/features/notifications/queries/queries_sql";
import { formatDateTime } from "@/shared/date";
import { isEmailDeliveryConfigured, sendReactTransactionalEmail } from "@/shared/email";
import { appEnv } from "@/shared/env.app";

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
  react: ReactElement;
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
    case "interview_invited":
    case "application_withdrawn":
      return "RoundZero Alert";
    default:
      return "RoundZero";
  }
}

const formatDeadline = (value: unknown) => {
  if (typeof value !== "string") {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return `Complete by ${formatDateTime(date)}.`;
};

const getEmailPresentationMeta = (presentation: ReturnType<typeof getNotificationPresentation>) => {
  if (!presentation || !("meta" in presentation)) {
    return {
      ctaLabel: undefined,
      ctaHref: undefined as string | undefined,
      deadlineText: null as string | null,
    };
  }

  const meta = presentation.meta;
  if (typeof meta !== "object" || !meta) {
    return {
      ctaLabel: undefined,
      ctaHref: undefined as string | undefined,
      deadlineText: null as string | null,
    };
  }

  const ctaLabel = typeof meta.ctaLabel === "string" ? meta.ctaLabel : undefined;
  const ctaHref = "ctaHref" in meta && typeof meta.ctaHref === "string" ? meta.ctaHref : undefined;
  const deadlineText = formatDeadline((meta as { deadline?: unknown }).deadline);
  return { ctaLabel, ctaHref, deadlineText };
};

export const sendNotificationEmail: NotificationEmailSender = async (message) => {
  const delivery = await sendReactTransactionalEmail({
    to: message.to,
    fromName: message.fromName,
    subject: message.subject,
    react: message.react,
  });

  return {
    providerMessageId: delivery.providerMessageId,
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

  const appUrl = appEnv.APP_URL;
  let pathname = String(presentation.to);
  const meta = getEmailPresentationMeta(presentation);
  for (const [key, value] of Object.entries(presentation.params)) {
    pathname = pathname.replace(`$${key}`, String(value));
  }
  const link = appUrl ? new URL(pathname, appUrl).toString() : null;

  const sendEmail = input.sendEmail;
  if (!sendEmail || (sendEmail === sendNotificationEmail && !isEmailDeliveryConfigured())) {
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
        previewText:
          "previewText" in presentation && typeof presentation.previewText === "string"
            ? presentation.previewText
            : presentation.title,
        body: presentation.body,
        ctaHref: meta.ctaHref ?? link,
        ctaLabel: meta.ctaLabel,
        deadlineText: meta.deadlineText,
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
