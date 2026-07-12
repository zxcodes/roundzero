import { createFileRoute, redirect, useLoaderData } from "@tanstack/react-router";

import { DashboardTeamSkeleton } from "@/components/route-skeletons";
import { CompanyTeamSection } from "@/features/companies/components/company-team-section";
import { getTeamOverview } from "@/features/companies/server/team-functions";

export const Route = createFileRoute("/_authenticated/dashboard/team")({
  beforeLoad: ({ context }) => {
    if (!context.isCompany) {
      throw redirect({ to: "/dashboard" });
    }

    const canManageTeam = context.membershipRole === "owner" || context.membershipRole === "admin";
    if (!canManageTeam) {
      throw redirect({ to: "/dashboard" });
    }
  },
  loader: async () => {
    const team = await getTeamOverview();
    return { team };
  },
  pendingComponent: DashboardTeamSkeleton,
  component: TeamPage,
});

function TeamPage() {
  const { team } = Route.useLoaderData();
  const auth = useLoaderData({ from: "/_authenticated" });

  if (auth.type !== "company") {
    return null;
  }

  return (
    <div className="space-y-6 pb-28">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Team</h1>
        <p className="text-sm text-muted-foreground">
          Invite teammates, manage roles, and control workspace access.
        </p>
      </div>
      <CompanyTeamSection
        team={team}
        currentUserId={auth.user.id}
        isOwner={auth.membershipRole === "owner"}
      />
    </div>
  );
}
