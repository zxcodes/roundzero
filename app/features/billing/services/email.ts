import type { Sql } from "postgres";
import { jsx } from "react/jsx-runtime";

import { getUserById } from "@/features/auth/queries/queries_sql";
import {
  claimSubscriptionWelcomeSend,
  clearSubscriptionWelcomeSendClaim,
} from "@/features/companies/queries/queries_sql";
import { isEmailDeliveryConfigured, sendReactTransactionalEmail } from "@/shared/email";
import { appEnv } from "@/shared/env.app";

import { SubscriptionWelcomeEmail } from "../components/subscription-welcome-email";
import { PLAN_CONFIGS, type SubscriptionPlan } from "../config";

export async function sendSubscriptionWelcomeEmail(input: {
  to: string;
  companyName: string;
  plan: SubscriptionPlan;
}): Promise<void> {
  if (!isEmailDeliveryConfigured()) {
    console.warn("[billing.email] Email delivery is not configured; skipping welcome email");
    return;
  }

  const dashboardUrl = appEnv.APP_URL
    ? `${appEnv.APP_URL}/dashboard`
    : "https://tryroundzero.com/dashboard";

  await sendReactTransactionalEmail({
    to: input.to,
    fromName: "RoundZero",
    subject:
      input.plan === "free"
        ? "Welcome to RoundZero"
        : `Welcome to RoundZero ${PLAN_CONFIGS[input.plan].name}`,
    react: jsx(SubscriptionWelcomeEmail, {
      plan: input.plan,
      companyName: input.companyName,
      dashboardUrl,
    }),
  });
}

/** Sends at most one welcome email per Polar subscription id (checkout + webhook safe). */
export async function trySendSubscriptionWelcomeEmail(
  db: Sql,
  input: {
    polarSubscriptionId: string;
    plan: SubscriptionPlan;
  },
): Promise<void> {
  if (input.plan === "free") {
    return;
  }

  const claimed = await claimSubscriptionWelcomeSend(db, {
    subscriptionWelcomePolarSubscriptionId: input.polarSubscriptionId,
  });
  if (!claimed) {
    return;
  }

  const owner = await getUserById(db, { id: claimed.ownerId });
  if (!owner?.email) {
    return;
  }

  try {
    await sendSubscriptionWelcomeEmail({
      to: owner.email,
      companyName: claimed.name,
      plan: input.plan,
    });
  } catch (error) {
    await clearSubscriptionWelcomeSendClaim(db, {
      polarSubscriptionId: input.polarSubscriptionId,
    });
    throw error;
  }
}
