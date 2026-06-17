import { jsx } from "react/jsx-runtime";
import { Resend } from "resend";
import { appEnv } from "@/shared/env.app";
import { SubscriptionWelcomeEmail } from "../components/subscription-welcome-email";
import { PLAN_CONFIGS, type SubscriptionPlan } from "../config";

export async function sendSubscriptionWelcomeEmail(input: {
  to: string;
  companyName: string;
  plan: SubscriptionPlan;
  polarSubscriptionId: string;
}): Promise<void> {
  if (!appEnv.RESEND_API_KEY || !appEnv.RESEND_FROM_EMAIL) {
    console.warn("[billing.email] Resend is not configured; skipping welcome email");
    return;
  }

  const resend = new Resend(appEnv.RESEND_API_KEY);
  const dashboardUrl = appEnv.APP_URL
    ? `${appEnv.APP_URL}/dashboard`
    : "https://roundzero.dev/dashboard";

  const response = await resend.emails.send(
    {
      from: `RoundZero <${appEnv.RESEND_FROM_EMAIL}>`,
      to: input.to,
      subject:
        input.plan === "free"
          ? "Welcome to RoundZero"
          : `Welcome to RoundZero ${PLAN_CONFIGS[input.plan].name}`,
      react: jsx(SubscriptionWelcomeEmail, {
        plan: input.plan,
        companyName: input.companyName,
        dashboardUrl,
      }),
    },
    {
      idempotencyKey: `subscription-welcome-${input.polarSubscriptionId}`,
    },
  );

  if (response.error) {
    throw new Error(response.error.message);
  }
}
