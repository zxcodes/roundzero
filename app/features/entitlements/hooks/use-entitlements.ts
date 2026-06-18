import { useRouteContext } from "@tanstack/react-router";

/**
 * Returns the current company's entitlements from the `_authenticated` route
 * context. Returns `null` when there is no company workspace.
 *
 * This is the single source for UI gating (disabling actions, showing usage,
 * upgrade nudges). It is best-effort UX only — the authoritative checks live in
 * `enforceCompanyEntitlement` at the server-function boundary.
 */
export function useEntitlements() {
  const auth = useRouteContext({ from: "/_authenticated" });
  return auth.entitlements;
}
