import { createServerFn } from "@tanstack/react-start";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import {
  getCompanyById,
  setCompanyPolarCustomer,
  updateCompanySubscription,
} from "@/features/companies/queries/queries_sql";
import { getDb } from "@/shared/db";
import { appEnv } from "@/shared/env.app";
import { assertCompanyOwner } from "@/shared/membership-auth";
import { companyMiddleware } from "@/shared/middleware";
import {
  hasActiveSubscription,
  SUBSCRIPTION_PLANS,
  type SubscriptionPlan,
  subscriptionPlanSchema,
} from "../config";
import { trySendSubscriptionWelcomeEmail } from "../services/email";
import { getPolar } from "../services/polar";

const checkoutSchema = z.object({
  plan: subscriptionPlanSchema,
});

function productIdForPlan(plan: SubscriptionPlan): string | null {
  if (plan === "starter") return appEnv.POLAR_PRODUCT_ID_STARTER;
  if (plan === "growth") return appEnv.POLAR_PRODUCT_ID_GROWTH;
  if (plan === "scale") return appEnv.POLAR_PRODUCT_ID_SCALE;
  return null;
}

/**
 * Look up the company's Polar customer ID, creating it on the fly if missing.
 * Persists the customer ID on the company row so subsequent calls and webhooks
 * can find it.
 */
async function ensurePolarCustomer(input: {
  companyId: string;
  existingCustomerId: string | null;
  email: string;
  name: string;
}): Promise<string> {
  if (input.existingCustomerId) return input.existingCustomerId;

  const polar = getPolar();
  const customer = await polar.customers.create({
    email: input.email,
    name: input.name,
    externalId: input.companyId,
  });

  const db = getDb();
  await setCompanyPolarCustomer(db, {
    id: input.companyId,
    polarCustomerId: customer.id,
  });

  return customer.id;
}

export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([companyMiddleware])
  .validator(zodValidator(checkoutSchema))
  .handler(async ({ data, context }) => {
    assertCompanyOwner(context.membership.role);

    const plan = data.plan;
    const productId = productIdForPlan(plan);

    if (!productId) {
      throw new Error("This plan is not purchasable");
    }

    if (
      context.company.polarSubscriptionId &&
      hasActiveSubscription({
        subscriptionPlan: context.company.subscriptionPlan,
        subscriptionStatus: context.company.subscriptionStatus,
      })
    ) {
      throw new Error(
        "You already have an active subscription. Use the billing portal to change plans.",
      );
    }

    await ensurePolarCustomer({
      companyId: context.company.id,
      existingCustomerId: context.company.polarCustomerId,
      email: context.user.email,
      name: context.company.name,
    });

    const polar = getPolar();
    const checkout = await polar.checkouts.create({
      products: [productId],
      externalCustomerId: context.company.id,
      successUrl: `${appEnv.APP_URL}/dashboard/billing?status=success&checkout_id={CHECKOUT_ID}`,
    });

    if (!checkout.url) {
      throw new Error("Polar checkout session has no URL");
    }

    return { url: checkout.url };
  });

export const createBillingPortalSession = createServerFn({ method: "POST" })
  .middleware([companyMiddleware])
  .handler(async ({ context }) => {
    assertCompanyOwner(context.membership.role);

    if (!context.company.polarCustomerId) {
      throw new Error("No billing account on file. Subscribe first.");
    }

    const polar = getPolar();
    const session = await polar.customerSessions.create({
      customerId: context.company.polarCustomerId,
    });

    return { url: session.customerPortalUrl };
  });

export const syncCheckoutSubscription = createServerFn({ method: "POST" })
  .middleware([companyMiddleware])
  .validator(zodValidator(z.object({ checkoutId: z.string() })))
  .handler(async ({ data, context }) => {
    assertCompanyOwner(context.membership.role);

    const polar = getPolar();
    const checkout = await polar.checkouts.get({ id: data.checkoutId });
    const subscriptionId = checkout.subscriptionId;
    if (!subscriptionId) {
      throw new Error("Checkout has no subscription");
    }

    const subscription = await polar.subscriptions.get({ id: subscriptionId });
    const productId = subscription.productId;
    let plan: SubscriptionPlan = "free";
    if (productId) {
      if (productId === appEnv.POLAR_PRODUCT_ID_STARTER) plan = "starter";
      else if (productId === appEnv.POLAR_PRODUCT_ID_GROWTH) plan = "growth";
      else if (productId === appEnv.POLAR_PRODUCT_ID_SCALE) plan = "scale";
    }

    await setCompanyPolarCustomer(getDb(), {
      id: context.company.id,
      polarCustomerId: subscription.customerId,
    });

    await updateCompanySubscription(getDb(), {
      polarCustomerId: subscription.customerId,
      polarSubscriptionId: subscription.id,
      polarProductId: productId,
      subscriptionPlan: plan,
      subscriptionStatus: subscription.status,
      subscriptionCurrentPeriodEnd: subscription.currentPeriodEnd,
      subscriptionCancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    });

    if (subscription.status === "active" || subscription.status === "trialing") {
      await trySendSubscriptionWelcomeEmail(getDb(), {
        polarSubscriptionId: subscription.id,
        plan,
      }).catch((error) => {
        console.error("[billing.syncCheckoutSubscription] failed to send welcome email", error);
      });
    }

    return { success: true };
  });

export const getMySubscription = createServerFn({ method: "GET" })
  .middleware([companyMiddleware])
  .handler(async ({ context }) => {
    assertCompanyOwner(context.membership.role);

    // Re-read so we always reflect the latest webhook-applied state.
    const db = getDb();
    const company = await getCompanyById(db, { id: context.company.id });
    if (!company) return null;

    const rawPlan = company.subscriptionPlan ?? "free";
    const plan = SUBSCRIPTION_PLANS.find((p) => p === rawPlan) ?? "free";

    return {
      plan,
      status: company.subscriptionStatus ?? "inactive",
      currentPeriodEnd: company.subscriptionCurrentPeriodEnd,
      cancelAtPeriodEnd: company.subscriptionCancelAtPeriodEnd,
      hasPolarCustomer: Boolean(company.polarCustomerId),
      isActive: hasActiveSubscription({
        subscriptionPlan: plan,
        subscriptionStatus: company.subscriptionStatus,
      }),
    };
  });
