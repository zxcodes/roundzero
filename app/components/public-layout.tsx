import { Menu01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Link, useRouteContext } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export function PublicHeader() {
  const { user } = useRouteContext({ from: "__root__" });
  const [mobileOpen, setMobileOpen] = useState(false);
  const onCloseMobileMenu = () => {
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-md bg-brand text-brand-foreground">
              <span
                className="font-serif text-[13px] leading-none italic"
                style={{ fontWeight: 500 }}
              >
                R0
              </span>
            </div>
            <span
              className="font-heading text-[19px] leading-none tracking-[-0.01em]"
              style={{ fontWeight: 400 }}
            >
              RoundZero
            </span>
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
              <Link to="/jobs" activeProps={{ className: "text-foreground bg-accent" }}>
                Jobs
              </Link>
            </Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
              <Link to="/companies" activeProps={{ className: "text-foreground bg-accent" }}>
                Companies
              </Link>
            </Button>
          </nav>
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
                className="hidden text-muted-foreground sm:inline-flex"
                asChild
              >
                <Link to="/company/login">For employers</Link>
              </Button>
              <Button size="sm" asChild>
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
                  <Link to="/companies" activeProps={{ className: "text-foreground bg-accent" }}>
                    Companies
                  </Link>
                </Button>
                {!user ? (
                  <>
                    <div className="my-2 h-px bg-border" />
                    <Button
                      variant="ghost"
                      className="justify-start text-muted-foreground"
                      asChild
                      onClick={onCloseMobileMenu}
                    >
                      <Link to="/company/login">For employers</Link>
                    </Button>
                    <Button
                      variant="ghost"
                      className="justify-start text-muted-foreground"
                      asChild
                      onClick={onCloseMobileMenu}
                    >
                      <Link to="/candidate/login">For job seekers</Link>
                    </Button>
                  </>
                ) : null}
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
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 text-sm text-muted-foreground lg:px-8">
        <span>&copy; {new Date().getFullYear()} RoundZero</span>
        <div className="flex gap-6">
          <span className="cursor-pointer transition-colors hover:text-foreground">Privacy</span>
          <span className="cursor-pointer transition-colors hover:text-foreground">Terms</span>
        </div>
      </div>
    </footer>
  );
}
