import { createFileRoute, redirect } from "@tanstack/react-router";
import { DashboardSettingsSkeleton } from "@/components/route-skeletons";
import { CandidateSettings } from "@/features/candidates/components/candidate-settings";
import { getMyCandidateProfile } from "@/features/candidates/server/functions";
import { CompanySettings } from "@/features/companies/components/company-settings";
import { CompanyTeamSection } from "@/features/companies/components/company-team-section";
import { getMyCompany, getMyMembership } from "@/features/companies/server/functions";
import { getTeamOverview } from "@/features/companies/server/team-functions";

export const Route = createFileRoute("/_authenticated/dashboard/settings")({
  loader: async ({ context }) => {
    if (context.isCompany) {
      const [company, membership] = await Promise.all([getMyCompany(), getMyMembership()]);
      if (!company) {
        throw redirect({ to: "/onboarding/company" });
      }

      const canManageTeam = membership?.role === "owner" || membership?.role === "admin";
      const team = canManageTeam ? await getTeamOverview() : null;

      return {
        type: "company" as const,
        company,
        canManageProfile: canManageTeam,
        canManageTeam,
        team,
      };
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
    return (
      <div className="space-y-6 pb-28">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage your company profile and team access.
          </p>
        </div>
        <CompanySettings company={data.company} canManageProfile={data.canManageProfile} />
        {data.canManageTeam && data.team ? (
          <CompanyTeamSection team={data.team} currentUserId={user.id} />
        ) : null}
      </div>
    );
  }

  return <CandidateSettings profile={data.profile} user={user} />;
}
