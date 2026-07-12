import { linkOptions } from "@tanstack/react-router";
import { z } from "zod";

import { type SubscriptionPlan, subscriptionPlanSchema } from "@/features/billing/config";

export const billingSignupRedirect = "/dashboard/billing";

export function sanitizeRedirect(url: unknown): string | undefined {
  if (typeof url !== "string" || !url.startsWith("/") || url.startsWith("//")) {
    return undefined;
  }
  return url;
}

export const signupSearchSchema = z.object({
  redirect: z.string().optional().transform(sanitizeRedirect),
  plan: subscriptionPlanSchema.optional().catch(undefined),
});

export type SignupSearch = {
  redirect?: string;
  plan?: SubscriptionPlan;
};

export type SignupRouteSearch = {
  redirect?: string;
  plan?: SubscriptionPlan;
};

export function parseSignupSearch(input: unknown): SignupSearch {
  return signupSearchSchema.parse(input ?? {}) as SignupSearch;
}

export function toSignupRouteSearch(search: SignupSearch): SignupRouteSearch {
  return {
    ...(search.redirect ? { redirect: search.redirect } : {}),
    ...(search.plan ? { plan: search.plan } : {}),
  };
}

export function billingSearchForDestination(
  destination: string,
  search: SignupSearch,
): SignupRouteSearch {
  if (destination === billingSignupRedirect && search.plan) {
    return { plan: search.plan };
  }
  return {};
}

export function redirectAfterSignup(search: SignupSearch, fallback = "/dashboard") {
  const to = search.redirect ?? fallback;
  return {
    to,
    search: billingSearchForDestination(to, search),
  };
}

export function signupSearchForPlan(plan: Exclude<SubscriptionPlan, "free">) {
  return {
    redirect: billingSignupRedirect,
    plan,
  } satisfies SignupSearch;
}

export function companyLoginLinkForPlan(plan: Exclude<SubscriptionPlan, "free">) {
  return linkOptions({
    to: "/company/login",
    search: toSignupRouteSearch(signupSearchForPlan(plan)),
  });
}

export function candidateLoginLink(redirectTo: string) {
  return linkOptions({
    to: "/candidate/login",
    search: toSignupRouteSearch(parseSignupSearch({ redirect: redirectTo })),
  });
}
