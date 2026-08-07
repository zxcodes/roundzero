import { Menu01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { User } from "@/router";

export function PublicHeader({ user = null }: { user?: User | null }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const onCloseMobileMenu = () => {
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-360 items-center justify-between px-6 lg:px-12 xl:px-16">
        <div className="flex items-center">
          <Link to="/" className="flex items-center gap-1">
            <Logo />

            <span className="font-heading text-[19px] leading-none tracking-[-0.01em] font-medium">
              RoundZero
            </span>
          </Link>
        </div>
        <div className="flex items-center">
          {user?.role ? (
            <Button size="sm" asChild>
              <Link to="/dashboard">Dashboard</Link>
            </Button>
          ) : (
            <>
              <div className="hidden items-center md:flex">
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full text-muted-foreground font-normal"
                  asChild
                >
                  <Link to="/" hash="product">
                    Product
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full text-muted-foreground font-normal"
                  asChild
                >
                  <Link to="/compare">Compare</Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full text-muted-foreground font-normal"
                  asChild
                >
                  <Link to="/jobs">Jobs</Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full text-muted-foreground font-normal"
                  asChild
                >
                  <Link to="/" hash="pricing">
                    Pricing
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full text-muted-foreground font-normal max-lg:hidden"
                  asChild
                >
                  <Link to="/candidate/login">For candidates</Link>
                </Button>
              </div>
              <Separator
                orientation="vertical"
                className="mx-2 hidden h-5 md:block data-vertical:self-center"
              />
              <div className="hidden items-center sm:flex">
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full text-muted-foreground font-normal"
                  asChild
                >
                  <Link to="/company/login">Log in</Link>
                </Button>
                <Button size="sm" className="rounded-full px-4 font-normal" asChild>
                  <Link to="/company/login">Post a job</Link>
                </Button>
              </div>
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
                <Button className="justify-start" asChild onClick={onCloseMobileMenu}>
                  <Link to="/company/login">Post a job</Link>
                </Button>
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
                    Log in
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  className="justify-start text-muted-foreground"
                  asChild
                  onClick={onCloseMobileMenu}
                >
                  <Link to="/" hash="product">
                    Product
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  className="justify-start text-muted-foreground"
                  asChild
                  onClick={onCloseMobileMenu}
                >
                  <Link to="/compare" activeProps={{ className: "text-foreground bg-accent" }}>
                    Compare
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
                    For job seekers
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
                <Button
                  variant="ghost"
                  className="justify-start text-muted-foreground"
                  asChild
                  onClick={onCloseMobileMenu}
                >
                  <Link to="/" hash="pricing">
                    Pricing
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
    <footer className="border-t border-border/60 bg-background">
      <div className="mx-auto w-full max-w-360 px-6 py-12 lg:px-12 lg:py-16 xl:px-16">
        <div className="grid gap-12 lg:grid-cols-[minmax(15rem,1.5fr)_repeat(4,minmax(8rem,1fr))]">
          <div className="max-w-sm">
            <Link to="/" className="flex items-center gap-2 text-foreground">
              <Logo />
              <span className="font-heading text-lg font-medium tracking-[-0.01em]">RoundZero</span>
            </Link>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              AI pre-evaluation, adaptive interviews, and evidence-backed reports before the first
              human interview.
            </p>
          </div>
          <FooterColumn title="Product">
            <Link to="/" hash="product">
              How it works
            </Link>
            <Link to="/compare">Compare</Link>
            <Link to="/" hash="pricing">
              Pricing
            </Link>
          </FooterColumn>
          <FooterColumn title="Explore">
            <Link to="/jobs">Jobs</Link>
            <Link to="/companies">Companies</Link>
            <Link to="/candidate/login">For candidates</Link>
          </FooterColumn>
          <FooterColumn title="Company">
            <Link to="/companies/$slug" params={{ slug: "roundzero" }}>
              Careers
            </Link>
            <Link to="/contact">Contact</Link>
          </FooterColumn>
          <FooterColumn title="Legal">
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/tos">Terms of Service</Link>
          </FooterColumn>
        </div>
        <div className="mt-12 border-t border-border/60 pt-6 text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} RoundZero
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-sm font-medium text-foreground">{title}</h2>
      <nav
        className="mt-4 flex flex-col items-start gap-3 text-sm text-muted-foreground"
        aria-label={title}
      >
        {children}
      </nav>
    </div>
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
