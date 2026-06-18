import { createServerFn } from "@tanstack/react-start";
import { zodValidator } from "@tanstack/zod-adapter";
import { Resend } from "resend";
import { z } from "zod";
import { appEnv } from "@/shared/env.app";

export const contactSchema = z.object({
  email: z.email("Please enter a valid email"),
  query: z.string().min(10, "Please enter at least 10 characters").max(5000),
});

export const submitContactForm = createServerFn({ method: "POST" })
  .validator(zodValidator(contactSchema))
  .handler(async ({ data }) => {
    const resend = new Resend(appEnv.RESEND_API_KEY);

    const response = await resend.emails.send({
      from: `RoundZero Contact <${appEnv.RESEND_FROM_EMAIL}>`,
      to: "contact@roundzero.dev",
      subject: `Contact form submission from ${data.email}`,
      text: `From: ${data.email}\n\nMessage:\n${data.query}`,
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    return { success: true };
  });
