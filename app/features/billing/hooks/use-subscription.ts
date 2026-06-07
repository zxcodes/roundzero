import { useLoaderData } from "@tanstack/react-router";

/**
 * Returns the current company's subscription state from the `_authenticated`
 * route loader data. Returns `null` when the user is a candidate (no
 * subscription on a company row).
 *
 * Usage:
 *   const subscription = useSubscription();
 *   if (subscription?.isActive) { ... }
 */
export function useSubscription() {
  const auth = useLoaderData({ from: "/_authenticated" });
  return auth.type === "company" ? auth.subscription : null;
}
