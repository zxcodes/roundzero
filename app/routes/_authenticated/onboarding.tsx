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
            <Logo />
            <span
              className="font-heading text-[19px] leading-none tracking-[-0.01em]"
              style={{ fontWeight: 400 }}
            >
              RoundZero
            </span>
          </Link>
        </div>

        <div>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
