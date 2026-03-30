import { UserIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/provider";

export const Route = createFileRoute("/candidate/login")({
  beforeLoad: ({ context }) => {
    if (context.user) {
      if (context.user.role === "company") {
        // Wrong login page — redirect to company dashboard
        throw redirect({ to: "/dashboard" });
      }
      throw redirect({ to: "/dashboard" });
    }
  },
  component: CandidateLoginPage,
});

function CandidateLoginPage() {
  const { signIn } = useAuth();

  const onSignIn = () => {
    signIn("candidate");
  };

  return (
    <div className="relative flex min-h-svh items-center justify-center p-6">
      {/* Background gradient */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--color-primary)/5%,transparent_70%)]" />

      <div className="animate-fade-in-up relative w-full max-w-sm space-y-8 text-center">
        {/* Logo */}
        <div className="flex justify-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20">
            <span className="text-lg font-bold text-primary-foreground">H</span>
          </div>
        </div>

        {/* Icon + heading */}
        <div className="space-y-3">
          <div className="mx-auto flex size-10 items-center justify-center rounded-xl bg-muted">
            <HugeiconsIcon
              icon={UserIcon}
              strokeWidth={2}
              className="size-5 text-muted-foreground"
            />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">Find your next role</h1>
            <p className="text-sm text-muted-foreground">
              Sign in to browse jobs, apply with one click, and complete AI-powered interviews.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <Button variant="outline" size="lg" className="w-full gap-3" onClick={onSignIn}>
            <svg className="size-4" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Looking to hire?{" "}
          <a href="/company/login" className="text-primary hover:underline">
            Sign in as a company
          </a>
        </p>
      </div>
    </div>
  );
}
