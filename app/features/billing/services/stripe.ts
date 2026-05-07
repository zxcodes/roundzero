import Stripe from "stripe";
import { appEnv } from "@/shared/env.app";

let cachedClient: Stripe | null = null;

/**
 * Stripe client configured for the Cloudflare Workers runtime.
 *
 * Uses Stripe's fetch-based HTTP client + WebCrypto provider so it works in
 * `workerd`. Re-uses a single instance per isolate.
 */
export function getStripe(): Stripe {
  if (cachedClient) return cachedClient;
  cachedClient = new Stripe(appEnv.STRIPE_SECRET_KEY, {
    httpClient: Stripe.createFetchHttpClient(),
    apiVersion: "2026-04-22.dahlia",
  });
  return cachedClient;
}

export const stripeCryptoProvider = Stripe.createSubtleCryptoProvider();
