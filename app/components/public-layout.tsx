import { Menu01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link, useRouteContext } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export function PublicHeader() {
  const { user } = useRouteContext({ from: "__root__" });

  const [mobileOpen, setMobileOpen] = useState(false);

  const onCloseMobileMenu = () => {
    setMobileOpen(false);
  };

  return (
    <header className="border-b border-border/40">
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
                <Link to="/company/login">For employers</Link>
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
                    For Employers
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
          <span>Privacy Policy coming soon</span>
          <span>Terms coming soon</span>
        </div>
      </div>
    </footer>
  );
}

export function Logo({ classname }: { classname?: string }) {
  return (
    <div className={cn("size-7", classname)}>
      <svg
        viewBox="0 0 512 512"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="size-full rounded-md"
        style={{ color: "oklch(0.42 0.13 28)" }}
      >
        <rect width="512" height="512" transform="matrix(0 1 -1 0 512 0)" fill="currentColor" />
        <path
          d="M357.653 102.59C392.513 111.459 403.452 138.067 400.556 162.015C397.687 185.746 370.66 206.888 331.03 205.517C341.822 206.307 375.781 218.033 382.68 246.273C389.832 275.542 373.838 293.618 354.078 303.037C323.073 317.816 288.832 317.774 259.335 316C277.464 325.457 303.423 343.185 306.705 370.444C309.987 397.703 285.254 423.66 235.199 413.904C185.145 404.147 90.1351 364 115.426 295.055C125.568 267.408 158.79 256.983 177.994 253.369C186.307 251.804 211.065 248.047 245.924 248.047C204.131 244.277 139.205 224.987 135.984 181.527C129.544 94.6078 295.282 86.7205 357.653 102.59Z"
          fill="oklch(0.99 0.003 75)"
        />
      </svg>
    </div>
  );
}
