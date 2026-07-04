import { createFileRoute, Outlet, redirect, useLocation } from "@tanstack/react-router";
import { DashboardLayoutSkeleton } from "@/components/route-skeletons";
import { Skeleton } from "@/components/ui/skeleton";
import {
  parseSignupSearch,
  redirectAfterSignup,
  toSignupRouteSearch,
} from "@/features/auth/signup-search";
import { getMyCandidateProfile } from "@/features/candidates/server/functions";
import {
  companyBootstrapQueryKey,
  getMyCompanyBootstrap,
} from "@/features/companies/server/functions";
import { deriveEntitlements } from "@/features/entitlements/entitlements";
import { parseCompanyMemberRole } from "@/shared/membership-auth";
import { noindexHead } from "@/shared/seo";

export const Route = createFileRoute("/_authenticated")({
  head: () => noindexHead(),
  beforeLoad: async ({ context, location }) => {
    // A session with no role (e.g. a brand-new identity) is not a usable app
    // session — treat it as logged out. Public routes guard on `user?.role`,
    // so this does not loop.
    if (!context.user?.role) {
      throw redirect({ to: "/" });
    }

    if (context.user.role !== "company") {
      return {
        membershipRole: null,
        company: null,
        hasCompanyWorkspace: false,
        entitlements: null,
        jobCounts: null,
      };
    }

    const companyContext = await context.queryClient.fetchQuery({
      queryKey: companyBootstrapQueryKey,
      queryFn: () => getMyCompanyBootstrap(),
      staleTime: 30_000,
    });

    switch (companyContext.state) {
      case "active": {
        const entitlements = deriveEntitlements({
          subscriptionPlan: companyContext.company.subscriptionPlan,
          subscriptionStatus: companyContext.company.subscriptionStatus,
          jobCounts: companyContext.jobCounts,
          teamCounts: companyContext.teamCounts,
        });

        return {
          membershipRole: parseCompanyMemberRole(companyContext.membership.role),
          company: companyContext.company,
          hasCompanyWorkspace: true,
          entitlements,
          jobCounts: companyContext.jobCounts,
        };
      }
      case "removed":
        if (!location.pathname.startsWith("/onboarding/no-workspace")) {
          throw redirect({ to: "/onboarding/no-workspace" });
        }
        return {
          membershipRole: null,
          company: null,
          hasCompanyWorkspace: false,
          entitlements: null,
          jobCounts: null,
        };
      case "new": {
        if (location.pathname !== "/onboarding/company") {
          throw redirect({
            to: "/onboarding/company",
            search: toSignupRouteSearch(parseSignupSearch(location.search)),
          });
        }
        return {
          membershipRole: null,
          company: null,
          hasCompanyWorkspace: false,
          entitlements: null,
          jobCounts: null,
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
    const signupSearch = parseSignupSearch(location.search);
    const onboardingSearch = toSignupRouteSearch(signupSearch);

    if (user.role === "company") {
      const company = context.company;
      const onboarded = Boolean(company?.onboardingCompletedAt);

      if (context.hasCompanyWorkspace && !onboarded && !isOnboardingRoute) {
        throw redirect({ to: "/onboarding/company", search: onboardingSearch });
      }
      if (onboarded && isOnboardingRoute && location.pathname !== "/onboarding/no-workspace") {
        throw redirect(redirectAfterSignup(signupSearch));
      }

      return {
        type: "company",
        user,
        company,
        membershipRole: context.membershipRole,
        entitlements: context.entitlements,
        jobCounts: context.jobCounts,
        candidateProfile: null,
      };
    }

    const candidateProfile = await getMyCandidateProfile();
    const onboarded = Boolean(candidateProfile?.onboardingCompletedAt);

    if (!onboarded && !isOnboardingRoute) {
      throw redirect({ to: "/onboarding/candidate", search: onboardingSearch });
    }
    if (onboarded && isOnboardingRoute) {
      throw redirect(redirectAfterSignup(signupSearch));
    }

    return {
      type: "candidate",
      user,
      company: null,
      membershipRole: null,
      entitlements: null,
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
