import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

import { getCompanyById, setCompanyPolarCustomer } from "@/features/companies/queries/queries_sql";
import { getDb } from "@/shared/db";
import { appEnv } from "@/shared/env.app";
import { assertCompanyOwner } from "@/shared/membership-auth";
import { companyMiddleware } from "@/shared/middleware";

import {
  hasActiveSubscription,
  requiresBillingPortal,
  SUBSCRIPTION_PLANS,
  type SubscriptionPlan,
  subscriptionPlanSchema,
} from "../config";
import {
  assertCheckoutBelongsToCompany,
  createPolarCheckout,
  createPolarPortalSession,
} from "../services/checkout";
import { trySendSubscriptionWelcomeEmail } from "../services/email";
import { getPolar } from "../services/polar";
import { reconcilePolarSubscription } from "../services/subscription-state";

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
  const customer = await polar.customers
    .create({
      email: input.email,
      name: input.name,
      externalId: input.companyId,
    })
    .catch(async () => await polar.customers.getExternal({ externalId: input.companyId }));

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
      requiresBillingPortal({
        polarSubscriptionId: context.company.polarSubscriptionId,
        subscriptionStatus: context.company.subscriptionStatus,
        cancelAtPeriodEnd: context.company.subscriptionCancelAtPeriodEnd,
      })
    ) {
      throw new Error("Manage your existing subscription through the billing portal.");
    }

    await ensurePolarCustomer({
      companyId: context.company.id,
      existingCustomerId: context.company.polarCustomerId,
      email: context.user.email,
      name: context.company.name,
    });

    const url = await createPolarCheckout({
      companyId: context.company.id,
      productId,
      customerIpAddress: getRequestHeader("cf-connecting-ip"),
    });
    return { url };
  });

export const createBillingPortalSession = createServerFn({ method: "POST" })
  .middleware([companyMiddleware])
  .handler(async ({ context }) => {
    assertCompanyOwner(context.membership.role);

    if (!context.company.polarCustomerId) {
      throw new Error("No billing account on file. Subscribe first.");
    }

    const url = await createPolarPortalSession(context.company.polarCustomerId);
    return { url };
  });

export const syncCheckoutSubscription = createServerFn({ method: "POST" })
  .middleware([companyMiddleware])
  .validator(zodValidator(z.object({ checkoutId: z.string() })))
  .handler(async ({ data, context }) => {
    assertCompanyOwner(context.membership.role);

    const polar = getPolar();
    const checkout = await polar.checkouts.get({ id: data.checkoutId });
    assertCheckoutBelongsToCompany(checkout, context.company.id);

    const subscriptionId = checkout.subscriptionId;
    if (!subscriptionId) {
      throw new Error("Checkout has no subscription");
    }

    const subscription = await polar.subscriptions.get({ id: subscriptionId });
    const result = await reconcilePolarSubscription(getDb(), subscription, context.company.id);

    if (
      result.applied &&
      (subscription.status === "active" || subscription.status === "trialing")
    ) {
      await trySendSubscriptionWelcomeEmail(getDb(), {
        polarSubscriptionId: subscription.id,
        plan: result.plan,
      }).catch((error) => {
        console.error("[billing.syncCheckoutSubscription] failed to send welcome email", error);
      });
    }

    return {
      success: true,
      isActive: subscription.status === "active" || subscription.status === "trialing",
      status: subscription.status,
    };
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
    const rawPendingPlan = company.subscriptionPendingPlan;
    const pendingPlan =
      SUBSCRIPTION_PLANS.find((candidate) => candidate === rawPendingPlan) ?? null;
    const isActive = hasActiveSubscription({
      subscriptionPlan: plan,
      subscriptionStatus: company.subscriptionStatus,
    });
    const requiresPortal = requiresBillingPortal({
      polarSubscriptionId: company.polarSubscriptionId,
      subscriptionStatus: company.subscriptionStatus,
      cancelAtPeriodEnd: company.subscriptionCancelAtPeriodEnd,
    });

    return {
      plan,
      entitlementPlan: isActive ? plan : "free",
      status: company.subscriptionStatus ?? "inactive",
      currentPeriodEnd: company.subscriptionCurrentPeriodEnd,
      cancelAtPeriodEnd: company.subscriptionCancelAtPeriodEnd,
      hasPolarCustomer: Boolean(company.polarCustomerId),
      requiresPortal,
      isActive,
      pendingPlan,
      pendingChangeAt: company.subscriptionPendingChangeAt,
    };
  });
