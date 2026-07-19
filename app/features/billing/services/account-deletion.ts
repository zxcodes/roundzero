import type { Sql } from "postgres";

import { getCompanyByOwnerId } from "@/features/companies/queries/queries_sql";

import { getPolar } from "./polar";
import { reconcilePolarSubscription } from "./subscription-state";

const CANCELLABLE_STATUSES = new Set(["active", "trialing", "past_due", "unpaid"]);

export async function scheduleOwnedSubscriptionCancellation(
  db: Sql,
  ownerId: string,
): Promise<{ scheduled: boolean }> {
  const company = await getCompanyByOwnerId(db, { ownerId });
  if (!company?.polarSubscriptionId) return { scheduled: false };
  if (!CANCELLABLE_STATUSES.has(company.subscriptionStatus)) return { scheduled: false };
  if (company.subscriptionCancelAtPeriodEnd) return { scheduled: false };

  const subscription = await getPolar().subscriptions.update({
    id: company.polarSubscriptionId,
    subscriptionUpdate: { cancelAtPeriodEnd: true },
  });
  await reconcilePolarSubscription(db, subscription, company.id);
  return { scheduled: true };
}
