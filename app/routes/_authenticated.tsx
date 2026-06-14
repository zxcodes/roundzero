import { createFileRoute, Outlet, redirect, useLocation } from "@tanstack/react-router";
import { DashboardLayoutSkeleton } from "@/components/route-skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { hasActiveSubscription } from "@/features/billing/config";
import { getMyCandidateProfile } from "@/features/candidates/server/functions";
import { getMyCompany, getMyMembership } from "@/features/companies/server/functions";
import { getMyJobCounts } from "@/features/jobs/server/functions";

type Company = NonNullable<Awaited<ReturnType<typeof getMyCompany>>>;
type SubscriptionSummary = { plan: string; status: string; isActive: boolean };

const buildSubscription = (company: Company): SubscriptionSummary => ({
  plan: company.subscriptionPlan,
  status: company.subscriptionStatus,
  isActive: hasActiveSubscription({
    subscriptionPlan: company.subscriptionPlan,
    subscriptionStatus: company.subscriptionStatus,
  }),
});

export const Route = createFileRoute("/_authenticated")({
  // Cheap, synchronous gate only. Heavy async work lives in `loader` so the
  // router can render `pendingComponent` while it resolves (pending components
  // are NOT shown while `beforeLoad` is pending).
  beforeLoad: ({ context }) => {
    if (!context.user?.role) {
      throw redirect({ to: "/" });
    }
  },
  loader: async ({ context, location }) => {
    const user = context.user;
    if (!user?.role) {
      throw redirect({ to: "/" });
    }

    const isOnboardingRoute = location.pathname.startsWith("/onboarding");
    const redirectParam =
      "redirect" in location.search ? String(location.search.redirect) : undefined;
    const search = redirectParam ? { redirect: redirectParam } : {};

    if (user.role === "company") {
      const [company, jobCounts, membership] = await Promise.all([
        getMyCompany(),
        getMyJobCounts(),
        getMyMembership(),
      ]);
      const onboarded = Boolean(company?.onboardingCompletedAt);

      if (!onboarded && !isOnboardingRoute) {
        throw redirect({ to: "/onboarding/company", search });
      }
      if (onboarded && isOnboardingRoute) {
        throw redirect({ to: "/dashboard" });
      }

      const subscription = company ? buildSubscription(company) : null;
      const atJobLimit = !subscription?.isActive && (jobCounts?.openCount ?? 0) >= 3;

      if (location.pathname === "/dashboard/jobs/new" && atJobLimit) {
        throw redirect({ to: "/dashboard/billing", search: { reason: "job_limit" } });
      }

      return {
        type: "company" as const,
        user,
        company,
        membershipRole: membership?.role ?? null,
        subscription,
        jobCounts,
        candidateProfile: null,
      };
    }

    const candidateProfile = await getMyCandidateProfile();
    const onboarded = Boolean(candidateProfile?.onboardingCompletedAt);

    if (!onboarded && !isOnboardingRoute) {
      throw redirect({ to: "/onboarding/candidate", search });
    }
    if (onboarded && isOnboardingRoute) {
      throw redirect({ to: "/dashboard" });
    }

    return {
      type: "candidate" as const,
      user,
      company: null,
      membershipRole: null,
      subscription: null,
      jobCounts: null,
      candidateProfile,
    };
  },
  pendingComponent: AuthenticatedPending,
  component: AuthenticatedLayout,
});

function AuthenticatedPending() {
  const { pathname } = useLocation();

  if (pathname.startsWith("/dashboard")) {
    return <DashboardLayoutSkeleton />;
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    </div>
  );
}

function AuthenticatedLayout() {
  return <Outlet />;
}
