import { createFileRoute, redirect, useLoaderData, useNavigate } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { BillingPageSkeleton } from "@/components/route-skeletons";
import { BillingPage } from "@/features/billing/components/billing-page";
import { billingPageSearchSchema } from "@/features/billing/search";
import { getMySubscription, syncCheckoutSubscription } from "@/features/billing/server/functions";
import { PAGE_SEO } from "@/shared/seo";

export const Route = createFileRoute("/_authenticated/dashboard/billing")({
  validateSearch: zodValidator(billingPageSearchSchema),
  head: () => ({
    meta: [
      { title: PAGE_SEO.pricing.title },
      { name: "description", content: PAGE_SEO.pricing.description },
    ],
  }),
  beforeLoad: ({ context }) => {
    if (!context.isCompany) {
      throw redirect({ to: "/dashboard" });
    }

    if (context.membershipRole !== "owner") {
      throw redirect({ to: "/dashboard" });
    }
  },
  loader: async ({ location }) => {
    const params = new URLSearchParams(location.searchStr);
    let checkoutConfirmed = false;
    if (params.get("status") === "success") {
      const checkoutId = params.get("checkout_id");
      if (checkoutId) {
        try {
          const result = await syncCheckoutSubscription({ data: { checkoutId } });
          checkoutConfirmed = result.isActive;
        } catch {
          // Ignore errors here — the webhook will eventually sync. Showing a stale
          // state briefly is better than crashing the billing page.
        }
      }
    }

    const subscription = await getMySubscription();
    if (!subscription) {
      throw redirect({ to: "/onboarding/company" });
    }
    return { subscription, checkoutConfirmed };
  },
  pendingComponent: BillingPageSkeleton,
  component: BillingRoute,
});

function BillingRoute() {
  const { subscription, checkoutConfirmed } = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const handledStatus = useRef<string | null>(null);

  useEffect(() => {
    if (!search.status || handledStatus.current === search.status) return;
    handledStatus.current = search.status;

    if (search.status === "success") {
      if (checkoutConfirmed) {
        toast.success("Subscription activated. Welcome aboard.");
      } else {
        toast.message("Checkout completed. Subscription confirmation is still pending.");
      }
    } else {
      toast.message("Checkout cancelled.");
    }

    void navigate({ search: (prev) => ({ ...prev, status: undefined, checkout_id: undefined }) });
  }, [search.status, navigate, checkoutConfirmed]);

  const auth = useLoaderData({ from: "/_authenticated" });
  const jobCounts = auth.type === "company" ? auth.jobCounts : null;

  return (
    <BillingPage subscription={subscription} jobCounts={jobCounts} highlightedPlan={search.plan} />
  );
}
