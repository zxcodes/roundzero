import { useRouteContext } from "@tanstack/react-router";

interface Subscription {
  plan: string;
  status: string;
  isActive: boolean;
}

/**
 * Returns the current company's subscription state from the `_authenticated`
 * route context. Returns `null` when the user is a candidate (no subscription
 * on a company row).
 *
 * Usage:
 *   const subscription = useSubscription();
 *   if (subscription?.isActive) { ... }
 */
export function useSubscription(): Subscription | null {
  const context = useRouteContext({ from: "/_authenticated" });
  const subscription =
    context && typeof context === "object" && "subscription" in context
      ? (context.subscription as Subscription | null)
      : null;
  return subscription;
}
