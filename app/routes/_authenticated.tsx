import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getMyCandidateProfile } from "@/features/candidates/server/functions";
import { getMyCompany } from "@/features/companies/server/functions";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ context, location }) => {
    if (!context.user) {
      throw redirect({ to: "/" });
    }
    if (!context.user.role) {
      throw redirect({ to: "/" });
    }

    const isOnboardingRoute = location.pathname.startsWith("/onboarding");

    if (context.isCompany) {
      const company = await getMyCompany();
      const onboarded = Boolean(company?.onboardingCompletedAt);
      if (!onboarded && !isOnboardingRoute) {
        throw redirect({ to: "/onboarding/company" });
      }
      if (onboarded && isOnboardingRoute) {
        throw redirect({ to: "/dashboard" });
      }
      return { company };
    }

    if (context.isCandidate) {
      const profile = await getMyCandidateProfile();
      const onboarded = Boolean(profile?.onboardingCompletedAt);
      if (!onboarded && !isOnboardingRoute) {
        throw redirect({ to: "/onboarding/candidate" });
      }
      if (onboarded && isOnboardingRoute) {
        throw redirect({ to: "/dashboard" });
      }
      return { candidateProfile: profile };
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  return <Outlet />;
}
