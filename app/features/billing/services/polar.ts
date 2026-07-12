import { Polar } from "@polar-sh/sdk";

import { appEnv } from "@/shared/env.app";

let cachedClient: Polar | null = null;

/**
 * Polar client configured for the Cloudflare Workers runtime.
 *
 * Uses fetch-based HTTP client so it works in `workerd`.
 * Re-uses a single instance per isolate.
 */
export function getPolar(): Polar {
  if (cachedClient) return cachedClient;
  cachedClient = new Polar({
    accessToken: appEnv.POLAR_ACCESS_TOKEN,
    server: appEnv.POLAR_MODE,
  });
  return cachedClient;
}
