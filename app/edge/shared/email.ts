type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

type EmailSendResult = {
  providerMessageId: string | null;
};

export async function sendEmailViaResend(
  apiKey: string,
  fromEmail: string,
  message: EmailMessage,
): Promise<EmailSendResult> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend API error (${response.status}): ${body}`);
  }

  const data = (await response.json()) as { id?: string };
  return { providerMessageId: data.id ?? null };
}
