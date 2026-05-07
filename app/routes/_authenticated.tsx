import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { hasActiveSubscription } from "@/features/billing/config";
import { getMyCandidateProfile } from "@/features/candidates/server/functions";
import { getMyCompany } from "@/features/companies/server/functions";
import { getMyJobCounts } from "@/features/jobs/server/functions";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ context, location }) => {
    if (!context?.user?.role) {
      throw redirect({ to: "/" });
    }

    const isOnboardingRoute = location.pathname.startsWith("/onboarding");
    const redirectParam = (location.search as Record<string, unknown>)?.redirect as
      | string
      | undefined;
    const search = redirectParam ? { redirect: redirectParam } : {};

    if (context.isCompany) {
      const company = await getMyCompany();
      const onboarded = Boolean(company?.onboardingCompletedAt);

      if (!onboarded && !isOnboardingRoute) {
        throw redirect({
          to: "/onboarding/company",
          search,
        });
      }

      if (onboarded && isOnboardingRoute) {
        throw redirect({
          to: "/dashboard",
        });
      }

      const subscription = company
        ? {
            plan: company.subscriptionPlan,
            status: company.subscriptionStatus,
            isActive: hasActiveSubscription({
              subscriptionPlan: company.subscriptionPlan,
              subscriptionStatus: company.subscriptionStatus,
            }),
          }
        : null;

      const jobCounts = await getMyJobCounts();

      return {
        company,
        subscription,
        jobCounts,
        candidateProfile: null,
      };
    }

    if (context.isCandidate) {
      const profile = await getMyCandidateProfile();
      const onboarded = Boolean(profile?.onboardingCompletedAt);

      if (!onboarded && !isOnboardingRoute) {
        throw redirect({
          to: "/onboarding/candidate",
          search,
        });
      }

      if (onboarded && isOnboardingRoute) {
        throw redirect({
          to: "/dashboard",
        });
      }
      return {
        company: null,
        subscription: null,
        jobCounts: null,
        candidateProfile: profile,
      };
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  return <Outlet />;
}
