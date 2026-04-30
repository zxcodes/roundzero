import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { Logo } from "@/components/public-layout";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: OnboardingLayout,
});

function OnboardingLayout() {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--color-primary)/5%,transparent_70%)]" />

      <div className="relative w-full max-w-lg">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <Link to="/" className="flex items-center gap-2.5">
            <Logo classname="size-9" />
            <span className="text-lg font-semibold tracking-tight">roundzero</span>
          </Link>
        </div>

        <div className="animate-fade-in-up">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
