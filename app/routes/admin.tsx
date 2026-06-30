import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute, Link, notFound, redirect } from "@tanstack/react-router";
import { Logo } from "@/components/public-layout";
import { AdminDashboardSkeleton } from "@/components/route-skeletons";
import { Button } from "@/components/ui/button";
import { PlatformAdminDashboard } from "@/features/admin/components/platform-admin-dashboard";
import { getPlatformAdminStats } from "@/features/admin/server/functions";
import { noindexHead } from "@/shared/seo";

export const Route = createFileRoute("/admin")({
  head: () => noindexHead(),
  beforeLoad: ({ context }) => {
    if (!context.user) {
      throw redirect({ to: "/" });
    }
  },
  loader: async () => {
    try {
      return await getPlatformAdminStats();
    } catch {
      throw notFound();
    }
  },
  pendingComponent: AdminPendingPage,
  component: AdminPage,
});

function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background text-foreground min-h-svh">
      <div className="mx-auto w-full min-w-0 max-w-[1600px] px-4 md:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b py-4 md:py-6">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-1">
              <Logo />
              <span className="font-heading text-[19px] leading-none font-medium tracking-[-0.01em]">
                RoundZero
              </span>
            </Link>
            <span className="text-sm text-muted-foreground">Internal</span>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/dashboard" className="no-underline hover:no-underline">
              <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-3.5" />
              Back to dashboard
            </Link>
          </Button>
        </header>

        <main className="py-6 md:py-10">{children}</main>
      </div>
    </div>
  );
}

function AdminPendingPage() {
  return (
    <AdminShell>
      <AdminDashboardSkeleton />
    </AdminShell>
  );
}

function AdminPage() {
  const stats = Route.useLoaderData();

  return (
    <AdminShell>
      <PlatformAdminDashboard stats={stats} />
    </AdminShell>
  );
}
