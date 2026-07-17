import { ArrowRight02Icon, Loading03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link } from "@tanstack/react-router";

import { Logo } from "@/components/public-layout";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "@/features/auth/components/google-icon";
import { cn } from "@/lib/utils";

export type LoginValueProp = {
  title: string;
  body: string;
};

type LoginPageShellProps = {
  roleEyebrow: string;
  headline: React.ReactNode;
  lead: string;
  valueProps: LoginValueProp[];
  trustPoints: string[];
  formTitle: string;
  formLead: string;
  crossLink: { prompt: string; to: string; linkText: string };
  onSignIn: () => void;
  isSigningIn: boolean;
};

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <span className="eyebrow">{children}</span>;
}

function ValuePropList({ items, className }: { items: LoginValueProp[]; className?: string }) {
  return (
    <div className={cn("space-y-6", className)}>
      {items.map((item, i) => (
        <div key={item.title} className={cn(i !== 0 ? "border-t border-border pt-6" : "")}>
          <h2 className="text-lg font-semibold tracking-[-0.01em]">{item.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
        </div>
      ))}
    </div>
  );
}

function TrustPointList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((point) => (
        <li key={point} className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground">
          <span className="mt-2 size-1 shrink-0 rounded-full bg-foreground" aria-hidden="true" />
          {point}
        </li>
      ))}
    </ul>
  );
}

function LogoLink({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn("flex items-center gap-1", className)}>
      <Logo />
      <span className="font-heading text-[19px] leading-none font-medium tracking-[-0.01em]">
        RoundZero
      </span>
    </Link>
  );
}

export function LoginPageShell({
  roleEyebrow,
  headline,
  lead,
  valueProps,
  trustPoints,
  formTitle,
  formLead,
  crossLink,
  onSignIn,
  isSigningIn,
}: LoginPageShellProps) {
  return (
    <div className="calm min-h-svh bg-background text-foreground lg:grid lg:grid-cols-2">
      <div className="relative hidden border-r border-border bg-muted/30 lg:flex lg:flex-col lg:justify-between lg:p-10 xl:p-14">
        <LogoLink />

        <div className="space-y-10">
          <div>
            <Eyebrow>{roleEyebrow}</Eyebrow>
            <h1 className="mt-4 text-[clamp(2rem,3.2vw,3rem)] font-semibold leading-[1.06] tracking-[-0.035em]">
              {headline}
            </h1>
            <p className="mt-4 max-w-md text-[clamp(0.98rem,1.3vw,1.1rem)] leading-relaxed text-muted-foreground">
              {lead}
            </p>
          </div>

          <ValuePropList items={valueProps} />
        </div>

        <TrustPointList items={trustPoints} />
      </div>

      <div className="flex min-h-svh items-start justify-center bg-background p-6 pt-16 lg:min-h-0 lg:items-center lg:p-10 lg:pt-10">
        <div className="w-full max-w-sm space-y-8">
          <div className="flex justify-center lg:hidden">
            <LogoLink />
          </div>

          <div className="text-center">
            <span className="lg:hidden">
              <Eyebrow>{roleEyebrow}</Eyebrow>
            </span>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight lg:hidden">{formTitle}</h1>
            <h2 className="hidden text-2xl font-semibold tracking-tight lg:block">{formTitle}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{formLead}</p>
          </div>

          <Button
            variant="outline"
            size="lg"
            className="w-full gap-3 rounded-full"
            onClick={onSignIn}
            disabled={isSigningIn}
            aria-busy={isSigningIn}
          >
            {isSigningIn ? (
              <HugeiconsIcon
                icon={Loading03Icon}
                strokeWidth={2}
                className="size-4 animate-spin"
                aria-hidden="true"
              />
            ) : (
              <GoogleIcon />
            )}
            <span aria-live="polite">{isSigningIn ? "Signing in…" : "Continue with Google"}</span>
          </Button>

          <div className="space-y-6 lg:hidden">
            <ValuePropList items={valueProps} />
            <TrustPointList items={trustPoints} />
          </div>

          <div className="space-y-3 text-center text-xs text-muted-foreground">
            <p>
              {crossLink.prompt}{" "}
              <Link
                to={crossLink.to}
                className="inline-flex items-center gap-0.5 text-foreground transition-colors hover:text-foreground/80"
              >
                {crossLink.linkText}
                <HugeiconsIcon icon={ArrowRight02Icon} strokeWidth={2} className="size-3.5" />
              </Link>
            </p>
            <p>
              By continuing, you agree to our{" "}
              <Link to="/tos" className="underline underline-offset-2">
                Terms
              </Link>{" "}
              and{" "}
              <Link to="/privacy" className="underline underline-offset-2">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
