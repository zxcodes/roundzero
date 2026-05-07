import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { BillingPageSkeleton } from "@/components/route-skeletons";
import { BillingPage } from "@/features/billing/components/billing-page";
import { getMySubscription } from "@/features/billing/server/functions";

const searchSchema = z.object({
  status: z.enum(["success", "cancelled"]).optional(),
  checkout_id: z.string().optional(),
  reason: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/dashboard/billing")({
  validateSearch: searchSchema,
  beforeLoad: ({ context }) => {
    if (!context.isCompany) {
      throw redirect({ to: "/dashboard" });
    }
  },
  loader: async () => {
    const subscription = await getMySubscription();
    if (!subscription) {
      throw redirect({ to: "/onboarding/company" });
    }
    return { subscription };
  },
  pendingComponent: BillingPageSkeleton,
  component: BillingRoute,
});

function BillingRoute() {
  const { subscription } = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const handledStatus = useRef<string | null>(null);

  useEffect(() => {
    if (!search.status || handledStatus.current === search.status) return;
    handledStatus.current = search.status;

    if (search.status === "success") {
      toast.success("Subscription activated. Welcome aboard.");
    } else {
      toast.message("Checkout cancelled.");
    }

    void navigate({ search: {}, replace: true });
  }, [search.status, navigate]);

  useEffect(() => {
    if (search.reason === "job_limit") {
      toast.info(
        "You've reached the 3 active job limit on the free plan. Upgrade to Pro for unlimited postings.",
      );
      void navigate({ search: (prev) => ({ ...prev, reason: undefined }), replace: true });
    }
  }, [search.reason, navigate]);

  const context = Route.useRouteContext();
  const jobCounts = context.jobCounts;

  return <BillingPage subscription={subscription} jobCounts={jobCounts} />;
}
