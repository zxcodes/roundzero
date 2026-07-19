import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  assertCheckoutBelongsToCompany,
  createPolarCheckout,
  createPolarPortalSession,
} from "../checkout";

const mockCheckoutCreate = vi.fn();
const mockPortalCreate = vi.fn();

vi.mock("../polar", () => ({
  getPolar: () => ({
    checkouts: { create: (...args: unknown[]) => mockCheckoutCreate(...args) },
    customerSessions: { create: (...args: unknown[]) => mockPortalCreate(...args) },
  }),
}));

vi.mock("@/shared/env.app", () => ({
  appEnv: { APP_URL: "https://roundzero.test" },
}));

beforeEach(() => {
  mockCheckoutCreate.mockReset();
  mockPortalCreate.mockReset();
});

describe("Polar checkout helpers", () => {
  it("forwards the company, Cloudflare IP, and RoundZero return URLs", async () => {
    mockCheckoutCreate.mockResolvedValue({ url: "https://sandbox.polar.sh/checkout/test" });

    const url = await createPolarCheckout({
      companyId: "company-123",
      productId: "product-123",
      customerIpAddress: "203.0.113.5",
    });

    expect(url).toBe("https://sandbox.polar.sh/checkout/test");
    expect(mockCheckoutCreate).toHaveBeenCalledWith({
      products: ["product-123"],
      externalCustomerId: "company-123",
      customerIpAddress: "203.0.113.5",
      successUrl:
        "https://roundzero.test/dashboard/billing?status=success&checkout_id={CHECKOUT_ID}",
      returnUrl: "https://roundzero.test/dashboard/billing?status=cancelled",
    });
  });

  it("returns the customer to the RoundZero billing page after portal use", async () => {
    mockPortalCreate.mockResolvedValue({ customerPortalUrl: "https://polar.sh/portal/test" });

    const url = await createPolarPortalSession("customer-123");

    expect(url).toBe("https://polar.sh/portal/test");
    expect(mockPortalCreate).toHaveBeenCalledWith({
      customerId: "customer-123",
      returnUrl: "https://roundzero.test/dashboard/billing",
    });
  });

  it("rejects a checkout created for another company", () => {
    expect(() =>
      assertCheckoutBelongsToCompany({ externalCustomerId: "company-other" }, "company-123"),
    ).toThrow("Checkout does not belong to this company");
  });

  it("accepts only the matching external company id", () => {
    expect(() =>
      assertCheckoutBelongsToCompany({ externalCustomerId: "company-123" }, "company-123"),
    ).not.toThrow();
  });
});
