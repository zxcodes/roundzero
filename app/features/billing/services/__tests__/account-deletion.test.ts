import { beforeEach, describe, expect, it, vi } from "vitest";

import { getCompanyByOwnerId } from "@/features/companies/queries/queries_sql";
import { getTestDb, seedUser } from "@/shared/__tests__/test-utils";
import { appEnv } from "@/shared/env.app";

import { scheduleOwnedSubscriptionCancellation } from "../account-deletion";

const sql = getTestDb();
const mockSubscriptionUpdate = vi.fn();

vi.mock("../polar", () => ({
  getPolar: () => ({
    subscriptions: {
      update: (...args: unknown[]) => mockSubscriptionUpdate(...args),
    },
  }),
}));

beforeEach(() => {
  mockSubscriptionUpdate.mockReset();
});

async function seedSubscribedCompany() {
  const owner = await seedUser({ role: "company" });
  const [company] = await sql`
    INSERT INTO companies (
      owner_id,
      name,
      slug,
      polar_customer_id,
      polar_subscription_id,
      polar_product_id,
      subscription_plan,
      subscription_status
    ) VALUES (
      ${owner.id},
      ${"Deleting Co"},
      ${`deleting-${crypto.randomUUID().slice(0, 6)}`},
      ${"cust_deleting"},
      ${"sub_deleting"},
      ${appEnv.POLAR_PRODUCT_ID_GROWTH},
      ${"growth"},
      ${"active"}
    )
    RETURNING id
  `;
  return { owner, companyId: company.id };
}

function makeCanceledSubscription(companyId: string) {
  return {
    createdAt: new Date("2026-06-01T00:00:00Z"),
    modifiedAt: new Date("2026-07-01T00:00:00Z"),
    id: "sub_deleting",
    customerId: "cust_deleting",
    productId: appEnv.POLAR_PRODUCT_ID_GROWTH,
    status: "active",
    currentPeriodEnd: new Date("2026-08-01T00:00:00Z"),
    cancelAtPeriodEnd: true,
    customer: { externalId: companyId },
    pendingUpdate: null,
  };
}

describe("scheduleOwnedSubscriptionCancellation", () => {
  it("schedules cancellation before account deletion can continue", async () => {
    const { owner, companyId } = await seedSubscribedCompany();
    mockSubscriptionUpdate.mockResolvedValue(makeCanceledSubscription(companyId));

    const result = await scheduleOwnedSubscriptionCancellation(sql, owner.id);

    expect(result).toEqual({ scheduled: true });
    expect(mockSubscriptionUpdate).toHaveBeenCalledWith({
      id: "sub_deleting",
      subscriptionUpdate: { cancelAtPeriodEnd: true },
    });
    const company = await getCompanyByOwnerId(sql, { ownerId: owner.id });
    expect(company!.subscriptionCancelAtPeriodEnd).toBe(true);
  });

  it("fails closed when Polar cannot schedule cancellation", async () => {
    const { owner } = await seedSubscribedCompany();
    mockSubscriptionUpdate.mockRejectedValue(new Error("Polar unavailable"));

    await expect(scheduleOwnedSubscriptionCancellation(sql, owner.id)).rejects.toThrow(
      "Polar unavailable",
    );
  });

  it("does not call Polar when cancellation is already scheduled", async () => {
    const { owner } = await seedSubscribedCompany();
    await sql`
      UPDATE companies
      SET subscription_cancel_at_period_end = true,
          updated_at = now()
      WHERE owner_id = ${owner.id}
    `;

    const result = await scheduleOwnedSubscriptionCancellation(sql, owner.id);

    expect(result).toEqual({ scheduled: false });
    expect(mockSubscriptionUpdate).not.toHaveBeenCalled();
  });
});
