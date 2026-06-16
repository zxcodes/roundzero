import { createFileRoute, Outlet, redirect, useLocation } from "@tanstack/react-router";
import { DashboardLayoutSkeleton } from "@/components/route-skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import { getPlanJobLimit, hasActiveSubscription } from "@/features/billing/config";
import { getMyCandidateProfile } from "@/features/candidates/server/functions";
import { getMyCompanyContext } from "@/features/companies/server/functions";
import { getMyJobCounts } from "@/features/jobs/server/functions";
import type { CompanyMemberRole } from "@/shared/enums";
import { parseCompanyMemberRole } from "@/shared/membership-auth";

type CompanyContext = Awaited<ReturnType<typeof getMyCompanyContext>>;
type Company = Extract<CompanyContext, { state: "active" }>["company"];
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
  beforeLoad: async ({ context, location }) => {
    // A session with no role (e.g. a brand-new identity) is not a usable app
    // session — treat it as logged out. Public routes guard on `user?.role`,
    // so this does not loop.
    if (!context.user?.role) {
      throw redirect({ to: "/" });
    }

    if (context.user.role !== "company") {
      return {
        membershipRole: null as CompanyMemberRole | null,
        company: null as Company | null,
        hasCompanyWorkspace: false,
      };
    }

    const companyContext = await getMyCompanyContext();

    switch (companyContext.state) {
      case "active":
        return {
          membershipRole: parseCompanyMemberRole(companyContext.membership.role),
          company: companyContext.company,
          hasCompanyWorkspace: true,
        };
      case "removed":
        if (!location.pathname.startsWith("/onboarding/no-workspace")) {
          throw redirect({ to: "/onboarding/no-workspace" });
        }
        return {
          membershipRole: null as CompanyMemberRole | null,
          company: null as Company | null,
          hasCompanyWorkspace: false,
        };
      case "new": {
        if (location.pathname !== "/onboarding/company") {
          throw redirect({ to: "/onboarding/company" });
        }
        return {
          membershipRole: null as CompanyMemberRole | null,
          company: null as Company | null,
          hasCompanyWorkspace: false,
        };
      }
      case "unauthenticated":
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
      const company = context.company;
      const jobCounts = context.hasCompanyWorkspace ? await getMyJobCounts() : null;
      const onboarded = Boolean(company?.onboardingCompletedAt);

      if (context.hasCompanyWorkspace && !onboarded && !isOnboardingRoute) {
        throw redirect({ to: "/onboarding/company", search });
      }
      if (onboarded && isOnboardingRoute && location.pathname !== "/onboarding/no-workspace") {
        throw redirect({ to: "/dashboard" });
      }

      const subscription = company ? buildSubscription(company) : null;
      const jobLimit = getPlanJobLimit(subscription?.plan);
      const atJobLimit = jobLimit !== Infinity && (jobCounts?.openCount ?? 0) >= jobLimit;

      if (location.pathname === "/dashboard/jobs/new" && atJobLimit) {
        throw redirect({ to: "/dashboard/billing", search: { reason: "job_limit" } });
      }

      return {
        type: "company" as const,
        user,
        company,
        membershipRole: context.membershipRole,
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
