import { Menu01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link, useRouteContext } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export function PublicHeader({ editorial }: { editorial?: boolean }) {
  const { user } = useRouteContext({ from: "__root__" });

  const [mobileOpen, setMobileOpen] = useState(false);

  const onCloseMobileMenu = () => {
    setMobileOpen(false);
  };

  return (
    <header
      className={`border-b ${editorial ? "border-(--ed-rule)" : "border-border/40"}`}
      style={editorial ? { borderBottomColor: "var(--ed-rule)" } : undefined}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6 lg:px-8">
        <div className="flex items-center">
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
        <div className="flex items-center gap-2">
          {user ? (
            <Button size="sm" asChild>
              <Link to="/dashboard">Dashboard</Link>
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="hidden text-muted-foreground sm:inline-flex rounded-none"
                asChild
              >
                <Link to="/company/login">For companies</Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="hidden text-muted-foreground sm:inline-flex rounded-none"
                asChild
              >
                <Link to="/candidate/login">For job seekers</Link>
              </Button>
            </>
          )}

          {/* Mobile hamburger menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="sm:hidden" aria-label="Open menu">
                <HugeiconsIcon icon={Menu01Icon} strokeWidth={2} className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <div className="flex flex-col gap-1 p-4 pt-12">
                <Button
                  variant="ghost"
                  className="justify-start text-muted-foreground"
                  asChild
                  onClick={onCloseMobileMenu}
                >
                  <Link
                    to="/company/login"
                    activeProps={{ className: "text-foreground bg-accent" }}
                  >
                    For Companies
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  className="justify-start text-muted-foreground"
                  asChild
                  onClick={onCloseMobileMenu}
                >
                  <Link
                    to="/candidate/login"
                    activeProps={{ className: "text-foreground bg-accent" }}
                  >
                    For Candidates
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  className="justify-start text-muted-foreground"
                  asChild
                  onClick={onCloseMobileMenu}
                >
                  <Link to="/jobs" activeProps={{ className: "text-foreground bg-accent" }}>
                    Jobs
                  </Link>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-border/40">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-3 px-6 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between lg:px-8">
        <span>&copy; {new Date().getFullYear()} RoundZero</span>
        <div className="flex gap-6">
          <Link to="/privacy" className="hover:text-foreground transition-colors">
            Privacy Policy
          </Link>
          <Link to="/tos" className="hover:text-foreground transition-colors">
            Terms of Service
          </Link>
        </div>
      </div>
    </footer>
  );
}

export function Logo({ classname }: { classname?: string }) {
  return (
    <div className={cn("size-4", classname)}>
      <svg
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="size-full"
      >
        <g clipPath="url(#clip0_1_1483)">
          <path
            d="M200 30C200 46.5685 186.569 60 170 60C153.431 60 140 46.5685 140 30C140 13.4315 153.431 0 170 0C186.569 0 200 13.4315 200 30Z"
            fill="currentColor"
          />
          <path
            d="M200 170C200 186.569 186.569 200 170 200C153.431 200 140 186.569 140 170C140 153.431 153.431 140 170 140C186.569 140 200 153.431 200 170Z"
            fill="currentColor"
          />
          <path
            d="M151 100C151 128.167 128.167 151 100 151C71.8335 151 49 128.167 49 100C49 71.8335 71.8335 49 100 49C128.167 49 151 71.8335 151 100Z"
            fill="currentColor"
          />
          <path
            d="M60 30C60 46.5685 46.5685 60 30 60C13.4315 60 0 46.5685 0 30C0 13.4315 13.4315 0 30 0C46.5685 0 60 13.4315 60 30Z"
            fill="currentColor"
          />
          <path
            d="M60 170C60 186.569 46.5685 200 30 200C13.4315 200 0 186.569 0 170C0 153.431 13.4315 140 30 140C46.5685 140 60 153.431 60 170Z"
            fill="currentColor"
          />
        </g>
        <defs>
          <clipPath id="clip0_1_1483">
            <rect width="200" height="200" fill="white" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}
