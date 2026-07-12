import { render } from "@react-email/render";
import { env } from "cloudflare:workers";
import type { ReactElement } from "react";

import { appEnv } from "@/shared/env.app";

export type TransactionalEmailSendResult = {
  providerMessageId: string;
};

type TransactionalEmailBase = {
  to: string;
  fromName: string;
  subject: string;
  replyTo?: string;
};

export type TransactionalEmailInput = TransactionalEmailBase & {
  html: string;
  text: string;
};

export type ReactTransactionalEmailInput = TransactionalEmailBase & {
  react: ReactElement;
};

export function isEmailDeliveryConfigured(): boolean {
  return Boolean(env.EMAIL && appEnv.EMAIL_FROM);
}

export async function renderReactEmail(
  react: ReactElement,
): Promise<{ html: string; text: string }> {
  const html = await render(react);
  const text = await render(react, { plainText: true });
  return { html, text };
}

export async function sendTransactionalEmail(
  input: TransactionalEmailInput,
): Promise<TransactionalEmailSendResult> {
  if (!env.EMAIL) {
    throw new Error("EMAIL binding is not configured");
  }
  if (!appEnv.EMAIL_FROM) {
    throw new Error("EMAIL_FROM is not configured");
  }

  const response = await env.EMAIL.send({
    to: input.to,
    from: { email: appEnv.EMAIL_FROM, name: input.fromName },
    subject: input.subject,
    html: input.html,
    text: input.text,
    ...(input.replyTo ? { replyTo: input.replyTo } : {}),
  });

  return { providerMessageId: response.messageId };
}

export async function sendReactTransactionalEmail(
  input: ReactTransactionalEmailInput,
): Promise<TransactionalEmailSendResult> {
  const { html, text } = await renderReactEmail(input.react);
  return sendTransactionalEmail({
    to: input.to,
    fromName: input.fromName,
    subject: input.subject,
    html,
    text,
    replyTo: input.replyTo,
  });
}
