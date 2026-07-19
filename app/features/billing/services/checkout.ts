import type { Checkout } from "@polar-sh/sdk/models/components/checkout";

import { appEnv } from "@/shared/env.app";

import { getPolar } from "./polar";

export async function createPolarCheckout(input: {
  companyId: string;
  productId: string;
  customerIpAddress?: string;
}): Promise<string> {
  const checkout = await getPolar().checkouts.create({
    products: [input.productId],
    externalCustomerId: input.companyId,
    customerIpAddress: input.customerIpAddress,
    successUrl: `${appEnv.APP_URL}/dashboard/billing?status=success&checkout_id={CHECKOUT_ID}`,
    returnUrl: `${appEnv.APP_URL}/dashboard/billing?status=cancelled`,
  });
  if (!checkout.url) {
    throw new Error("Polar checkout session has no URL");
  }
  return checkout.url;
}

export async function createPolarPortalSession(customerId: string): Promise<string> {
  const session = await getPolar().customerSessions.create({
    customerId,
    returnUrl: `${appEnv.APP_URL}/dashboard/billing`,
  });
  return session.customerPortalUrl;
}

export function assertCheckoutBelongsToCompany(
  checkout: Pick<Checkout, "externalCustomerId">,
  companyId: string,
): void {
  if (checkout.externalCustomerId !== companyId) {
    throw new Error("Checkout does not belong to this company");
  }
}
