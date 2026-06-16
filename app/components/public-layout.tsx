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
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6 lg:px-10">
        <div className="flex items-center">
          <Link to="/" className="flex items-center gap-1">
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
          {user?.role ? (
            <Button size="sm" asChild>
              <Link to="/dashboard">Dashboard</Link>
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="hidden rounded-full text-muted-foreground sm:inline-flex"
                asChild
              >
                <Link to="/company/login">For companies</Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="hidden rounded-full text-muted-foreground sm:inline-flex"
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
      <div className="mx-auto flex max-w-7xl flex-col items-start gap-3 px-6 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between lg:px-10">
        <span>&copy; {new Date().getFullYear()} RoundZero</span>
        <div className="flex gap-6">
          <Link to="/contact" className="hover:text-foreground transition-colors">
            Contact
          </Link>
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
    <div className={cn("size-6", classname)}>
      <svg
        width="512"
        height="512"
        viewBox="0 0 512 512"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="size-full"
        aria-hidden="true"
      >
        <rect
          x="512"
          width="512"
          height="512"
          rx="112"
          transform="rotate(90 512 0)"
          fill="var(--muted)"
        />
        <g clipPath="url(#clip0_5_3)">
          <path
            d="M406 151C406 175.853 385.853 196 361 196C336.147 196 316 175.853 316 151C316 126.147 336.147 106 361 106C385.853 106 406 126.147 406 151Z"
            fill="var(--foreground)"
          />
          <path
            d="M406 361C406 385.853 385.853 406 361 406C336.147 406 316 385.853 316 361C316 336.147 336.147 316 361 316C385.853 316 406 336.147 406 361Z"
            fill="var(--foreground)"
          />
          <path
            d="M332.5 256C332.5 298.25 298.25 332.5 256 332.5C213.75 332.5 179.5 298.25 179.5 256C179.5 213.75 213.75 179.5 256 179.5C298.25 179.5 332.5 213.75 332.5 256Z"
            fill="var(--foreground)"
          />
          <path
            d="M196 151C196 175.853 175.853 196 151 196C126.147 196 106 175.853 106 151C106 126.147 126.147 106 151 106C175.853 106 196 126.147 196 151Z"
            fill="var(--foreground)"
          />
          <path
            d="M196 361C196 385.853 175.853 406 151 406C126.147 406 106 385.853 106 361C106 336.147 126.147 316 151 316C175.853 316 196 336.147 196 361Z"
            fill="var(--foreground)"
          />
        </g>
        <defs>
          <clipPath id="clip0_5_3">
            <rect width="300" height="300" fill="white" transform="translate(106 106)" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}
