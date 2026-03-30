import { Building01Icon, UserIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/login")({
  beforeLoad: ({ context }) => {
    if (context.user?.role) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: LoginPage,
});

function LoginPage() {
  return (
    <div className="relative flex min-h-svh items-center justify-center p-6">
      {/* Background gradient */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--color-primary)/5%,transparent_70%)]" />

      <div className="animate-fade-in-up relative w-full max-w-lg space-y-8 text-center">
        {/* Logo */}
        <div className="flex justify-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20">
            <span className="text-lg font-bold text-primary-foreground">H</span>
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Welcome to Hirely</h1>
          <p className="text-sm text-muted-foreground">How would you like to get started?</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Link
            to="/company/login"
            className="group rounded-xl border bg-card p-6 text-center ring-1 ring-foreground/3 transition-all hover:border-primary/40 hover:shadow-sm"
          >
            <div className="flex flex-col items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-xl bg-muted transition-colors group-hover:bg-primary/10">
                <HugeiconsIcon
                  icon={Building01Icon}
                  strokeWidth={2}
                  className="size-6 text-muted-foreground transition-colors group-hover:text-primary"
                />
              </div>
              <div>
                <p className="text-sm font-semibold">I'm hiring</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Post jobs and review AI-generated candidate reports
                </p>
              </div>
            </div>
          </Link>

          <Link
            to="/candidate/login"
            className="group rounded-xl border bg-card p-6 text-center ring-1 ring-foreground/3 transition-all hover:border-primary/40 hover:shadow-sm"
          >
            <div className="flex flex-col items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-xl bg-muted transition-colors group-hover:bg-primary/10">
                <HugeiconsIcon
                  icon={UserIcon}
                  strokeWidth={2}
                  className="size-6 text-muted-foreground transition-colors group-hover:text-primary"
                />
              </div>
              <div>
                <p className="text-sm font-semibold">I'm looking for work</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Apply to jobs and complete AI-powered interviews
                </p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
