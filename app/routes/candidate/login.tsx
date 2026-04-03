import {
  BubbleChatIcon,
  CheckmarkCircle02Icon,
  Clock01Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/provider";

function sanitizeRedirect(url: unknown): string | undefined {
  if (typeof url !== "string" || !url.startsWith("/") || url.startsWith("//")) {
    return undefined;
  }
  return url;
}

const loginSearchSchema = z.object({
  redirect: z.string().optional().transform(sanitizeRedirect),
});

export const Route = createFileRoute("/candidate/login")({
  validateSearch: loginSearchSchema,
  beforeLoad: ({ context }) => {
    if (context.user) {
      throw redirect({ to: "/dashboard" });
    }
  },
  head: () => ({
    meta: [{ title: "Sign In as Candidate | RoundZero" }],
  }),
  component: CandidateLoginPage,
});

function CandidateLoginPage() {
  const { signIn } = useAuth();
  const { redirect: redirectTo } = Route.useSearch();

  const onSignIn = () => {
    signIn("candidate", redirectTo);
  };

  return (
    <div className="min-h-svh lg:grid lg:grid-cols-2">
      {/* Left — value proposition */}
      <div className="relative hidden overflow-hidden bg-card lg:block">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,var(--color-primary)/8%,transparent_60%)]" />
        <div className="relative flex h-full flex-col justify-between p-10 xl:p-14">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-sm font-bold text-primary-foreground">R0</span>
            </div>
            <span className="text-lg font-semibold tracking-tight">roundzero</span>
          </Link>

          {/* Hero copy */}
          <div className="space-y-8">
            <div className="space-y-4">
              <p className="text-[11px] font-bold uppercase tracking-widest text-primary">
                For job seekers
              </p>
              <h1 className="text-3xl font-extrabold leading-tight tracking-tight xl:text-4xl">
                Interview on your
                <br />
                own terms.
              </h1>
              <p className="max-w-md text-base leading-relaxed text-muted-foreground">
                Browse open positions, apply with one click, and complete AI-powered interviews
                whenever you're ready — no scheduling, no phone screens.
              </p>
            </div>

            <div className="space-y-4">
              <ValueProp
                icon={Search01Icon}
                title="Browse and apply instantly"
                text="One-click applications using your saved profile and resume"
              />
              <ValueProp
                icon={BubbleChatIcon}
                title="AI interviews, your schedule"
                text="20-40 minute structured conversations, anytime, anywhere"
              />
              <ValueProp
                icon={Clock01Icon}
                title="Faster responses"
                text="Companies get your report immediately — no waiting weeks to hear back"
              />
            </div>
          </div>

          {/* Trust */}
          <div className="space-y-2">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <HugeiconsIcon
                  icon={CheckmarkCircle02Icon}
                  strokeWidth={2}
                  className="size-3.5 text-emerald-500"
                />
                Always free for candidates
              </span>
              <span className="flex items-center gap-1">
                <HugeiconsIcon
                  icon={CheckmarkCircle02Icon}
                  strokeWidth={2}
                  className="size-3.5 text-emerald-500"
                />
                No hidden fees
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right — login form */}
      <div className="relative flex min-h-svh items-start justify-center p-6 pt-16 lg:min-h-0 lg:items-center lg:p-10 lg:pt-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--color-primary)/4%,transparent_70%)]" />

        <div className="animate-fade-in relative w-full max-w-sm space-y-8">
          {/* Mobile logo */}
          <div className="flex justify-center lg:hidden">
            <Link to="/" className="flex items-center gap-2">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20">
                <span className="text-base font-bold text-primary-foreground">R0</span>
              </div>
            </Link>
          </div>

          <div className="space-y-2 text-center">
            <p className="text-[11px] font-bold uppercase tracking-widest text-primary lg:hidden">
              For job seekers
            </p>
            <h2 className="text-2xl font-bold tracking-tight">Find your next role</h2>
            <p className="text-sm text-muted-foreground">
              Sign in to browse jobs, apply with one click, and complete AI-powered interviews.
            </p>
          </div>

          <div className="space-y-4">
            <Button variant="outline" size="lg" className="w-full gap-3" onClick={onSignIn}>
              <GoogleIcon />
              Continue with Google
            </Button>
          </div>

          {/* Mobile value props — condensed */}
          <div className="space-y-3 lg:hidden">
            <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-card/50 p-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                <HugeiconsIcon
                  icon={Search01Icon}
                  strokeWidth={2}
                  className="size-4 text-primary"
                />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">Browse and apply instantly</p>
                <p className="text-xs text-muted-foreground">
                  One-click applications using your saved profile and resume
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-card/50 p-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                <HugeiconsIcon
                  icon={BubbleChatIcon}
                  strokeWidth={2}
                  className="size-4 text-primary"
                />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">AI interviews, your schedule</p>
                <p className="text-xs text-muted-foreground">
                  20-40 minute structured conversations, anytime, anywhere
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-card/50 p-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                <HugeiconsIcon icon={Clock01Icon} strokeWidth={2} className="size-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">Faster responses</p>
                <p className="text-xs text-muted-foreground">
                  Companies get your report immediately — no waiting weeks
                </p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-4 pt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <HugeiconsIcon
                  icon={CheckmarkCircle02Icon}
                  strokeWidth={2}
                  className="size-3.5 text-emerald-500"
                />
                Always free for candidates
              </span>
              <span className="flex items-center gap-1">
                <HugeiconsIcon
                  icon={CheckmarkCircle02Icon}
                  strokeWidth={2}
                  className="size-3.5 text-emerald-500"
                />
                No hidden fees
              </span>
            </div>
          </div>

          <div className="space-y-3 text-center text-xs text-muted-foreground">
            <p>
              Looking to hire?{" "}
              <Link to="/company/login" className="font-medium text-primary hover:underline">
                Sign in as a company
              </Link>
            </p>
            <p>
              By continuing, you agree to our{" "}
              <span className="underline underline-offset-2 hover:text-foreground cursor-pointer">
                Terms
              </span>{" "}
              and{" "}
              <span className="underline underline-offset-2 hover:text-foreground cursor-pointer">
                Privacy Policy
              </span>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ValueProp({
  icon,
  title,
  text,
}: {
  icon: typeof BubbleChatIcon;
  title: string;
  text: string;
}) {
  return (
    <div className="flex items-start gap-3.5">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <HugeiconsIcon icon={icon} strokeWidth={2} className="size-4 text-primary" />
      </div>
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
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
  );
}
