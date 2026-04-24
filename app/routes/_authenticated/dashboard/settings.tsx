import { createFileRoute, redirect } from "@tanstack/react-router";
import { DashboardSettingsSkeleton } from "@/components/route-skeletons";
import { CandidateSettings } from "@/features/candidates/components/candidate-settings";
import { getMyCandidateProfile } from "@/features/candidates/server/functions";
import { CompanySettings } from "@/features/companies/components/company-settings";
import { getMyCompany } from "@/features/companies/server/functions";

export const Route = createFileRoute("/_authenticated/dashboard/settings")({
  loader: async ({ context }) => {
    if (context.isCompany) {
      const company = await getMyCompany();
      if (!company) {
        throw redirect({ to: "/onboarding/company" });
      }
      return { type: "company" as const, company };
    }
    const profile = await getMyCandidateProfile();
    if (!profile) {
      throw redirect({ to: "/onboarding/candidate" });
    }
    return { type: "candidate" as const, profile };
  },
  pendingComponent: DashboardSettingsSkeleton,
  component: SettingsPage,
});

function SettingsPage() {
  const data = Route.useLoaderData();
  const { user } = Route.useRouteContext();
  if (!user) return null;

  if (data.type === "company") {
    return <CompanySettings company={data.company} />;
  }

  return <CandidateSettings profile={data.profile} user={user} />;
}
