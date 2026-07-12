import { createServerFn } from "@tanstack/react-start";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

import { isEmailDeliveryConfigured, sendTransactionalEmail } from "@/shared/email";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export const contactSchema = z.object({
  email: z.email("Please enter a valid email"),
  query: z.string().min(10, "Please enter at least 10 characters").max(5000),
});

export const submitContactForm = createServerFn({ method: "POST" })
  .validator(zodValidator(contactSchema))
  .handler(async ({ data }) => {
    if (!isEmailDeliveryConfigured()) {
      throw new Error("Email delivery is not configured");
    }

    await sendTransactionalEmail({
      to: "contact@roundzero.dev",
      fromName: "RoundZero Contact",
      subject: `Contact form submission from ${data.email}`,
      html: `<p><strong>From:</strong> ${escapeHtml(data.email)}</p><p>${escapeHtml(data.query).replace(/\n/g, "<br />")}</p>`,
      text: `From: ${data.email}\n\nMessage:\n${data.query}`,
      replyTo: data.email,
    });

    return { success: true };
  });
