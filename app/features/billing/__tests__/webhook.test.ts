import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getCompanyByPolarCustomerId } from "@/features/companies/queries/queries_sql";
import { getTestDb, seedUser } from "@/shared/__tests__/test-utils";

import { handlePolarWebhook } from "../webhook";

const sql = getTestDb();

const mockValidateEvent = vi.fn();
const mockSubscriptionsGet = vi.fn();

vi.mock("@polar-sh/sdk/webhooks", () => ({
  validateEvent: (...args: unknown[]) => ({
    timestamp: new Date("2026-06-01T00:00:00Z"),
    ...mockValidateEvent(...args),
  }),
  WebhookVerificationError: class WebhookVerificationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "WebhookVerificationError";
    }
  },
}));

vi.mock("../services/polar", () => ({
  getPolar: () => ({
    subscriptions: {
      get: (...args: unknown[]) => mockSubscriptionsGet(...args),
    },
  }),
}));

vi.mock("@/shared/env.app", () => ({
  appEnv: {
    POLAR_WEBHOOK_SECRET: "test-secret",
    POLAR_PRODUCT_ID_STARTER: "starter-product-id",
    POLAR_PRODUCT_ID_GROWTH: "growth-product-id",
    POLAR_PRODUCT_ID_SCALE: "scale-product-id",
    EMAIL_FROM: "test@tryroundzero.com",
    APP_URL: "http://localhost:3000",
  },
}));

vi.mock("@/shared/db", () => ({
  getDb: () => sql,
}));

beforeEach(() => {
  mockValidateEvent.mockReset();
  mockSubscriptionsGet.mockReset();
});

function makeWebhookRequest(
  payload: unknown,
  signature = "valid-sig",
  webhookId = `webhook-${crypto.randomUUID()}`,
): Request {
  return new Request("http://localhost/api/polar/webhook", {
    method: "POST",
    headers: {
      "webhook-signature": signature,
      "webhook-id": webhookId,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

function makeSubscription(overrides?: Record<string, unknown>) {
  return {
    createdAt: new Date("2026-05-01T00:00:00Z"),
    modifiedAt: new Date("2026-06-01T00:00:00Z"),
    id: "sub_123",
    customerId: "cust_123",
    productId: "growth-product-id",
    status: "active",
    currentPeriodEnd: new Date("2026-06-07T00:00:00Z"),
    cancelAtPeriodEnd: false,
    customer: { externalId: null },
    pendingUpdate: null,
    ...overrides,
  };
}

describe("webhook verification", () => {
  it("returns 400 when signature header is missing", async () => {
    const request = new Request("http://localhost/api/polar/webhook", {
      method: "POST",
      body: JSON.stringify({ type: "subscription.active" }),
    });
    const response = await handlePolarWebhook(request);
    expect(response.status).toBe(400);
    expect(await response.text()).toBe("Missing webhook-signature header");
  });

  it("returns 400 when signature is invalid", async () => {
    const { WebhookVerificationError } = await import("@polar-sh/sdk/webhooks");
    mockValidateEvent.mockImplementation(() => {
      throw new WebhookVerificationError("Invalid signature");
    });

    const request = makeWebhookRequest({ type: "subscription.active" }, "bad-sig");
    const response = await handlePolarWebhook(request);
    expect(response.status).toBe(400);
    expect(await response.text()).toContain("Invalid signature");
  });
});

describe("subscription.active webhook", () => {
  it("updates company subscription from webhook", async () => {
    const owner = await seedUser({ role: "company" });
    await sql`
      INSERT INTO companies (owner_id, name, slug, polar_customer_id)
      VALUES (${owner.id}, ${"Test Co"}, ${`test-co-${crypto.randomUUID().slice(0, 6)}`}, ${"cust_123"})
    `;

    mockValidateEvent.mockReturnValue({
      type: "subscription.active",
      data: makeSubscription(),
    });

    const request = makeWebhookRequest({ type: "subscription.active" });
    const response = await handlePolarWebhook(request);

    expect(response.status).toBe(200);

    const updated = await getCompanyByPolarCustomerId(sql, { polarCustomerId: "cust_123" });
    expect(updated).not.toBeNull();
    expect(updated!.subscriptionPlan).toBe("growth");
    expect(updated!.subscriptionStatus).toBe("active");
    expect(updated!.polarSubscriptionId).toBe("sub_123");
    expect(updated!.polarProductId).toBe("growth-product-id");
  });

  it("maps starter product id to starter plan", async () => {
    const owner = await seedUser({ role: "company" });
    await sql`
      INSERT INTO companies (owner_id, name, slug, polar_customer_id)
      VALUES (${owner.id}, ${"Test Co"}, ${`test-co-${crypto.randomUUID().slice(0, 6)}`}, ${"cust_starter"})
    `;

    mockValidateEvent.mockReturnValue({
      type: "subscription.active",
      data: makeSubscription({ customerId: "cust_starter", productId: "starter-product-id" }),
    });

    const response = await handlePolarWebhook(makeWebhookRequest({ type: "subscription.active" }));
    expect(response.status).toBe(200);

    const updated = await getCompanyByPolarCustomerId(sql, { polarCustomerId: "cust_starter" });
    expect(updated!.subscriptionPlan).toBe("starter");
  });

  it("sends welcome email at most once per subscription id", async () => {
    const owner = await seedUser({ role: "company", email: "owner-welcome@acme.com" });
    await sql`
      INSERT INTO companies (owner_id, name, slug, polar_customer_id)
      VALUES (${owner.id}, ${"Welcome Co"}, ${`welcome-co-${crypto.randomUUID().slice(0, 6)}`}, ${"cust_welcome"})
    `;

    vi.mocked(env.EMAIL.send).mockClear();

    mockValidateEvent.mockReturnValue({
      type: "subscription.active",
      data: makeSubscription({ customerId: "cust_welcome", id: "sub_welcome_once" }),
    });

    const request = makeWebhookRequest({ type: "subscription.active" });
    const first = await handlePolarWebhook(request);
    expect(first.status).toBe(200);
    expect(env.EMAIL.send).toHaveBeenCalledTimes(1);

    const second = await handlePolarWebhook(makeWebhookRequest({ type: "subscription.active" }));
    expect(second.status).toBe(200);
    expect(env.EMAIL.send).toHaveBeenCalledTimes(1);
  });

  it("maps scale product id to scale plan", async () => {
    const owner = await seedUser({ role: "company" });
    await sql`
      INSERT INTO companies (owner_id, name, slug, polar_customer_id)
      VALUES (${owner.id}, ${"Test Co"}, ${`test-co-${crypto.randomUUID().slice(0, 6)}`}, ${"cust_scale"})
    `;

    mockValidateEvent.mockReturnValue({
      type: "subscription.active",
      data: makeSubscription({ customerId: "cust_scale", productId: "scale-product-id" }),
    });

    const response = await handlePolarWebhook(makeWebhookRequest({ type: "subscription.active" }));
    expect(response.status).toBe(200);

    const updated = await getCompanyByPolarCustomerId(sql, { polarCustomerId: "cust_scale" });
    expect(updated!.subscriptionPlan).toBe("scale");
  });
});

describe("subscription.updated webhook", () => {
  it("syncs updated subscription to company row", async () => {
    const owner = await seedUser({ role: "company" });
    await sql`
      INSERT INTO companies (owner_id, name, slug, polar_customer_id, polar_subscription_id, subscription_plan, subscription_status)
      VALUES (${owner.id}, ${"Test Co"}, ${`test-co-${crypto.randomUUID().slice(0, 6)}`}, ${"cust_456"}, ${"sub_old"}, ${"growth"}, ${"active"})
    `;

    mockValidateEvent.mockReturnValue({
      type: "subscription.updated",
      data: makeSubscription({
        id: "sub_new",
        customerId: "cust_456",
        status: "past_due",
        cancelAtPeriodEnd: true,
      }),
    });

    const request = makeWebhookRequest({ type: "subscription.updated" });
    const response = await handlePolarWebhook(request);

    expect(response.status).toBe(200);

    const updated = await getCompanyByPolarCustomerId(sql, { polarCustomerId: "cust_456" });
    expect(updated!.subscriptionStatus).toBe("past_due");
    expect(updated!.polarSubscriptionId).toBe("sub_new");
    expect(updated!.subscriptionCancelAtPeriodEnd).toBe(true);
  });
});

describe("subscription.canceled webhook", () => {
  it("keeps plan active until period end and sets cancelAtPeriodEnd", async () => {
    const owner = await seedUser({ role: "company" });
    await sql`
      INSERT INTO companies (owner_id, name, slug, polar_customer_id, polar_subscription_id, polar_product_id, subscription_plan, subscription_status)
      VALUES (${owner.id}, ${"Test Co"}, ${`test-co-${crypto.randomUUID().slice(0, 6)}`}, ${"cust_789"}, ${"sub_123"}, ${"growth-product-id"}, ${"growth"}, ${"active"})
    `;

    mockValidateEvent.mockReturnValue({
      type: "subscription.canceled",
      data: makeSubscription({
        customerId: "cust_789",
        status: "active",
        cancelAtPeriodEnd: true,
      }),
    });

    const request = makeWebhookRequest({ type: "subscription.canceled" });
    const response = await handlePolarWebhook(request);

    expect(response.status).toBe(200);

    const updated = await getCompanyByPolarCustomerId(sql, { polarCustomerId: "cust_789" });
    expect(updated!.subscriptionPlan).toBe("growth");
    expect(updated!.subscriptionStatus).toBe("active");
    expect(updated!.polarSubscriptionId).toBe("sub_123");
    expect(updated!.polarProductId).toBe("growth-product-id");
    expect(updated!.subscriptionCancelAtPeriodEnd).toBe(true);
  });
});

describe("subscription.revoked webhook", () => {
  it("clears subscription and resets to free plan", async () => {
    const owner = await seedUser({ role: "company" });
    await sql`
      INSERT INTO companies (owner_id, name, slug, polar_customer_id, polar_subscription_id, subscription_plan, subscription_status)
      VALUES (${owner.id}, ${"Test Co"}, ${`test-co-${crypto.randomUUID().slice(0, 6)}`}, ${"cust_rev"}, ${"sub_123"}, ${"growth"}, ${"active"})
    `;

    mockValidateEvent.mockReturnValue({
      type: "subscription.revoked",
      data: makeSubscription({
        customerId: "cust_rev",
        status: "canceled",
        modifiedAt: new Date("2026-06-08T00:00:00Z"),
      }),
    });

    const request = makeWebhookRequest({ type: "subscription.revoked" });
    const response = await handlePolarWebhook(request);

    expect(response.status).toBe(200);

    const cleared = await getCompanyByPolarCustomerId(sql, { polarCustomerId: "cust_rev" });
    expect(cleared!.subscriptionPlan).toBe("free");
    expect(cleared!.subscriptionStatus).toBe("canceled");
  });
});

describe("checkout.updated webhook", () => {
  it("accepts checkout updates without an extra Polar API request", async () => {
    const owner = await seedUser({ role: "company" });
    await sql`
      INSERT INTO companies (owner_id, name, slug, polar_customer_id)
      VALUES (${owner.id}, ${"Test Co"}, ${`test-co-${crypto.randomUUID().slice(0, 6)}`}, ${"cust_check"})
    `;

    mockSubscriptionsGet.mockResolvedValue(makeSubscription({ customerId: "cust_check" }));

    mockValidateEvent.mockReturnValue({
      type: "checkout.updated",
      data: { mode: "subscription", subscriptionId: "sub_checkout" },
    });

    const request = makeWebhookRequest({ type: "checkout.updated" });
    const response = await handlePolarWebhook(request);

    expect(response.status).toBe(200);
    expect(mockSubscriptionsGet).not.toHaveBeenCalled();

    const updated = await getCompanyByPolarCustomerId(sql, { polarCustomerId: "cust_check" });
    expect(updated!.subscriptionPlan).toBe("free");
    expect(updated!.polarSubscriptionId).toBeNull();
  });

  it("ignores checkout without subscriptionId", async () => {
    mockValidateEvent.mockReturnValue({
      type: "checkout.updated",
      data: { mode: "subscription", subscriptionId: null },
    });

    const request = makeWebhookRequest({ type: "checkout.updated" });
    const response = await handlePolarWebhook(request);

    expect(response.status).toBe(200);
    expect(mockSubscriptionsGet).not.toHaveBeenCalled();
  });
});

describe("unknown event type", () => {
  it("returns 200 and ignores the event", async () => {
    mockValidateEvent.mockReturnValue({
      type: "customer.created",
      data: { id: "cust_123" },
    });

    const request = makeWebhookRequest({ type: "customer.created" });
    const response = await handlePolarWebhook(request);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ received: true });
  });
});

describe("webhook lifecycle resilience", () => {
  it.each([
    { type: "subscription.created", status: "active" },
    { type: "subscription.past_due", status: "past_due" },
    { type: "subscription.uncanceled", status: "active" },
  ])("handles the explicit $type lifecycle event", async ({ type, status }) => {
    const owner = await seedUser({ role: "company" });
    const customerId = `cust-${crypto.randomUUID()}`;
    await sql`
      INSERT INTO companies (owner_id, name, slug, polar_customer_id)
      VALUES (${owner.id}, ${"Lifecycle Co"}, ${`lifecycle-${crypto.randomUUID().slice(0, 6)}`}, ${customerId})
    `;
    mockValidateEvent.mockReturnValue({
      type,
      data: makeSubscription({ customerId, status }),
    });

    const response = await handlePolarWebhook(makeWebhookRequest({ type }));

    expect(response.status).toBe(200);
    const company = await getCompanyByPolarCustomerId(sql, { polarCustomerId: customerId });
    expect(company!.subscriptionStatus).toBe(status);
  });

  it("processes a webhook id only once", async () => {
    const owner = await seedUser({ role: "company" });
    await sql`
      INSERT INTO companies (owner_id, name, slug, polar_customer_id)
      VALUES (${owner.id}, ${"Idempotent Co"}, ${`idempotent-${crypto.randomUUID().slice(0, 6)}`}, ${"cust_idempotent"})
    `;
    mockValidateEvent.mockReturnValue({
      type: "subscription.active",
      data: makeSubscription({ customerId: "cust_idempotent" }),
    });

    const webhookId = `webhook-${crypto.randomUUID()}`;
    const first = await handlePolarWebhook(
      makeWebhookRequest({ type: "subscription.active" }, "valid-sig", webhookId),
    );
    expect(first.status).toBe(200);

    mockValidateEvent.mockReturnValue({
      type: "subscription.active",
      data: makeSubscription({
        customerId: "cust_idempotent",
        productId: "scale-product-id",
      }),
    });
    const duplicate = await handlePolarWebhook(
      makeWebhookRequest({ type: "subscription.active" }, "valid-sig", webhookId),
    );

    expect(duplicate.status).toBe(200);
    const [company] = await sql`
      SELECT subscription_plan
      FROM companies
      WHERE polar_customer_id = ${"cust_idempotent"}
    `;
    expect(company.subscription_plan).toBe("growth");
    const [receipt] = await sql`
      SELECT status, attempt_count
      FROM polar_webhook_receipts
      WHERE id = ${webhookId}
    `;
    expect(receipt.status).toBe("completed");
    expect(receipt.attempt_count).toBe(1);
  });

  it("ignores an older subscription snapshot", async () => {
    const owner = await seedUser({ role: "company" });
    await sql`
      INSERT INTO companies (
        owner_id,
        name,
        slug,
        polar_customer_id,
        polar_subscription_id,
        polar_product_id,
        polar_subscription_modified_at,
        subscription_plan,
        subscription_status
      ) VALUES (
        ${owner.id},
        ${"Fresh Co"},
        ${`fresh-${crypto.randomUUID().slice(0, 6)}`},
        ${"cust_fresh"},
        ${"sub_current"},
        ${"growth-product-id"},
        ${new Date("2026-07-01T00:00:00Z")},
        ${"growth"},
        ${"active"}
      )
    `;
    mockValidateEvent.mockReturnValue({
      type: "subscription.updated",
      data: makeSubscription({
        id: "sub_current",
        customerId: "cust_fresh",
        productId: "starter-product-id",
        modifiedAt: new Date("2026-06-01T00:00:00Z"),
      }),
    });

    const response = await handlePolarWebhook(makeWebhookRequest({ type: "subscription.updated" }));

    expect(response.status).toBe(200);
    const updated = await getCompanyByPolarCustomerId(sql, { polarCustomerId: "cust_fresh" });
    expect(updated!.subscriptionPlan).toBe("growth");
    expect(updated!.polarSubscriptionModifiedAt).toEqual(new Date("2026-07-01T00:00:00Z"));
  });

  it("does not let an old revocation clear a new resubscription", async () => {
    const owner = await seedUser({ role: "company" });
    await sql`
      INSERT INTO companies (
        owner_id,
        name,
        slug,
        polar_customer_id,
        polar_subscription_id,
        polar_product_id,
        polar_subscription_modified_at,
        subscription_plan,
        subscription_status
      ) VALUES (
        ${owner.id},
        ${"Resub Co"},
        ${`resub-${crypto.randomUUID().slice(0, 6)}`},
        ${"cust_resub"},
        ${"sub_new"},
        ${"scale-product-id"},
        ${new Date("2026-07-01T00:00:00Z")},
        ${"scale"},
        ${"active"}
      )
    `;
    mockValidateEvent.mockReturnValue({
      type: "subscription.revoked",
      data: makeSubscription({
        id: "sub_old",
        customerId: "cust_resub",
        status: "canceled",
        modifiedAt: new Date("2026-07-02T00:00:00Z"),
      }),
    });

    const response = await handlePolarWebhook(makeWebhookRequest({ type: "subscription.revoked" }));

    expect(response.status).toBe(200);
    const company = await getCompanyByPolarCustomerId(sql, { polarCustomerId: "cust_resub" });
    expect(company!.polarSubscriptionId).toBe("sub_new");
    expect(company!.subscriptionPlan).toBe("scale");
  });

  it("does not resurrect a revoked subscription when its matching update arrives late", async () => {
    const owner = await seedUser({ role: "company" });
    await sql`
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
        ${"Revoked Co"},
        ${`revoked-${crypto.randomUUID().slice(0, 6)}`},
        ${"cust_revoked_order"},
        ${"sub_revoked_order"},
        ${"growth-product-id"},
        ${"growth"},
        ${"active"}
      )
    `;
    const modifiedAt = new Date("2026-07-02T00:00:00Z");
    const revokedSubscription = makeSubscription({
      id: "sub_revoked_order",
      customerId: "cust_revoked_order",
      status: "canceled",
      modifiedAt,
    });
    mockValidateEvent.mockReturnValue({
      type: "subscription.revoked",
      data: revokedSubscription,
    });
    expect(
      (await handlePolarWebhook(makeWebhookRequest({ type: "subscription.revoked" }))).status,
    ).toBe(200);

    mockValidateEvent.mockReturnValue({
      type: "subscription.updated",
      data: revokedSubscription,
    });
    expect(
      (await handlePolarWebhook(makeWebhookRequest({ type: "subscription.updated" }))).status,
    ).toBe(200);

    const company = await getCompanyByPolarCustomerId(sql, {
      polarCustomerId: "cust_revoked_order",
    });
    expect(company!.polarSubscriptionId).toBeNull();
    expect(company!.subscriptionPlan).toBe("free");
  });

  it("repairs a missing customer mapping from the external company id", async () => {
    const owner = await seedUser({ role: "company" });
    const [company] = await sql`
      INSERT INTO companies (owner_id, name, slug)
      VALUES (${owner.id}, ${"External Co"}, ${`external-${crypto.randomUUID().slice(0, 6)}`})
      RETURNING id
    `;
    mockValidateEvent.mockReturnValue({
      type: "subscription.created",
      data: makeSubscription({
        customerId: "cust_external",
        customer: { externalId: company.id },
      }),
    });

    const response = await handlePolarWebhook(makeWebhookRequest({ type: "subscription.created" }));

    expect(response.status).toBe(200);
    const [updated] = await sql`
      SELECT polar_customer_id, polar_subscription_id, subscription_plan
      FROM companies
      WHERE id = ${company.id}
    `;
    expect(updated.polar_customer_id).toBe("cust_external");
    expect(updated.polar_subscription_id).toBe("sub_123");
    expect(updated.subscription_plan).toBe("growth");
  });

  it("returns 500 and records an unknown product for retry", async () => {
    const owner = await seedUser({ role: "company" });
    await sql`
      INSERT INTO companies (owner_id, name, slug, polar_customer_id)
      VALUES (${owner.id}, ${"Unknown Product Co"}, ${`unknown-${crypto.randomUUID().slice(0, 6)}`}, ${"cust_unknown_product"})
    `;
    mockValidateEvent.mockReturnValue({
      type: "subscription.active",
      data: makeSubscription({
        customerId: "cust_unknown_product",
        productId: "unknown-product-id",
      }),
    });
    const webhookId = `webhook-${crypto.randomUUID()}`;

    const response = await handlePolarWebhook(
      makeWebhookRequest({ type: "subscription.active" }, "valid-sig", webhookId),
    );

    expect(response.status).toBe(500);
    const [receipt] = await sql`
      SELECT status, last_error
      FROM polar_webhook_receipts
      WHERE id = ${webhookId}
    `;
    expect(receipt.status).toBe("failed");
    expect(receipt.last_error).toContain("Unknown Polar product");
  });

  it("stores a scheduled plan change without applying it early", async () => {
    const owner = await seedUser({ role: "company" });
    await sql`
      INSERT INTO companies (owner_id, name, slug, polar_customer_id)
      VALUES (${owner.id}, ${"Pending Co"}, ${`pending-${crypto.randomUUID().slice(0, 6)}`}, ${"cust_pending"})
    `;
    const appliesAt = new Date("2026-07-01T00:00:00Z");
    mockValidateEvent.mockReturnValue({
      type: "subscription.updated",
      data: makeSubscription({
        customerId: "cust_pending",
        pendingUpdate: {
          productId: "starter-product-id",
          appliesAt,
        },
      }),
    });

    const response = await handlePolarWebhook(makeWebhookRequest({ type: "subscription.updated" }));

    expect(response.status).toBe(200);
    const company = await getCompanyByPolarCustomerId(sql, { polarCustomerId: "cust_pending" });
    expect(company!.subscriptionPlan).toBe("growth");
    expect(company!.subscriptionPendingPlan).toBe("starter");
    expect(company!.subscriptionPendingChangeAt).toEqual(appliesAt);
  });
});

describe("handler error", () => {
  it("returns 500 when no company matches so Polar retries", async () => {
    mockValidateEvent.mockReturnValue({
      type: "subscription.active",
      data: makeSubscription({ customerId: "nonexistent" }),
    });

    const request = makeWebhookRequest({ type: "subscription.active" });
    const response = await handlePolarWebhook(request);

    expect(response.status).toBe(500);
  });
});
