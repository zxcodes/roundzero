import { useRouteContext } from "@tanstack/react-router";

/**
 * Returns the current company's subscription state from the `_authenticated`
 * route context. Returns `null` when the user is a candidate (no subscription
 * on a company row).
 *
 * Usage:
 *   const subscription = useSubscription();
 *   if (subscription?.isActive) { ... }
 */
export function useSubscription() {
  const context = useRouteContext({ from: "/_authenticated" });
  return context.subscription;
}
