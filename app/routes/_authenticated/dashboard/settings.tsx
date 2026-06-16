import { createFileRoute, redirect } from "@tanstack/react-router";
import { DashboardSettingsSkeleton } from "@/components/route-skeletons";
import { CandidateSettings } from "@/features/candidates/components/candidate-settings";
import { getMyCandidateProfile } from "@/features/candidates/server/functions";
import { CompanyLeaveSection } from "@/features/companies/components/company-leave-section";
import { CompanySettings } from "@/features/companies/components/company-settings";
import { getMyCompanyContext } from "@/features/companies/server/functions";

export const Route = createFileRoute("/_authenticated/dashboard/settings")({
  loader: async ({ context }) => {
    if (context.isCompany) {
      const companyContext = await getMyCompanyContext();

      if (companyContext.state === "new") {
        throw redirect({ to: "/onboarding/company" });
      }
      if (companyContext.state !== "active") {
        throw redirect({ to: "/onboarding/no-workspace" });
      }

      const { company, membership } = companyContext;
      const canManageProfile = membership.role === "owner" || membership.role === "admin";

      return {
        type: "company" as const,
        company,
        canManageProfile,
        canLeaveTeam: membership.role !== "owner",
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

  if (data.type === "company") {
    return (
      <div className="space-y-6 pb-28">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your company profile.</p>
        </div>
        <CompanySettings company={data.company} canManageProfile={data.canManageProfile} />
        {data.canLeaveTeam ? <CompanyLeaveSection /> : null}
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <CandidateSettings profile={data.profile} user={user} />;
}
