import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getMyCompany } from "@/features/companies/server/functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  beforeLoad: async ({ context }) => {
    if (context.isCompany) {
      const company = await getMyCompany();
      if (!company) {
        throw redirect({ to: "/onboarding/company" });
      }
    }
  },
  component: DashboardLayout,
});

function DashboardLayout() {
  return <Outlet />;
}
