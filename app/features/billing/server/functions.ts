import { createServerFn } from "@tanstack/react-start";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import {
  getCompanyByOwnerId,
  setCompanyStripeCustomer,
} from "@/features/companies/queries/queries_sql";
import { getDb } from "@/shared/db";
import { appEnv } from "@/shared/env.app";
import { companyMiddleware } from "@/shared/middleware";
import { hasActiveSubscription, type SubscriptionPlan, subscriptionPlanSchema } from "../config";
import { getStripe } from "../services/stripe";

const checkoutSchema = z.object({
  plan: subscriptionPlanSchema,
});

function priceIdForPlan(plan: SubscriptionPlan): string | null {
  if (plan === "pro") return appEnv.STRIPE_PRICE_ID_PRO;
  return null;
}

/**
 * Look up the company's Stripe customer ID, creating it on the fly if missing.
 * Persists the customer ID on the company row so subsequent calls and webhooks
 * can find it.
 */
async function ensureStripeCustomer(input: {
  companyId: string;
  existingCustomerId: string | null;
  email: string;
  name: string;
}): Promise<string> {
  if (input.existingCustomerId) return input.existingCustomerId;

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email: input.email,
    name: input.name,
    metadata: { companyId: input.companyId },
  });

  const db = getDb();
  await setCompanyStripeCustomer(db, {
    id: input.companyId,
    stripeCustomerId: customer.id,
  });

  return customer.id;
}

export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([companyMiddleware])
  .inputValidator(zodValidator(checkoutSchema))
  .handler(async ({ data, context }) => {
    const plan = data.plan as SubscriptionPlan;
    const priceId = priceIdForPlan(plan);

    if (!priceId) {
      throw new Error(
        plan === "enterprise"
          ? "Contact sales for the Enterprise plan"
          : "This plan is not purchasable",
      );
    }

    const customerId = await ensureStripeCustomer({
      companyId: context.company.id,
      existingCustomerId: context.company.stripeCustomerId,
      email: context.user.email,
      name: context.company.name,
    });

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appEnv.APP_URL}/dashboard/billing?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appEnv.APP_URL}/dashboard/billing?status=cancelled`,
      allow_promotion_codes: true,
      client_reference_id: context.company.id,
      subscription_data: {
        metadata: {
          companyId: context.company.id,
          plan,
        },
      },
    });

    if (!session.url) {
      throw new Error("Stripe checkout session has no URL");
    }

    return { url: session.url };
  });

export const createBillingPortalSession = createServerFn({ method: "POST" })
  .middleware([companyMiddleware])
  .handler(async ({ context }) => {
    if (!context.company.stripeCustomerId) {
      throw new Error("No Stripe customer on file. Subscribe first.");
    }

    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: context.company.stripeCustomerId,
      return_url: `${appEnv.APP_URL}/dashboard/billing`,
    });

    return { url: session.url };
  });

export const getMySubscription = createServerFn({ method: "GET" })
  .middleware([companyMiddleware])
  .handler(async ({ context }) => {
    // Re-read so we always reflect the latest webhook-applied state.
    const db = getDb();
    const company = await getCompanyByOwnerId(db, { ownerId: context.userId });
    if (!company) return null;

    return {
      plan: (company.subscriptionPlan ?? "free") as SubscriptionPlan,
      status: company.subscriptionStatus ?? "inactive",
      currentPeriodEnd: company.subscriptionCurrentPeriodEnd,
      cancelAtPeriodEnd: company.subscriptionCancelAtPeriodEnd,
      hasStripeCustomer: Boolean(company.stripeCustomerId),
      isActive: hasActiveSubscription({
        subscriptionPlan: company.subscriptionPlan,
        subscriptionStatus: company.subscriptionStatus,
      }),
    };
  });
