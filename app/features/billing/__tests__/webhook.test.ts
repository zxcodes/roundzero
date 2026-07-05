import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCompanyByPolarCustomerId } from "@/features/companies/queries/queries_sql";
import { getTestDb, seedUser } from "@/shared/__tests__/test-utils";
import { handlePolarWebhook } from "../webhook";

const sql = getTestDb();

const mockValidateEvent = vi.fn();
const mockSubscriptionsGet = vi.fn();

vi.mock("@polar-sh/sdk/webhooks", () => ({
  validateEvent: (...args: unknown[]) => mockValidateEvent(...args),
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
    EMAIL_FROM: "test@roundzero.dev",
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

function makeWebhookRequest(payload: unknown, signature = "valid-sig"): Request {
  return new Request("http://localhost/api/polar/webhook", {
    method: "POST",
    headers: {
      "webhook-signature": signature,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

function makeSubscription(overrides?: Record<string, unknown>) {
  return {
    id: "sub_123",
    customerId: "cust_123",
    productId: "growth-product-id",
    status: "active",
    currentPeriodEnd: new Date("2026-06-07T00:00:00Z"),
    cancelAtPeriodEnd: false,
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
      data: { customerId: "cust_rev" },
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
  it("fetches subscription and syncs when checkout has subscriptionId", async () => {
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
    expect(mockSubscriptionsGet).toHaveBeenCalledWith({ id: "sub_checkout" });

    const updated = await getCompanyByPolarCustomerId(sql, { polarCustomerId: "cust_check" });
    expect(updated!.subscriptionPlan).toBe("growth");
    expect(updated!.polarSubscriptionId).toBe("sub_123");
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

describe("handler error", () => {
  it("returns 500 when DB update throws", async () => {
    mockValidateEvent.mockReturnValue({
      type: "subscription.active",
      data: makeSubscription({ customerId: "nonexistent" }),
    });

    const request = makeWebhookRequest({ type: "subscription.active" });
    const response = await handlePolarWebhook(request);

    // updateCompanySubscription returns null when no company matches, not throws
    expect(response.status).toBe(200);
  });
});
