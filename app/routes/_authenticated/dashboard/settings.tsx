import { createFileRoute, redirect } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { DashboardSettingsSkeleton } from "@/components/route-skeletons";
import { sanitizeRedirect } from "@/features/auth/signup-search";
import { CandidateSettings } from "@/features/candidates/components/candidate-settings";
import { getMyCandidateProfile } from "@/features/candidates/server/functions";
import { CompanyLeaveSection } from "@/features/companies/components/company-leave-section";
import { CompanySettings } from "@/features/companies/components/company-settings";

const settingsSearchSchema = z.object({
  redirect: z.string().optional().transform(sanitizeRedirect),
});

export const Route = createFileRoute("/_authenticated/dashboard/settings")({
  validateSearch: zodValidator(settingsSearchSchema),
  loader: async ({ context }) => {
    if (context.isCompany) {
      if (!context.company) {
        throw redirect({ to: "/onboarding/no-workspace" });
      }

      const canManageProfile =
        context.membershipRole === "owner" || context.membershipRole === "admin";

      return {
        type: "company" as const,
        company: context.company,
        canManageProfile,
        canLeaveTeam: context.membershipRole !== "owner",
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
  const { redirect: redirectTo } = Route.useSearch();

  if (data.type === "company") {
    return (
      <div className="space-y-6 pb-28">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
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

  return <CandidateSettings profile={data.profile} user={user} redirectTo={redirectTo} />;
}
