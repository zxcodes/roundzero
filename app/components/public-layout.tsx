import { Link, useRouteContext } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function PublicHeader() {
  const { user } = useRouteContext({ from: "__root__" });

  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary">
              <span className="text-xs font-bold text-primary-foreground">R0</span>
            </div>
            <span className="text-base font-semibold tracking-tight">roundzero</span>
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
                <Link to="/company/login">For companies</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/candidate/login">For job seekers</Link>
              </Button>
            </>
          )}
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
