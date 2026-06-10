import { createServerFn } from "@tanstack/react-start";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import {
  getCompanyByOwnerId,
  setCompanyPolarCustomer,
} from "@/features/companies/queries/queries_sql";
import { getDb } from "@/shared/db";
import { appEnv } from "@/shared/env.app";
import { companyMiddleware } from "@/shared/middleware";
import { hasActiveSubscription, type SubscriptionPlan, subscriptionPlanSchema } from "../config";
import { getPolar } from "../services/polar";

const checkoutSchema = z.object({
  plan: subscriptionPlanSchema,
});

function productIdForPlan(plan: SubscriptionPlan): string | null {
  if (plan === "pro") return appEnv.POLAR_PRODUCT_ID_PRO;
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
    const plan = data.plan as SubscriptionPlan;
    const productId = productIdForPlan(plan);

    if (!productId) {
      throw new Error(
        plan === "enterprise"
          ? "Contact sales for the Enterprise plan"
          : "This plan is not purchasable",
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
    if (!context.company.polarCustomerId) {
      throw new Error("No billing account on file. Subscribe first.");
    }

    const polar = getPolar();
    const session = await polar.customerSessions.create({
      customerId: context.company.polarCustomerId,
    });

    return { url: session.customerPortalUrl };
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
      hasPolarCustomer: Boolean(company.polarCustomerId),
      isActive: hasActiveSubscription({
        subscriptionPlan: company.subscriptionPlan,
        subscriptionStatus: company.subscriptionStatus,
      }),
    };
  });
