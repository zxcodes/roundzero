import type { Subscription } from "@polar-sh/sdk/models/components/subscription";
import type { Sql } from "postgres";

import {
  clearCurrentCompanySubscription,
  getCompanyById,
  getCompanyByPolarCustomerId,
  reconcileCompanySubscription,
} from "@/features/companies/queries/queries_sql";
import { appEnv } from "@/shared/env.app";

import type { SubscriptionPlan } from "../config";

export function planFromPolarProductId(productId: string): SubscriptionPlan {
  if (productId === appEnv.POLAR_PRODUCT_ID_STARTER) return "starter";
  if (productId === appEnv.POLAR_PRODUCT_ID_GROWTH) return "growth";
  if (productId === appEnv.POLAR_PRODUCT_ID_SCALE) return "scale";
  throw new Error(`Unknown Polar product: ${productId}`);
}

function subscriptionModifiedAt(subscription: Subscription): Date {
  return subscription.modifiedAt ?? subscription.createdAt;
}

async function resolveSubscriptionCompany(
  db: Sql,
  subscription: Subscription,
  expectedCompanyId?: string,
) {
  const externalCompanyId = subscription.customer.externalId;
  if (expectedCompanyId && externalCompanyId !== expectedCompanyId) {
    throw new Error("Polar subscription does not belong to this company");
  }

  const company = expectedCompanyId
    ? await getCompanyById(db, { id: expectedCompanyId })
    : externalCompanyId
      ? await getCompanyById(db, { id: externalCompanyId })
      : await getCompanyByPolarCustomerId(db, { polarCustomerId: subscription.customerId });

  if (!company) {
    throw new Error(`No company found for Polar customer ${subscription.customerId}`);
  }

  if (company.polarCustomerId && company.polarCustomerId !== subscription.customerId) {
    throw new Error("Company is linked to a different Polar customer");
  }

  return company;
}

export async function reconcilePolarSubscription(
  db: Sql,
  subscription: Subscription,
  expectedCompanyId?: string,
): Promise<{ applied: boolean; companyId: string; plan: SubscriptionPlan }> {
  const company = await resolveSubscriptionCompany(db, subscription, expectedCompanyId);
  const plan = planFromPolarProductId(subscription.productId);
  const pendingPlan = subscription.pendingUpdate?.productId
    ? planFromPolarProductId(subscription.pendingUpdate.productId)
    : null;

  const updated = await reconcileCompanySubscription(db, {
    id: company.id,
    polarCustomerId: subscription.customerId,
    polarSubscriptionId: subscription.id,
    polarProductId: subscription.productId,
    polarSubscriptionModifiedAt: subscriptionModifiedAt(subscription),
    subscriptionPlan: plan,
    subscriptionStatus: subscription.status,
    subscriptionCurrentPeriodEnd: subscription.currentPeriodEnd,
    subscriptionCancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    subscriptionPendingPlan: pendingPlan,
    subscriptionPendingChangeAt: subscription.pendingUpdate?.appliesAt ?? null,
  });

  return { applied: updated !== null, companyId: company.id, plan };
}

export async function revokePolarSubscription(
  db: Sql,
  subscription: Subscription,
): Promise<{ applied: boolean; companyId: string }> {
  const company = await resolveSubscriptionCompany(db, subscription);
  const cleared = await clearCurrentCompanySubscription(db, {
    id: company.id,
    polarSubscriptionId: subscription.id,
    polarSubscriptionModifiedAt: subscriptionModifiedAt(subscription),
  });

  return { applied: cleared !== null, companyId: company.id };
}
