import { createFileRoute } from "@tanstack/react-router";
import { DashboardSettingsSkeleton } from "@/components/route-skeletons";
import { CandidateSettings } from "@/features/candidates/components/candidate-settings";
import { getMyCandidateProfile } from "@/features/candidates/server/functions";
import { CompanySettings } from "@/features/companies/components/company-settings";
import { getMyCompany } from "@/features/companies/server/functions";

export const Route = createFileRoute("/_authenticated/dashboard/settings")({
  loader: async ({ context }) => {
    if (context.isCompany) {
      const company = await getMyCompany();
      return { type: "company" as const, company, profile: null };
    }
    const profile = await getMyCandidateProfile();
    return { type: "candidate" as const, company: null, profile };
  },
  pendingComponent: DashboardSettingsSkeleton,
  component: SettingsPage,
});

function SettingsPage() {
  const data = Route.useLoaderData();
  const { user } = Route.useRouteContext();

  if (data.type === "company" && data.company) {
    return <CompanySettings company={data.company} />;
  }

  if (data.type === "candidate" && data.profile) {
    return <CandidateSettings profile={data.profile} user={user!} />;
  }

  return null;
}
